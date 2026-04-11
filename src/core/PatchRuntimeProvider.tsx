import {
    createContext,
    useContext,
    useEffect,
    useRef,
    type FC,
    type MutableRefObject,
    type ReactNode,
} from 'react';
import { graphDocumentToPatch, type GraphDocumentLike } from '../patch/document';
import { bumpWasmDebugCounter } from '../runtime/wasm/loadWasmOnce';
import {
    DIN_AUDIO_RUNTIME_PROCESSOR_NAME,
    ensureDinAudioWorkletLoaded,
    getDinWasmModuleForWorklet,
} from '../runtime/wasm/loadDinAudioWorklet';
import { usePatchGraph } from './PatchGraphContext';

interface PatchRuntimeProviderProps {
    masterBus: GainNode | null;
    sampleRate: number;
    /** Must match the AudioWorklet render quantum (128). */
    blockSize?: number;
    children: ReactNode;
}

/** Subset of `din-wasm` `AudioRuntime` used from React; implemented via `AudioWorkletNode` message port. */
export type PatchRuntimeHandle = {
    setInput: (key: string, value: number) => void;
    pushMidi: (status: number, data1: number, data2: number, frameOffset: number) => void;
};

interface PatchRuntimeContextValue {
    runtimeRef: MutableRefObject<PatchRuntimeHandle | null>;
}

const PatchRuntimeContext = createContext<PatchRuntimeContextValue | null>(null);

function isDevBuild(): boolean {
    const meta = import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } };
    return Boolean(meta.env?.DEV ?? meta.env?.MODE === 'development');
}

function buildGraphDocument(graph: ReturnType<typeof usePatchGraph>) {
    const nodes = Array.from(graph.getNodes().entries()).map(([id, node]) => ({
        id,
        position: { x: 0, y: 0 },
        data: {
            ...node.data,
            type: node.type,
        },
    }));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = Array.from(graph.getConnections().values())
        .filter((c) => nodeIds.has(c.source) && nodeIds.has(c.target))
        .map((connection) => ({
            id: connection.id,
            source: connection.source,
            sourceHandle: connection.sourceHandle,
            target: connection.target,
            targetHandle: connection.targetHandle,
        }));
    return {
        name: 'Wasm Graph',
        nodes,
        edges,
    };
}

export const PatchRuntimeProvider: FC<PatchRuntimeProviderProps> = ({
    masterBus,
    sampleRate,
    blockSize = 128,
    children,
}) => {
    const graph = usePatchGraph();
    const runtimeRef = useRef<PatchRuntimeHandle | null>(null);
    const workletRef = useRef<AudioWorkletNode | null>(null);

    useEffect(() => {
        if (!masterBus) return undefined;
        const context = masterBus.context;
        let cancelled = false;
        /** Monotonic id for rebuild attempts; stale async completions must not destroy a newer worklet. */
        const rebuildSeqRef = { current: 0 };
        /** Coalesce synchronous graph notifications into one microtask rebuild. */
        let rebuildMicrotaskScheduled = false;

        const destroyRuntime = () => {
            const node = workletRef.current;
            if (node) {
                node.port.onmessage = null;
                try {
                    node.disconnect();
                } catch {
                    /* ignore */
                }
                workletRef.current = null;
            }
            runtimeRef.current = null;
        };

        const rebuildRuntime = async () => {
            if (cancelled) return;
            const seq = ++rebuildSeqRef.current;

            if (graph.getNodes().size === 0) {
                if (seq === rebuildSeqRef.current) {
                    destroyRuntime();
                }
                return;
            }

            let patchJson: string;
            try {
                const graphDoc = buildGraphDocument(graph) as GraphDocumentLike;
                const patch = graphDocumentToPatch(graphDoc);
                patchJson = JSON.stringify(patch);
                if (isDevBuild()) {
                    console.info('[PatchRuntimeProvider] patch built', {
                        jsonLength: patchJson.length,
                        nodeCount: patch.nodes.length,
                        connectionCount: patch.connections.length,
                    });
                }
            } catch (error) {
                console.error('[PatchRuntimeProvider] graph → patch failed:', error);
                if (seq === rebuildSeqRef.current) {
                    destroyRuntime();
                }
                return;
            }

            try {
                await ensureDinAudioWorkletLoaded(context);
            } catch (error) {
                console.error('[PatchRuntimeProvider] AudioWorklet module failed:', error);
                return;
            }

            if (cancelled || seq !== rebuildSeqRef.current) return;

            let wasmModule: WebAssembly.Module;
            try {
                wasmModule = await getDinWasmModuleForWorklet();
            } catch (error) {
                console.error('[PatchRuntimeProvider] din_wasm compile failed:', error);
                return;
            }

            if (cancelled || seq !== rebuildSeqRef.current) return;

            destroyRuntime();
            if (cancelled || seq !== rebuildSeqRef.current) return;

            const node = new AudioWorkletNode(context, DIN_AUDIO_RUNTIME_PROCESSOR_NAME, {
                numberOfInputs: 0,
                numberOfOutputs: 1,
                outputChannelCount: [2],
                processorOptions: {
                    kind: 'graph-runtime',
                    patchJson,
                    sampleRate,
                    channels: 2,
                    blockSize,
                    wasmModule,
                },
            });
            workletRef.current = node;

            node.port.onmessage = (event: MessageEvent) => {
                const data = event.data;
                if (!data || typeof data !== 'object') return;
                if (data.type === 'bump' && data.key === 'patchRuntimeCreated') {
                    bumpWasmDebugCounter('patchRuntimeCreated');
                }
                if (data.type === 'error' && typeof data.message === 'string') {
                    console.error('[PatchRuntimeProvider] worklet:', data.message);
                }
                if (isDevBuild() && data.type === 'renderDebug') {
                    console.info('[PatchRuntimeProvider] worklet render', data);
                }
            };

            const facade: PatchRuntimeHandle = {
                setInput(key: string, value: number) {
                    node.port.postMessage({ type: 'setInput', key, value });
                },
                pushMidi(status: number, data1: number, data2: number, frameOffset: number) {
                    node.port.postMessage({ type: 'pushMidi', status, d1: data1, d2: data2, frameOffset });
                },
            };

            runtimeRef.current = facade;
            node.connect(masterBus);
        };

        const scheduleRebuild = () => {
            if (rebuildMicrotaskScheduled) return;
            rebuildMicrotaskScheduled = true;
            queueMicrotask(() => {
                rebuildMicrotaskScheduled = false;
                void rebuildRuntime().catch((error) => {
                    console.error('[PatchRuntimeProvider] rebuild failed:', error);
                });
            });
        };

        scheduleRebuild();

        const unsubscribe = graph.subscribe(() => {
            scheduleRebuild();
        });

        return () => {
            cancelled = true;
            rebuildSeqRef.current += 1;
            unsubscribe();
            destroyRuntime();
        };
    }, [blockSize, graph, masterBus, sampleRate]);

    return (
        <PatchRuntimeContext.Provider value={{ runtimeRef }}>
            {children}
        </PatchRuntimeContext.Provider>
    );
};

/** Returns the patch graph WASM runtime handle (`setInput` / `pushMidi` via AudioWorklet). */
export function usePatchRuntime(): PatchRuntimeContextValue {
    const context = useContext(PatchRuntimeContext);
    if (!context) {
        throw new Error('usePatchRuntime must be used within PatchRuntimeProvider');
    }
    return context;
}
