/**
 * Parameter transport: SharedArrayBuffer (data plane) or postMessage (fallback / control).
 */

export type ParamTransportMode = 'auto' | 'sab' | 'postMessage';

const DEFAULT_MAX_PARAMS = 1024;

export interface ParamTransport {
    /** Resolved data plane (`sab` only when SharedArrayBuffer is used). */
    readonly kind: 'sab' | 'postMessage';

    setParam(nodeId: string, key: string, value: number): void;
    /** Call after a new AudioWorkletNode is created so the worklet receives SAB + mapping. */
    attachPort(port: MessagePort): void;
    destroy(): void;
}

function resolveTransportKind(mode: ParamTransportMode): 'sab' | 'postMessage' {
    if (mode === 'postMessage') {
        return 'postMessage';
    }
    if (mode === 'sab') {
        try {
            if (typeof SharedArrayBuffer !== 'undefined') {
                new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT);
                return 'sab';
            }
        } catch {
            /* not cross-origin isolated or SAB disabled */
        }
        return 'postMessage';
    }
    // auto
    try {
        if (
            typeof crossOriginIsolated !== 'undefined' &&
            crossOriginIsolated &&
            typeof SharedArrayBuffer !== 'undefined'
        ) {
            new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT);
            return 'sab';
        }
    } catch {
        /* ignore */
    }
    return 'postMessage';
}

function compoundKey(nodeId: string, key: string): string {
    return `${nodeId}:${key}`;
}

class PostMessageParamTransport implements ParamTransport {
    readonly kind = 'postMessage' as const;

    private port: MessagePort | null = null;

    attachPort(port: MessagePort): void {
        this.port = port;
    }

    setParam(nodeId: string, key: string, value: number): void {
        const k = compoundKey(nodeId, key);
        this.port?.postMessage({ type: 'setInput', key: k, value });
    }

    destroy(): void {
        this.port = null;
    }
}

class SharedArrayBufferParamTransport implements ParamTransport {
    readonly kind = 'sab' as const;

    private readonly sab: SharedArrayBuffer;

    private readonly view: Float32Array;

    private readonly keyToSlot = new Map<string, number>();

    private nextSlot = 0;

    private readonly maxParams: number;

    private port: MessagePort | null = null;

    constructor(maxParams: number = DEFAULT_MAX_PARAMS) {
        this.maxParams = maxParams;
        this.sab = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * maxParams);
        this.view = new Float32Array(this.sab);
    }

    attachPort(port: MessagePort): void {
        this.port = port;
        port.postMessage({
            type: 'init-sab',
            sab: this.sab,
            mapping: Object.fromEntries(this.keyToSlot),
        });
    }

    setParam(nodeId: string, key: string, value: number): void {
        const ck = compoundKey(nodeId, key);
        let slot = this.keyToSlot.get(ck);
        if (slot === undefined) {
            if (this.nextSlot >= this.maxParams) {
                this.port?.postMessage({ type: 'setInput', key: ck, value });
                return;
            }
            slot = this.nextSlot;
            this.nextSlot += 1;
            this.keyToSlot.set(ck, slot);
            this.port?.postMessage({ type: 'registerSabParam', key: ck, slot });
        }
        this.view[slot] = value;
    }

    destroy(): void {
        this.port = null;
    }
}

export interface CreateParamTransportOptions {
    mode?: ParamTransportMode;
    /** Max float32 slots when using SAB. @default 1024 */
    maxParams?: number;
}

/**
 * Creates a parameter transport. Call {@link ParamTransport.attachPort} after the worklet node exists.
 */
export function createParamTransport(options: CreateParamTransportOptions = {}): ParamTransport {
    const mode = options.mode ?? 'auto';
    const maxParams = options.maxParams ?? DEFAULT_MAX_PARAMS;
    const kind = resolveTransportKind(mode);
    if (kind === 'sab') {
        return new SharedArrayBufferParamTransport(maxParams);
    }
    return new PostMessageParamTransport();
}
