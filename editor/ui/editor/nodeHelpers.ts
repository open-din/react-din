import type { Edge, Node } from '@xyflow/react';
import type {
    AudioNodeData,
    InputNodeData,
    InputParam,
    MidiInMapping,
    MidiNoteNodeData,
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
    EDITOR_NODE_CATALOG,
    getNodeCatalogEntry,
    getNodeHandleDescriptors,
    type HandleDescriptor,
    type HandleDirection,
    type EditorNodeType,
} from './nodeCatalog';
import { createEditorNode } from './graphBuilders';
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
    nodeType: EditorNodeType;
    nodeLabel: string;
    handleId: string;
    handleLabel: string;
    handleType: HandleDirection;
    connection: NormalizedConnectionDescriptor;
}

export interface NodeSuggestion extends CompatibleHandleMatch {
    type: EditorNodeType;
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
    'phaser',
    'flanger',
    'tremolo',
    'eq3',
    'distortion',
    'chorus',
    'noiseBurst',
    'waveShaper',
    'convolver',
    'analyzer',
    'panner3d',
    'panner',
    'mixer',
    'auxSend',
    'auxReturn',
    'matrixMixer',
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
    'midiNote',
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
    'sidechainStrength',
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
    'low',
    'mid',
    'high',
    'lowFrequency',
    'highFrequency',
    'baseFrequency',
    'stages',
    'sendGain',
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
    EDITOR_NODE_CATALOG
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
    const normalizePositive = (value: number | undefined, fallback: number) =>
        Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    return {
        type: 'transport',
        bpm: normalizePositive(data.bpm, 120),
        playing: Boolean(data.playing),
        beatsPerBar: normalizePositive(data.beatsPerBar, 4),
        beatUnit: normalizePositive(data.beatUnit, 4),
        stepsPerBeat: normalizePositive(data.stepsPerBeat, 4),
        barsPerPhrase: normalizePositive(data.barsPerPhrase, 4),
        swing: Number.isFinite(data.swing) ? clamp(Number(data.swing), 0, 1) : 0,
        label: data.label?.trim() || 'Transport',
    };
}

const isMidiInputSelection = (value: unknown): value is MidiNoteNodeData['inputId'] =>
    value === 'default' || value === 'all' || (typeof value === 'string' && value.length > 0);

const clampMidiNote = (value: unknown, fallback: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(127, Math.round(numeric)));
};

const normalizeMidiChannel = (value: unknown): MidiNoteNodeData['channel'] => {
    if (value === 'all') return 'all';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'all';
    const rounded = Math.round(numeric);
    return rounded >= 1 && rounded <= 16 ? rounded : 'all';
};

const normalizeMidiInMapping = (mapping: unknown): MidiInMapping | null => {
    if (!mapping || typeof mapping !== 'object') return null;

    const candidate = mapping as Partial<MidiInMapping>;
    if (typeof candidate.inputId !== 'string' || candidate.inputId.length === 0) return null;

    const channel = normalizeMidiChannel(candidate.channel);
    if (channel === 'all') return null;

    return {
        mappingId: typeof candidate.mappingId === 'string' && candidate.mappingId.length > 0
            ? candidate.mappingId
            : `${candidate.inputId}:${channel}`,
        inputId: candidate.inputId,
        inputName: typeof candidate.inputName === 'string' && candidate.inputName.trim().length > 0
            ? candidate.inputName.trim()
            : candidate.inputId,
        channel,
        lastNote: clampMidiNote(candidate.lastNote, 60),
        lastVelocity: Number.isFinite(candidate.lastVelocity) ? Math.max(0, Math.min(1, Number(candidate.lastVelocity))) : 0,
        lastSeenAt: Number.isFinite(candidate.lastSeenAt) ? Number(candidate.lastSeenAt) : 0,
    };
};

export function normalizeMidiNoteNodeData(data: MidiNoteNodeData): MidiNoteNodeData {
    const note = clampMidiNote(data.note, 60);
    const noteMin = clampMidiNote(data.noteMin, 48);
    const noteMax = clampMidiNote(data.noteMax, 72);
    const normalizedMin = Math.min(noteMin, noteMax);
    const normalizedMax = Math.max(noteMin, noteMax);
    const mappings = Array.isArray(data.mappings)
        ? data.mappings
            .map((mapping) => normalizeMidiInMapping(mapping))
            .filter((mapping): mapping is MidiInMapping => mapping !== null)
        : [];
    const activeMappingId = typeof data.activeMappingId === 'string'
        && mappings.some((mapping) => mapping.mappingId === data.activeMappingId)
        ? data.activeMappingId
        : null;

    return {
        type: 'midiNote',
        inputId: isMidiInputSelection(data.inputId) ? data.inputId : 'default',
        channel: normalizeMidiChannel(data.channel),
        noteMode: data.noteMode === 'single' || data.noteMode === 'range' ? data.noteMode : 'all',
        note,
        noteMin: normalizedMin,
        noteMax: normalizedMax,
        mappingEnabled: Boolean(data.mappingEnabled),
        mappings,
        activeMappingId,
        label: data.label?.trim() && data.label.trim() !== 'Keyboard In' ? data.label.trim() : 'Midi In',
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
    const sourceHandle = connection.sourceHandle ?? '';
    const isAudioOutHandle = sourceHandle === 'out' || /^out\d+$/.test(sourceHandle);
    return isAudioOutHandle
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

    if (
        isAudioNodeType(sourceType)
        && (sourceHandle === 'out' || /^out\d+$/.test(sourceHandle))
        && targetType === 'compressor'
        && targetHandle === 'sidechainIn'
    ) {
        return true;
    }

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
                || (targetHandle === 'trigger' && targetType === 'midiNoteOutput')
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
                && targetHandle !== 'sidechainIn'
                && !targetHandle.startsWith('in');
        }
        return false;
    }

    if (sourceType === 'midiNote') {
        if (sourceHandle === 'frequency') {
            return targetHandle === 'frequency';
        }
        if (sourceHandle === 'note') {
            return targetHandle === 'note' || targetHandle === 'frequency';
        }
        if (sourceHandle === 'gate') {
            return targetHandle === 'gate'
                || targetHandle === 'trigger'
                || targetHandle === 'gain';
        }
        if (sourceHandle === 'velocity') {
            return targetHandle !== 'transport'
                && targetHandle !== 'in'
                && targetHandle !== 'sidechainIn'
                && !targetHandle.startsWith('in');
        }
        return false;
    }

    if (sourceType === 'midiCC') {
        return (sourceHandle === 'normalized' || sourceHandle === 'raw')
            && targetHandle !== 'transport'
            && targetHandle !== 'trigger'
            && targetHandle !== 'in'
            && targetHandle !== 'sidechainIn'
            && !targetHandle.startsWith('in');
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
            && targetHandle !== 'sidechainIn'
            && !targetHandle.startsWith('in');
    }

    if (sourceType === 'lfo') {
        return sourceHandle === 'out'
            && (MODULATION_TARGET_HANDLES.has(targetHandle) || targetHandle.startsWith('cell:'));
    }

    if (sourceType === 'adsr') {
        return sourceHandle === 'envelope'
            && (MODULATION_TARGET_HANDLES.has(targetHandle) || targetHandle.startsWith('cell:'));
    }

    if (sourceType === 'constantSource') {
        return sourceHandle === 'out'
            && (MODULATION_TARGET_HANDLES.has(targetHandle) || targetHandle.startsWith('cell:'));
    }

    if (isDataNodeType(sourceType)) {
        return sourceHandle === 'out'
            && targetHandle !== 'transport'
            && targetHandle !== 'trigger'
            && targetHandle !== 'gate'
            && targetHandle !== 'in'
            && targetHandle !== 'sidechainIn'
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
    const startNodeType = baseLookup.get(start.nodeId)?.data.type;

    const getPriority = (suggestion: NodeSuggestion): number => {
        if (!start.handleId || !startNodeType) return 0;

        if (startNodeType === 'midiNote' && start.handleId === 'trigger') {
            if (suggestion.type === 'voice') return 100;
            if (suggestion.type === 'adsr') return 95;
            if (suggestion.type === 'sampler') return 90;
            if (suggestion.type === 'noiseBurst') return 85;
            if (suggestion.type === 'midiNoteOutput') return 80;
        }

        if (startNodeType === 'midiNote' && start.handleId === 'frequency') {
            if (suggestion.type === 'osc') return 100;
            if (suggestion.type === 'filter') return 70;
        }

        if (startNodeType === 'midiCC' && (start.handleId === 'normalized' || start.handleId === 'raw')) {
            if (suggestion.type === 'filter') return 100;
            if (suggestion.type === 'gain') return 95;
            if (suggestion.type === 'panner') return 90;
            if (suggestion.type === 'lfo') return 85;
            if (suggestion.type === 'midiCCOutput') return 80;
        }

        if (start.handleId === 'note' && suggestion.type === 'midiNoteOutput') {
            return 100;
        }
        if (start.handleId === 'gate' && suggestion.type === 'midiNoteOutput') {
            return 95;
        }
        if (start.handleId === 'trigger' && suggestion.type === 'midiNoteOutput') {
            return 90;
        }

        return 0;
    };

    return EDITOR_NODE_CATALOG.flatMap((entry) => {
        if (entry.singleton && existingTypes.has(entry.type)) {
            return [];
        }

        const virtualNode = createEditorNode(`__suggestion__${entry.type}`, entry.type, { x: 0, y: 0 });
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
    }).sort((left, right) => {
        const score = getPriority(right) - getPriority(left);
        if (score !== 0) return score;
        return left.title.localeCompare(right.title);
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

        if (node.data.type === 'midiNote') {
            return [{
                ...node,
                data: normalizeMidiNoteNodeData(node.data as MidiNoteNodeData),
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
                    || targetType === 'midiNoteOutput'
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
