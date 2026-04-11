import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
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
import { createParamTransport, type ParamTransportMode } from '../runtime/wasm/paramTransport';
import { PATCH_MASTER_OUTPUT_NODE_ID, usePatchGraph } from './PatchGraphContext';

interface PatchRuntimeProviderProps {
    masterBus: GainNode | null;
    sampleRate: number;
    /** Must match the AudioWorklet render quantum (128). */
    blockSize?: number;
    children: ReactNode;
    paramTransport?: ParamTransportMode;
    debug?: boolean;
}

/** Subset of `din-wasm` `AudioRuntime` used from React; implemented via `AudioWorkletNode` message port. */
export type PatchRuntimeHandle = {
    setParam: (nodeId: string, key: string, value: number) => void;
    setInput: (key: string, value: number) => void;
    pushMidi: (status: number, data1: number, data2: number, frameOffset: number) => void;
};

interface PatchRuntimeContextValue {
    runtimeRef: MutableRefObject<PatchRuntimeHandle | null>;
    /**
     * Increments each time the AudioWorklet runtime is connected with a live facade.
     * Consumers should flush WASM params when this changes so updates are not dropped
     * while `runtimeRef` was still null during async bootstrap.
     */
    runtimeEpoch: number;
}

const PatchRuntimeContext = createContext<PatchRuntimeContextValue | null>(null);

function isDevBuild(): boolean {
    const meta = import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } };
    return Boolean(meta.env?.DEV ?? meta.env?.MODE === 'development');
}

const TOPOLOGY_REBUILD_DEBOUNCE_MS = 40;

function graphHasWasmNodes(graph: ReturnType<typeof usePatchGraph>): boolean {
    return Array.from(graph.getNodes().keys()).some((id) => id !== PATCH_MASTER_OUTPUT_NODE_ID);
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
    paramTransport = 'auto',
    debug = false,
}) => {
    const graph = usePatchGraph();
    const runtimeRef = useRef<PatchRuntimeHandle | null>(null);
    const workletRef = useRef<AudioWorkletNode | null>(null);
    const paramTransportRef = useRef<ReturnType<typeof createParamTransport> | null>(null);
    const [runtimeEpoch, setRuntimeEpoch] = useState(0);

    useEffect(() => {
        if (!masterBus) return undefined;
        const context = masterBus.context;
        let cancelled = false;
        /** Monotonic id for rebuild attempts; stale async completions must not destroy a newer worklet. */
        const rebuildSeqRef = { current: 0 };
        /** Debounce rapid topology churn (play/pause remounts) so one rebuild runs after the graph settles. */
        let topologyDebounceTimer: ReturnType<typeof setTimeout> | null = null;

        const destroyRuntime = () => {
            const node = workletRef.current;
            if (node) {
                node.port.postMessage({ type: 'destroy' });
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

            if (!graphHasWasmNodes(graph)) {
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

            /** Keep until new WASM is ready so the bus still plays the old graph during async bootstrap. */
            const prevNode = workletRef.current;

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

            node.connect(masterBus);

            try {
                await new Promise<void>((resolve, reject) => {
                    node.port.onmessage = (event: MessageEvent) => {
                        const data = event.data as Record<string, unknown> | null;
                        if (!data || typeof data !== 'object') return;
                        if (data.type === 'error') {
                            reject(new Error(String(data.message ?? 'worklet error')));
                            return;
                        }
                        if (data.type === 'bump' && data.key === 'patchRuntimeCreated') {
                            bumpWasmDebugCounter('patchRuntimeCreated');
                            resolve();
                        }
                    };
                });
            } catch (error) {
                console.error('[PatchRuntimeProvider] worklet bootstrap failed:', error);
                try {
                    node.disconnect();
                } catch {
                    /* ignore */
                }
                return;
            }

            if (cancelled || seq !== rebuildSeqRef.current) {
                try {
                    node.disconnect();
                } catch {
                    /* ignore */
                }
                return;
            }

            if (prevNode) {
                prevNode.port.postMessage({ type: 'destroy' });
                prevNode.port.onmessage = null;
                try {
                    prevNode.disconnect();
                } catch {
                    /* ignore */
                }
            }

            workletRef.current = node;

            if (paramTransportRef.current) {
                paramTransportRef.current.destroy();
            }
            paramTransportRef.current = createParamTransport({ mode: paramTransport });
            if (debug && isDevBuild()) {
                console.info('[PatchRuntimeProvider] param transport', paramTransportRef.current.kind);
            }
            paramTransportRef.current.attachPort(node.port);

            const facade: PatchRuntimeHandle = {
                setParam(nodeId: string, key: string, value: number) {
                    paramTransportRef.current?.setParam(nodeId, key, value);
                },
                setInput(key: string, value: number) {
                    node.port.postMessage({ type: 'setInput', key, value });
                },
                pushMidi(status: number, data1: number, data2: number, frameOffset: number) {
                    node.port.postMessage({ type: 'pushMidi', status, d1: data1, d2: data2, frameOffset });
                },
            };

            runtimeRef.current = facade;
            setRuntimeEpoch((n) => n + 1);

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
        };

        const runRebuild = () => {
            void rebuildRuntime().catch((error) => {
                console.error('[PatchRuntimeProvider] rebuild failed:', error);
            });
        };

        /** First commit: coalesce with a microtask (no 40ms wait). Later topology: debounce play/pause churn. */
        const scheduleDebouncedRebuild = () => {
            if (topologyDebounceTimer !== null) {
                clearTimeout(topologyDebounceTimer);
                topologyDebounceTimer = null;
            }
            topologyDebounceTimer = setTimeout(() => {
                topologyDebounceTimer = null;
                runRebuild();
            }, TOPOLOGY_REBUILD_DEBOUNCE_MS);
        };

        queueMicrotask(runRebuild);

        let lastTopologyVersion = graph.getTopologyVersion();
        const unsubscribe = graph.subscribe(() => {
            const currentTopology = graph.getTopologyVersion();
            if (currentTopology !== lastTopologyVersion) {
                lastTopologyVersion = currentTopology;
                scheduleDebouncedRebuild();
            }
        });

        return () => {
            cancelled = true;
            rebuildSeqRef.current += 1;
            if (topologyDebounceTimer !== null) {
                clearTimeout(topologyDebounceTimer);
                topologyDebounceTimer = null;
            }
            unsubscribe();
            destroyRuntime();
            paramTransportRef.current?.destroy();
            paramTransportRef.current = null;
        };
    }, [blockSize, debug, graph, masterBus, paramTransport, sampleRate]);

    return (
        <PatchRuntimeContext.Provider value={{ runtimeRef, runtimeEpoch }}>
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
