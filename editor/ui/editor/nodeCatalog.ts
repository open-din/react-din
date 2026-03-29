import type {
    AudioNodeData,
    InputNodeData,
    UiTokensNodeData,
    MathNodeData,
    SwitchNodeData,
    MatrixMixerNodeData,
} from './store';
import { getInputParamHandleId } from './handleIds';

export type EditorNodeType = AudioNodeData['type'];
export type HandleDirection = 'source' | 'target';
export type PaletteCategory = 'Sources' | 'MIDI' | 'Effects' | 'Routing' | 'Math';

export interface HandleDescriptor {
    id: string;
    direction: HandleDirection;
    label: string;
}

export interface NodeCatalogEntry {
    type: EditorNodeType;
    category: PaletteCategory;
    label: string;
    icon: string;
    color: string;
    singleton?: boolean;
}

const MATH_OPERATION_INPUT_LABELS: Record<MathNodeData['operation'], Array<{ id: 'a' | 'b' | 'c'; label: string }>> = {
    add: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    subtract: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    multiply: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    divide: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    multiplyAdd: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }],
    power: [{ id: 'a', label: 'Base' }, { id: 'b', label: 'Exponent' }],
    logarithm: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Base' }],
    sqrt: [{ id: 'a', label: 'Value' }],
    invSqrt: [{ id: 'a', label: 'Value' }],
    abs: [{ id: 'a', label: 'Value' }],
    exp: [{ id: 'a', label: 'Value' }],
    min: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    max: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    lessThan: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    greaterThan: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    sign: [{ id: 'a', label: 'Value' }],
    compare: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    smoothMin: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'Smooth' }],
    smoothMax: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'Smooth' }],
    round: [{ id: 'a', label: 'Value' }],
    floor: [{ id: 'a', label: 'Value' }],
    ceil: [{ id: 'a', label: 'Value' }],
    truncate: [{ id: 'a', label: 'Value' }],
    fraction: [{ id: 'a', label: 'Value' }],
    truncModulo: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Divisor' }],
    floorModulo: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Divisor' }],
    wrap: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Min' }, { id: 'c', label: 'Max' }],
    snap: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Step' }],
    pingPong: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Length' }],
    sin: [{ id: 'a', label: 'Value' }],
    cos: [{ id: 'a', label: 'Value' }],
    tan: [{ id: 'a', label: 'Value' }],
    asin: [{ id: 'a', label: 'Value' }],
    acos: [{ id: 'a', label: 'Value' }],
    atan: [{ id: 'a', label: 'Value' }],
    atan2: [{ id: 'a', label: 'Y' }, { id: 'b', label: 'X' }],
    sinh: [{ id: 'a', label: 'Value' }],
    cosh: [{ id: 'a', label: 'Value' }],
    tanh: [{ id: 'a', label: 'Value' }],
};

export const EDITOR_NODE_CATALOG: NodeCatalogEntry[] = [
    { type: 'input', category: 'Sources', label: 'Params', icon: '⏱️', color: '#dddddd' },
    { type: 'uiTokens', category: 'Sources', label: 'UI Tokens', icon: '⏱️', color: '#68a5ff' },
    { type: 'eventTrigger', category: 'Sources', label: 'Event Trigger', icon: '⚡', color: '#ffd166' },
    { type: 'transport', category: 'Sources', label: 'Transport', icon: '⏯️', color: '#dddddd', singleton: true },
    { type: 'stepSequencer', category: 'Sources', label: 'Step Sequencer', icon: '🎹', color: '#dddddd' },
    { type: 'pianoRoll', category: 'Sources', label: 'Piano Roll', icon: '🎼', color: '#44ccff' },
    { type: 'lfo', category: 'Sources', label: 'LFO', icon: '🌀', color: '#aa44ff' },
    { type: 'constantSource', category: 'Sources', label: 'Constant Source', icon: '━', color: '#7bd1ff' },
    { type: 'mediaStream', category: 'Sources', label: 'Media Stream', icon: '🎙️', color: '#7bd1ff' },
    { type: 'voice', category: 'Sources', label: 'Voice', icon: '🗣️', color: '#ff4466' },
    { type: 'adsr', category: 'Sources', label: 'ADSR', icon: '📈', color: '#dddddd' },
    { type: 'note', category: 'Sources', label: 'Note', icon: '🎵', color: '#ffcc00' },
    { type: 'osc', category: 'Sources', label: 'Oscillator', icon: '◐', color: '#ff8844' },
    { type: 'noise', category: 'Sources', label: 'Noise', icon: '〰️', color: '#888888' },
    { type: 'noiseBurst', category: 'Sources', label: 'Noise Burst', icon: '💥', color: '#888888' },
    { type: 'sampler', category: 'Sources', label: 'Sampler', icon: '🎹', color: '#44ccff' },
    { type: 'midiNote', category: 'MIDI', label: 'Midi In', icon: '🎹', color: '#4dd4a0' },
    { type: 'midiCC', category: 'MIDI', label: 'Knob / CC In', icon: '🎛️', color: '#4dd4a0' },
    { type: 'midiNoteOutput', category: 'MIDI', label: 'Note Out', icon: '📤', color: '#4dd4a0' },
    { type: 'midiCCOutput', category: 'MIDI', label: 'CC Out', icon: '📤', color: '#4dd4a0' },
    { type: 'midiSync', category: 'MIDI', label: 'Sync', icon: '⏱️', color: '#4dd4a0', singleton: true },
    { type: 'gain', category: 'Effects', label: 'Gain', icon: '◧', color: '#44cc44' },
    { type: 'filter', category: 'Effects', label: 'Filter', icon: '◇', color: '#aa44ff' },
    { type: 'compressor', category: 'Effects', label: 'Compressor', icon: '🗜️', color: '#44cc44' },
    { type: 'delay', category: 'Effects', label: 'Delay', icon: '⏱️', color: '#4488ff' },
    { type: 'reverb', category: 'Effects', label: 'Reverb', icon: '🏛️', color: '#8844ff' },
    { type: 'phaser', category: 'Effects', label: 'Phaser', icon: '🌀', color: '#7a9cff' },
    { type: 'flanger', category: 'Effects', label: 'Flanger', icon: '🧵', color: '#7a9cff' },
    { type: 'tremolo', category: 'Effects', label: 'Tremolo', icon: '〰️', color: '#7a9cff' },
    { type: 'eq3', category: 'Effects', label: 'EQ3', icon: '🎚️', color: '#7a9cff' },
    { type: 'distortion', category: 'Effects', label: 'Distortion', icon: '🔥', color: '#ff7f50' },
    { type: 'chorus', category: 'Effects', label: 'Chorus', icon: '🌊', color: '#44ccff' },
    { type: 'waveShaper', category: 'Effects', label: 'WaveShaper', icon: '∿', color: '#ff7f50' },
    { type: 'convolver', category: 'Effects', label: 'Convolver', icon: '🧱', color: '#8844ff' },
    { type: 'analyzer', category: 'Effects', label: 'Analyzer', icon: '📊', color: '#7bd1ff' },
    { type: 'panner', category: 'Effects', label: 'Pan', icon: '↔️', color: '#44ffff' },
    { type: 'panner3d', category: 'Effects', label: 'Panner 3D', icon: '🧭', color: '#44ffff' },
    { type: 'mixer', category: 'Routing', label: 'Mixer', icon: '⊕', color: '#ffaa44' },
    { type: 'auxSend', category: 'Routing', label: 'Aux Send', icon: '↗️', color: '#ffaa44' },
    { type: 'auxReturn', category: 'Routing', label: 'Aux Return', icon: '↘️', color: '#ffaa44' },
    { type: 'matrixMixer', category: 'Routing', label: 'Matrix Mixer', icon: '▦', color: '#ffaa44' },
    { type: 'output', category: 'Routing', label: 'Output', icon: '🔊', color: '#ff4466', singleton: true },
    { type: 'math', category: 'Math', label: 'Math', icon: 'fx', color: '#7bd1ff' },
    { type: 'compare', category: 'Math', label: 'Compare', icon: '>=', color: '#7bd1ff' },
    { type: 'mix', category: 'Math', label: 'Mix', icon: 'mix', color: '#7bd1ff' },
    { type: 'clamp', category: 'Math', label: 'Clamp', icon: '[]', color: '#7bd1ff' },
    { type: 'switch', category: 'Math', label: 'Switch', icon: 'sw', color: '#7bd1ff' },
];

const DEFAULT_HANDLES_BY_TYPE: Record<EditorNodeType, HandleDescriptor[]> = {
    input: [],
    uiTokens: [],
    eventTrigger: [
        { id: 'trigger', direction: 'source', label: 'Trigger' },
        { id: 'token', direction: 'target', label: 'Token' },
    ],
    transport: [{ id: 'out', direction: 'source', label: 'Clock' }],
    stepSequencer: [
        { id: 'transport', direction: 'target', label: 'Transport' },
        { id: 'trigger', direction: 'source', label: 'Trigger' },
    ],
    pianoRoll: [
        { id: 'transport', direction: 'target', label: 'Transport' },
        { id: 'trigger', direction: 'source', label: 'Trigger' },
    ],
    lfo: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'rate', direction: 'target', label: 'Rate' },
        { id: 'depth', direction: 'target', label: 'Depth' },
    ],
    voice: [
        { id: 'trigger', direction: 'target', label: 'Trigger' },
        { id: 'portamento', direction: 'target', label: 'Portamento' },
        { id: 'note', direction: 'source', label: 'Freq' },
        { id: 'gate', direction: 'source', label: 'Gate' },
        { id: 'velocity', direction: 'source', label: 'Velocity' },
    ],
    adsr: [
        { id: 'gate', direction: 'target', label: 'Gate' },
        { id: 'attack', direction: 'target', label: 'Attack' },
        { id: 'decay', direction: 'target', label: 'Decay' },
        { id: 'sustain', direction: 'target', label: 'Sustain' },
        { id: 'release', direction: 'target', label: 'Release' },
        { id: 'envelope', direction: 'source', label: 'Envelope' },
    ],
    note: [{ id: 'freq', direction: 'source', label: 'Frequency' }],
    osc: [
        { id: 'out', direction: 'source', label: 'Audio Out' },
        { id: 'frequency', direction: 'target', label: 'Freq' },
        { id: 'detune', direction: 'target', label: 'Detune' },
    ],
    noise: [{ id: 'out', direction: 'source', label: 'Audio Out' }],
    noiseBurst: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'trigger', direction: 'target', label: 'Trigger' },
        { id: 'duration', direction: 'target', label: 'Duration' },
        { id: 'gain', direction: 'target', label: 'Gain' },
        { id: 'attack', direction: 'target', label: 'Attack' },
        { id: 'release', direction: 'target', label: 'Release' },
    ],
    constantSource: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'offset', direction: 'target', label: 'Offset' },
    ],
    mediaStream: [{ id: 'out', direction: 'source', label: 'Out' }],
    sampler: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'trigger', direction: 'target', label: 'Trigger' },
        { id: 'playbackRate', direction: 'target', label: 'Speed' },
        { id: 'detune', direction: 'target', label: 'Detune' },
    ],
    midiNote: [
        { id: 'trigger', direction: 'source', label: 'Trigger' },
        { id: 'frequency', direction: 'source', label: 'Frequency' },
        { id: 'note', direction: 'source', label: 'Note' },
        { id: 'gate', direction: 'source', label: 'Gate' },
        { id: 'velocity', direction: 'source', label: 'Velocity' },
    ],
    midiCC: [
        { id: 'normalized', direction: 'source', label: 'Normalized' },
        { id: 'raw', direction: 'source', label: 'Raw' },
    ],
    midiNoteOutput: [
        { id: 'trigger', direction: 'target', label: 'Trigger' },
        { id: 'gate', direction: 'target', label: 'Gate' },
        { id: 'note', direction: 'target', label: 'Note' },
        { id: 'frequency', direction: 'target', label: 'Frequency' },
        { id: 'velocity', direction: 'target', label: 'Velocity' },
    ],
    midiCCOutput: [
        { id: 'value', direction: 'target', label: 'Value' },
    ],
    midiSync: [],
    compressor: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'sidechainIn', direction: 'target', label: 'Sidechain' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'threshold', direction: 'target', label: 'Threshold' },
        { id: 'knee', direction: 'target', label: 'Knee' },
        { id: 'ratio', direction: 'target', label: 'Ratio' },
        { id: 'attack', direction: 'target', label: 'Attack' },
        { id: 'release', direction: 'target', label: 'Release' },
        { id: 'sidechainStrength', direction: 'target', label: 'SC Amt' },
    ],
    phaser: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'rate', direction: 'target', label: 'Rate' },
        { id: 'depth', direction: 'target', label: 'Depth' },
        { id: 'feedback', direction: 'target', label: 'Feedback' },
        { id: 'baseFrequency', direction: 'target', label: 'Base Freq' },
        { id: 'stages', direction: 'target', label: 'Stages' },
        { id: 'mix', direction: 'target', label: 'Mix' },
    ],
    flanger: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'rate', direction: 'target', label: 'Rate' },
        { id: 'depth', direction: 'target', label: 'Depth' },
        { id: 'feedback', direction: 'target', label: 'Feedback' },
        { id: 'delay', direction: 'target', label: 'Delay' },
        { id: 'mix', direction: 'target', label: 'Mix' },
    ],
    tremolo: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'rate', direction: 'target', label: 'Rate' },
        { id: 'depth', direction: 'target', label: 'Depth' },
        { id: 'mix', direction: 'target', label: 'Mix' },
    ],
    eq3: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'low', direction: 'target', label: 'Low' },
        { id: 'mid', direction: 'target', label: 'Mid' },
        { id: 'high', direction: 'target', label: 'High' },
        { id: 'lowFrequency', direction: 'target', label: 'Low Freq' },
        { id: 'highFrequency', direction: 'target', label: 'High Freq' },
        { id: 'mix', direction: 'target', label: 'Mix' },
    ],
    distortion: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'drive', direction: 'target', label: 'Drive' },
        { id: 'level', direction: 'target', label: 'Level' },
        { id: 'mix', direction: 'target', label: 'Mix' },
        { id: 'tone', direction: 'target', label: 'Tone' },
    ],
    chorus: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'rate', direction: 'target', label: 'Rate' },
        { id: 'depth', direction: 'target', label: 'Depth' },
        { id: 'feedback', direction: 'target', label: 'Feedback' },
        { id: 'delay', direction: 'target', label: 'Delay' },
        { id: 'mix', direction: 'target', label: 'Mix' },
    ],
    waveShaper: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'amount', direction: 'target', label: 'Amount' },
    ],
    convolver: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
    ],
    analyzer: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
    ],
    gain: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'gain', direction: 'target', label: 'Gain' },
    ],
    filter: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'frequency', direction: 'target', label: 'Freq' },
        { id: 'q', direction: 'target', label: 'Q' },
        { id: 'detune', direction: 'target', label: 'Detune' },
        { id: 'gain', direction: 'target', label: 'Gain' },
    ],
    delay: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'delayTime', direction: 'target', label: 'Delay Time' },
        { id: 'feedback', direction: 'target', label: 'Feedback' },
    ],
    reverb: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'decay', direction: 'target', label: 'Decay' },
        { id: 'mix', direction: 'target', label: 'Mix' },
    ],
    panner: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'pan', direction: 'target', label: 'Pan' },
    ],
    panner3d: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'positionX', direction: 'target', label: 'X' },
        { id: 'positionY', direction: 'target', label: 'Y' },
        { id: 'positionZ', direction: 'target', label: 'Z' },
        { id: 'refDistance', direction: 'target', label: 'Ref Dist' },
        { id: 'maxDistance', direction: 'target', label: 'Max Dist' },
        { id: 'rolloffFactor', direction: 'target', label: 'Rolloff' },
    ],
    mixer: [
        { id: 'in1', direction: 'target', label: 'In 1' },
        { id: 'in2', direction: 'target', label: 'In 2' },
        { id: 'in3', direction: 'target', label: 'In 3' },
        { id: 'out', direction: 'source', label: 'Out' },
    ],
    auxSend: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'sendGain', direction: 'target', label: 'Send' },
    ],
    auxReturn: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'gain', direction: 'target', label: 'Gain' },
    ],
    matrixMixer: [
        { id: 'in1', direction: 'target', label: 'In 1' },
        { id: 'in2', direction: 'target', label: 'In 2' },
        { id: 'in3', direction: 'target', label: 'In 3' },
        { id: 'in4', direction: 'target', label: 'In 4' },
        { id: 'out', direction: 'source', label: 'Out Mix' },
        { id: 'out1', direction: 'source', label: 'Out 1' },
        { id: 'out2', direction: 'source', label: 'Out 2' },
        { id: 'out3', direction: 'source', label: 'Out 3' },
        { id: 'out4', direction: 'source', label: 'Out 4' },
    ],
    output: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'masterGain', direction: 'target', label: 'Master' },
    ],
    math: [{ id: 'out', direction: 'source', label: 'Out' }, { id: 'a', direction: 'target', label: 'A' }, { id: 'b', direction: 'target', label: 'B' }],
    compare: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'a', direction: 'target', label: 'A' },
        { id: 'b', direction: 'target', label: 'B' },
    ],
    mix: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'a', direction: 'target', label: 'A' },
        { id: 'b', direction: 'target', label: 'B' },
        { id: 't', direction: 'target', label: 'T' },
    ],
    clamp: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'value', direction: 'target', label: 'Value' },
        { id: 'min', direction: 'target', label: 'Min' },
        { id: 'max', direction: 'target', label: 'Max' },
    ],
    switch: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'index', direction: 'target', label: 'Index' },
        { id: 'in_0', direction: 'target', label: 'In 1' },
        { id: 'in_1', direction: 'target', label: 'In 2' },
        { id: 'in_2', direction: 'target', label: 'In 3' },
    ],
};

export const NODE_CATEGORY_ORDER: PaletteCategory[] = ['Sources', 'MIDI', 'Effects', 'Routing', 'Math'];

export function getNodeCatalogEntry(type: EditorNodeType): NodeCatalogEntry {
    const entry = EDITOR_NODE_CATALOG.find((item) => item.type === type);
    if (!entry) {
        throw new Error(`Unknown editor node type: ${type}`);
    }
    return entry;
}

export function getNodeHandleDescriptors(data: AudioNodeData): HandleDescriptor[] {
    switch (data.type) {
        case 'input': {
            const inputData = data as InputNodeData;
            return inputData.params.map((param) => ({
                id: getInputParamHandleId(param),
                direction: 'source',
                label: param.label || param.name,
            }));
        }
        case 'uiTokens': {
            const uiTokensData = data as UiTokensNodeData;
            return uiTokensData.params.map((param) => ({
                id: getInputParamHandleId(param),
                direction: 'source',
                label: param.label || param.name,
            }));
        }
        case 'math': {
            const mathData = data as MathNodeData;
            const inputs = MATH_OPERATION_INPUT_LABELS[mathData.operation] ?? MATH_OPERATION_INPUT_LABELS.add;
            return [
                { id: 'out', direction: 'source', label: 'Out' },
                ...inputs.map((input) => ({
                    id: input.id,
                    direction: 'target' as const,
                    label: input.label,
                })),
            ];
        }
        case 'switch': {
            const switchData = data as SwitchNodeData;
            const inputs = Math.min(Math.max(switchData.inputs || 2, 2), 8);
            return [
                { id: 'out', direction: 'source', label: 'Out' },
                { id: 'index', direction: 'target', label: 'Index' },
                ...Array.from({ length: inputs }, (_, index) => ({
                    id: `in_${index}`,
                    direction: 'target' as const,
                    label: `In ${index + 1}`,
                })),
            ];
        }
        case 'matrixMixer': {
            const matrixData = data as MatrixMixerNodeData;
            const inputs = Math.min(Math.max(matrixData.inputs || 4, 2), 8);
            const outputs = Math.min(Math.max(matrixData.outputs || 4, 2), 8);
            const handles: HandleDescriptor[] = [
                ...Array.from({ length: inputs }, (_, index) => ({
                    id: `in${index + 1}`,
                    direction: 'target' as const,
                    label: `In ${index + 1}`,
                })),
                { id: 'out', direction: 'source', label: 'Out Mix' },
                ...Array.from({ length: outputs }, (_, index) => ({
                    id: `out${index + 1}`,
                    direction: 'source' as const,
                    label: `Out ${index + 1}`,
                })),
            ];

            for (let row = 0; row < inputs; row++) {
                for (let column = 0; column < outputs; column++) {
                    handles.push({
                        id: `cell:${row}:${column}`,
                        direction: 'target',
                        label: `M${row + 1}${column + 1}`,
                    });
                }
            }
            return handles;
        }
        default:
            return DEFAULT_HANDLES_BY_TYPE[data.type];
    }
}

export function groupCatalogByCategory() {
    return NODE_CATEGORY_ORDER.map((category) => ({
        name: category,
        nodes: EDITOR_NODE_CATALOG.filter((node) => node.category === category),
    }));
}
