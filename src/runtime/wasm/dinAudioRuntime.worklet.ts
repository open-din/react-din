/**
 * AudioWorklet processor: runs `din-wasm` `AudioRuntime` on the audio rendering thread.
 * Registered name: {@link DIN_AUDIO_RUNTIME_PROCESSOR_NAME}.
 */
import './audioWorkletEnvPolyfill';
import initWasm, { AudioRuntime } from 'din-wasm';
import type { MidiTransportState, PatchDocument, PatchMidiBindings } from '../../patch/types';
import {
    applyInterfaceEvents,
    applyInterfaceInputs,
    applyMidiNoteEdges,
} from './applyWasmPatchInterface';
import { DIN_AUDIO_RUNTIME_PROCESSOR_NAME } from './dinAudioWorkletConstants';

export type DinBridgeAsset = { path: string; bytes: Uint8Array };

export type DinPatchBridgeProcessorOptions = {
    kind: 'patch-bridge';
    patchJson: string;
    sampleRate: number;
    channels: number;
    blockSize: number;
    assets: readonly DinBridgeAsset[];
    /** Compiled on the main thread; worklet scope may not have `fetch`. */
    wasmModule: WebAssembly.Module;
    /** When true, posts extra `renderDebug` messages for `PatchRuntimeProvider` logging. */
    workletDebug?: boolean;
};

export type DinGraphRuntimeProcessorOptions = {
    kind: 'graph-runtime';
    patchJson: string;
    sampleRate: number;
    channels: number;
    blockSize: number;
    wasmModule: WebAssembly.Module;
    /** When true, posts throttled `renderDebug` peaks for host diagnostics. */
    workletDebug?: boolean;
};

export type DinAudioProcessorOptions = DinPatchBridgeProcessorOptions | DinGraphRuntimeProcessorOptions;

type WasmDebugKey = 'audioRuntimeCreated' | 'patchRuntimeCreated';

/** `AudioWorkletGlobalScope` types are not in the default TS `dom` lib set used here. */
declare abstract class AudioWorkletProcessor {
    readonly port: MessagePort;
    constructor(options?: { processorOptions?: DinAudioProcessorOptions });

    process(
        inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean;
}

declare function registerProcessor(
    name: string,
    processorCtor: new (options: { processorOptions: DinAudioProcessorOptions }) => AudioWorkletProcessor
): void;

class DinAudioRuntimeProcessor extends AudioWorkletProcessor {
    private readonly mode: 'patch-bridge' | 'graph-runtime';
    private readonly blockSize: number;
    private readonly channels: number;
    private readonly patch: PatchDocument;
    private runtime: AudioRuntime | null = null;
    private scratch: Float32Array | null = null;
    private ready = false;

    private readonly lastGateByNodeId = new Map<string, boolean>();
    private lastTickCount: number | null = null;

    private propValues: Record<string, unknown> = {};
    private midi: PatchMidiBindings<PatchDocument> | undefined;

    private sabView: Float32Array | null = null;

    private readonly sabKeyToSlot = new Map<string, number>();

    /** Latest compound `nodeId:param` values; re-applied each block so failed `setNodeParam` calls retry. */
    private readonly nodeParamOverrides = new Map<string, number>();

    private readonly pendingSetInputs: Array<{ key: string; value: number }> = [];
    private readonly pendingMidi: Array<{
        status: number;
        d1: number;
        d2: number;
        frameOffset: number;
    }> = [];

    /** Set by `destroy` message; causes `process` to return `false` so the browser releases the processor. */
    private destroyed = false;

    /** One-shot: warn once when `setNodeParam` is missing from the WASM binary. */
    private setNodeParamWarned = false;
    /** One-shot: first successful block render stats (main thread logs in dev). */
    private renderDebugPosted = false;
    /** One-shot: log first `renderBlockInto` failure from the audio thread. */
    private renderErrorPosted = false;
    /** One-shot: warn when host render quantum is not a multiple of `blockSize` (would otherwise output silence). */
    private quantumWarnPosted = false;

    /** Mirrors `AudioProvider` / `PatchRuntimeProvider` `debug` — richer `renderDebug` traffic. */
    private readonly workletDebug: boolean;
    /** Invocations of `process` (for throttled debug posts). */
    private processInvocationCount = 0;
    /** One-shot diagnostics for early `process` exits when debugging. */
    private renderDebugNotReadyPosted = false;
    private renderDebugQuantumPosted = false;

    constructor(options: { processorOptions: DinAudioProcessorOptions }) {
        super(options);
        const opts = options.processorOptions;
        this.mode = opts.kind;
        this.blockSize = opts.blockSize ?? 128;
        this.channels = opts.channels;
        this.workletDebug = 'workletDebug' in opts && opts.workletDebug === true;
        this.patch = JSON.parse(opts.patchJson) as PatchDocument;

        this.port.onmessage = (event: MessageEvent) => {
            this.onPortMessage(event.data);
        };

        void this.bootstrap(opts);
    }

    private onPortMessage(data: unknown): void {
        if (!data || typeof data !== 'object') return;
        const msg = data as Record<string, unknown>;
        if (msg.type === 'destroy') {
            this.destroyed = true;
            try { (this.runtime as AudioRuntime | null)?.free(); } catch { /* ignore */ }
            this.runtime = null;
            this.ready = false;
            return;
        }
        if (msg.type === 'controls') {
            this.propValues = (msg.propValues as Record<string, unknown>) ?? {};
            this.midi = msg.midi as PatchMidiBindings<PatchDocument> | undefined;
            return;
        }
        if (msg.type === 'init-sab') {
            const sab = msg.sab;
            if (sab instanceof SharedArrayBuffer) {
                this.sabView = new Float32Array(sab);
                this.sabKeyToSlot.clear();
                const mapping = msg.mapping as Record<string, number> | undefined;
                if (mapping) {
                    for (const [k, v] of Object.entries(mapping)) {
                        this.sabKeyToSlot.set(k, Number(v));
                    }
                }
            }
            return;
        }
        if (msg.type === 'registerSabParam') {
            this.sabKeyToSlot.set(String(msg.key), Number(msg.slot));
            return;
        }
        if (msg.type === 'setInput') {
            const key = String(msg.key);
            const value = Number(msg.value);
            if (key.includes(':')) {
                if (key.endsWith(':gate')) {
                    // eslint-disable-next-line no-console -- intentional voice-gate trace (filter: react-din / din-audio)
                    console.debug('[din-audio] worklet setInput nodeParamOverride', key, value);
                }
                this.nodeParamOverrides.set(key, value);
            } else {
                this.pendingSetInputs.push({ key, value });
            }
            return;
        }
        if (msg.type === 'pushMidi') {
            this.pendingMidi.push({
                status: Number(msg.status) & 0xff,
                d1: Number(msg.d1) & 0xff,
                d2: Number(msg.d2) & 0xff,
                frameOffset: Number(msg.frameOffset) >>> 0,
            });
        }
    }

    private async bootstrap(opts: DinAudioProcessorOptions): Promise<void> {
        try {
            await initWasm({ module_or_path: opts.wasmModule });
            const runtime = new AudioRuntime(
                opts.patchJson,
                opts.sampleRate,
                opts.channels,
                opts.blockSize
            );
            if (opts.kind === 'patch-bridge') {
                for (const a of opts.assets) {
                    runtime.loadAsset(a.path, a.bytes);
                }
            }
            this.runtime = runtime;
            this.scratch = new Float32Array(runtime.interleavedOutputLen());
            this.ready = true;
            this.port.postMessage({
                type: 'bump',
                key: opts.kind === 'patch-bridge' ? 'audioRuntimeCreated' : 'patchRuntimeCreated',
            } as { type: 'bump'; key: WasmDebugKey });
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.port.postMessage({ type: 'error', message });
        }
    }

    /**
     * Apply compound node param overrides to WASM. Retries every audio quantum if the runtime
     * lacks `setNodeParam` or a call throws (stale module, init race).
     */
    private applyNodeParamOverrides(rt: AudioRuntime): void {
        const setter = (
            rt as unknown as { setNodeParam?: (compoundKey: string, value: number) => void }
        ).setNodeParam;
        if (typeof setter !== 'function') {
            if (!this.setNodeParamWarned) {
                this.setNodeParamWarned = true;
                this.port.postMessage({
                    type: 'error',
                    message: '[din-wasm] setNodeParam missing — rebuild din-wasm to enable live parameter updates',
                });
            }
            return;
        }
        for (const [key, value] of this.nodeParamOverrides) {
            try {
                setter.call(rt, key, value);
            } catch (err) {
                if (key.endsWith(':gate')) {
                    // eslint-disable-next-line no-console -- intentional voice-gate trace
                    console.debug('[din-audio] applyNodeParamOverrides setNodeParam failed', key, value, err);
                }
                /* keep entry for next block */
            }
        }
    }

    process(
        _inputs: Float32Array[][],
        outputs: Float32Array[][],
        parameters: Record<string, Float32Array>
    ): boolean {
        if (this.destroyed) return false;
        void parameters;
        const out = outputs[0];
        if (!out || out.length < 2) {
            return true;
        }

        const frames = out[0]?.length ?? 0;
        for (let ch = 0; ch < out.length; ch++) {
            out[ch].fill(0);
        }

        if (!this.ready || !this.runtime || !this.scratch) {
            if (this.workletDebug && !this.renderDebugNotReadyPosted) {
                this.renderDebugNotReadyPosted = true;
                this.port.postMessage({
                    type: 'renderDebug',
                    peak: 0,
                    frames,
                    channels: this.channels,
                    mode: this.mode,
                    diag: 'process-before-ready',
                    ready: this.ready,
                    hasRuntime: Boolean(this.runtime),
                    hasScratch: Boolean(this.scratch),
                });
            }
            return true;
        }

        const bs = this.blockSize;
        if (frames % bs !== 0 || this.scratch.length !== bs * this.channels) {
            if (!this.quantumWarnPosted && frames > 0) {
                this.quantumWarnPosted = true;
                this.port.postMessage({
                    type: 'error',
                    message: `[din-audio] worklet quantum ${frames} is not a multiple of blockSize ${bs} (no audio)`,
                });
            }
            if (this.workletDebug && !this.renderDebugQuantumPosted) {
                this.renderDebugQuantumPosted = true;
                this.port.postMessage({
                    type: 'renderDebug',
                    peak: 0,
                    frames,
                    channels: this.channels,
                    mode: this.mode,
                    diag: 'quantum-blocksize-mismatch',
                    blockSize: bs,
                });
            }
            return true;
        }

        this.processInvocationCount += 1;

        const rt = this.runtime;
        const numBlocks = frames / bs;
        const outL = out[0]!;
        const outR = out[1]!;
        let debugPeak = 0;

        for (let b = 0; b < numBlocks; b++) {
            if (this.mode === 'graph-runtime') {
                if (this.sabView && this.sabKeyToSlot.size > 0) {
                    for (const [paramKey, slot] of this.sabKeyToSlot) {
                        // Voice gates use postMessage; do not let SAB slots (often 0) overwrite them each block.
                        if (paramKey.endsWith(':gate')) continue;
                        this.nodeParamOverrides.set(paramKey, this.sabView[slot]!);
                    }
                }
                this.applyNodeParamOverrides(rt);
                if (b === 0) {
                    for (const p of this.pendingSetInputs) {
                        try {
                            rt.setInput(p.key, p.value);
                        } catch {
                            /* ignore */
                        }
                    }
                    this.pendingSetInputs.length = 0;
                    for (const m of this.pendingMidi) {
                        rt.pushMidi(m.status, m.d1, m.d2, m.frameOffset);
                    }
                    this.pendingMidi.length = 0;
                }
            } else {
                applyInterfaceInputs(rt, this.patch, this.propValues);
                applyInterfaceEvents(rt, this.patch, this.propValues);
                applyMidiNoteEdges(rt, this.patch, this.midi, this.lastGateByNodeId);
            }

            try {
                rt.renderBlockInto(this.scratch);
            } catch (error) {
                if (!this.renderErrorPosted) {
                    this.renderErrorPosted = true;
                    const message = error instanceof Error ? error.message : String(error);
                    this.port.postMessage({ type: 'error', message: `renderBlockInto: ${message}` });
                }
                return true;
            }

            if (!this.renderDebugPosted || this.workletDebug) {
                for (let i = 0; i < this.scratch.length; i++) {
                    debugPeak = Math.max(debugPeak, Math.abs(this.scratch[i]!));
                }
            }

            const off = b * bs;
            for (let i = 0; i < bs; i++) {
                outL[off + i] = this.scratch[i * 2]!;
                outR[off + i] = this.scratch[i * 2 + 1]!;
            }

            if (this.mode === 'patch-bridge') {
                try {
                    const state = rt.transportState() as MidiTransportState;
                    if (state.tick_count !== this.lastTickCount) {
                        this.lastTickCount = state.tick_count;
                        this.port.postMessage({ type: 'transport', state });
                    }
                } catch {
                    /* ignore */
                }
            }
        }

        if (!this.renderDebugPosted) {
            this.renderDebugPosted = true;
            this.port.postMessage({
                type: 'renderDebug',
                peak: debugPeak,
                frames,
                channels: this.channels,
                mode: this.mode,
            });
        } else if (this.workletDebug && this.processInvocationCount % 64 === 0) {
            this.port.postMessage({
                type: 'renderDebug',
                peak: debugPeak,
                frames,
                channels: this.channels,
                mode: this.mode,
                throttled: true,
                processInvocationCount: this.processInvocationCount,
            });
        }

        return true;
    }
}

registerProcessor(DIN_AUDIO_RUNTIME_PROCESSOR_NAME, DinAudioRuntimeProcessor);
