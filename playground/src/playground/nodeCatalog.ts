import type {
    AudioNodeData,
    InputNodeData,
    MathNodeData,
    SwitchNodeData,
} from './store';
import { getInputParamHandleId } from './handleIds';

export type PlaygroundNodeType = AudioNodeData['type'];
export type HandleDirection = 'source' | 'target';
export type PaletteCategory = 'Sources' | 'Effects' | 'Routing' | 'Math';

export interface HandleDescriptor {
    id: string;
    direction: HandleDirection;
    label: string;
}

export interface NodeCatalogEntry {
    type: PlaygroundNodeType;
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

export const PLAYGROUND_NODE_CATALOG: NodeCatalogEntry[] = [
    { type: 'input', category: 'Sources', label: 'Params', icon: '⏱️', color: '#dddddd' },
    { type: 'transport', category: 'Sources', label: 'Transport', icon: '⏯️', color: '#dddddd', singleton: true },
    { type: 'stepSequencer', category: 'Sources', label: 'Step Sequencer', icon: '🎹', color: '#dddddd' },
    { type: 'pianoRoll', category: 'Sources', label: 'Piano Roll', icon: '🎼', color: '#44ccff' },
    { type: 'lfo', category: 'Sources', label: 'LFO', icon: '🌀', color: '#aa44ff' },
    { type: 'voice', category: 'Sources', label: 'Voice', icon: '🗣️', color: '#ff4466' },
    { type: 'adsr', category: 'Sources', label: 'ADSR', icon: '📈', color: '#dddddd' },
    { type: 'note', category: 'Sources', label: 'Note', icon: '🎵', color: '#ffcc00' },
    { type: 'osc', category: 'Sources', label: 'Oscillator', icon: '◐', color: '#ff8844' },
    { type: 'noise', category: 'Sources', label: 'Noise', icon: '〰️', color: '#888888' },
    { type: 'sampler', category: 'Sources', label: 'Sampler', icon: '🎹', color: '#44ccff' },
    { type: 'gain', category: 'Effects', label: 'Gain', icon: '◧', color: '#44cc44' },
    { type: 'filter', category: 'Effects', label: 'Filter', icon: '◇', color: '#aa44ff' },
    { type: 'delay', category: 'Effects', label: 'Delay', icon: '⏱️', color: '#4488ff' },
    { type: 'reverb', category: 'Effects', label: 'Reverb', icon: '🏛️', color: '#8844ff' },
    { type: 'panner', category: 'Effects', label: 'Pan', icon: '↔️', color: '#44ffff' },
    { type: 'mixer', category: 'Routing', label: 'Mixer', icon: '⊕', color: '#ffaa44' },
    { type: 'output', category: 'Routing', label: 'Output', icon: '🔊', color: '#ff4466', singleton: true },
    { type: 'math', category: 'Math', label: 'Math', icon: 'fx', color: '#7bd1ff' },
    { type: 'compare', category: 'Math', label: 'Compare', icon: '>=', color: '#7bd1ff' },
    { type: 'mix', category: 'Math', label: 'Mix', icon: 'mix', color: '#7bd1ff' },
    { type: 'clamp', category: 'Math', label: 'Clamp', icon: '[]', color: '#7bd1ff' },
    { type: 'switch', category: 'Math', label: 'Switch', icon: 'sw', color: '#7bd1ff' },
];

const DEFAULT_HANDLES_BY_TYPE: Record<PlaygroundNodeType, HandleDescriptor[]> = {
    input: [],
    transport: [{ id: 'out', direction: 'source', label: 'Clock' }],
    stepSequencer: [
        { id: 'transport', direction: 'target', label: 'Transport' },
        { id: 'trigger', direction: 'source', label: 'Trigger' },
    ],
    pianoRoll: [
        { id: 'transport', direction: 'target', label: 'Transport' },
        { id: 'trigger', direction: 'source', label: 'Trigger' },
    ],
    lfo: [{ id: 'out', direction: 'source', label: 'Out' }],
    voice: [
        { id: 'trigger', direction: 'target', label: 'Trigger' },
        { id: 'note', direction: 'source', label: 'Freq' },
        { id: 'gate', direction: 'source', label: 'Gate' },
        { id: 'velocity', direction: 'source', label: 'Velocity' },
    ],
    adsr: [
        { id: 'gate', direction: 'target', label: 'Gate' },
        { id: 'envelope', direction: 'source', label: 'Envelope' },
    ],
    note: [{ id: 'freq', direction: 'source', label: 'Frequency' }],
    osc: [
        { id: 'out', direction: 'source', label: 'Audio Out' },
        { id: 'frequency', direction: 'target', label: 'Freq' },
        { id: 'detune', direction: 'target', label: 'Detune' },
    ],
    noise: [{ id: 'out', direction: 'source', label: 'Audio Out' }],
    sampler: [
        { id: 'out', direction: 'source', label: 'Out' },
        { id: 'trigger', direction: 'target', label: 'Trigger' },
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
    ],
    panner: [
        { id: 'in', direction: 'target', label: 'In' },
        { id: 'out', direction: 'source', label: 'Out' },
    ],
    mixer: [
        { id: 'in1', direction: 'target', label: 'In 1' },
        { id: 'in2', direction: 'target', label: 'In 2' },
        { id: 'in3', direction: 'target', label: 'In 3' },
        { id: 'out', direction: 'source', label: 'Out' },
    ],
    output: [{ id: 'in', direction: 'target', label: 'In' }],
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

export const NODE_CATEGORY_ORDER: PaletteCategory[] = ['Sources', 'Effects', 'Routing', 'Math'];

export function getNodeCatalogEntry(type: PlaygroundNodeType): NodeCatalogEntry {
    const entry = PLAYGROUND_NODE_CATALOG.find((item) => item.type === type);
    if (!entry) {
        throw new Error(`Unknown playground node type: ${type}`);
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
        default:
            return DEFAULT_HANDLES_BY_TYPE[data.type];
    }
}

export function groupCatalogByCategory() {
    return NODE_CATEGORY_ORDER.map((category) => ({
        name: category,
        nodes: PLAYGROUND_NODE_CATALOG.filter((node) => node.category === category),
    }));
}
