import type { PatchConnection, PatchNode } from '../types';
import { PATCH_INPUT_HANDLE_PREFIX, asNumber, asString, normalizeSlotType } from './shared';

const AUDIO_NODE_TYPES = new Set([
    'osc', 'gain', 'filter', 'delay', 'reverb', 'compressor', 'phaser', 'flanger', 'tremolo', 'eq3',
    'distortion', 'chorus', 'noiseBurst', 'waveShaper', 'convolver', 'analyzer', 'panner3d', 'panner',
    'mixer', 'auxSend', 'auxReturn', 'matrixMixer', 'noise', 'constantSource', 'mediaStream', 'sampler', 'output',
]);

const DATA_NODE_TYPES = new Set(['math', 'compare', 'mix', 'clamp', 'switch']);

const PATCH_NODE_TYPES = new Set([
    ...AUDIO_NODE_TYPES,
    ...DATA_NODE_TYPES,
    'input', 'uiTokens', 'note', 'transport', 'stepSequencer', 'pianoRoll', 'eventTrigger', 'lfo', 'voice',
    'adsr', 'midiNote', 'midiCC', 'midiNoteOutput', 'midiCCOutput', 'midiSync', 'midiPlayer', 'patch',
]);

export function getInputParamHandleId(paramId: string): string {
    return `${PATCH_INPUT_HANDLE_PREFIX}${paramId}`;
}

function getPatchSlotHandleIds(node: PatchNode, direction: 'input' | 'output'): Set<string> {
    const data = node.data as Record<string, unknown>;
    const handlePrefix = direction === 'input' ? 'in:' : 'out:';
    const implicitHandle = direction === 'input' ? 'in' : 'out';
    const slots = Array.isArray(direction === 'input' ? data.inputs : data.outputs)
        ? ((direction === 'input' ? data.inputs : data.outputs) as Array<Record<string, unknown>>)
        : [];
    const handleIds = new Set<string>([implicitHandle]);

    slots.forEach((slot, index) => {
        const slotId = asString(slot.id).trim() || `${direction}-${index + 1}`;
        handleIds.add(`${handlePrefix}${slotId}`);
    });

    return handleIds;
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
    if (type === 'stepSequencer' || type === 'pianoRoll' || type === 'eventTrigger' || type === 'midiPlayer') {
        handleIds.add('trigger');
    }
    if (type === 'lfo') handleIds.add('out');
    if (type === 'voice') ['note', 'gate', 'velocity'].forEach((id) => handleIds.add(id));
    if (type === 'adsr') {
        handleIds.add('envelope');
        handleIds.add('out');
    }
    if (type === 'midiNote') ['trigger', 'frequency', 'note', 'gate', 'velocity'].forEach((id) => handleIds.add(id));
    if (type === 'midiCC') ['normalized', 'raw'].forEach((id) => handleIds.add(id));
    if (type === 'patch') getPatchSlotHandleIds(node, 'output').forEach((id) => handleIds.add(id));
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
    if (type === 'stepSequencer' || type === 'pianoRoll' || type === 'midiPlayer') handleIds.add('transport');
    if (type === 'lfo') ['rate', 'depth'].forEach((id) => handleIds.add(id));
    if (type === 'voice') ['trigger', 'portamento'].forEach((id) => handleIds.add(id));
    if (type === 'adsr') {
        handleIds.add('in');
        ['gate', 'attack', 'decay', 'sustain', 'release'].forEach((id) => handleIds.add(id));
    }
    if (type === 'noiseBurst') ['trigger', 'duration', 'gain', 'attack', 'release'].forEach((id) => handleIds.add(id));
    if (type === 'constantSource') handleIds.add('offset');
    if (type === 'sampler') ['trigger', 'playbackRate', 'detune'].forEach((id) => handleIds.add(id));
    if (type === 'midiNoteOutput') ['trigger', 'gate', 'note', 'frequency', 'velocity'].forEach((id) => handleIds.add(id));
    if (type === 'midiCCOutput') handleIds.add('value');
    if (type === 'patch') getPatchSlotHandleIds(node, 'input').forEach((id) => handleIds.add(id));

    [
        'frequency', 'detune', 'gain', 'q', 'delayTime', 'feedback', 'mix', 'pan', 'masterGain', 'rate', 'depth',
        'playbackRate', 'portamento', 'attack', 'decay', 'sustain', 'release', 'threshold', 'knee', 'ratio',
        'sidechainStrength', 'level', 'tone', 'drive', 'duration', 'offset', 'positionX', 'positionY', 'positionZ',
        'refDistance', 'maxDistance', 'rolloffFactor', 'token', 'low', 'mid', 'high', 'lowFrequency',
        'highFrequency', 'baseFrequency', 'stages', 'sendGain', 'value', 'min', 'max', 'a', 'b', 'c', 't', 'index',
    ].forEach((id) => handleIds.add(id));
    if (type === 'switch') {
        const inputs = Math.max(1, asNumber((node.data as Record<string, unknown>).inputs, 1));
        for (let index = 0; index < inputs; index += 1) {
            handleIds.add(`in_${index}`);
        }
    }

    return handleIds;
}

export function validateNode(node: PatchNode): void {
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

export function validateConnection(connection: PatchConnection, nodeById: Map<string, PatchNode>): void {
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

export function isAudioConnectionLike(
    connection: Pick<PatchConnection, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
    nodeById: Map<string, PatchNode>
): boolean {
    const sourceNode = nodeById.get(connection.source);
    const sourceHandle = connection.sourceHandle ?? '';
    if (!sourceNode) return false;

    const isAudioTargetHandle = Boolean(connection.target)
        && ((connection.targetHandle ?? '') === 'in' || (connection.targetHandle ?? '').startsWith('in'));

    if (isAudioNodeType(sourceNode.data.type)) {
        const isAudioOutHandle = sourceHandle === 'out' || /^out\d+$/.test(sourceHandle);
        return isAudioOutHandle && isAudioTargetHandle;
    }

    if (sourceNode.data.type === 'adsr' && sourceHandle === 'out') {
        return isAudioTargetHandle;
    }

    if (sourceNode.data.type !== 'patch' || !(sourceHandle === 'out' || sourceHandle.startsWith('out:'))) {
        return false;
    }

    if (sourceHandle === 'out') {
        return isAudioTargetHandle;
    }

    const outputId = sourceHandle.slice('out:'.length);
    const outputs = Array.isArray((sourceNode.data as Record<string, unknown>).outputs)
        ? ((sourceNode.data as Record<string, unknown>).outputs as Array<Record<string, unknown>>)
        : [];
    const outputSlot = outputs.find((slot) => asString(slot.id).trim() === outputId);
    return normalizeSlotType(outputSlot?.type, 'midi') === 'audio' && isAudioTargetHandle;
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
            && (targetNode.data.type === 'stepSequencer'
                || targetNode.data.type === 'pianoRoll'
                || targetNode.data.type === 'midiPlayer')
            && connection.sourceHandle === 'out'
            && connection.targetHandle === 'transport'
        ) {
            connected.add(connection.target);
        }
    });

    return connected;
}
