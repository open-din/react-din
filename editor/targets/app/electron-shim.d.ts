declare module 'electron' {
    export class BrowserWindow {
        constructor(options?: Record<string, unknown>);
        static getAllWindows(): BrowserWindow[];
        loadURL(url: string): Promise<void>;
        focus(): void;
        show(): void;
        close(): void;
        isDestroyed(): boolean;
        on(event: string, listener: (...args: unknown[]) => void): this;
        once(event: string, listener: (...args: unknown[]) => void): this;
    }

    export const app: {
        isPackaged: boolean;
        whenReady(): Promise<void>;
        on(event: string, listener: (...args: unknown[]) => void): void;
        quit(): void;
        getPath(name: string): string;
    };

    export const contextBridge: {
        exposeInMainWorld(name: string, api: unknown): void;
    };

    export const ipcMain: {
        handle(channel: string, listener: (event: unknown, ...args: any[]) => unknown | Promise<unknown>): void;
    };

    export const ipcRenderer: {
        invoke(channel: string, ...args: unknown[]): Promise<unknown>;
    };

    export const shell: {
        openPath(path: string): Promise<string>;
    };
}
