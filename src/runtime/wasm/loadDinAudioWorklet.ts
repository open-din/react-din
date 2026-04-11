import { createEnsureDinAudioWorkletLoaded } from './createEnsureDinAudioWorkletLoaded';
import { DIN_AUDIO_RUNTIME_PROCESSOR_NAME } from './dinAudioWorkletConstants';

/**
 * Resolves the worklet script URL for `audioWorklet.addModule`.
 *
 * tsup splits this module into `dist/chunk-*.js` at the package `dist/` root, so
 * `import.meta.url` is often `.../dist/chunk-XXXX.js` and the worklet lives at
 * `dist/runtime/wasm/dinAudioRuntime.worklet.js` → use `./runtime/wasm/...` from that chunk.
 *
 * When this file is bundled as `dist/runtime/wasm/loadDinAudioWorklet.js`, the worklet is in the
 * same directory → `./dinAudioRuntime.worklet.js`.
 *
 * Vite dev with `@open-din/react` aliased to `src/` often hoists this module into an app chunk
 * where the relative URLs above do not match a served asset. The example app aliases this module
 * to `example/shims/loadDinAudioWorklet.ts`, which uses Vite's `?url` import for a correct href.
 */
export function dinAudioWorkletModuleUrl(): string {
    const base = import.meta.url;
    if (base.includes('/runtime/wasm/')) {
        return new URL('./dinAudioRuntime.worklet.js', base).href;
    }
    return new URL('./runtime/wasm/dinAudioRuntime.worklet.js', base).href;
}

/**
 * Same base resolution as {@link dinAudioWorkletModuleUrl}, for `din_wasm_bg.wasm` next to the
 * packaged worklet (`copy-din-wasm-to-dist.mjs`). Used on the main thread only — `AudioWorkletGlobalScope`
 * may not have `fetch`, so the worklet receives a pre-compiled {@link WebAssembly.Module} instead.
 */
export function dinWasmBinaryUrl(): string {
    const base = import.meta.url;
    if (base.includes('/runtime/wasm/')) {
        return new URL('./din_wasm_bg.wasm', base).href;
    }
    return new URL('./runtime/wasm/din_wasm_bg.wasm', base).href;
}

let wasmModuleForWorkletPromise: Promise<WebAssembly.Module> | null = null;

/**
 * Fetches and compiles `din_wasm_bg.wasm` once (main thread). Pass the result as `wasmModule` in
 * `AudioWorkletNode` `processorOptions` so the worklet can call `initWasm(module)` without `fetch`.
 */
export function getDinWasmModuleForWorklet(): Promise<WebAssembly.Module> {
    if (!wasmModuleForWorkletPromise) {
        wasmModuleForWorkletPromise = (async () => {
            const url = dinWasmBinaryUrl();
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch din_wasm_bg.wasm: HTTP ${response.status}`);
            }
            const bytes = await response.arrayBuffer();
            return WebAssembly.compile(bytes);
        })();
    }
    return wasmModuleForWorkletPromise;
}

export const ensureDinAudioWorkletLoaded = createEnsureDinAudioWorkletLoaded(dinAudioWorkletModuleUrl);

export { DIN_AUDIO_RUNTIME_PROCESSOR_NAME };
