import { useAudio } from '../../core';
import type { PatchDocument, PatchMidiBindings } from '../../patch/types';
import type { MidiNoteValue } from '../../midi/types';
import { useEffect, useRef, type FC } from 'react';
import { ensureWasmInitialized } from './loadWasmOnce';

/** ScriptProcessor buffer size must be one of the allowed legacy sizes; matches `AudioRuntime` block. */
const WASM_BLOCK_FRAMES = 256;
const WASM_CHANNELS = 2;

function applyInterfaceInputs(
    runtime: import('din-wasm').AudioRuntime,
    patch: PatchDocument,
    propValues: Record<string, unknown>
): void {
    patch.interface.inputs.forEach((item) => {
        if (!Object.prototype.hasOwnProperty.call(propValues, item.key)) return;
        const v = Number(propValues[item.key]);
        if (!Number.isFinite(v)) return;
        try {
            runtime.setInput(item.key, v);
        } catch {
            /* unknown or invalid key */
        }
    });
}

function applyInterfaceEvents(
    runtime: import('din-wasm').AudioRuntime,
    patch: PatchDocument,
    propValues: Record<string, unknown>
): void {
    patch.interface.events.forEach((item) => {
        if (!Object.prototype.hasOwnProperty.call(propValues, item.key)) return;
        const raw = propValues[item.key];
        const token =
            typeof raw === 'bigint' ? raw : BigInt(Math.max(0, Math.floor(Number(raw) || 0)));
        try {
            runtime.triggerEvent(item.key, token);
        } catch {
            /* unknown event key */
        }
    });
}

function applyMidiNoteEdges(
    runtime: import('din-wasm').AudioRuntime,
    patch: PatchDocument,
    midi: PatchMidiBindings<PatchDocument> | undefined,
    lastGateByNodeId: Map<string, boolean>
): void {
    patch.interface.midiInputs.forEach((item) => {
        const value = midi?.inputs?.[item.key as keyof NonNullable<typeof midi.inputs>];
        if (!value || !('gate' in value)) return;
        const mv = value as MidiNoteValue;
        const nodeId = item.nodeId;
        const prev = lastGateByNodeId.get(nodeId) ?? false;
        const gate = Boolean(mv.gate);
        if (gate && !prev) {
            const note = mv.note != null ? mv.note : 60;
            const vel = Math.max(0, Math.min(127, Math.round(mv.velocity)));
            runtime.pushMidi(0x90, note, vel, 0);
        } else if (!gate && prev) {
            const note = mv.note != null ? mv.note : 60;
            runtime.pushMidi(0x80, note, 0, 0);
        }
        lastGateByNodeId.set(nodeId, gate);
    });
}

export interface PatchWasmBridgeProps<TPatch extends PatchDocument> {
    patch: TPatch;
    assetRoot?: string;
    propValues: Record<string, unknown>;
    midi?: PatchMidiBindings<TPatch>;
}

/**
 * Connects `din-wasm` `AudioRuntime` to the WebAudio graph via a `ScriptProcessorNode`
 * into the shared `AudioProvider` master bus.
 */
export const PatchWasmBridge: FC<PatchWasmBridgeProps<PatchDocument>> = ({
    patch,
    propValues,
    midi,
}) => {
    const { context, masterBus, sampleRate } = useAudio();

    const propValuesRef = useRef(propValues);
    const midiRef = useRef(midi);
    propValuesRef.current = propValues;
    midiRef.current = midi;

    const lastGateRef = useRef<Map<string, boolean>>(new Map());

    useEffect(() => {
        if (!context || !masterBus) return undefined;

        let cancelled = false;
        let processor: ScriptProcessorNode | null = null;
        let runtime: import('din-wasm').AudioRuntime | null = null;

        const lastGateByNodeId = lastGateRef.current;

        void(async () => {
            try {
                await ensureWasmInitialized();
                if (cancelled) return;

                const { AudioRuntime } = await import('din-wasm');
                const patchJson = JSON.stringify(patch);
                const audioRuntime = new AudioRuntime(
                    patchJson,
                    sampleRate,
                    WASM_CHANNELS,
                    WASM_BLOCK_FRAMES
                );

                if (cancelled) {
                    audioRuntime.free();
                    return;
                }

                runtime = audioRuntime;
                const scratch = new Float32Array(audioRuntime.interleavedOutputLen());

                const proc = context.createScriptProcessor(WASM_BLOCK_FRAMES, 0, WASM_CHANNELS);
                processor = proc;
                proc.onaudioprocess = (event) => {
                    applyInterfaceInputs(audioRuntime, patch, propValuesRef.current);
                    applyInterfaceEvents(audioRuntime, patch, propValuesRef.current);
                    applyMidiNoteEdges(audioRuntime, patch, midiRef.current, lastGateByNodeId);
                    audioRuntime.renderBlockInto(scratch);
                    const outL = event.outputBuffer.getChannelData(0);
                    const outR = event.outputBuffer.getChannelData(1);
                    for (let i = 0; i < WASM_BLOCK_FRAMES; i++) {
                        outL[i] = scratch[i * 2];
                        outR[i] = scratch[i * 2 + 1];
                    }
                };

                proc.connect(masterBus);
            } catch (error) {
                if (!cancelled) {
                    console.error('[react-din] PatchWasmBridge failed to init din-wasm AudioRuntime', error);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (processor) {
                try {
                    processor.disconnect();
                } catch {
                    /* ignore */
                }
                processor = null;
            }
            if (runtime) {
                runtime.free();
                runtime = null;
            }
        };
    }, [context, masterBus, patch, sampleRate]);

    return null;
};
