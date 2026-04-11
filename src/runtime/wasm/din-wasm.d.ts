/* eslint-disable jsdoc/require-jsdoc -- ambient module shapes for optional peer */
/** Optional peer: install `din-wasm` to use the native patch runtime in the browser. */
declare module 'din-wasm' {
    /** Pass a URL/string, `Response`, `WebAssembly.Module`, or `{ module_or_path }` (wasm-bindgen 0.2.100+). */
    export default function init(moduleOrPath?: unknown): Promise<unknown>;

    export class AudioRuntime {
        constructor(json: string, sampleRate: number, channels: number, blockSize: number);
        static fromPatch(json: string, sampleRate: number, channels: number, blockSize: number): AudioRuntime;
        free(): void;
        interleavedOutputLen(): number;
        loadAsset(path: string, bytes: Uint8Array): void;
        pushMidi(status: number, data1: number, data2: number, frameOffset: number): void;
        renderBlock(): Float32Array;
        renderBlockInto(dst: Float32Array): void;
        runtimeSnapshot(): unknown;
        setInput(key: string, value: number): void;
        transportState(): unknown;
        triggerEvent(key: string, token: bigint): void;
    }

    export class TransportRuntime {
        constructor();
        static fromConfig(
            bpm: number,
            beatsPerBar: number,
            beatUnit: number,
            barsPerPhrase: number,
            stepsPerBeat: number,
            swing: number,
            mode: string
        ): TransportRuntime;
        free(): void;
        play(): void;
        stop(): void;
        reset(): void;
        isPlaying(): boolean;
        advanceSeconds(deltaSeconds: number): unknown;
        stepIndex(): bigint;
        secondsPerBeat(): number;
        secondsPerStep(): number;
        seekToStep?(step: bigint): void;
    }

    export function parse_note_value(input: string): unknown | null;
    export function note_to_midi_value(input: string): number;
    export function midi_to_note_value(midi: number, preferFlats?: boolean): string;
    export function midi_to_freq_value(midi: number): number;
    export function note_to_freq_value(input: string): number | null;
    export function note_to_french_value(input: string): string | null;
    export function note_from_french_value(input: string): string | null;

    export function audio_math(
        operation: string,
        a: number,
        b: number,
        c: number
    ): number;
    export function audio_compare(operation: string, a: number, b: number): boolean;
    export function audio_mix(a: number, b: number, t: number, clamp: boolean): number;
    export function audio_clamp(
        value: number,
        min: number,
        max: number,
        mode: string
    ): number;
    export function audio_switch(index: number, values: Float32Array): number;

    export function migrate_patch(json: string): string;
    export function graph_document_to_patch(json: string): string;
    export function patch_to_graph_document(json: string): string;
    export function resolve_patch_asset_path(
        assetPath: string,
        assetRoot: string
    ): string | null;
}
