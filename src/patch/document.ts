import type { MidiTransportSyncMode, MidiValueFormat } from '../midi/types';
import { ensureUniqueName, toSafeIdentifier } from './naming';
import type {
    PatchConnection,
    PatchDocument,
    PatchEvent,
    PatchInput,
    PatchInterface,
    PatchMidiCCInput,
    PatchMidiCCOutput,
    PatchMidiInput,
    PatchMidiNoteInput,
    PatchMidiNoteOutput,
    PatchMidiOutput,
    PatchMidiSyncOutput,
    PatchNode,
    PatchPosition,
} from './types';

export const PATCH_DOCUMENT_VERSION = 1 as const;
export const PATCH_INPUT_HANDLE_PREFIX = 'param:';

export interface GraphNodeLike {
    id: string;
    position?: PatchPosition;
    data: {
        type: string;
        label?: string;
        [key: string]: unknown;
    };
}

export interface GraphConnectionLike {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export interface GraphDocumentLike {
    id?: string;
    name?: string;
    nodes: readonly GraphNodeLike[];
    edges?: readonly GraphConnectionLike[];
    connections?: readonly GraphConnectionLike[];
    createdAt?: number;
    updatedAt?: number;
    order?: number;
}

export interface PatchToGraphOptions {
    graphId?: string;
    createdAt?: number;
    updatedAt?: number;
    order?: number;
}

const AUDIO_NODE_TYPES = new Set([
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

const DATA_NODE_TYPES = new Set([
    'math',
    'compare',
    'mix',
    'clamp',
    'switch',
]);

const PATCH_NODE_TYPES = new Set([
    ...AUDIO_NODE_TYPES,
    ...DATA_NODE_TYPES,
    'input',
    'uiTokens',
    'note',
    'transport',
    'stepSequencer',
    'pianoRoll',
    'eventTrigger',
    'lfo',
    'voice',
    'adsr',
    'midiNote',
    'midiCC',
    'midiNoteOutput',
    'midiCCOutput',
    'midiSync',
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

function createGraphId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `graph_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function asNumber(value: unknown, fallback: number): number {
    return Number.isFinite(value) ? Number(value) : fallback;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function deepClone<T>(value: T): T {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
}

function fileNameFromPath(path: string): string {
    const candidate = path.trim().split(/[\\/]/).pop() ?? '';
    return candidate || '';
}

function ensurePathPrefix(basePath: string, fallbackDir: string, fallbackName: string): string {
    const trimmed = basePath.trim();
    if (trimmed) return trimmed;
    return `${fallbackDir}/${fallbackName}`;
}

function resolveSamplerAssetPath(data: Record<string, unknown>): string {
    const assetPath = asString(data.assetPath);
    if (assetPath) return assetPath;

    const src = asString(data.src);
    if (src && !src.startsWith('blob:') && !src.startsWith('data:')) {
        return src;
    }

    const fileName = fileNameFromPath(asString(data.fileName));
    return ensurePathPrefix('', '/samples', fileName || 'sample.wav');
}

function resolveConvolverAssetPath(data: Record<string, unknown>): string {
    const assetPath = asString(data.assetPath);
    if (assetPath) return assetPath;

    const impulseSrc = asString(data.impulseSrc);
    if (impulseSrc && !impulseSrc.startsWith('blob:') && !impulseSrc.startsWith('data:')) {
        return impulseSrc;
    }

    const fileName = fileNameFromPath(asString(data.impulseFileName));
    return ensurePathPrefix('', '/impulses', fileName || 'impulse.wav');
}

function sanitizeNodeData(data: Record<string, unknown>): Record<string, unknown> {
    const next = deepClone(data);

    if (next.type === 'sampler') {
        next.assetPath = resolveSamplerAssetPath(next);
        next.src = '';
        delete next.sampleId;
        delete next.loaded;
    }

    if (next.type === 'convolver') {
        next.assetPath = resolveConvolverAssetPath(next);
        next.impulseSrc = '';
        delete next.impulseId;
    }

    if (next.type === 'output' || next.type === 'transport') {
        next.playing = false;
    }

    return next;
}

function hydrateNodeDataForGraph(data: Record<string, unknown>): Record<string, unknown> {
    const next = deepClone(data);

    if (next.type === 'sampler') {
        const assetPath = resolveSamplerAssetPath(next);
        next.assetPath = assetPath;
        next.src = '';
        next.sampleId = '';
        next.fileName = asString(next.fileName) || fileNameFromPath(assetPath) || 'sample.wav';
        next.loaded = false;
    }

    if (next.type === 'convolver') {
        const assetPath = resolveConvolverAssetPath(next);
        next.assetPath = assetPath;
        next.impulseSrc = '';
        next.impulseId = '';
        next.impulseFileName = asString(next.impulseFileName) || fileNameFromPath(assetPath) || 'impulse.wav';
    }

    if (next.type === 'output' || next.type === 'transport') {
        next.playing = false;
    }

    return next;
}

function getInputParamHandleId(paramId: string): string {
    return `${PATCH_INPUT_HANDLE_PREFIX}${paramId}`;
}

function isInputLikeNodeType(type: string): boolean {
    return type === 'input' || type === 'uiTokens';
}

function isAudioNodeType(type: string): boolean {
    return AUDIO_NODE_TYPES.has(type);
}

function isDataNodeType(type: string): boolean {
    return DATA_NODE_TYPES.has(type);
}

function getSourceHandleIds(node: PatchNode): Set<string> {
    const handleIds = new Set<string>();
    const type = node.data.type;

    if (isAudioNodeType(type)) {
        handleIds.add('out');
        if (type === 'matrixMixer') {
            const outputs = Math.max(1, asNumber((node.data as Record<string, unknown>).outputs, 1));
            for (let index = 1; index <= outputs; index += 1) {
                handleIds.add(`out${index}`);
            }
        }
    }

    if (type === 'note') handleIds.add('freq');
    if (type === 'transport') handleIds.add('out');
    if (type === 'stepSequencer' || type === 'pianoRoll' || type === 'eventTrigger') handleIds.add('trigger');
    if (type === 'lfo') handleIds.add('out');
    if (type === 'voice') ['note', 'gate', 'velocity'].forEach((id) => handleIds.add(id));
    if (type === 'adsr') handleIds.add('envelope');
    if (type === 'midiNote') ['trigger', 'frequency', 'note', 'gate', 'velocity'].forEach((id) => handleIds.add(id));
    if (type === 'midiCC') ['normalized', 'raw'].forEach((id) => handleIds.add(id));
    if (isInputLikeNodeType(type)) {
        const params = Array.isArray((node.data as Record<string, unknown>).params)
            ? ((node.data as Record<string, unknown>).params as Array<Record<string, unknown>>)
            : [];
        params.forEach((param, index) => {
            const paramId = asString(param.id) || `${node.id}-param-${index + 1}`;
            handleIds.add(getInputParamHandleId(paramId));
            handleIds.add(`param_${index}`);
        });
    }
    if (isDataNodeType(type)) handleIds.add('out');

    return handleIds;
}

function getTargetHandleIds(node: PatchNode): Set<string> {
    const handleIds = new Set<string>();
    const type = node.data.type;

    if (isAudioNodeType(type)) {
        handleIds.add('in');
        if (type === 'matrixMixer') {
            const inputs = Math.max(1, asNumber((node.data as Record<string, unknown>).inputs, 1));
            for (let index = 1; index <= inputs; index += 1) {
                handleIds.add(`in${index}`);
            }
        }
    }

    if (type === 'compressor') handleIds.add('sidechainIn');
    if (type === 'eventTrigger') handleIds.add('token');
    if (type === 'stepSequencer' || type === 'pianoRoll') handleIds.add('transport');
    if (type === 'lfo') ['rate', 'depth'].forEach((id) => handleIds.add(id));
    if (type === 'voice') ['trigger', 'portamento'].forEach((id) => handleIds.add(id));
    if (type === 'adsr') ['gate', 'attack', 'decay', 'sustain', 'release'].forEach((id) => handleIds.add(id));
    if (type === 'noiseBurst') ['trigger', 'duration', 'gain', 'attack', 'release'].forEach((id) => handleIds.add(id));
    if (type === 'constantSource') handleIds.add('offset');
    if (type === 'sampler') ['trigger', 'playbackRate', 'detune'].forEach((id) => handleIds.add(id));
    if (type === 'midiNoteOutput') ['trigger', 'gate', 'note', 'frequency', 'velocity'].forEach((id) => handleIds.add(id));
    if (type === 'midiCCOutput') handleIds.add('value');

    MODULATION_TARGET_HANDLES.forEach((id) => handleIds.add(id));
    if (type === 'switch') {
        const inputs = Math.max(1, asNumber((node.data as Record<string, unknown>).inputs, 1));
        for (let index = 0; index < inputs; index += 1) {
            handleIds.add(`in_${index}`);
        }
    }

    return handleIds;
}

function validateNode(node: PatchNode): void {
    if (!node.id) {
        throw new Error('Patch nodes must include an id.');
    }
    if (!node.data || typeof node.data !== 'object' || typeof node.data.type !== 'string') {
        throw new Error(`Patch node "${node.id}" is missing a valid data.type.`);
    }
    if (!PATCH_NODE_TYPES.has(node.data.type)) {
        throw new Error(`Patch node "${node.id}" uses unsupported node type "${node.data.type}".`);
    }
    if (node.type !== node.data.type) {
        throw new Error(`Patch node "${node.id}" has mismatched type metadata.`);
    }
}

function validateConnection(connection: PatchConnection, nodeById: Map<string, PatchNode>): void {
    const sourceNode = nodeById.get(connection.source);
    const targetNode = nodeById.get(connection.target);

    if (!sourceNode) {
        throw new Error(`Patch connection "${connection.id}" references missing source node "${connection.source}".`);
    }
    if (!targetNode) {
        throw new Error(`Patch connection "${connection.id}" references missing target node "${connection.target}".`);
    }
    if (connection.source === connection.target) {
        throw new Error(`Patch connection "${connection.id}" cannot connect a node to itself.`);
    }

    if (connection.sourceHandle && !getSourceHandleIds(sourceNode).has(connection.sourceHandle)) {
        throw new Error(`Patch connection "${connection.id}" uses unsupported source handle "${connection.sourceHandle}".`);
    }
    if (connection.targetHandle && !getTargetHandleIds(targetNode).has(connection.targetHandle)) {
        throw new Error(`Patch connection "${connection.id}" uses unsupported target handle "${connection.targetHandle}".`);
    }
}

function normalizePatchNode(node: GraphNodeLike): PatchNode {
    const type = asString(node.data?.type);
    const position = node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y)
        ? { x: Number(node.position.x), y: Number(node.position.y) }
        : undefined;

    return {
        id: node.id,
        type,
        position,
        data: sanitizeNodeData({ ...node.data, type }) as PatchNode['data'],
    };
}

function normalizePatchConnection(connection: GraphConnectionLike, index: number): PatchConnection {
    return {
        id: connection.id || `${connection.source}:${connection.sourceHandle ?? 'out'}->${connection.target}:${connection.targetHandle ?? 'in'}:${index}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
    };
}

function buildPatchInterface(nodes: readonly PatchNode[]): PatchInterface {
    const topLevelKeys = new Set<string>();
    const midiInputKeys = new Set<string>();
    const midiOutputKeys = new Set<string>();
    const inputs: PatchInput[] = [];
    const events: PatchEvent[] = [];
    const midiInputs: PatchMidiInput[] = [];
    const midiOutputs: PatchMidiOutput[] = [];

    nodes.forEach((node) => {
        const data = node.data as Record<string, unknown>;
        const label = asString(data.label) || node.type;

        if (node.type === 'input') {
            const params = Array.isArray(data.params) ? (data.params as Array<Record<string, unknown>>) : [];
            params.forEach((param, index) => {
                const paramId = asString(param.id) || `${node.id}-param-${index + 1}`;
                const paramLabel = asString(param.label) || asString(param.name) || `Param ${index + 1}`;
                const fallback = `param${inputs.length + 1}`;
                const key = ensureUniqueName(toSafeIdentifier(paramLabel, fallback, topLevelKeys), topLevelKeys);
                topLevelKeys.add(key);
                inputs.push({
                    id: `${node.id}:${paramId}`,
                    key,
                    label: paramLabel,
                    kind: 'input',
                    nodeId: node.id,
                    paramId,
                    handle: getInputParamHandleId(paramId),
                    defaultValue: asNumber(param.defaultValue, asNumber(param.value, 0)),
                    min: asNumber(param.min, 0),
                    max: asNumber(param.max, 1),
                });
            });
            return;
        }

        if (node.type === 'eventTrigger') {
            const fallback = `event${events.length + 1}`;
            const key = ensureUniqueName(toSafeIdentifier(label, fallback, topLevelKeys), topLevelKeys);
            topLevelKeys.add(key);
            events.push({
                id: node.id,
                key,
                label,
                kind: 'event',
                nodeId: node.id,
            });
            return;
        }

        if (node.type === 'midiNote') {
            const fallback = `midiInput${midiInputs.length + 1}`;
            const key = ensureUniqueName(toSafeIdentifier(label, fallback, midiInputKeys), midiInputKeys);
            midiInputKeys.add(key);
            midiInputs.push({
                id: node.id,
                key,
                label,
                kind: 'midi-note-input',
                nodeId: node.id,
                inputId: (data.inputId as string | 'default' | 'all' | null | undefined) ?? 'default',
                channel: (data.channel as number | 'all' | undefined) ?? 'all',
                noteMode: (data.noteMode as 'all' | 'single' | 'range' | undefined) ?? 'all',
                note: asNumber(data.note, 60),
                noteMin: asNumber(data.noteMin, 0),
                noteMax: asNumber(data.noteMax, 127),
            } satisfies PatchMidiNoteInput);
            return;
        }

        if (node.type === 'midiCC') {
            const fallback = `midiInput${midiInputs.length + 1}`;
            const key = ensureUniqueName(toSafeIdentifier(label, fallback, midiInputKeys), midiInputKeys);
            midiInputKeys.add(key);
            midiInputs.push({
                id: node.id,
                key,
                label,
                kind: 'midi-cc-input',
                nodeId: node.id,
                inputId: (data.inputId as string | 'default' | 'all' | null | undefined) ?? 'default',
                channel: (data.channel as number | 'all' | undefined) ?? 'all',
                cc: asNumber(data.cc, 1),
            } satisfies PatchMidiCCInput);
            return;
        }

        if (node.type === 'midiNoteOutput') {
            const fallback = `midiOutput${midiOutputs.length + 1}`;
            const key = ensureUniqueName(toSafeIdentifier(label, fallback, midiOutputKeys), midiOutputKeys);
            midiOutputKeys.add(key);
            midiOutputs.push({
                id: node.id,
                key,
                label,
                kind: 'midi-note-output',
                nodeId: node.id,
                outputId: (data.outputId as string | null | undefined) ?? null,
                channel: asNumber(data.channel, 1),
                note: asNumber(data.note, 60),
                frequency: asNumber(data.frequency, 261.63),
                velocity: asNumber(data.velocity, 1),
            } satisfies PatchMidiNoteOutput);
            return;
        }

        if (node.type === 'midiCCOutput') {
            const fallback = `midiOutput${midiOutputs.length + 1}`;
            const key = ensureUniqueName(toSafeIdentifier(label, fallback, midiOutputKeys), midiOutputKeys);
            midiOutputKeys.add(key);
            midiOutputs.push({
                id: node.id,
                key,
                label,
                kind: 'midi-cc-output',
                nodeId: node.id,
                outputId: (data.outputId as string | null | undefined) ?? null,
                channel: asNumber(data.channel, 1),
                cc: asNumber(data.cc, 1),
                valueFormat: (data.valueFormat as MidiValueFormat | undefined) ?? 'normalized',
            } satisfies PatchMidiCCOutput);
            return;
        }

        if (node.type === 'midiSync') {
            const fallback = `midiOutput${midiOutputs.length + 1}`;
            const key = ensureUniqueName(toSafeIdentifier(label, fallback, midiOutputKeys), midiOutputKeys);
            midiOutputKeys.add(key);
            midiOutputs.push({
                id: node.id,
                key,
                label,
                kind: 'midi-sync-output',
                nodeId: node.id,
                mode: (data.mode as MidiTransportSyncMode | undefined) ?? 'transport-master',
                inputId: (data.inputId as string | null | undefined) ?? null,
                outputId: (data.outputId as string | null | undefined) ?? null,
                sendStartStop: data.sendStartStop === false ? false : true,
                sendClock: data.sendClock === false ? false : true,
            } satisfies PatchMidiSyncOutput);
        }
    });

    return { inputs, events, midiInputs, midiOutputs };
}

export function isAudioConnectionLike(
    connection: Pick<PatchConnection, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
    nodeById: Map<string, PatchNode>
): boolean {
    const sourceNode = nodeById.get(connection.source);
    if (!sourceNode || !isAudioNodeType(sourceNode.data.type)) return false;
    const sourceHandle = connection.sourceHandle ?? '';
    const isAudioOutHandle = sourceHandle === 'out' || /^out\d+$/.test(sourceHandle);
    return isAudioOutHandle
        && Boolean(connection.target)
        && ((connection.targetHandle ?? '') === 'in' || (connection.targetHandle ?? '').startsWith('in'));
}

export function getTransportConnections(
    connections: readonly PatchConnection[],
    nodeById: Map<string, PatchNode>
): Set<string> {
    const connected = new Set<string>();

    connections.forEach((connection) => {
        const sourceNode = nodeById.get(connection.source);
        const targetNode = nodeById.get(connection.target);
        if (
            sourceNode?.data.type === 'transport'
            && targetNode
            && (targetNode.data.type === 'stepSequencer' || targetNode.data.type === 'pianoRoll')
            && connection.sourceHandle === 'out'
            && connection.targetHandle === 'transport'
        ) {
            connected.add(connection.target);
        }
    });

    return connected;
}

export function resolvePatchAssetPath(assetPath: string | undefined, assetRoot?: string): string | undefined {
    if (!assetPath) return undefined;
    if (!assetRoot) return assetPath;
    if (/^(?:[a-z]+:)?\/\//i.test(assetPath) || assetPath.startsWith('blob:') || assetPath.startsWith('data:')) {
        return assetPath;
    }

    const normalizedRoot = assetRoot.endsWith('/') ? assetRoot.slice(0, -1) : assetRoot;
    const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${normalizedRoot}${normalizedPath}`;
}

export function graphDocumentToPatch(graph: GraphDocumentLike): PatchDocument {
    const rawConnections = graph.connections ?? graph.edges ?? [];
    const nodes = graph.nodes.map(normalizePatchNode);
    const connections = rawConnections.map(normalizePatchConnection);
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

    nodes.forEach(validateNode);
    connections.forEach((connection) => validateConnection(connection, nodeById));

    return {
        version: PATCH_DOCUMENT_VERSION,
        name: typeof graph.name === 'string' && graph.name.trim() ? graph.name.trim() : 'Untitled Graph',
        nodes,
        connections,
        interface: buildPatchInterface(nodes),
    };
}

export function migratePatchDocument(patch: PatchDocument): PatchDocument {
    if (!patch || typeof patch !== 'object') {
        throw new Error('Patch document must be an object.');
    }
    if (patch.version !== PATCH_DOCUMENT_VERSION) {
        throw new Error(`Unsupported patch version "${String((patch as { version?: unknown }).version)}".`);
    }

    const nodes = (Array.isArray(patch.nodes) ? patch.nodes : []).map((node) => normalizePatchNode(node as GraphNodeLike));
    const connections = (Array.isArray(patch.connections) ? patch.connections : []).map((connection, index) =>
        normalizePatchConnection(connection as GraphConnectionLike, index)
    );
    const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

    nodes.forEach(validateNode);
    connections.forEach((connection) => validateConnection(connection, nodeById));

    return {
        version: PATCH_DOCUMENT_VERSION,
        name: typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : 'Untitled Graph',
        nodes,
        connections,
        interface: buildPatchInterface(nodes),
    };
}

function buildGraphEdgeStyle(
    connection: PatchConnection,
    nodeById: Map<string, PatchNode>
): { animated: boolean; style: Record<string, string | number> } {
    if (isAudioConnectionLike(connection, nodeById)) {
        return {
            animated: false,
            style: { stroke: '#44cc44', strokeWidth: 3 },
        };
    }

    if (connection.targetHandle === 'trigger' || connection.targetHandle === 'gate') {
        return {
            animated: true,
            style: { stroke: '#ff4466', strokeWidth: 2, strokeDasharray: '6,4' },
        };
    }

    return {
        animated: true,
        style: { stroke: '#4488ff', strokeWidth: 2, strokeDasharray: '5,5' },
    };
}

export function patchToGraphDocument(patch: PatchDocument, options: PatchToGraphOptions = {}) {
    const migrated = migratePatchDocument(patch);
    const now = Date.now();
    const graphId = options.graphId ?? createGraphId();
    const createdAt = options.createdAt ?? now;
    const updatedAt = options.updatedAt ?? now;
    const order = options.order ?? 0;
    const nodeById = new Map(migrated.nodes.map((node) => [node.id, node] as const));

    const nodes = migrated.nodes.map((node) => ({
        id: node.id,
        type: `${node.type}Node`,
        position: node.position ? { ...node.position } : { x: 0, y: 0 },
        dragHandle: '.node-header',
        data: hydrateNodeDataForGraph(node.data),
    }));

    const edges = migrated.connections.map((connection) => ({
        id: connection.id,
        source: connection.source,
        sourceHandle: connection.sourceHandle ?? undefined,
        target: connection.target,
        targetHandle: connection.targetHandle ?? undefined,
        ...buildGraphEdgeStyle(connection, nodeById),
    }));

    return {
        id: graphId,
        name: migrated.name,
        nodes,
        edges,
        createdAt,
        updatedAt,
        order,
    };
}
