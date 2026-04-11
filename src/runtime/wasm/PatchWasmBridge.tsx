import { useAudio } from '../../core';
import type { MidiTransportState, PatchDocument, PatchMidiBindings } from '../../patch/types';
import {
    resolveConvolverAssetPath,
    resolveMidiPlayerAssetPath,
    resolveSamplerAssetPath,
} from '../../patch/document/assets';
import { resolvePatchAssetPath } from '../../patch/document';
import { useEffect, useRef, useState, type FC } from 'react';
import { bumpWasmDebugCounter } from './loadWasmOnce';
import type { DinBridgeAsset } from './dinAudioRuntime.worklet';
import {
    DIN_AUDIO_RUNTIME_PROCESSOR_NAME,
    ensureDinAudioWorkletLoaded,
    getDinWasmModuleForWorklet,
} from './loadDinAudioWorklet';

/** Must match the Web Audio render quantum (128) and `AudioRuntime` block size. */
const WASM_BLOCK_FRAMES = 128;
const WASM_CHANNELS = 2;

async function fetchPatchAssets(
    patch: PatchDocument,
    assetRoot?: string
): Promise<DinBridgeAsset[]> {
    const tasks: Array<{ path: string; resolvedPath: string }> = [];

    for (const node of patch.nodes) {
        const nodeType = node.data?.type;
        if (nodeType === 'sampler' || nodeType === 'triggeredSampler') {
            const samplerPath = resolveSamplerAssetPath(node.data);
            tasks.push({
                path: samplerPath,
                resolvedPath: resolvePatchAssetPath(samplerPath, assetRoot) ?? samplerPath,
            });
        } else if (nodeType === 'convolver') {
            const convolverPath = resolveConvolverAssetPath(node.data);
            tasks.push({
                path: convolverPath,
                resolvedPath: resolvePatchAssetPath(convolverPath, assetRoot) ?? convolverPath,
            });
        } else if (nodeType === 'midiPlayer') {
            const midiPath = resolveMidiPlayerAssetPath(node.data);
            tasks.push({
                path: midiPath,
                resolvedPath: resolvePatchAssetPath(midiPath, assetRoot) ?? midiPath,
            });
        }
    }

    const assets: DinBridgeAsset[] = [];

    await Promise.all(
        tasks.map(async ({ path, resolvedPath }) => {
            try {
                const response = await fetch(resolvedPath);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const bytes = new Uint8Array(await response.arrayBuffer());
                assets.push({ path, bytes });
            } catch (error) {
                console.warn(`[PatchWasmBridge] Failed to load asset ${resolvedPath}:`, error);
            }
        })
    );

    return assets;
}

export interface PatchWasmBridgeProps<TPatch extends PatchDocument> {
    patch: TPatch;
    assetRoot?: string;
    propValues: Record<string, unknown>;
    midi?: PatchMidiBindings<TPatch>;
    onTransportState?: (state: MidiTransportState) => void;
}

/**
 * Connects `din-wasm` `AudioRuntime` to the WebAudio graph via an `AudioWorkletNode`
 * into the shared `AudioProvider` master bus.
 */
export const PatchWasmBridge: FC<PatchWasmBridgeProps<PatchDocument>> = ({
    patch,
    assetRoot,
    propValues,
    midi,
    onTransportState,
}) => {
    const { context, masterBus, sampleRate } = useAudio();

    const workletRef = useRef<AudioWorkletNode | null>(null);
    const [bridgeReady, setBridgeReady] = useState(false);

    useEffect(() => {
        if (!context || !masterBus) return undefined;

        let cancelled = false;
        let node: AudioWorkletNode | null = null;
        setBridgeReady(false);

        void (async () => {
            try {
                await ensureDinAudioWorkletLoaded(context);
                if (cancelled) return;

                const wasmModule = await getDinWasmModuleForWorklet();

                const patchJson = JSON.stringify(patch);
                const assets = await fetchPatchAssets(patch, assetRoot);
                if (cancelled) return;

                node = new AudioWorkletNode(context, DIN_AUDIO_RUNTIME_PROCESSOR_NAME, {
                    numberOfInputs: 0,
                    numberOfOutputs: 1,
                    outputChannelCount: [WASM_CHANNELS],
                    processorOptions: {
                        kind: 'patch-bridge',
                        patchJson,
                        sampleRate,
                        channels: WASM_CHANNELS,
                        blockSize: WASM_BLOCK_FRAMES,
                        assets,
                        wasmModule,
                    },
                });
                workletRef.current = node;

                node.port.onmessage = (event: MessageEvent) => {
                    const data = event.data;
                    if (!data || typeof data !== 'object') return;
                    if (data.type === 'bump' && data.key === 'audioRuntimeCreated') {
                        bumpWasmDebugCounter('audioRuntimeCreated');
                    }
                    if (data.type === 'error' && typeof data.message === 'string') {
                        console.error('[PatchWasmBridge] worklet:', data.message);
                    }
                    if (data.type === 'transport' && onTransportState) {
                        onTransportState(data.state as MidiTransportState);
                    }
                };

                node.connect(masterBus);
                if (!cancelled) {
                    setBridgeReady(true);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('[react-din] PatchWasmBridge failed to init din-wasm AudioRuntime', error);
                }
            }
        })();

        return () => {
            cancelled = true;
            setBridgeReady(false);
            workletRef.current = null;
            if (node) {
                try {
                    node.port.onmessage = null;
                    node.disconnect();
                } catch {
                    /* ignore */
                }
                node = null;
            }
        };
    }, [assetRoot, context, masterBus, onTransportState, patch, sampleRate]);

    useEffect(() => {
        if (!bridgeReady) return;
        workletRef.current?.port.postMessage({
            type: 'controls',
            propValues,
            midi,
        });
    }, [bridgeReady, propValues, midi]);

    return null;
};
