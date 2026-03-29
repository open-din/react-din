import type { Connection, Edge, Node } from '@xyflow/react';
import { patchToGraphDocument } from '../../src/patch';
import {
    canConnect,
    getSingletonNodeTypes,
    isAudioConnection,
    migrateGraphEdges,
    migrateGraphNodes,
    normalizeInputNodeData,
    normalizeMidiNoteNodeData,
    normalizeTransportNodeData,
} from '../ui/editor/nodeHelpers';
import { normalizeUiTokensNodeData } from '../ui/editor/uiTokens';
import { createDefaultOutputData, createEditorNode } from '../ui/editor/graphBuilders';
import {
    type AudioNodeData,
    type ConvolverNodeData,
    type GraphDocument,
    type InputNodeData,
    type MidiNoteNodeData,
    type SamplerNodeData,
    type TransportNodeData,
    type UiTokensNodeData,
} from '../ui/editor/store';
import { normalizeGraphName } from '../ui/editor/graphUtils';
import type {
    EditorOperation,
    EditorOperationIssue,
    EditorOperationOutcome,
    EditorOperationResult,
    EditorOperationSummary,
    EditorSessionState,
} from './types';
import { buildEditorAudioStatus } from './session';

function deepClone<T>(value: T): T {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

function createGraphId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `graph_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createNodeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `agent_${crypto.randomUUID()}`;
    }
    return `agent_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function edgeKey(edge: Pick<Edge, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>): string {
    return [
        edge.source,
        edge.sourceHandle ?? 'default',
        edge.target,
        edge.targetHandle ?? 'default',
    ].join('::');
}

function createEdgeId(connection: Connection): string {
    return `edge_${edgeKey({
        source: connection.source!,
        sourceHandle: connection.sourceHandle ?? null,
        target: connection.target!,
        targetHandle: connection.targetHandle ?? null,
    })}`;
}

function normalizeNodeData(nodeId: string, data: AudioNodeData): AudioNodeData {
    if (data.type === 'input') {
        return normalizeInputNodeData(nodeId, data as InputNodeData);
    }
    if (data.type === 'uiTokens') {
        return normalizeUiTokensNodeData(data as UiTokensNodeData);
    }
    if (data.type === 'transport') {
        return normalizeTransportNodeData(data as TransportNodeData);
    }
    if (data.type === 'midiNote') {
        return normalizeMidiNoteNodeData(data as MidiNoteNodeData);
    }
    return data;
}

function normalizeGraph(graph: GraphDocument, index: number): GraphDocument {
    const nodes = migrateGraphNodes(graph.nodes).map((node) => ({
        ...node,
        data: normalizeNodeData(node.id, node.data),
    }));
    const edges = migrateGraphEdges(nodes, graph.edges);

    return {
        ...graph,
        name: normalizeGraphName(graph.name),
        nodes,
        edges,
        createdAt: graph.createdAt ?? Date.now(),
        updatedAt: graph.updatedAt ?? Date.now(),
        order: graph.order ?? index,
    };
}

function sortGraphs(graphs: GraphDocument[]): GraphDocument[] {
    return [...graphs].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}

function stopGraphPlayback(graph: GraphDocument): GraphDocument {
    const nodes = graph.nodes.map((node) => {
        if (node.data.type !== 'output' && node.data.type !== 'transport') return node;
        return {
            ...node,
            data: {
                ...node.data,
                playing: false,
            } as AudioNodeData,
        };
    });

    return updateGraphNodesAndEdges(graph, nodes, graph.edges);
}

function stopOtherGraphsPlayback(
    state: EditorSessionState,
    keepGraphId?: string | null,
): EditorSessionState {
    return {
        ...state,
        graphs: state.graphs.map((graph) => {
            if (keepGraphId && graph.id === keepGraphId) return graph;
            return stopGraphPlayback(graph);
        }),
    };
}

function refreshState(state: EditorSessionState): EditorSessionState {
    const graphs = sortGraphs(state.graphs.map((graph, index) => normalizeGraph(graph, index)));
    const activeGraphId = state.activeGraphId && graphs.some((graph) => graph.id === state.activeGraphId)
        ? state.activeGraphId
        : (graphs[0]?.id ?? null);

    return {
        ...state,
        graphs,
        activeGraphId,
        audio: buildEditorAudioStatus(graphs, activeGraphId),
        selectedNodeId: state.selectedNodeId && activeGraphId
            ? (graphs.find((graph) => graph.id === activeGraphId)?.nodes.some((node) => node.id === state.selectedNodeId)
                ? state.selectedNodeId
                : null)
            : null,
    };
}

function getGraphIndex(state: EditorSessionState, graphId?: string): number {
    const resolvedGraphId = graphId ?? state.activeGraphId;
    if (!resolvedGraphId) return -1;
    return state.graphs.findIndex((graph) => graph.id === resolvedGraphId);
}

function getGraphOrIssue(
    state: EditorSessionState,
    issues: EditorOperationIssue[],
    index: number,
    graphId?: string,
): GraphDocument | null {
    const graphIndex = getGraphIndex(state, graphId);
    if (graphIndex >= 0) {
        return state.graphs[graphIndex] ?? null;
    }

    issues.push({
        index,
        code: 'GRAPH_NOT_FOUND',
        message: graphId
            ? `Graph "${graphId}" was not found.`
            : 'No active graph is available.',
    });
    return null;
}

function replaceGraph(
    state: EditorSessionState,
    graph: GraphDocument,
): EditorSessionState {
    const graphIndex = state.graphs.findIndex((entry) => entry.id === graph.id);
    const graphs = graphIndex >= 0
        ? state.graphs.map((entry, index) => (index === graphIndex ? graph : entry))
        : [...state.graphs, graph];

    return {
        ...state,
        graphs,
        activeGraphId: state.activeGraphId ?? graph.id,
    };
}

function updateGraphNodesAndEdges(
    graph: GraphDocument,
    nodes: Node<AudioNodeData>[],
    edges: Edge[],
    name = graph.name,
): GraphDocument {
    const normalizedNodes = migrateGraphNodes(nodes).map((node) => ({
        ...node,
        data: normalizeNodeData(node.id, node.data),
    }));
    const normalizedEdges = migrateGraphEdges(normalizedNodes, edges);

    return {
        ...graph,
        name: normalizeGraphName(name),
        nodes: normalizedNodes,
        edges: normalizedEdges,
        updatedAt: Date.now(),
    };
}

function makeSummary(state: EditorSessionState): EditorOperationSummary {
    return {
        graphIds: state.graphs.map((graph) => graph.id),
        activeGraphId: state.activeGraphId,
        graphsCreated: 0,
        graphsDeleted: 0,
        graphsRenamed: 0,
        nodesCreated: 0,
        nodesUpdated: 0,
        nodesDeleted: 0,
        edgesCreated: 0,
        edgesDeleted: 0,
        patchesImported: 0,
        assetsBound: 0,
        playbackChanges: 0,
    };
}

function createStyledEdge(
    nodes: Node<AudioNodeData>[],
    edges: Edge[],
    connection: Connection,
): Edge | null {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    if (!canConnect(connection, nodeById)) return null;

    const audioConnection = isAudioConnection(connection, nodeById);
    const id = connection.id ?? createEdgeId(connection);

    const existing = edges.find((edge) => edge.id === id || edgeKey(edge) === edgeKey({
        source: connection.source!,
        sourceHandle: connection.sourceHandle ?? null,
        target: connection.target!,
        targetHandle: connection.targetHandle ?? null,
    }));
    if (existing) return existing;

    return {
        id,
        source: connection.source!,
        sourceHandle: connection.sourceHandle ?? null,
        target: connection.target!,
        targetHandle: connection.targetHandle ?? null,
        style: audioConnection
            ? { stroke: '#44cc44', strokeWidth: 3 }
            : { stroke: '#4488ff', strokeWidth: 2, strokeDasharray: '5,5' },
        animated: !audioConnection,
    };
}

function edgeMatches(edge: Edge, operation: Extract<EditorOperation, { type: 'disconnect' }>): boolean {
    if (operation.edgeId) return edge.id === operation.edgeId;
    return edge.source === operation.source
        && (operation.sourceHandle === undefined || edge.sourceHandle === (operation.sourceHandle ?? null))
        && edge.target === operation.target
        && (operation.targetHandle === undefined || edge.targetHandle === (operation.targetHandle ?? null));
}

function setGraphPlaying(graph: GraphDocument, playing: boolean): GraphDocument {
    const nodes = graph.nodes.map((node) => {
        if (node.data.type !== 'output' && node.data.type !== 'transport') return node;
        return {
            ...node,
            data: {
                ...node.data,
                playing,
            } as AudioNodeData,
        };
    });

    return updateGraphNodesAndEdges(graph, nodes, graph.edges);
}

function bindAssetToNodeData(
    data: AudioNodeData,
    operation: Extract<EditorOperation, { type: 'bind_asset_to_node' }>,
): AudioNodeData | null {
    if (operation.role === 'sampler' && data.type === 'sampler') {
        const sampler = data as SamplerNodeData;
        return {
            ...sampler,
            assetPath: operation.assetPath ?? sampler.assetPath ?? '',
            sampleId: operation.assetId ?? sampler.sampleId ?? '',
            fileName: operation.assetName ?? sampler.fileName ?? '',
            src: operation.objectUrl ?? sampler.src,
            loaded: Boolean(operation.objectUrl ?? operation.assetId ?? operation.assetPath ?? sampler.src),
        };
    }

    if (operation.role === 'convolver' && data.type === 'convolver') {
        const convolver = data as ConvolverNodeData;
        return {
            ...convolver,
            assetPath: operation.assetPath ?? convolver.assetPath ?? '',
            impulseId: operation.assetId ?? convolver.impulseId ?? '',
            impulseFileName: operation.assetName ?? convolver.impulseFileName ?? '',
            impulseSrc: operation.objectUrl ?? convolver.impulseSrc,
        };
    }

    return null;
}

function createDefaultGraph(graphId: string, name: string, order: number): GraphDocument {
    const osc = createEditorNode('osc_1', 'osc', { x: 50, y: 150 });
    const gain = createEditorNode('gain_1', 'gain', { x: 300, y: 150 });
    const output = {
        id: 'output_1',
        type: 'outputNode',
        position: { x: 520, y: 150 },
        dragHandle: '.node-header',
        data: createDefaultOutputData(),
    } satisfies Node<AudioNodeData>;

    if (!osc || !gain) {
        throw new Error('Unable to create the default DIN Editor graph.');
    }

    const now = Date.now();
    const nodes = [osc, gain, output];
    const edgeA = createStyledEdge(nodes, [], {
        source: osc.id,
        sourceHandle: 'out',
        target: gain.id,
        targetHandle: 'in',
    });
    const edgeB = createStyledEdge(nodes, edgeA ? [edgeA] : [], {
        source: gain.id,
        sourceHandle: 'out',
        target: output.id,
        targetHandle: 'in',
    });

    return normalizeGraph({
        id: graphId,
        name,
        nodes,
        edges: [edgeA, edgeB].filter(Boolean) as Edge[],
        createdAt: now,
        updatedAt: now,
        order,
    }, order);
}

function resolveGraphOperationTarget(operation: EditorOperation): string | undefined {
    if ('graphId' in operation) return operation.graphId;
    return undefined;
}

export function applyEditorOperations(
    inputState: EditorSessionState,
    operations: EditorOperation[],
    mode: 'preview' | 'apply',
): EditorOperationResult {
    const state = refreshState(deepClone(inputState));
    const issues: EditorOperationIssue[] = [];
    const outcomes: EditorOperationOutcome[] = [];
    const summary = makeSummary(state);
    const singletonTypes = getSingletonNodeTypes();

    let workingState = state;

    operations.forEach((operation, index) => {
        if (operation.type === 'create_graph') {
            const order = workingState.graphs.reduce((max, graph) => Math.max(max, graph.order ?? 0), -1) + 1;
            const graphId = operation.graphId?.trim() || createGraphId();
            const graph = createDefaultGraph(
                graphId,
                normalizeGraphName(operation.name ?? `Graph ${order + 1}`),
                order,
            );

            workingState = refreshState({
                ...(operation.activate === false
                    ? workingState
                    : stopOtherGraphsPlayback(workingState, null)),
                graphs: [...workingState.graphs, graph],
                activeGraphId: operation.activate === false
                    ? workingState.activeGraphId
                    : graph.id,
                selectedNodeId: null,
            });

            summary.graphsCreated += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                message: `Created graph "${graph.name}".`,
            });
            return;
        }

        if (operation.type === 'set_active_graph') {
            const targetGraph = getGraphOrIssue(workingState, issues, index, operation.graphId);
            if (!targetGraph) {
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: operation.graphId,
                    message: `Unable to activate graph "${operation.graphId}".`,
                });
                return;
            }

            workingState = refreshState({
                ...stopOtherGraphsPlayback(workingState, null),
                activeGraphId: targetGraph.id,
                selectedNodeId: null,
            });
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: targetGraph.id,
                message: `Active graph set to "${targetGraph.name}".`,
            });
            return;
        }

        const graphId = resolveGraphOperationTarget(operation);
        const graph = getGraphOrIssue(workingState, issues, index, graphId);
        if (!graph) {
            outcomes.push({
                index,
                type: operation.type,
                ok: false,
                graphId,
                message: 'Target graph is not available.',
            });
            return;
        }

        if (operation.type === 'rename_graph') {
            const renamedGraph = {
                ...graph,
                name: normalizeGraphName(operation.name),
                updatedAt: Date.now(),
            };
            workingState = refreshState(replaceGraph(workingState, renamedGraph));
            summary.graphsRenamed += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: renamedGraph.id,
                message: `Renamed graph to "${renamedGraph.name}".`,
            });
            return;
        }

        if (operation.type === 'delete_graph') {
            const remainingGraphs = workingState.graphs.filter((entry) => entry.id !== graph.id);

            if (remainingGraphs.length === 0) {
                const fallbackGraph = createDefaultGraph(createGraphId(), 'Graph 1', 0);
                workingState = refreshState({
                    ...workingState,
                    graphs: [fallbackGraph],
                    activeGraphId: fallbackGraph.id,
                    selectedNodeId: null,
                });
            } else {
                const orderedGraphs = sortGraphs(remainingGraphs);
                const nextActiveGraphId = workingState.activeGraphId === graph.id
                    ? orderedGraphs[0]?.id ?? null
                    : workingState.activeGraphId;
                workingState = refreshState({
                    ...stopOtherGraphsPlayback({
                        ...workingState,
                        graphs: remainingGraphs,
                    }, null),
                    graphs: remainingGraphs,
                    activeGraphId: nextActiveGraphId,
                    selectedNodeId: workingState.activeGraphId === graph.id ? null : workingState.selectedNodeId,
                });
            }

            summary.graphsDeleted += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                message: `Deleted graph "${graph.name}".`,
            });
            return;
        }

        if (operation.type === 'add_node') {
            if (singletonTypes.has(operation.nodeType) && graph.nodes.some((node) => node.data.type === operation.nodeType)) {
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: true,
                    graphId: graph.id,
                    message: `Skipped singleton node "${operation.nodeType}" because it already exists.`,
                });
                return;
            }

            const nodeId = operation.nodeId?.trim() || createNodeId();
            if (graph.nodes.some((node) => node.id === nodeId)) {
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: true,
                    graphId: graph.id,
                    nodeId,
                    message: `Node "${nodeId}" already exists.`,
                });
                return;
            }

            const node = createEditorNode(nodeId, operation.nodeType, operation.position ?? { x: 300, y: 200 });
            if (!node) {
                issues.push({
                    index,
                    code: 'INVALID_OPERATION',
                    message: `Node type "${operation.nodeType}" cannot be created.`,
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    nodeId,
                    message: `Failed to create node type "${operation.nodeType}".`,
                });
                return;
            }

            const nextGraph = updateGraphNodesAndEdges(graph, [...graph.nodes, node], graph.edges);
            workingState = refreshState(replaceGraph(workingState, nextGraph));
            summary.nodesCreated += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                nodeId,
                message: `Added node "${nodeId}" (${operation.nodeType}).`,
            });
            return;
        }

        if (operation.type === 'update_node_data') {
            const targetNode = graph.nodes.find((node) => node.id === operation.nodeId);
            if (!targetNode) {
                issues.push({
                    index,
                    code: 'NODE_NOT_FOUND',
                    message: `Node "${operation.nodeId}" was not found in graph "${graph.id}".`,
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    nodeId: operation.nodeId,
                    message: `Unable to update node "${operation.nodeId}".`,
                });
                return;
            }

            if (typeof operation.data.type === 'string' && operation.data.type !== targetNode.data.type) {
                issues.push({
                    index,
                    code: 'INVALID_OPERATION',
                    message: `Node "${operation.nodeId}" cannot change type from "${targetNode.data.type}" to "${operation.data.type}".`,
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    nodeId: operation.nodeId,
                    message: `Unable to change the node type for "${operation.nodeId}".`,
                });
                return;
            }

            const nextNodes = graph.nodes.map((node) => (
                node.id === operation.nodeId
                    ? {
                        ...node,
                        data: normalizeNodeData(node.id, { ...node.data, ...operation.data } as AudioNodeData),
                    }
                    : node
            ));
            const nextGraph = updateGraphNodesAndEdges(graph, nextNodes, graph.edges);
            workingState = refreshState(replaceGraph(workingState, nextGraph));
            summary.nodesUpdated += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                nodeId: operation.nodeId,
                message: `Updated node "${operation.nodeId}".`,
            });
            return;
        }

        if (operation.type === 'remove_node') {
            if (!graph.nodes.some((node) => node.id === operation.nodeId)) {
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: true,
                    graphId: graph.id,
                    nodeId: operation.nodeId,
                    message: `Node "${operation.nodeId}" is already absent.`,
                });
                return;
            }

            const nextNodes = graph.nodes.filter((node) => node.id !== operation.nodeId);
            const nextEdges = graph.edges.filter((edge) => edge.source !== operation.nodeId && edge.target !== operation.nodeId);
            const nextGraph = updateGraphNodesAndEdges(graph, nextNodes, nextEdges);
            workingState = refreshState({
                ...replaceGraph(workingState, nextGraph),
                selectedNodeId: workingState.selectedNodeId === operation.nodeId ? null : workingState.selectedNodeId,
            });
            summary.nodesDeleted += 1;
            summary.edgesDeleted += graph.edges.length - nextEdges.length;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                nodeId: operation.nodeId,
                message: `Removed node "${operation.nodeId}".`,
            });
            return;
        }

        if (operation.type === 'connect') {
            const edge = createStyledEdge(graph.nodes, graph.edges, {
                id: operation.edgeId,
                source: operation.source,
                sourceHandle: operation.sourceHandle ?? null,
                target: operation.target,
                targetHandle: operation.targetHandle ?? null,
            });

            if (!edge) {
                issues.push({
                    index,
                    code: 'INVALID_CONNECTION',
                    message: `Connection ${operation.source} -> ${operation.target} is invalid.`,
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    edgeId: operation.edgeId,
                    message: `Failed to connect "${operation.source}" to "${operation.target}".`,
                });
                return;
            }

            if (graph.edges.some((existing) => edgeKey(existing) === edgeKey(edge))) {
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: true,
                    graphId: graph.id,
                    edgeId: edge.id,
                    message: 'Connection already exists.',
                });
                return;
            }

            const nextGraph = updateGraphNodesAndEdges(graph, graph.nodes, [...graph.edges, edge]);
            workingState = refreshState(replaceGraph(workingState, nextGraph));
            summary.edgesCreated += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                edgeId: edge.id,
                message: `Connected "${operation.source}" to "${operation.target}".`,
            });
            return;
        }

        if (operation.type === 'disconnect') {
            if (!operation.edgeId && (!operation.source || !operation.target)) {
                issues.push({
                    index,
                    code: 'INVALID_OPERATION',
                    message: 'A disconnect operation requires either edgeId or both source and target.',
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    message: 'Disconnect operation is missing its target edge.',
                });
                return;
            }

            const nextEdges = graph.edges.filter((edge) => !edgeMatches(edge, operation));
            if (nextEdges.length === graph.edges.length) {
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: true,
                    graphId: graph.id,
                    edgeId: operation.edgeId,
                    message: 'Connection already absent.',
                });
                return;
            }

            const nextGraph = updateGraphNodesAndEdges(graph, graph.nodes, nextEdges);
            workingState = refreshState(replaceGraph(workingState, nextGraph));
            summary.edgesDeleted += graph.edges.length - nextEdges.length;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                edgeId: operation.edgeId,
                message: 'Disconnected matching edge(s).',
            });
            return;
        }

        if (operation.type === 'load_graph') {
            const loadedGraph = stopGraphPlayback(updateGraphNodesAndEdges(
                graph,
                operation.nodes,
                operation.edges,
                operation.name ?? graph.name,
            ));
            workingState = refreshState({
                ...replaceGraph(workingState, loadedGraph),
                selectedNodeId: null,
            });
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                message: `Loaded ${loadedGraph.nodes.length} nodes into graph "${loadedGraph.name}".`,
            });
            return;
        }

        if (operation.type === 'set_playing') {
            const targetGraph = setGraphPlaying(graph, operation.playing);
            const nextGraphs = workingState.graphs.map((entry) => {
                if (entry.id === targetGraph.id) return targetGraph;
                if (!operation.playing) return entry;
                return stopGraphPlayback(entry);
            });

            workingState = refreshState({
                ...workingState,
                graphs: nextGraphs,
                activeGraphId: operation.playing ? targetGraph.id : workingState.activeGraphId,
                selectedNodeId: operation.playing ? null : workingState.selectedNodeId,
            });
            summary.playbackChanges += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                message: operation.playing ? 'Playback enabled.' : 'Playback disabled.',
            });
            return;
        }

        if (operation.type === 'import_patch_into_active_graph') {
            let importedGraph: GraphDocument;
            try {
                importedGraph = patchToGraphDocument(operation.patch, {
                    graphId: graph.id,
                    createdAt: graph.createdAt,
                    updatedAt: Date.now(),
                    order: graph.order,
                }) as GraphDocument;
            } catch (error) {
                issues.push({
                    index,
                    code: 'INVALID_PATCH',
                    message: error instanceof Error ? error.message : 'Failed to import patch.',
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    message: 'Patch import failed.',
                });
                return;
            }

            const nextGraph = stopGraphPlayback(updateGraphNodesAndEdges(
                {
                    ...graph,
                    name: importedGraph.name,
                    order: graph.order,
                },
                importedGraph.nodes,
                importedGraph.edges,
                importedGraph.name,
            ));
            workingState = refreshState({
                ...replaceGraph(workingState, nextGraph),
                selectedNodeId: null,
            });
            summary.patchesImported += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                message: `Imported patch "${nextGraph.name}".`,
            });
            return;
        }

        if (operation.type === 'bind_asset_to_node') {
            const targetNode = graph.nodes.find((node) => node.id === operation.nodeId);
            if (!targetNode) {
                issues.push({
                    index,
                    code: 'NODE_NOT_FOUND',
                    message: `Node "${operation.nodeId}" was not found in graph "${graph.id}".`,
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    nodeId: operation.nodeId,
                    message: `Unable to bind asset to node "${operation.nodeId}".`,
                });
                return;
            }

            const nextData = bindAssetToNodeData(targetNode.data, operation);
            if (!nextData) {
                issues.push({
                    index,
                    code: 'INVALID_ASSET_BINDING',
                    message: `Node "${operation.nodeId}" cannot receive role "${operation.role}".`,
                });
                outcomes.push({
                    index,
                    type: operation.type,
                    ok: false,
                    graphId: graph.id,
                    nodeId: operation.nodeId,
                    message: `Invalid asset binding for node "${operation.nodeId}".`,
                });
                return;
            }

            const nextNodes = graph.nodes.map((node) => (
                node.id === operation.nodeId
                    ? { ...node, data: normalizeNodeData(node.id, nextData) }
                    : node
            ));
            const nextGraph = updateGraphNodesAndEdges(graph, nextNodes, graph.edges);
            workingState = refreshState(replaceGraph(workingState, nextGraph));
            summary.assetsBound += 1;
            outcomes.push({
                index,
                type: operation.type,
                ok: true,
                graphId: graph.id,
                nodeId: operation.nodeId,
                message: `Bound ${operation.role} asset to "${operation.nodeId}".`,
            });
        }
    });

    const finalState = refreshState(workingState);
    summary.graphIds = finalState.graphs.map((graph) => graph.id);
    summary.activeGraphId = finalState.activeGraphId;

    return {
        mode,
        ok: issues.length === 0,
        state: finalState,
        outcomes,
        issues,
        summary,
    };
}
