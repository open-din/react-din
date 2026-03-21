import type { Edge, Node } from '@xyflow/react';
import type {
    AudioNodeData,
    InputNodeData,
    InputParam,
    TransportNodeData,
    UiTokensNodeData,
} from './store';
import {
    INPUT_PARAM_HANDLE_PREFIX,
    getInputParamHandleId,
    migrateLegacyInputHandle,
    resolveInputParamByHandle,
} from './handleIds';
import {
    PLAYGROUND_NODE_CATALOG,
    getNodeCatalogEntry,
    getNodeHandleDescriptors,
    type HandleDescriptor,
    type HandleDirection,
    type PlaygroundNodeType,
} from './nodeCatalog';
import { createPlaygroundNode } from './graphBuilders';
import {
    hasAnyUiTokenInputParam,
    isLegacyUiTokensInputLabel,
    normalizeUiTokensNodeData,
} from './uiTokens';

export {
    INPUT_PARAM_HANDLE_PREFIX,
    getInputParamHandleId,
    migrateLegacyInputHandle,
    resolveInputParamByHandle,
} from './handleIds';

export interface GraphConnectionLike {
    source?: string | null;
    sourceHandle?: string | null;
    target?: string | null;
    targetHandle?: string | null;
}

export interface ConnectionAssistStart {
    nodeId: string;
    handleId: string | null;
    handleType: HandleDirection;
}

export interface NormalizedConnectionDescriptor {
    source: string;
    sourceHandle?: string | null;
    target: string;
    targetHandle?: string | null;
}

export interface CompatibleHandleMatch {
    key: string;
    nodeId: string;
    nodeType: PlaygroundNodeType;
    nodeLabel: string;
    handleId: string;
    handleLabel: string;
    handleType: HandleDirection;
    connection: NormalizedConnectionDescriptor;
}

export interface NodeSuggestion extends CompatibleHandleMatch {
    type: PlaygroundNodeType;
    icon: string;
    color: string;
    title: string;
}

const AUDIO_NODE_TYPES = new Set<AudioNodeData['type']>([
    'osc',
    'gain',
    'filter',
    'delay',
    'reverb',
    'compressor',
    'distortion',
    'chorus',
    'noiseBurst',
    'waveShaper',
    'convolver',
    'analyzer',
    'panner3d',
    'panner',
    'mixer',
    'noise',
    'constantSource',
    'mediaStream',
    'sampler',
    'output',
]);

const DATA_NODE_TYPES = new Set<AudioNodeData['type']>([
    'math',
    'compare',
    'mix',
    'clamp',
    'switch',
]);

const TRANSPORT_TARGET_TYPES = new Set<AudioNodeData['type']>([
    'stepSequencer',
    'pianoRoll',
]);

const TRIGGER_SOURCE_TYPES = new Set<AudioNodeData['type']>([
    'stepSequencer',
    'pianoRoll',
    'eventTrigger',
]);

const MODULATION_TARGET_HANDLES = new Set([
    'frequency',
    'detune',
    'gain',
    'q',
    'delayTime',
    'feedback',
    'mix',
    'pan',
    'masterGain',
    'rate',
    'depth',
    'playbackRate',
    'portamento',
    'attack',
    'decay',
    'sustain',
    'release',
    'threshold',
    'knee',
    'ratio',
    'level',
    'tone',
    'drive',
    'duration',
    'offset',
    'positionX',
    'positionY',
    'positionZ',
    'refDistance',
    'maxDistance',
    'rolloffFactor',
    'token',
    'value',
    'min',
    'max',
    'a',
    'b',
    'c',
    't',
    'index',
]);

const SINGLETON_NODE_TYPES = new Set(
    PLAYGROUND_NODE_CATALOG
        .filter((node) => node.singleton)
        .map((node) => node.type)
);

export function isAudioNodeType(type: AudioNodeData['type']): boolean {
    return AUDIO_NODE_TYPES.has(type);
}

export function isDataNodeType(type: AudioNodeData['type']): boolean {
    return DATA_NODE_TYPES.has(type);
}

export function isInputLikeNodeType(type: AudioNodeData['type']): type is 'input' | 'uiTokens' {
    return type === 'input' || type === 'uiTokens';
}

export function createInputParamId(nodeId: string, index: number): string {
    return `${nodeId}-param-${index + 1}`;
}

export function ensureInputParam(param: Partial<InputParam>, nodeId: string, index: number): InputParam {
    const fallbackName = param.name?.trim() || param.label?.trim() || `Param ${index + 1}`;
    const defaultValue = Number.isFinite(param.defaultValue) ? Number(param.defaultValue) : Number(param.value ?? 0);
    const value = Number.isFinite(param.value) ? Number(param.value) : defaultValue;
    const min = Number.isFinite(param.min) ? Number(param.min) : 0;
    const max = Number.isFinite(param.max) ? Number(param.max) : 1;

    return {
        id: param.id?.trim() || createInputParamId(nodeId, index),
        name: fallbackName,
        type: 'float',
        defaultValue,
        value,
        min,
        max,
        label: param.label?.trim() || fallbackName,
    };
}

export function normalizeInputNodeData(nodeId: string, data: InputNodeData): InputNodeData {
    return {
        type: 'input',
        params: Array.isArray(data.params)
            ? data.params.map((param, index) => ensureInputParam(param, nodeId, index))
            : [],
        label: data.label?.trim() || 'Params',
    };
}

export function getInputParamHandleIdByIndex(params: InputParam[], index: number): string | null {
    const param = params[index];
    return param ? getInputParamHandleId(param) : null;
}

export function normalizeTransportNodeData(data: TransportNodeData): TransportNodeData {
    return {
        type: 'transport',
        bpm: Number.isFinite(data.bpm) ? data.bpm : 120,
        playing: Boolean(data.playing),
        beatsPerBar: Number.isFinite(data.beatsPerBar) ? data.beatsPerBar : 4,
        beatUnit: Number.isFinite(data.beatUnit) ? data.beatUnit : 4,
        stepsPerBeat: Number.isFinite(data.stepsPerBeat) ? data.stepsPerBeat : 4,
        barsPerPhrase: Number.isFinite(data.barsPerPhrase) ? data.barsPerPhrase : 4,
        swing: Number.isFinite(data.swing) ? data.swing : 0,
        label: data.label?.trim() || 'Transport',
    };
}

export function getSingletonNodeTypes(): ReadonlySet<AudioNodeData['type']> {
    return SINGLETON_NODE_TYPES;
}

export function isAudioConnection(
    connection: GraphConnectionLike,
    nodeById: Map<string, Node<AudioNodeData>>
): boolean {
    const sourceNode = connection.source ? nodeById.get(connection.source) : null;
    if (!sourceNode || !isAudioNodeType(sourceNode.data.type)) return false;
    return connection.sourceHandle === 'out'
        && !!connection.target
        && (connection.targetHandle === 'in' || connection.targetHandle?.startsWith('in') === true);
}

export function canConnect(
    connection: GraphConnectionLike,
    nodeById: Map<string, Node<AudioNodeData>>
): boolean {
    if (!connection.source || !connection.target || !connection.targetHandle) return false;
    const sourceNode = nodeById.get(connection.source);
    const targetNode = nodeById.get(connection.target);
    if (!sourceNode || !targetNode) return false;
    if (connection.source === connection.target) return false;

    if (isAudioConnection(connection, nodeById)) {
        return true;
    }

    const { type: sourceType } = sourceNode.data;
    const { type: targetType } = targetNode.data;
    const sourceHandle = connection.sourceHandle ?? '';
    const targetHandle = connection.targetHandle;

    if (sourceType === 'transport') {
        return sourceHandle === 'out'
            && targetHandle === 'transport'
            && TRANSPORT_TARGET_TYPES.has(targetType);
    }

    if (TRIGGER_SOURCE_TYPES.has(sourceType)) {
        return sourceHandle === 'trigger'
            && (
                (targetHandle === 'trigger' && (targetType === 'voice' || targetType === 'sampler'))
                || (targetHandle === 'gate' && targetType === 'adsr')
                || (targetHandle === 'trigger' && targetType === 'noiseBurst')
            );
    }

    if (sourceType === 'voice') {
        if (sourceHandle === 'note') {
            return targetHandle === 'frequency';
        }
        if (sourceHandle === 'gate') {
            return targetHandle === 'gate'
                || targetHandle === 'trigger'
                || targetHandle === 'gain';
        }
        if (sourceHandle === 'velocity') {
            return targetHandle !== 'transport'
                && targetHandle !== 'in'
                && !targetHandle.startsWith('in');
        }
        return false;
    }

    if (sourceType === 'note') {
        return sourceHandle === 'freq' && targetHandle === 'frequency';
    }

    if (isInputLikeNodeType(sourceType)) {
        return (sourceHandle.startsWith(INPUT_PARAM_HANDLE_PREFIX) || /^param_\d+$/.test(sourceHandle))
            && targetHandle !== 'transport'
            && targetHandle !== 'trigger'
            && targetHandle !== 'gate'
            && targetHandle !== 'in'
            && !targetHandle.startsWith('in');
    }

    if (sourceType === 'lfo') {
        return sourceHandle === 'out' && MODULATION_TARGET_HANDLES.has(targetHandle);
    }

    if (sourceType === 'adsr') {
        return sourceHandle === 'envelope' && MODULATION_TARGET_HANDLES.has(targetHandle);
    }

    if (sourceType === 'constantSource') {
        return sourceHandle === 'out' && MODULATION_TARGET_HANDLES.has(targetHandle);
    }

    if (isDataNodeType(sourceType)) {
        return sourceHandle === 'out'
            && targetHandle !== 'transport'
            && targetHandle !== 'trigger'
            && targetHandle !== 'gate'
            && targetHandle !== 'in'
            && !targetHandle.startsWith('in');
    }

    return false;
}

export function normalizeConnectionFromStart(
    start: ConnectionAssistStart,
    candidate: { nodeId: string; handleId: string | null; handleType: HandleDirection }
): NormalizedConnectionDescriptor | null {
    if (start.handleType === candidate.handleType) return null;

    if (start.handleType === 'source') {
        return {
            source: start.nodeId,
            sourceHandle: start.handleId,
            target: candidate.nodeId,
            targetHandle: candidate.handleId,
        };
    }

    return {
        source: candidate.nodeId,
        sourceHandle: candidate.handleId,
        target: start.nodeId,
        targetHandle: start.handleId,
    };
}

function createNodeLookup(nodes: Node<AudioNodeData>[]) {
    return new Map(nodes.map((node) => [node.id, node]));
}

function getNodeDisplayLabel(node: Node<AudioNodeData>): string {
    return String(node.data.label || getNodeCatalogEntry(node.data.type).label);
}

function mapHandleMatch(
    node: Node<AudioNodeData>,
    handle: HandleDescriptor,
    connection: NormalizedConnectionDescriptor
): CompatibleHandleMatch {
    return {
        key: `${node.id}:${handle.id}`,
        nodeId: node.id,
        nodeType: node.data.type,
        nodeLabel: getNodeDisplayLabel(node),
        handleId: handle.id,
        handleLabel: handle.label,
        handleType: handle.direction,
        connection,
    };
}

export function getCompatibleExistingHandleMatches(
    start: ConnectionAssistStart,
    nodes: Node<AudioNodeData>[]
): CompatibleHandleMatch[] {
    const nodeById = createNodeLookup(nodes);
    const expectedDirection: HandleDirection = start.handleType === 'source' ? 'target' : 'source';

    return nodes.flatMap((node) => {
        return getNodeHandleDescriptors(node.data)
            .filter((handle) => handle.direction === expectedDirection)
            .flatMap((handle) => {
                const connection = normalizeConnectionFromStart(start, {
                    nodeId: node.id,
                    handleId: handle.id,
                    handleType: handle.direction,
                });

                if (!connection || !canConnect(connection, nodeById)) {
                    return [];
                }

                return [mapHandleMatch(node, handle, connection)];
            });
    });
}

export function getCompatibleNodeSuggestions(
    start: ConnectionAssistStart,
    nodes: Node<AudioNodeData>[]
): NodeSuggestion[] {
    const existingTypes = new Set(nodes.map((node) => node.data.type));
    const baseLookup = createNodeLookup(nodes);
    const expectedDirection: HandleDirection = start.handleType === 'source' ? 'target' : 'source';

    return PLAYGROUND_NODE_CATALOG.flatMap((entry) => {
        if (entry.singleton && existingTypes.has(entry.type)) {
            return [];
        }

        const virtualNode = createPlaygroundNode(`__suggestion__${entry.type}`, entry.type, { x: 0, y: 0 });
        if (!virtualNode) return [];

        const lookup = new Map(baseLookup);
        lookup.set(virtualNode.id, virtualNode);

        return getNodeHandleDescriptors(virtualNode.data)
            .filter((handle) => handle.direction === expectedDirection)
            .flatMap((handle) => {
                const connection = normalizeConnectionFromStart(start, {
                    nodeId: virtualNode.id,
                    handleId: handle.id,
                    handleType: handle.direction,
                });

                if (!connection || !canConnect(connection, lookup)) {
                    return [];
                }

                return [{
                    ...mapHandleMatch(virtualNode, handle, connection),
                    type: entry.type,
                    icon: entry.icon,
                    color: entry.color,
                    title: `${entry.label} -> ${handle.label}`,
                }];
            });
    });
}

export function migrateGraphNodes(nodes: Node<AudioNodeData>[]): Node<AudioNodeData>[] {
    const singletonSeen = new Set<AudioNodeData['type']>();

    return nodes.flatMap((node) => {
        if (getSingletonNodeTypes().has(node.data.type)) {
            if (singletonSeen.has(node.data.type)) {
                return [];
            }
            singletonSeen.add(node.data.type);
        }

        if (node.data.type === 'input') {
            const normalizedInput = normalizeInputNodeData(node.id, node.data as InputNodeData);
            if (
                isLegacyUiTokensInputLabel(normalizedInput.label)
                && hasAnyUiTokenInputParam(normalizedInput.params)
            ) {
                return [{
                    ...node,
                    type: 'uiTokensNode',
                    data: normalizeUiTokensNodeData({
                        type: 'uiTokens',
                        params: normalizedInput.params,
                        label: normalizedInput.label,
                    }) as UiTokensNodeData,
                }];
            }

            return [{
                ...node,
                data: normalizedInput,
            }];
        }

        if (node.data.type === 'uiTokens') {
            return [{
                ...node,
                type: 'uiTokensNode',
                data: normalizeUiTokensNodeData(node.data as UiTokensNodeData),
            }];
        }

        if (node.data.type === 'transport') {
            return [{
                ...node,
                data: normalizeTransportNodeData(node.data as TransportNodeData),
            }];
        }

        return [node];
    });
}

export function migrateGraphEdges(
    nodes: Node<AudioNodeData>[],
    edges: Edge[]
): Edge[] {
    const nodeById = createNodeLookup(nodes);

    return edges.flatMap((edge) => {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);

        let nextEdge = edge;
        const sourceType = sourceNode?.data.type;
        const targetType = targetNode?.data.type;

        if (sourceType && targetType) {
            if (
                sourceType === 'transport'
                && TRANSPORT_TARGET_TYPES.has(targetType)
                && !nextEdge.sourceHandle
                && (!nextEdge.targetHandle || nextEdge.targetHandle === 'transport')
            ) {
                nextEdge = {
                    ...nextEdge,
                    sourceHandle: 'out',
                    targetHandle: nextEdge.targetHandle ?? 'transport',
                };
            }

            if (
                TRIGGER_SOURCE_TYPES.has(sourceType)
                && !nextEdge.sourceHandle
                && (
                    !nextEdge.targetHandle
                    || nextEdge.targetHandle === 'trigger'
                    || nextEdge.targetHandle === 'gate'
                )
                && (
                    targetType === 'voice'
                    || targetType === 'sampler'
                    || targetType === 'adsr'
                    || targetType === 'noiseBurst'
                )
            ) {
                nextEdge = {
                    ...nextEdge,
                    sourceHandle: 'trigger',
                    targetHandle: nextEdge.targetHandle ?? (targetType === 'adsr' ? 'gate' : 'trigger'),
                };
            }

            if (
                sourceType === 'voice'
                && nextEdge.sourceHandle === 'gate'
                && !nextEdge.targetHandle
                && (targetType === 'adsr' || targetType === 'sampler' || targetType === 'voice' || targetType === 'noiseBurst')
            ) {
                nextEdge = {
                    ...nextEdge,
                    targetHandle: targetType === 'adsr' ? 'gate' : 'trigger',
                };
            }

            if (
                isAudioNodeType(sourceType)
                && isAudioNodeType(targetType)
                && !nextEdge.sourceHandle
                && (!nextEdge.targetHandle || nextEdge.targetHandle === 'in')
                && targetType !== 'mixer'
            ) {
                nextEdge = {
                    ...nextEdge,
                    sourceHandle: 'out',
                    targetHandle: nextEdge.targetHandle ?? 'in',
                };
            }

            if (
                isAudioNodeType(sourceType)
                && isAudioNodeType(targetType)
                && nextEdge.sourceHandle === 'out'
                && !nextEdge.targetHandle
                && targetType !== 'mixer'
            ) {
                nextEdge = {
                    ...nextEdge,
                    targetHandle: 'in',
                };
            }
        }

        if (sourceNode && isInputLikeNodeType(sourceNode.data.type)) {
            const inputData = sourceNode.data as InputNodeData | UiTokensNodeData;
            const migratedHandle = migrateLegacyInputHandle(inputData.params, edge.sourceHandle);
            if (migratedHandle !== edge.sourceHandle) {
                nextEdge = { ...nextEdge, sourceHandle: migratedHandle ?? undefined };
            }
        }

        if (targetNode?.data.type === 'note' && nextEdge.targetHandle === 'trigger') {
            return [];
        }

        if (!canConnect(nextEdge, nodeById)) {
            return [];
        }

        return [nextEdge];
    });
}

export function getTransportConnections(
    edges: Edge[],
    nodeById: Map<string, Node<AudioNodeData>>
): Set<string> {
    const connected = new Set<string>();

    edges.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);
        if (
            sourceNode?.data.type === 'transport'
            && targetNode
            && TRANSPORT_TARGET_TYPES.has(targetNode.data.type)
            && edge.sourceHandle === 'out'
            && edge.targetHandle === 'transport'
        ) {
            connected.add(edge.target);
        }
    });

    return connected;
}
