/* eslint-disable jsdoc/require-jsdoc -- ambient module shapes for optional peer */
/** Optional peer: install `din-wasm` to use the native patch runtime in the browser. */
declare module 'din-wasm' {
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
}
