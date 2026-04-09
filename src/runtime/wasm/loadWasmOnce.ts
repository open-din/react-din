let initPromise: Promise<void> | null = null;

/**
 * Loads and initializes the `din-wasm` module once per JS realm.
 * Rejects if the optional peer `din-wasm` is not installed or fails to load.
 */
export function ensureWasmInitialized(): Promise<void> {
    if (!initPromise) {
        initPromise = (async () => {
            const wasm = await import('din-wasm');
            await wasm.default();
        })();
    }
    return initPromise;
}
