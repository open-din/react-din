import { create } from 'zustand';
import {
    type Edge,
    type Connection,
    type Node,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from '@xyflow/react';
import type { XYPosition } from '@xyflow/react';
import { audioEngine } from './AudioEngine';
import { normalizeGraphName } from './graphUtils';
import {
    canConnect,
    isAudioConnection,
    type NormalizedConnectionDescriptor,
    migrateGraphEdges,
    migrateGraphNodes,
    normalizeInputNodeData,
    normalizeMidiNoteNodeData,
    normalizeTransportNodeData,
    getSingletonNodeTypes,
} from './nodeHelpers';
import type { EditorNodeType } from './nodeCatalog';
import {
    createEditorNode,
} from './graphBuilders';
import { normalizeUiTokensNodeData } from './uiTokens';
import { createEditorGraphId, createInitialGraphDocument } from './defaultGraph';
import type {
    AudioNodeData,
    GraphDocument,
    GraphHistoryMap,
    GraphHistorySnapshot,
    GraphHistoryState,
    UpdateNodeDataOptions,
    ConnectionAssistStart,
    InputNodeData,
    UiTokensNodeData,
    TransportNodeData,
    MidiNoteNodeData,
} from './types';

export * from './types';

// ============================================================================
// Store State
// ============================================================================

interface AudioGraphState {
    nodes: Node<AudioNodeData>[];
    edges: Edge[];
    graphs: GraphDocument[];
    activeGraphId: string | null;
    isHydrated: boolean;
    audioContext: AudioContext | null;
    selectedNodeId: string | null;
    historyByGraph: GraphHistoryMap;
    canUndo: boolean;
    canRedo: boolean;

    // React Flow handlers
    onNodesChange: OnNodesChange<Node<AudioNodeData>>;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;

    // Graph actions
    setGraphs: (graphs: GraphDocument[], activeGraphId?: string | null) => void;
    setActiveGraph: (graphId: string) => void;
    createGraph: (name?: string) => GraphDocument;
    renameGraph: (graphId: string, name: string) => void;
    removeGraph: (graphId: string) => GraphDocument | null;
    setHydrated: (isHydrated: boolean) => void;
    undo: () => void;
    redo: () => void;
    clearHistoryForGraph: (graphId: string) => void;
    clearAllHistory: () => void;
    finalizeHistoryGroup: (graphId: string, mergeKey?: string) => void;

    // Custom actions
    addNode: (type: EditorNodeType, position?: { x: number; y: number }) => void;
    addNodeAndConnect: (type: EditorNodeType, connection: NormalizedConnectionDescriptor, position?: { x: number; y: number }) => string | null;
    updateNodeData: (nodeId: string, data: Partial<AudioNodeData>, options?: UpdateNodeDataOptions) => void;
    removeNode: (nodeId: string) => void;
    loadGraph: (nodes: Node<AudioNodeData>[], edges: Edge[]) => void;
    setPlaying: (playing: boolean) => void;
    setSelectedNode: (nodeId: string | null) => void;
    initAudioContext: () => void;
    clearAssetReferences: (assetId: string) => void;
    
    // Connection Assist State
    connectionAssist: ConnectionAssistStart | null;
    assistPosition: XYPosition | null;
    assistQuery: string;
    setConnectionAssist: (assist: ConnectionAssistStart | null) => void;
    setAssistPosition: (position: XYPosition | null) => void;
    setAssistQuery: (query: string) => void;
}

let nodeIdCounter = 0;
const getNodeId = () => `node_${++nodeIdCounter}`;

const deepClone = <T>(value: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

const stopOutputNodes = (nodes: Node<AudioNodeData>[]) =>
    nodes.map((node) => {
        if (node.data.type !== 'output' && node.data.type !== 'transport') return node;
        return {
            ...node,
            data: {
                ...node.data,
                playing: false,
            } as AudioNodeData,
        };
    });

const syncNodeIdCounter = (nodes: Node<AudioNodeData>[]) => {
    let maxId = 0;

    nodes.forEach((node) => {
        const match = /^node_(\d+)$/.exec(node.id);
        if (!match) return;
        const value = Number(match[1]);
        if (Number.isFinite(value)) {
            maxId = Math.max(maxId, value);
        }
    });

    if (maxId > nodeIdCounter) {
        nodeIdCounter = maxId;
    }
};

const HISTORY_GROUP_DELAY_MS = 250;
const historyGroupTimers = new Map<string, ReturnType<typeof setTimeout>>();
const NODE_CHANGE_STRUCTURAL_TYPES = new Set(['add', 'remove', 'replace']);
const EDGE_CHANGE_STRUCTURAL_TYPES = new Set(['add', 'remove', 'replace']);

const createEmptyGraphHistoryState = (): GraphHistoryState => ({
    undoStack: [],
    redoStack: [],
    pendingGroup: null,
});

const getGraphHistoryState = (historyByGraph: GraphHistoryMap, graphId: string): GraphHistoryState =>
    historyByGraph[graphId] ?? createEmptyGraphHistoryState();

const clearHistoryGroupTimer = (graphId: string) => {
    const timer = historyGroupTimers.get(graphId);
    if (!timer) return;
    clearTimeout(timer);
    historyGroupTimers.delete(graphId);
};

const clearAllHistoryGroupTimers = () => {
    historyGroupTimers.forEach((timer) => clearTimeout(timer));
    historyGroupTimers.clear();
};

const stripSelectionFromNodes = (nodes: Node<AudioNodeData>[]) =>
    nodes.map((node) => ({
        ...node,
        selected: false,
    }));

const stripSelectionFromEdges = (edges: Edge[]) =>
    edges.map((edge) => ({
        ...edge,
        selected: false,
    }));

const createHistorySnapshot = (graph: Pick<GraphDocument, 'name' | 'nodes' | 'edges'>): GraphHistorySnapshot => ({
    name: normalizeGraphName(graph.name),
    nodes: deepClone(stripSelectionFromNodes(graph.nodes)),
    edges: deepClone(stripSelectionFromEdges(graph.edges)),
});

const cloneHistorySnapshot = (snapshot: GraphHistorySnapshot): GraphHistorySnapshot => ({
    name: snapshot.name,
    nodes: deepClone(snapshot.nodes),
    edges: deepClone(snapshot.edges),
});

const historySnapshotEquals = (left: GraphHistorySnapshot, right: GraphHistorySnapshot) =>
    left.name === right.name
    && JSON.stringify(left.nodes) === JSON.stringify(right.nodes)
    && JSON.stringify(left.edges) === JSON.stringify(right.edges);

const getHistoryAvailability = (historyByGraph: GraphHistoryMap, activeGraphId: string | null) => {
    if (!activeGraphId) {
        return { canUndo: false, canRedo: false };
    }
    const history = historyByGraph[activeGraphId];
    return {
        canUndo: Boolean(history?.pendingGroup || history?.undoStack.length),
        canRedo: Boolean(history?.redoStack.length),
    };
};

const finalizePendingHistoryGroup = (
    historyByGraph: GraphHistoryMap,
    graphId: string,
    mergeKey?: string
): GraphHistoryMap => {
    const history = historyByGraph[graphId];
    if (!history?.pendingGroup) return historyByGraph;
    if (mergeKey && history.pendingGroup.mergeKey !== mergeKey) return historyByGraph;

    clearHistoryGroupTimer(graphId);

    const pendingGroup = history.pendingGroup;
    if (historySnapshotEquals(pendingGroup.before, pendingGroup.after)) {
        return {
            ...historyByGraph,
            [graphId]: {
                ...history,
                pendingGroup: null,
            },
        };
    }

    return {
        ...historyByGraph,
        [graphId]: {
            undoStack: [...history.undoStack, {
                before: pendingGroup.before,
                after: pendingGroup.after,
                mergeKey: pendingGroup.mergeKey,
            }],
            redoStack: history.redoStack,
            pendingGroup: null,
        },
    };
};

const appendHistoryEntry = (
    historyByGraph: GraphHistoryMap,
    graphId: string,
    before: GraphHistorySnapshot,
    after: GraphHistorySnapshot
): GraphHistoryMap => {
    const finalizedHistory = finalizePendingHistoryGroup(historyByGraph, graphId);
    if (historySnapshotEquals(before, after)) {
        return finalizedHistory;
    }

    const history = getGraphHistoryState(finalizedHistory, graphId);
    return {
        ...finalizedHistory,
        [graphId]: {
            undoStack: [...history.undoStack, { before, after }],
            redoStack: [],
            pendingGroup: null,
        },
    };
};

const updatePendingHistoryGroup = (
    historyByGraph: GraphHistoryMap,
    graphId: string,
    mergeKey: string,
    before: GraphHistorySnapshot,
    after: GraphHistorySnapshot
): GraphHistoryMap => {
    const existingHistory = historyByGraph[graphId];
    if (existingHistory?.pendingGroup && existingHistory.pendingGroup.mergeKey !== mergeKey) {
        historyByGraph = finalizePendingHistoryGroup(historyByGraph, graphId);
    }

    const history = getGraphHistoryState(historyByGraph, graphId);
    const pendingGroup = history.pendingGroup?.mergeKey === mergeKey
        ? {
            ...history.pendingGroup,
            after,
        }
        : {
            before,
            after,
            mergeKey,
        };

    return {
        ...historyByGraph,
        [graphId]: {
            undoStack: history.undoStack,
            redoStack: [],
            pendingGroup,
        },
    };
};

const clearHistoryForGraphState = (
    historyByGraph: GraphHistoryMap,
    graphId: string
): GraphHistoryMap => {
    clearHistoryGroupTimer(graphId);
    if (!(graphId in historyByGraph)) return historyByGraph;
    const nextHistory = { ...historyByGraph };
    delete nextHistory[graphId];
    return nextHistory;
};

const removeGraphHistoryState = (
    historyByGraph: GraphHistoryMap,
    graphId: string
): GraphHistoryMap => clearHistoryForGraphState(historyByGraph, graphId);

const createNodeUpdateMergeKey = (nodeId: string, data: Partial<AudioNodeData>, options?: UpdateNodeDataOptions) => {
    if (options?.mergeKey) return options.mergeKey;
    const keys = Object.keys(data).sort();
    return keys.length > 0 ? `node:${nodeId}:${keys.join(',')}` : `node:${nodeId}`;
};

const shouldSkipNodeHistory = (
    node: Node<AudioNodeData> | undefined,
    data: Partial<AudioNodeData>,
    options?: UpdateNodeDataOptions
) => {
    if (!node) return true;
    if (options?.history === 'skip') return true;

    const keys = Object.keys(data);
    if (keys.length === 1 && keys[0] === 'playing' && (node.data.type === 'output' || node.data.type === 'transport')) {
        return true;
    }

    return false;
};

const applyNodeDataPatch = (
    node: Node<AudioNodeData>,
    data: Partial<AudioNodeData>
): Node<AudioNodeData> => {
    const nextData = { ...node.data, ...data } as AudioNodeData;

    if (nextData.type === 'input') {
        return {
            ...node,
            data: normalizeInputNodeData(node.id, nextData as InputNodeData),
        };
    }

    if (nextData.type === 'uiTokens') {
        return {
            ...node,
            data: normalizeUiTokensNodeData(nextData as UiTokensNodeData),
        };
    }

    if (nextData.type === 'transport') {
        return {
            ...node,
            data: normalizeTransportNodeData(nextData as TransportNodeData),
        };
    }

    if (nextData.type === 'midiNote') {
        return {
            ...node,
            data: normalizeMidiNoteNodeData(nextData as MidiNoteNodeData),
        };
    }

    return {
        ...node,
        data: nextData,
    };
};

const patchNodeDataInSnapshot = (
    snapshot: GraphHistorySnapshot,
    nodeId: string,
    data: Partial<AudioNodeData>
): GraphHistorySnapshot => {
    const currentNode = snapshot.nodes.find((node) => node.id === nodeId);
    if (!currentNode) return snapshot;

    const nextNodes = snapshot.nodes.map((node) =>
        node.id === nodeId
            ? applyNodeDataPatch(node, data)
            : node
    );
    const nextEdges = requiresConnectionRefresh(currentNode, data)
        ? migrateGraphEdges(nextNodes, snapshot.edges)
        : snapshot.edges;

    return {
        ...snapshot,
        nodes: nextNodes,
        edges: nextEdges,
    };
};

const syncNodePatchIntoHistory = (
    historyByGraph: GraphHistoryMap,
    graphId: string,
    nodeId: string,
    data: Partial<AudioNodeData>
): GraphHistoryMap => {
    const history = historyByGraph[graphId];
    if (!history) return historyByGraph;

    return {
        ...historyByGraph,
        [graphId]: {
            undoStack: history.undoStack.map((entry) => ({
                ...entry,
                before: patchNodeDataInSnapshot(entry.before, nodeId, data),
                after: patchNodeDataInSnapshot(entry.after, nodeId, data),
            })),
            redoStack: history.redoStack.map((entry) => ({
                ...entry,
                before: patchNodeDataInSnapshot(entry.before, nodeId, data),
                after: patchNodeDataInSnapshot(entry.after, nodeId, data),
            })),
            pendingGroup: history.pendingGroup
                ? {
                    ...history.pendingGroup,
                    before: patchNodeDataInSnapshot(history.pendingGroup.before, nodeId, data),
                    after: patchNodeDataInSnapshot(history.pendingGroup.after, nodeId, data),
                }
                : null,
        },
    };
};

const initialGraph: GraphDocument = createInitialGraphDocument();

const normalizeGraphDocument = (graph: GraphDocument, index: number, now: number): GraphDocument => {
    const nodes = migrateGraphNodes(graph.nodes);
    const edges = migrateGraphEdges(nodes, graph.edges);

    return {
        ...graph,
        nodes,
        edges,
        name: normalizeGraphName(graph.name),
        createdAt: graph.createdAt ?? now,
        updatedAt: graph.updatedAt ?? now,
        order: graph.order ?? index,
    };
};

const hasSingletonNode = (nodes: Node<AudioNodeData>[], type: EditorNodeType) =>
    nodes.some((node) => node.data.type === type);

const requiresConnectionRefresh = (
    node: Node<AudioNodeData> | undefined,
    data: Partial<AudioNodeData>
) => {
    if (!node) return false;
    if (node.data.type === 'input' && 'params' in data) return true;
    if (node.data.type === 'uiTokens' && 'params' in data) return true;
    if (node.data.type === 'switch' && 'inputs' in data) return true;
    if (node.data.type === 'matrixMixer' && ('inputs' in data || 'outputs' in data)) return true;
    return false;
};

const createStyledEdge = (
    nodes: Node<AudioNodeData>[],
    edges: Edge[],
    connection: Connection
): Edge[] | null => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    if (!canConnect(connection, nodeById)) return null;

    const isAudioConnectionValue = isAudioConnection(connection, nodeById);
    const edgeStyle = isAudioConnectionValue
        ? { stroke: '#44cc44', strokeWidth: 3 }
        : { stroke: '#4488ff', strokeWidth: 2, strokeDasharray: '5,5' };

    return addEdge({ ...connection, style: edgeStyle, animated: !isAudioConnectionValue }, edges);
};

const replaceVirtualConnectionNode = (
    nodes: Node<AudioNodeData>[],
    connection: NormalizedConnectionDescriptor,
    nodeId: string
): Connection => ({
    source: nodes.some((node) => node.id === connection.source) ? connection.source : nodeId,
    sourceHandle: connection.sourceHandle ?? null,
    target: nodes.some((node) => node.id === connection.target) ? connection.target : nodeId,
    targetHandle: connection.targetHandle ?? null,
});

const buildGraphsWithActiveSnapshot = (
    graphs: GraphDocument[],
    activeGraphId: string | null,
    snapshot: GraphHistorySnapshot
) => graphs.map((graph) => {
    if (graph.id !== activeGraphId) return graph;
    const restored = cloneHistorySnapshot(snapshot);
    return {
        ...graph,
        name: restored.name,
        nodes: restored.nodes,
        edges: restored.edges,
        updatedAt: Date.now(),
    };
});

const buildActiveGraphSnapshot = (
    state: Pick<AudioGraphState, 'graphs' | 'activeGraphId' | 'nodes' | 'edges'>
): GraphHistorySnapshot | null => {
    const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
    if (!activeGraph) return null;

    return createHistorySnapshot({
        name: activeGraph.name,
        nodes: state.nodes,
        edges: state.edges,
    });
};

export const useAudioGraphStore = create<AudioGraphState>((set, get) => ({
    nodes: initialGraph.nodes,
    edges: initialGraph.edges,
    graphs: [initialGraph],
    activeGraphId: initialGraph.id,
    isHydrated: false,
    audioContext: null,
    selectedNodeId: null,
    historyByGraph: {},
    canUndo: false,
    canRedo: false,

    setHydrated: (isHydrated) => set({ isHydrated }),

    clearHistoryForGraph: (graphId) => {
        set((state) => {
            const historyByGraph = clearHistoryForGraphState(state.historyByGraph, graphId);
            return {
                historyByGraph,
                ...getHistoryAvailability(historyByGraph, state.activeGraphId),
            };
        });
    },

    clearAllHistory: () => {
        clearAllHistoryGroupTimers();
        set((state) => ({
            historyByGraph: {},
            ...getHistoryAvailability({}, state.activeGraphId),
        }));
    },

    finalizeHistoryGroup: (graphId, mergeKey) => {
        set((state) => {
            const historyByGraph = finalizePendingHistoryGroup(state.historyByGraph, graphId, mergeKey);
            return {
                historyByGraph,
                ...getHistoryAvailability(historyByGraph, state.activeGraphId),
            };
        });
    },

    undo: () => {
        const state = get();
        const graphId = state.activeGraphId;
        if (!graphId) return;

        const historyByGraph = finalizePendingHistoryGroup(state.historyByGraph, graphId);
        const history = historyByGraph[graphId];
        if (!history || history.undoStack.length === 0) {
            if (historyByGraph !== state.historyByGraph) {
                set({
                    historyByGraph,
                    ...getHistoryAvailability(historyByGraph, graphId),
                });
            }
            return;
        }

        const entry = history.undoStack[history.undoStack.length - 1];
        const restored = cloneHistorySnapshot(entry.before);
        const nextHistoryByGraph: GraphHistoryMap = {
            ...historyByGraph,
            [graphId]: {
                undoStack: history.undoStack.slice(0, -1),
                redoStack: [...history.redoStack, entry],
                pendingGroup: null,
            },
        };

        syncNodeIdCounter(restored.nodes);
        set((currentState) => ({
            historyByGraph: nextHistoryByGraph,
            graphs: buildGraphsWithActiveSnapshot(currentState.graphs, graphId, restored),
            nodes: restored.nodes,
            edges: restored.edges,
            selectedNodeId: null,
            ...getHistoryAvailability(nextHistoryByGraph, graphId),
        }));

        audioEngine.refreshConnections(restored.nodes, restored.edges);
    },

    redo: () => {
        const state = get();
        const graphId = state.activeGraphId;
        if (!graphId) return;

        const historyByGraph = finalizePendingHistoryGroup(state.historyByGraph, graphId);
        const history = historyByGraph[graphId];
        if (!history || history.redoStack.length === 0) {
            if (historyByGraph !== state.historyByGraph) {
                set({
                    historyByGraph,
                    ...getHistoryAvailability(historyByGraph, graphId),
                });
            }
            return;
        }

        const entry = history.redoStack[history.redoStack.length - 1];
        const restored = cloneHistorySnapshot(entry.after);
        const nextHistoryByGraph: GraphHistoryMap = {
            ...historyByGraph,
            [graphId]: {
                undoStack: [...history.undoStack, entry],
                redoStack: history.redoStack.slice(0, -1),
                pendingGroup: null,
            },
        };

        syncNodeIdCounter(restored.nodes);
        set((currentState) => ({
            historyByGraph: nextHistoryByGraph,
            graphs: buildGraphsWithActiveSnapshot(currentState.graphs, graphId, restored),
            nodes: restored.nodes,
            edges: restored.edges,
            selectedNodeId: null,
            ...getHistoryAvailability(nextHistoryByGraph, graphId),
        }));

        audioEngine.refreshConnections(restored.nodes, restored.edges);
    },

    setGraphs: (graphs, activeGraphId) => {
        const now = Date.now();
        const normalizedGraphs = (graphs.length ? graphs : get().graphs)
            .map((graph, index) => normalizeGraphDocument(graph, index, now));

        const orderedGraphs = [...normalizedGraphs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const fallbackGraph = orderedGraphs[0];
        if (!fallbackGraph) return;

        const resolvedActiveId = activeGraphId && orderedGraphs.some((graph) => graph.id === activeGraphId)
            ? activeGraphId
            : fallbackGraph.id;
        const activeGraph = orderedGraphs.find((graph) => graph.id === resolvedActiveId) ?? fallbackGraph;

        clearAllHistoryGroupTimers();
        audioEngine.stop();
        syncNodeIdCounter(activeGraph.nodes);

        set({
            graphs: orderedGraphs,
            activeGraphId: activeGraph.id,
            nodes: activeGraph.nodes,
            edges: activeGraph.edges,
            selectedNodeId: null,
            historyByGraph: {},
            canUndo: false,
            canRedo: false,
        });

        audioEngine.refreshConnections(activeGraph.nodes, activeGraph.edges);
    },

    setActiveGraph: (graphId) => {
        const state = get();
        if (state.activeGraphId === graphId) return;

        const targetGraph = state.graphs.find((graph) => graph.id === graphId);
        if (!targetGraph) return;

        const historyByGraph = state.activeGraphId
            ? finalizePendingHistoryGroup(state.historyByGraph, state.activeGraphId)
            : state.historyByGraph;
        const stoppedNodes = stopOutputNodes(state.nodes);
        const updatedGraphs = state.graphs.map((graph) => {
            if (graph.id !== state.activeGraphId) return graph;
            return {
                ...graph,
                nodes: stoppedNodes,
                updatedAt: Date.now(),
            };
        });
        const nextGraph = updatedGraphs.find((graph) => graph.id === graphId) ?? targetGraph;

        audioEngine.stop();
        syncNodeIdCounter(nextGraph.nodes);

        set({
            graphs: updatedGraphs,
            activeGraphId: graphId,
            nodes: nextGraph.nodes,
            edges: nextGraph.edges,
            selectedNodeId: null,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, graphId),
        });

        audioEngine.refreshConnections(nextGraph.nodes, nextGraph.edges);
    },

    createGraph: (name) => {
        const state = get();
        const nextIndex = state.graphs.length + 1;
        const graphName = normalizeGraphName(name ?? `Graph ${nextIndex}`);
        const now = Date.now();
        const order = state.graphs.reduce((max, graph) => Math.max(max, graph.order ?? 0), -1) + 1;

        const graph: GraphDocument = createInitialGraphDocument(createEditorGraphId(), graphName, order);
        const normalizedGraph = normalizeGraphDocument(graph, order, now);
        const historyByGraph = state.activeGraphId
            ? finalizePendingHistoryGroup(state.historyByGraph, state.activeGraphId)
            : state.historyByGraph;
        const stoppedNodes = stopOutputNodes(state.nodes);
        const updatedGraphs = state.graphs.map((existing) =>
            existing.id === state.activeGraphId
                ? { ...existing, nodes: stoppedNodes, updatedAt: now }
                : existing
        );

        syncNodeIdCounter(normalizedGraph.nodes);
        audioEngine.stop();

        set({
            graphs: [...updatedGraphs, normalizedGraph],
            activeGraphId: normalizedGraph.id,
            nodes: normalizedGraph.nodes,
            edges: normalizedGraph.edges,
            selectedNodeId: null,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, normalizedGraph.id),
        });

        audioEngine.refreshConnections(normalizedGraph.nodes, normalizedGraph.edges);
        return normalizedGraph;
    },

    renameGraph: (graphId, name) => {
        const state = get();
        const nextName = normalizeGraphName(name);
        const currentGraph = state.graphs.find((graph) => graph.id === graphId);
        if (!currentGraph || currentGraph.name === nextName) return;

        if (graphId !== state.activeGraphId) {
            set({
                graphs: state.graphs.map((graph) =>
                    graph.id === graphId
                        ? { ...graph, name: nextName, updatedAt: Date.now() }
                        : graph
                ),
            });
            return;
        }

        const before = buildActiveGraphSnapshot(state);
        if (!before) return;

        const after = createHistorySnapshot({
            name: nextName,
            nodes: state.nodes,
            edges: state.edges,
        });
        const historyByGraph = appendHistoryEntry(state.historyByGraph, graphId, before, after);

        set({
            graphs: state.graphs.map((graph) =>
                graph.id === graphId
                    ? { ...graph, name: nextName, updatedAt: Date.now() }
                    : graph
            ),
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });
    },

    removeGraph: (graphId) => {
        const state = get();
        const targetGraph = state.graphs.find((graph) => graph.id === graphId);
        if (!targetGraph) return null;

        const historyByGraph = removeGraphHistoryState(state.historyByGraph, graphId);
        const remaining = state.graphs.filter((graph) => graph.id !== graphId);

        if (remaining.length === 0) {
            const now = Date.now();
            const fallbackGraph: GraphDocument = createInitialGraphDocument(
                createEditorGraphId(),
                normalizeGraphName('Graph 1'),
                0
            );
            const normalized = normalizeGraphDocument(fallbackGraph, 0, now);
            syncNodeIdCounter(normalized.nodes);
            audioEngine.stop();

            set({
                graphs: [normalized],
                activeGraphId: normalized.id,
                nodes: normalized.nodes,
                edges: normalized.edges,
                selectedNodeId: null,
                historyByGraph: {},
                canUndo: false,
                canRedo: false,
            });

            audioEngine.refreshConnections(normalized.nodes, normalized.edges);
            return normalized;
        }

        const nextActiveId = graphId === state.activeGraphId ? remaining[0].id : state.activeGraphId;
        const nextActiveGraph = remaining.find((g) => g.id === nextActiveId)!;

        syncNodeIdCounter(nextActiveGraph.nodes);
        audioEngine.stop();

        set({
            graphs: remaining,
            activeGraphId: nextActiveId,
            nodes: nextActiveGraph.nodes,
            edges: nextActiveGraph.edges,
            selectedNodeId: null,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, nextActiveId),
        });

        audioEngine.refreshConnections(nextActiveGraph.nodes, nextActiveGraph.edges);
        return nextActiveGraph;
    },

    setGraphsList: (graphs: GraphDocument[]) => {
        set({ graphs });
    },

    setPlaying: (playing: boolean) => {
        const outputNode = get().nodes.find((n) => (n.data as AudioNodeData).type === 'output');
        if (outputNode) {
            get().updateNodeData(outputNode.id, { playing }, { history: 'skip' });
        }
    },

    setSelectedNode: (nodeId: string | null) => {
        set((state) => {
            const nodes = state.nodes.map((node) => ({
                ...node,
                selected: node.id === nodeId,
            }));

            const graphs = state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, nodes, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs;

            return {
                selectedNodeId: nodeId,
                nodes,
                graphs,
            };
        });
    },

    // Connection Assist State
    connectionAssist: null,
    assistPosition: null,
    assistQuery: '',

    setConnectionAssist: (connectionAssist) => set({ connectionAssist }),
    setAssistPosition: (assistPosition) => set({ assistPosition }),
    setAssistQuery: (assistQuery) => set({ assistQuery }),

    onNodesChange: (changes) => {
        const state = get();
        const nextNodes = applyNodeChanges(changes, state.nodes);
        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const hasStructuralChange = changes.some((change) => NODE_CHANGE_STRUCTURAL_TYPES.has(change.type));
        const hasPositionChange = changes.some((change) => change.type === 'position');
        let historyByGraph = state.historyByGraph;

        if (state.activeGraphId && activeGraph && (hasStructuralChange || hasPositionChange)) {
            const before = createHistorySnapshot({
                name: activeGraph.name,
                nodes: state.nodes,
                edges: state.edges,
            });
            const after = createHistorySnapshot({
                name: activeGraph.name,
                nodes: nextNodes,
                edges: state.edges,
            });

            historyByGraph = hasStructuralChange
                ? appendHistoryEntry(historyByGraph, state.activeGraphId, before, after)
                : updatePendingHistoryGroup(historyByGraph, state.activeGraphId, 'nodes:position', before, after);
        }

        const graphs = state.activeGraphId
            ? state.graphs.map((graph) =>
                graph.id === state.activeGraphId
                    ? { ...graph, nodes: nextNodes, updatedAt: Date.now() }
                    : graph
            )
            : state.graphs;

        set({
            nodes: nextNodes,
            graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        if (state.activeGraphId && hasPositionChange && !hasStructuralChange) {
            const isDragComplete = changes.some((change) => change.type === 'position' && change.dragging === false);
            if (isDragComplete) {
                get().finalizeHistoryGroup(state.activeGraphId, 'nodes:position');
            } else {
                scheduleHistoryGroupFinalization(state.activeGraphId, 'nodes:position');
            }
        }

        if (hasStructuralChange) {
            audioEngine.refreshConnections(nextNodes, state.edges);
        } else if (changes.length > 0) {
            audioEngine.refreshDataValues(nextNodes, state.edges);
        }
    },

    onEdgesChange: (changes) => {
        const state = get();
        const nextEdges = applyEdgeChanges(changes, state.edges);
        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const hasStructuralChange = changes.some((change) => EDGE_CHANGE_STRUCTURAL_TYPES.has(change.type));
        let historyByGraph = state.historyByGraph;

        if (state.activeGraphId && activeGraph && hasStructuralChange) {
            const before = createHistorySnapshot({
                name: activeGraph.name,
                nodes: state.nodes,
                edges: state.edges,
            });
            const after = createHistorySnapshot({
                name: activeGraph.name,
                nodes: state.nodes,
                edges: nextEdges,
            });
            historyByGraph = appendHistoryEntry(historyByGraph, state.activeGraphId, before, after);
        }

        const graphs = state.activeGraphId
            ? state.graphs.map((graph) =>
                graph.id === state.activeGraphId
                    ? { ...graph, edges: nextEdges, updatedAt: Date.now() }
                    : graph
            )
            : state.graphs;

        set({
            edges: nextEdges,
            graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        if (changes.length > 0) {
            audioEngine.refreshConnections(state.nodes, nextEdges);
        }
    },

    onConnect: (connection) => {
        const state = get();
        const newEdges = createStyledEdge(state.nodes, state.edges, connection as Connection);
        if (!newEdges) return;

        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const historyByGraph = state.activeGraphId && activeGraph
            ? appendHistoryEntry(
                state.historyByGraph,
                state.activeGraphId,
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: state.nodes,
                    edges: state.edges,
                }),
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: state.nodes,
                    edges: newEdges,
                })
            )
            : state.historyByGraph;

        set({
            edges: newEdges,
            graphs: state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, edges: newEdges, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        audioEngine.refreshConnections(state.nodes, newEdges);
    },

    addNode: (type, position = { x: 300, y: 200 }) => {
        const state = get();
        if (getSingletonNodeTypes().has(type) && hasSingletonNode(state.nodes, type)) {
            return;
        }

        const id = getNodeId();
        const newNode = createEditorNode(id, type, position);
        if (!newNode) return;

        const newNodes = [...state.nodes, newNode];
        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const historyByGraph = state.activeGraphId && activeGraph
            ? appendHistoryEntry(
                state.historyByGraph,
                state.activeGraphId,
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: state.nodes,
                    edges: state.edges,
                }),
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: newNodes,
                    edges: state.edges,
                })
            )
            : state.historyByGraph;

        set({
            nodes: newNodes,
            graphs: state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, nodes: newNodes, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        audioEngine.refreshConnections(newNodes, state.edges);
    },

    addNodeAndConnect: (type, connection, position = { x: 300, y: 200 }) => {
        const state = get();
        if (getSingletonNodeTypes().has(type) && hasSingletonNode(state.nodes, type)) {
            return null;
        }

        const id = getNodeId();
        const newNode = createEditorNode(id, type, position);
        if (!newNode) return null;

        const newNodes = [...state.nodes, newNode];
        const resolvedConnection = replaceVirtualConnectionNode(state.nodes, connection, id);
        const newEdges = createStyledEdge(newNodes, state.edges, resolvedConnection);
        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const historyByGraph = state.activeGraphId && activeGraph
            ? appendHistoryEntry(
                state.historyByGraph,
                state.activeGraphId,
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: state.nodes,
                    edges: state.edges,
                }),
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: newNodes,
                    edges: newEdges ?? state.edges,
                })
            )
            : state.historyByGraph;

        set({
            nodes: newNodes,
            edges: newEdges ?? state.edges,
            graphs: state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, nodes: newNodes, edges: newEdges ?? state.edges, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        audioEngine.refreshConnections(newNodes, newEdges ?? state.edges);
        return id;
    },

    updateNodeData: (nodeId, data, options) => {
        const state = get();
        const currentNode = state.nodes.find((node) => node.id === nodeId);
        if (!currentNode) return;

        const refreshConnections = requiresConnectionRefresh(currentNode, data);
        const nextNodes = state.nodes.map((node) =>
            node.id === nodeId
                ? applyNodeDataPatch(node, data)
                : node
        );
        const nextEdges = refreshConnections
            ? migrateGraphEdges(nextNodes, state.edges)
            : state.edges;
        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const skipHistory = shouldSkipNodeHistory(currentNode, data, options);
        let historyByGraph = state.historyByGraph;

        if (state.activeGraphId && activeGraph) {
            if (skipHistory) {
                historyByGraph = syncNodePatchIntoHistory(historyByGraph, state.activeGraphId, nodeId, data);
            } else {
                historyByGraph = updatePendingHistoryGroup(
                    historyByGraph,
                    state.activeGraphId,
                    createNodeUpdateMergeKey(nodeId, data, options),
                    createHistorySnapshot({
                        name: activeGraph.name,
                        nodes: state.nodes,
                        edges: state.edges,
                    }),
                    createHistorySnapshot({
                        name: activeGraph.name,
                        nodes: nextNodes,
                        edges: nextEdges,
                    })
                );
            }
        }

        set({
            nodes: nextNodes,
            edges: nextEdges,
            graphs: state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, nodes: nextNodes, edges: nextEdges, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        if (state.activeGraphId && !skipHistory) {
            scheduleHistoryGroupFinalization(state.activeGraphId, createNodeUpdateMergeKey(nodeId, data, options));
        }

        audioEngine.updateNode(nodeId, data);
        if (refreshConnections) {
            audioEngine.refreshConnections(nextNodes, nextEdges);
        } else {
            audioEngine.refreshDataValues(nextNodes, nextEdges);
        }
    },

    removeNode: (nodeId) => {
        const state = get();
        const newNodes = state.nodes.filter((node) => node.id !== nodeId);
        const newEdges = state.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
        const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
        const historyByGraph = state.activeGraphId && activeGraph
            ? appendHistoryEntry(
                state.historyByGraph,
                state.activeGraphId,
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: state.nodes,
                    edges: state.edges,
                }),
                createHistorySnapshot({
                    name: activeGraph.name,
                    nodes: newNodes,
                    edges: newEdges,
                })
            )
            : state.historyByGraph;

        set({
            nodes: newNodes,
            edges: newEdges,
            graphs: state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, nodes: newNodes, edges: newEdges, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        audioEngine.refreshConnections(newNodes, newEdges);
    },

    loadGraph: (nodes, edges) => {
        const state = get();
        const normalizedNodes = migrateGraphNodes(nodes);
        const normalizedEdges = migrateGraphEdges(normalizedNodes, edges);
        const historyByGraph = state.activeGraphId
            ? clearHistoryForGraphState(state.historyByGraph, state.activeGraphId)
            : state.historyByGraph;

        syncNodeIdCounter(normalizedNodes);
        audioEngine.stop();

        set({
            nodes: normalizedNodes,
            edges: normalizedEdges,
            selectedNodeId: null,
            graphs: state.activeGraphId
                ? state.graphs.map((graph) =>
                    graph.id === state.activeGraphId
                        ? { ...graph, nodes: normalizedNodes, edges: normalizedEdges, updatedAt: Date.now() }
                        : graph
                )
                : state.graphs,
            historyByGraph,
            ...getHistoryAvailability(historyByGraph, state.activeGraphId),
        });

        audioEngine.refreshConnections(normalizedNodes, normalizedEdges);
    },

    clearAssetReferences: (assetId: string) => {
        set((state) => {
            const clearNode = (node: Node<AudioNodeData>): Node<AudioNodeData> => {
                if (node.data.type === 'sampler' && node.data.sampleId === assetId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            sampleId: '',
                            src: '',
                            fileName: '',
                            loaded: false,
                        }
                    };
                }
                if (node.data.type === 'convolver' && node.data.impulseId === assetId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            impulseId: '',
                            impulseSrc: '',
                            impulseFileName: '',
                        }
                    };
                }
                return node;
            };

            const nodes = state.nodes.map(clearNode);
            const graphs = state.graphs.map((graph) => ({
                ...graph,
                nodes: graph.nodes.map(clearNode),
                updatedAt: graph.id === state.activeGraphId || graph.nodes.some(n => 
                    (n.data.type === 'sampler' && n.data.sampleId === assetId) ||
                    (n.data.type === 'convolver' && n.data.impulseId === assetId)
                ) ? Date.now() : graph.updatedAt,
            }));

            // Sync audio engine for current nodes
            audioEngine.refreshDataValues(nodes, state.edges);

            return { nodes, graphs };
        });
    },

    initAudioContext: () => {
        if (!get().audioContext) {
            const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            set({ audioContext: ctx });
        }
    },
}));

function scheduleHistoryGroupFinalization(graphId: string, mergeKey: string) {
    clearHistoryGroupTimer(graphId);
    historyGroupTimers.set(
        graphId,
        setTimeout(() => {
            useAudioGraphStore.getState().finalizeHistoryGroup(graphId, mergeKey);
        }, HISTORY_GROUP_DELAY_MS)
    );
}
