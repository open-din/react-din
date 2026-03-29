declare module 'electron' {
    export class BrowserWindow {
        constructor(options?: Record<string, unknown>);
        static getAllWindows(): BrowserWindow[];
        loadURL(url: string): Promise<void>;
        loadFile(path: string): Promise<void>;
    }

    export const app: {
        isPackaged: boolean;
        whenReady(): Promise<void>;
        on(event: string, listener: (...args: unknown[]) => void): void;
        quit(): void;
    };

    export const contextBridge: {
        exposeInMainWorld(name: string, api: unknown): void;
    };
}
