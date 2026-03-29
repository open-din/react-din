import type {
    ClampMode,
    CompareOperation,
    DinCoreBackend,
    DistortionCurveType,
    GraphConnectionLike,
    GraphDocumentLike,
    GraphNodeLike,
    MathOperation,
    MidiTransportSyncMode,
    MidiValueFormat,
    NoiseType,
    ParsedNote,
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
    PatchToGraphOptions,
    ReverbImpulseFrames,
    WaveShaperCurvePreset,
} from './contracts';
import { ensureUniqueName, toSafeIdentifier } from './naming';

const PATCH_DOCUMENT_VERSION = 1 as const;
const PATCH_INPUT_HANDLE_PREFIX = 'param:' as const;

const PATCH_NODE_TYPES = new Set([
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
    'math',
    'compare',
    'mix',
    'clamp',
    'switch',
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

const DATA_NODE_TYPES = new Set(['math', 'compare', 'mix', 'clamp', 'switch']);

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

const NOTE_TO_SEMITONE: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1,
    D: 2, 'D#': 3, Eb: 3,
    E: 4, Fb: 4, 'E#': 5,
    F: 5, 'F#': 6, Gb: 6,
    G: 7, 'G#': 8, Ab: 8,
    A: 9, 'A#': 10, Bb: 10,
    B: 11, Cb: 11, 'B#': 0,
};

const SEMITONE_TO_NOTE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const SEMITONE_TO_NOTE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const FRENCH_TO_ENGLISH: Record<string, string> = {
    Do: 'C',
    Re: 'D',
    Mi: 'E',
    Fa: 'F',
    Sol: 'G',
    La: 'A',
    Si: 'B',
};

const ENGLISH_TO_FRENCH: Record<string, string> = {
    C: 'Do',
    D: 'Re',
    E: 'Mi',
    F: 'Fa',
    G: 'Sol',
    A: 'La',
    B: 'Si',
};

function safeNumber(value: number | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function truncateNumber(value: number) {
    if (Number.isNaN(value)) return 0;
    if (typeof Math.trunc === 'function') return Math.trunc(value);
    return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function clampRange(value: number, min: number, max: number, mode: ClampMode) {
    let minValue = min;
    let maxValue = max;
    if (mode === 'range' && minValue > maxValue) {
        [minValue, maxValue] = [maxValue, minValue];
    }
    return Math.min(Math.max(value, minValue), maxValue);
}

function wrapValue(value: number, min: number, max: number) {
    const range = max - min;
    if (!Number.isFinite(range) || range === 0) return min;
    const wrapped = ((value - min) % range + range) % range;
    return wrapped + min;
}

function flooredModulo(value: number, divisor: number) {
    if (!Number.isFinite(divisor) || divisor === 0) return 0;
    return value - Math.floor(value / divisor) * divisor;
}

function pingPongValue(value: number, length: number) {
    if (!Number.isFinite(length) || length === 0) return 0;
    const range = length * 2;
    const wrapped = wrapValue(value, 0, range);
    return length - Math.abs(wrapped - length);
}

function smoothMinValue(a: number, b: number, k: number) {
    const smooth = Math.max(0.0001, k);
    const h = clampRange(0.5 + 0.5 * (b - a) / smooth, 0, 1, 'minmax');
    return (b * (1 - h) + a * h) - smooth * h * (1 - h);
}

function normalizeAccents(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function frenchToEnglish(note: string): string {
    const normalized = normalizeAccents(note);
    const frenchMatch = normalized.match(/^(Do|Re|Mi|Fa|Sol|La|Si)(#|b)?$/i);
    if (!frenchMatch) return note;

    const baseFrench = frenchMatch[1].charAt(0).toUpperCase() + frenchMatch[1].slice(1).toLowerCase();
    const accidental = frenchMatch[2] || '';
    const lookupKey = baseFrench === 'Sol' ? 'Sol' : baseFrench;
    const english = FRENCH_TO_ENGLISH[lookupKey];
    return english ? `${english}${accidental}` : note;
}

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

function fillNoiseSamples(type: NoiseType, sampleCount: number, target?: Float32Array): Float32Array {
    const buffer = target ?? new Float32Array(sampleCount);

    switch (type) {
        case 'white':
            for (let i = 0; i < sampleCount; i += 1) {
                buffer[i] = Math.random() * 2 - 1;
            }
            break;
        case 'pink': {
            let b0 = 0;
            let b1 = 0;
            let b2 = 0;
            let b3 = 0;
            let b4 = 0;
            let b5 = 0;
            let b6 = 0;
            for (let i = 0; i < sampleCount; i += 1) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.969 * b2 + white * 0.153852;
                b3 = 0.8665 * b3 + white * 0.3104856;
                b4 = 0.55 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.016898;
                buffer[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            }
            break;
        }
        case 'brown': {
            let lastOut = 0;
            for (let i = 0; i < sampleCount; i += 1) {
                const white = Math.random() * 2 - 1;
                buffer[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = buffer[i];
                buffer[i] *= 3.5;
            }
            break;
        }
        case 'blue': {
            let lastSample = 0;
            for (let i = 0; i < sampleCount; i += 1) {
                const white = Math.random() * 2 - 1;
                buffer[i] = white - lastSample;
                lastSample = white;
            }
            break;
        }
        case 'violet': {
            let last1 = 0;
            let last2 = 0;
            for (let i = 0; i < sampleCount; i += 1) {
                const white = Math.random() * 2 - 1;
                const diff1 = white - last1;
                buffer[i] = diff1 - last2;
                last2 = diff1;
                last1 = white;
            }
            break;
        }
    }

    return buffer;
}

function createReverbImpulseFrames(
    sampleRate: number,
    decay: number,
    preDelay = 0,
    damping = 0
): ReverbImpulseFrames {
    const safeSampleRate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
    const safeDecay = Math.max(0.001, Number.isFinite(decay) ? decay : 1);
    const safePreDelay = Math.max(0, Number.isFinite(preDelay) ? preDelay : 0);
    const safeDamping = clampRange(Number.isFinite(damping) ? damping : 0, 0, 1, 'minmax');
    const length = Math.max(1, Math.floor(safeSampleRate * (safeDecay + safePreDelay)));
    const preDelaySamples = Math.floor(safePreDelay * safeSampleRate);
    const left = new Float32Array(length);
    const right = new Float32Array(length);

    [left, right].forEach((channelData) => {
        for (let i = 0; i < length; i += 1) {
            if (i < preDelaySamples) {
                channelData[i] = 0;
                continue;
            }

            const t = (i - preDelaySamples) / safeSampleRate;
            const envelope = Math.exp(-t / Math.max(0.0001, safeDecay * 0.5));
            let sample = (Math.random() * 2 - 1) * envelope;

            if (i > preDelaySamples && safeDamping > 0) {
                sample = sample * (1 - safeDamping) + channelData[i - 1] * safeDamping * 0.5;
            }

            channelData[i] = sample;
        }
    });

    return { left, right };
}

function createWaveShaperCurve(amount: number, preset: WaveShaperCurvePreset, samples = 512): Float32Array {
    const curve = new Float32Array(samples);
    const k = Math.max(0, amount) * 100;

    for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;

        if (preset === 'hardClip') {
            curve[i] = Math.max(-1, Math.min(1, x * (1 + k / 8)));
        } else if (preset === 'saturate') {
            const amt = 1 + k / 20;
            curve[i] = ((3 + amt) * x * 20) / (Math.PI + (amt * Math.abs(x * 20)));
        } else {
            curve[i] = Math.tanh(x * (1 + k / 12));
        }
    }

    return curve;
}

function createDistortionCurve(type: DistortionCurveType, drive: number, samples = 256): Float32Array {
    const curve = new Float32Array(samples);
    const k = drive * 100;

    for (let i = 0; i < samples; i += 1) {
        const x = (i * 2) / samples - 1;

        switch (type) {
            case 'soft':
                curve[i] = Math.tanh(x * (1 + k / 10));
                break;
            case 'hard':
                curve[i] = Math.max(-1, Math.min(1, x * (1 + k / 5)));
                break;
            case 'fuzz':
                if (x >= 0) {
                    curve[i] = Math.min(1, x * (1 + k / 3));
                } else {
                    curve[i] = Math.max(-1, x * (1 + k / 2) + Math.sin(x * k) * 0.1);
                }
                break;
            case 'bitcrush': {
                const bits = Math.max(2, 16 - Math.floor(k / 10));
                const steps = Math.pow(2, bits);
                curve[i] = Math.round(x * steps) / steps;
                break;
            }
            case 'saturate': {
                const amt = 1 + k / 20;
                curve[i] = ((3 + amt) * x * 20) / (Math.PI + (amt * Math.abs(x * 20)));
                break;
            }
            default:
                curve[i] = x;
        }
    }

    return curve;
}

function parseNote(input: string | number): ParsedNote {
    if (typeof input === 'number') {
        const midi = Math.round(input);
        const octave = Math.floor(midi / 12) - 1;
        const semitone = ((midi % 12) + 12) % 12;
        const note = SEMITONE_TO_NOTE_SHARP[semitone];
        const frequency = midiToFreq(midi);
        return { note, octave, midi, frequency };
    }

    const normalized = normalizeAccents(input.trim());
    const match = normalized.match(/^([A-Za-z]+)(#|b)?(-?\d+)?$/);

    if (!match) {
        throw new Error(`Invalid note format: "${input}"`);
    }

    let notePart = match[1] + (match[2] || '');
    const octaveStr = match[3];
    notePart = frenchToEnglish(notePart);

    const noteUpper = notePart.charAt(0).toUpperCase() + notePart.slice(1).toLowerCase();
    const semitone = NOTE_TO_SEMITONE[noteUpper];
    if (semitone === undefined) {
        throw new Error(`Unknown note name: "${notePart}" (from "${input}")`);
    }

    const octave = octaveStr !== undefined ? parseInt(octaveStr, 10) : 4;
    const midi = (octave + 1) * 12 + semitone;
    const frequency = midiToFreq(midi);
    const note = SEMITONE_TO_NOTE_SHARP[semitone];

    return { note, octave, midi, frequency };
}

function noteToMidi(note: string, octave?: number | null): number {
    if (octave !== undefined && octave !== null) {
        return parseNote(`${note}${octave}`).midi;
    }
    return parseNote(note).midi;
}

function midiToNote(midi: number, preferFlats = false): string {
    const midiRounded = Math.round(midi);
    const octave = Math.floor(midiRounded / 12) - 1;
    const semitone = ((midiRounded % 12) + 12) % 12;
    const noteTable = preferFlats ? SEMITONE_TO_NOTE_FLAT : SEMITONE_TO_NOTE_SHARP;
    const note = noteTable[semitone];
    return `${note}${octave}`;
}

function midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function noteToFreq(note: string | number, octave?: number | null): number {
    if (typeof note === 'number') {
        return midiToFreq(note);
    }
    if (octave !== undefined && octave !== null) {
        return parseNote(`${note}${octave}`).frequency;
    }
    return parseNote(note).frequency;
}

function noteToFrench(note: string): string {
    const match = note.match(/^([A-G])(#|b)?$/i);
    if (!match) return note;

    const base = match[1].toUpperCase();
    const accidental = match[2] || '';
    const french = ENGLISH_TO_FRENCH[base];
    return french ? `${french}${accidental}` : note;
}

function noteFromFrench(note: string): string {
    return frenchToEnglish(note);
}

function math(operation: MathOperation, a = 0, b = 0, c = 0): number {
    const av = safeNumber(a);
    const bv = safeNumber(b);
    const cv = safeNumber(c);

    switch (operation) {
        case 'add':
            return av + bv;
        case 'subtract':
            return av - bv;
        case 'multiply':
            return av * bv;
        case 'divide':
            return bv === 0 ? 0 : av / bv;
        case 'multiplyAdd':
            return av * bv + cv;
        case 'power':
            return Math.pow(av, bv);
        case 'logarithm':
            if (av <= 0) return 0;
            if (!Number.isFinite(bv) || bv <= 0 || bv === 1) return Math.log(av);
            return Math.log(av) / Math.log(bv);
        case 'sqrt':
            return av < 0 ? 0 : Math.sqrt(av);
        case 'invSqrt':
            return av <= 0 ? 0 : 1 / Math.sqrt(av);
        case 'abs':
            return Math.abs(av);
        case 'exp':
            return Math.exp(av);
        case 'min':
            return Math.min(av, bv);
        case 'max':
            return Math.max(av, bv);
        case 'lessThan':
            return av < bv ? 1 : 0;
        case 'greaterThan':
            return av > bv ? 1 : 0;
        case 'sign':
            return av === 0 ? 0 : av > 0 ? 1 : -1;
        case 'compare':
            return av === bv ? 0 : av > bv ? 1 : -1;
        case 'smoothMin':
            return smoothMinValue(av, bv, cv);
        case 'smoothMax':
            return -smoothMinValue(-av, -bv, cv);
        case 'round':
            return Math.round(av);
        case 'floor':
            return Math.floor(av);
        case 'ceil':
            return Math.ceil(av);
        case 'truncate':
            return truncateNumber(av);
        case 'fraction':
            return av - Math.floor(av);
        case 'truncModulo':
            return bv === 0 ? 0 : av % bv;
        case 'floorModulo':
            return flooredModulo(av, bv);
        case 'wrap':
            return wrapValue(av, bv, cv);
        case 'snap':
            return bv === 0 ? av : Math.round(av / bv) * bv;
        case 'pingPong':
            return pingPongValue(av, bv);
        case 'sin':
            return Math.sin(av);
        case 'cos':
            return Math.cos(av);
        case 'tan':
            return Math.tan(av);
        case 'asin':
            return Math.asin(av);
        case 'acos':
            return Math.acos(av);
        case 'atan':
            return Math.atan(av);
        case 'atan2':
            return Math.atan2(av, bv);
        case 'sinh':
            return Math.sinh(av);
        case 'cosh':
            return Math.cosh(av);
        case 'tanh':
            return Math.tanh(av);
        default:
            return 0;
    }
}

function compare(operation: CompareOperation, a = 0, b = 0): number {
    const av = safeNumber(a);
    const bv = safeNumber(b);

    switch (operation) {
        case 'gt':
            return av > bv ? 1 : 0;
        case 'gte':
            return av >= bv ? 1 : 0;
        case 'lt':
            return av < bv ? 1 : 0;
        case 'lte':
            return av <= bv ? 1 : 0;
        case 'eq':
            return av === bv ? 1 : 0;
        case 'neq':
            return av !== bv ? 1 : 0;
        default:
            return 0;
    }
}

function mix(a = 0, b = 0, t = 0, clampMix = false): number {
    const av = safeNumber(a);
    const bv = safeNumber(b);
    const tv = safeNumber(t);
    const mixValue = clampMix ? clampRange(tv, 0, 1, 'minmax') : tv;
    return av * (1 - mixValue) + bv * mixValue;
}

function clamp(value = 0, min = 0, max = 1, mode: ClampMode = 'minmax'): number {
    const v = safeNumber(value);
    const minValue = safeNumber(min);
    const maxValue = safeNumber(max);
    return clampRange(v, minValue, maxValue, mode);
}

function switchValue(index: number, values: readonly number[], fallback = 0): number {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    const indexValue = Number.isFinite(index) ? Math.floor(index) : 0;
    const safeIndex = Math.min(Math.max(indexValue, 0), values.length - 1);
    const value = values[safeIndex];
    return Number.isFinite(value) ? value : fallback;
}

function isAudioConnectionLike(
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

function getTransportConnections(
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

function resolvePatchAssetPath(assetPath: string | undefined, assetRoot?: string): string | undefined {
    if (!assetPath) return undefined;
    if (!assetRoot) return assetPath;
    if (/^(?:[a-z]+:)?\/\//i.test(assetPath) || assetPath.startsWith('blob:') || assetPath.startsWith('data:')) {
        return assetPath;
    }

    const normalizedRoot = assetRoot.endsWith('/') ? assetRoot.slice(0, -1) : assetRoot;
    const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${normalizedRoot}${normalizedPath}`;
}

function graphDocumentToPatch(graph: GraphDocumentLike): PatchDocument {
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

function migratePatchDocument(patch: PatchDocument): PatchDocument {
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

function patchToGraphDocument(patch: PatchDocument, options: PatchToGraphOptions = {}) {
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
        dragHandle: '.node-header' as const,
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

export const fallbackDinCoreBackend: DinCoreBackend = {
    runtime: 'fallback',
    patchDocumentVersion: PATCH_DOCUMENT_VERSION,
    patchInputHandlePrefix: PATCH_INPUT_HANDLE_PREFIX,
    math,
    compare,
    mix,
    clamp,
    switchValue,
    parseNote,
    noteToMidi,
    midiToNote,
    midiToFreq,
    noteToFreq,
    noteToFrench,
    noteFromFrench,
    createDistortionCurve,
    createWaveShaperCurve,
    fillNoiseSamples,
    createReverbImpulseFrames,
    graphDocumentToPatch,
    migratePatchDocument,
    patchToGraphDocument,
    isAudioConnectionLike,
    getTransportConnections,
    resolvePatchAssetPath,
    buildPatchInterface,
};
