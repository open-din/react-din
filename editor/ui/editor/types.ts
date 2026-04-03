import type { Edge, Node, XYPosition } from '@xyflow/react';
import type { MidiTransportSyncMode, MidiValueFormat } from '@din/react/midi';

// ============================================================================
// Audio Node Data Types
// ============================================================================

export interface OscNodeData {
    type: 'osc';
    frequency: number;
    detune: number;
    waveform: OscillatorType;
    label: string;
    [key: string]: unknown;
}

export interface GainNodeData {
    type: 'gain';
    gain: number;
    label: string;
    [key: string]: unknown;
}

export interface FilterNodeData {
    type: 'filter';
    filterType: BiquadFilterType;
    frequency: number;
    detune: number;
    q: number;
    gain: number; // For peaking, lowshelf, highshelf
    label: string;
    [key: string]: unknown;
}

export interface OutputNodeData {
    type: 'output';
    playing: boolean;
    masterGain: number;
    label: string;
    [key: string]: unknown;
}

export interface NoiseNodeData {
    type: 'noise';
    noiseType: 'white' | 'pink' | 'brown';
    label: string;
    [key: string]: unknown;
}

export interface DelayNodeData {
    type: 'delay';
    delayTime: number;
    feedback: number;
    label: string;
    [key: string]: unknown;
}

export interface ReverbNodeData {
    type: 'reverb';
    decay: number;
    mix: number;
    label: string;
    [key: string]: unknown;
}

export interface CompressorNodeData {
    type: 'compressor';
    threshold: number;
    knee: number;
    ratio: number;
    attack: number;
    release: number;
    sidechainStrength?: number;
    label: string;
    [key: string]: unknown;
}

export interface PhaserNodeData {
    type: 'phaser';
    rate: number;
    depth: number;
    feedback: number;
    baseFrequency: number;
    stages: number;
    mix: number;
    label: string;
    [key: string]: unknown;
}

export interface FlangerNodeData {
    type: 'flanger';
    rate: number;
    depth: number;
    feedback: number;
    delay: number;
    mix: number;
    label: string;
    [key: string]: unknown;
}

export interface TremoloNodeData {
    type: 'tremolo';
    rate: number;
    depth: number;
    waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
    stereo: boolean;
    mix: number;
    label: string;
    [key: string]: unknown;
}

export interface EQ3NodeData {
    type: 'eq3';
    low: number;
    mid: number;
    high: number;
    lowFrequency: number;
    highFrequency: number;
    mix: number;
    label: string;
    [key: string]: unknown;
}

export interface DistortionNodeData {
    type: 'distortion';
    distortionType: 'soft' | 'hard' | 'fuzz' | 'bitcrush' | 'saturate';
    drive: number;
    level: number;
    mix: number;
    tone: number;
    label: string;
    [key: string]: unknown;
}

export interface ChorusNodeData {
    type: 'chorus';
    rate: number;
    depth: number;
    feedback: number;
    delay: number;
    mix: number;
    stereo: boolean;
    label: string;
    [key: string]: unknown;
}

export interface NoiseBurstNodeData {
    type: 'noiseBurst';
    noiseType: 'white' | 'pink' | 'brown';
    duration: number;
    gain: number;
    attack: number;
    release: number;
    label: string;
    [key: string]: unknown;
}

export interface WaveShaperNodeData {
    type: 'waveShaper';
    amount: number;
    preset: 'softClip' | 'hardClip' | 'saturate';
    oversample: 'none' | '2x' | '4x';
    label: string;
    [key: string]: unknown;
}

export interface ConvolverNodeData {
    type: 'convolver';
    impulseSrc: string;
    assetPath?: string;
    impulseId?: string;
    impulseFileName?: string;
    normalize: boolean;
    label: string;
    [key: string]: unknown;
}

export interface AnalyzerNodeData {
    type: 'analyzer';
    fftSize: number;
    smoothingTimeConstant: number;
    updateRate: number;
    autoUpdate: boolean;
    label: string;
    [key: string]: unknown;
}

export interface Panner3DNodeData {
    type: 'panner3d';
    positionX: number;
    positionY: number;
    positionZ: number;
    refDistance: number;
    maxDistance: number;
    rolloffFactor: number;
    panningModel: 'equalpower' | 'HRTF';
    distanceModel: 'linear' | 'inverse' | 'exponential';
    label: string;
    [key: string]: unknown;
}

export interface ConstantSourceNodeData {
    type: 'constantSource';
    offset: number;
    label: string;
    [key: string]: unknown;
}

export interface MediaStreamNodeData {
    type: 'mediaStream';
    requestMic: boolean;
    label: string;
    [key: string]: unknown;
}

export interface EventTriggerNodeData {
    type: 'eventTrigger';
    token: number;
    mode: 'change' | 'rising';
    cooldownMs: number;
    velocity: number;
    duration: number;
    note: number;
    trackId: string;
    label: string;
    [key: string]: unknown;
}

export interface StereoPannerNodeData {
    type: 'panner';
    pan: number;
    label: string;
    [key: string]: unknown;
}

export interface MixerNodeData {
    type: 'mixer';
    inputs: number;
    label: string;
    [key: string]: unknown;
}

export interface AuxSendNodeData {
    type: 'auxSend';
    busId: string;
    sendGain: number;
    tap: 'pre' | 'post';
    label: string;
    [key: string]: unknown;
}

export interface AuxReturnNodeData {
    type: 'auxReturn';
    busId: string;
    gain: number;
    label: string;
    [key: string]: unknown;
}

export interface MatrixMixerNodeData {
    type: 'matrixMixer';
    inputs: number;
    outputs: number;
    matrix: number[][];
    label: string;
    [key: string]: unknown;
}

export interface InputParam {
    id: string; // Unique ID for keying
    name: string;
    type: 'float'; // Extensible for later
    defaultValue: number;
    value: number; // Current value
    min: number;
    max: number;
    label?: string; // Optional display label
}

export interface InputNodeData {
    type: 'input';
    params: InputParam[];
    label: string;
    [key: string]: unknown;
}

export interface UiTokensNodeData {
    type: 'uiTokens';
    params: InputParam[];
    label: string;
    [key: string]: unknown;
}

export type MathOperation =
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'multiplyAdd'
    | 'power'
    | 'logarithm'
    | 'sqrt'
    | 'invSqrt'
    | 'abs'
    | 'exp'
    | 'min'
    | 'max'
    | 'lessThan'
    | 'greaterThan'
    | 'sign'
    | 'compare'
    | 'smoothMin'
    | 'smoothMax'
    | 'round'
    | 'floor'
    | 'ceil'
    | 'truncate'
    | 'fraction'
    | 'truncModulo'
    | 'floorModulo'
    | 'wrap'
    | 'snap'
    | 'pingPong'
    | 'sin'
    | 'cos'
    | 'tan'
    | 'asin'
    | 'acos'
    | 'atan'
    | 'atan2'
    | 'sinh'
    | 'cosh'
    | 'tanh';

export type CompareOperation = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';

export type ClampMode = 'minmax' | 'range';

export interface MathNodeData {
    type: 'math';
    operation: MathOperation;
    a: number;
    b: number;
    c: number;
    label: string;
    [key: string]: unknown;
}

export interface CompareNodeData {
    type: 'compare';
    operation: CompareOperation;
    a: number;
    b: number;
    label: string;
    [key: string]: unknown;
}

export interface MixNodeData {
    type: 'mix';
    a: number;
    b: number;
    t: number;
    clamp: boolean;
    label: string;
    [key: string]: unknown;
}

export interface ClampNodeData {
    type: 'clamp';
    mode: ClampMode;
    value: number;
    min: number;
    max: number;
    label: string;
    [key: string]: unknown;
}

export interface SwitchNodeData {
    type: 'switch';
    inputs: number;
    selectedIndex: number;
    values: number[];
    label: string;
    [key: string]: unknown;
}

export interface NoteNodeData {
    type: 'note';
    note: string;
    octave: number;
    frequency: number;
    language: 'en' | 'fr';
    label: string;
    [key: string]: unknown;
}

export interface LFONodeData {
    type: 'lfo';
    rate: number;       // Hz (0.1 - 20)
    depth: number;      // 0 - 1
    waveform: 'sine' | 'square' | 'triangle' | 'sawtooth';
    label: string;
    [key: string]: unknown;
}

export interface ADSRNodeData {
    type: 'adsr';
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    label: string;
    [key: string]: unknown;
}

export interface StepSequencerNodeData {
    type: 'stepSequencer';
    steps: number;
    pattern: number[]; // Velocities (0-1)
    activeSteps: boolean[]; // On/Off toggles
    label: string;
    [key: string]: unknown;
}

export interface NoteEvent {
    pitch: number;      // MIDI note number (0-127)
    step: number;       // Start step (0-based)
    duration: number;   // Duration in steps
    velocity: number;   // 0-1
}

export interface PianoRollNodeData {
    type: 'pianoRoll';
    steps: number;      // 16, 32, 64
    octaves: number;    // 2-4 octaves
    baseNote: number;   // Base MIDI note (e.g., 48 for C3)
    notes: NoteEvent[];
    label: string;
    [key: string]: unknown;
}

export interface TransportNodeData {
    type: 'transport';
    bpm: number;
    playing: boolean;
    beatsPerBar: number;
    beatUnit: number;
    stepsPerBeat: number;
    barsPerPhrase: number;
    swing: number;
    label: string;
    [key: string]: unknown;
}

export interface VoiceNodeData {
    type: 'voice';
    /** Portamento time in seconds */
    portamento: number;
    label: string;
    [key: string]: unknown;
}

export interface SamplerNodeData {
    type: 'sampler';
    src: string;           // URL of the sample
    assetPath?: string;
    loop: boolean;         // Whether to loop
    playbackRate: number;  // Playback speed (1 = normal)
    detune: number;        // Detune in cents
    loaded: boolean;       // Whether the sample is loaded
    sampleId?: string;     // Cache ID for stored audio
    fileName?: string;     // Original file name
    label: string;
    [key: string]: unknown;
}

export interface MidiInMapping {
    mappingId: string;
    inputId: string;
    inputName: string;
    channel: number;
    lastNote: number;
    lastVelocity: number;
    lastSeenAt: number;
}

export interface MidiNoteNodeData {
    type: 'midiNote';
    inputId: string | 'default' | 'all';
    channel: number | 'all';
    noteMode: 'all' | 'single' | 'range';
    note: number;
    noteMin: number;
    noteMax: number;
    mappingEnabled: boolean;
    mappings: MidiInMapping[];
    activeMappingId: string | null;
    label: string;
    [key: string]: unknown;
}

export interface MidiCCNodeData {
    type: 'midiCC';
    inputId: string | 'default' | 'all';
    channel: number | 'all';
    cc: number;
    label: string;
    [key: string]: unknown;
}

export interface MidiNoteOutputNodeData {
    type: 'midiNoteOutput';
    outputId: string | null;
    channel: number;
    gate: number;
    note: number;
    frequency: number;
    velocity: number;
    label: string;
    [key: string]: unknown;
}

export interface MidiCCOutputNodeData {
    type: 'midiCCOutput';
    outputId: string | null;
    channel: number;
    cc: number;
    value: number;
    valueFormat: MidiValueFormat;
    label: string;
    [key: string]: unknown;
}

export interface MidiSyncNodeData {
    type: 'midiSync';
    mode: MidiTransportSyncMode;
    inputId: string | null;
    outputId: string | null;
    sendStartStop: boolean;
    sendClock: boolean;
    label: string;
    [key: string]: unknown;
}

export type AudioNodeData = (
    | OscNodeData
    | GainNodeData
    | FilterNodeData
    | OutputNodeData
    | NoiseNodeData
    | DelayNodeData
    | ReverbNodeData
    | CompressorNodeData
    | PhaserNodeData
    | FlangerNodeData
    | TremoloNodeData
    | EQ3NodeData
    | DistortionNodeData
    | ChorusNodeData
    | NoiseBurstNodeData
    | WaveShaperNodeData
    | ConvolverNodeData
    | AnalyzerNodeData
    | Panner3DNodeData
    | ConstantSourceNodeData
    | MediaStreamNodeData
    | EventTriggerNodeData
    | StereoPannerNodeData
    | MixerNodeData
    | AuxSendNodeData
    | AuxReturnNodeData
    | MatrixMixerNodeData
    | InputNodeData
    | UiTokensNodeData
    | NoteNodeData
    | LFONodeData
    | TransportNodeData
    | StepSequencerNodeData
    | PianoRollNodeData
    | ADSRNodeData
    | VoiceNodeData
    | SamplerNodeData
    | MidiNoteNodeData
    | MidiCCNodeData
    | MidiNoteOutputNodeData
    | MidiCCOutputNodeData
    | MidiSyncNodeData
    | MathNodeData
    | CompareNodeData
    | MixNodeData
    | ClampNodeData
    | SwitchNodeData
) & Record<string, unknown>;

export interface GraphDocument {
    id: string;
    name: string;
    nodes: Node<AudioNodeData>[];
    edges: Edge[];
    createdAt: number;
    updatedAt: number;
    order: number;
}

export interface GraphHistorySnapshot {
    name: string;
    nodes: Node<AudioNodeData>[];
    edges: Edge[];
}

export interface GraphHistoryEntry {
    before: GraphHistorySnapshot;
    after: GraphHistorySnapshot;
    mergeKey?: string;
}

export interface GraphHistoryPendingGroup extends GraphHistoryEntry {
    mergeKey: string;
}

export interface GraphHistoryState {
    undoStack: GraphHistoryEntry[];
    redoStack: GraphHistoryEntry[];
    pendingGroup: GraphHistoryPendingGroup | null;
}

export type GraphHistoryMap = Record<string, GraphHistoryState>;
export type UpdateNodeDataHistoryMode = 'auto' | 'skip';

export interface UpdateNodeDataOptions {
    history?: UpdateNodeDataHistoryMode;
    mergeKey?: string;
}

export type HandleDirection = 'source' | 'target';

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
