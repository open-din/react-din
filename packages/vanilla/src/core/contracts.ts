export type MidiTransportSyncMode = 'midi-master' | 'transport-master';
export type MidiValueFormat = 'normalized' | 'raw';
export type NoteName =
    | 'C' | 'C#' | 'Db'
    | 'D' | 'D#' | 'Eb'
    | 'E'
    | 'F' | 'F#' | 'Gb'
    | 'G' | 'G#' | 'Ab'
    | 'A' | 'A#' | 'Bb'
    | 'B';

export interface ParsedNote {
    note: NoteName;
    octave: number;
    midi: number;
    frequency: number;
}

export interface PatchPosition {
    x: number;
    y: number;
}

export interface PatchNode<TType extends string = string> {
    id: string;
    type: TType;
    position?: PatchPosition;
    data: {
        type: TType;
        label?: string;
        [key: string]: unknown;
    };
}

export interface PatchConnection {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export interface PatchInterfaceEntryBase<TKind extends string = string> {
    id: string;
    key: string;
    label: string;
    kind: TKind;
    nodeId: string;
}

export interface PatchInput extends PatchInterfaceEntryBase<'input'> {
    paramId: string;
    handle: string;
    defaultValue: number;
    min: number;
    max: number;
}

export interface PatchEvent extends PatchInterfaceEntryBase<'event'> {}

export interface PatchMidiNoteInput extends PatchInterfaceEntryBase<'midi-note-input'> {
    inputId?: string | 'default' | 'all' | null;
    channel?: number | 'all';
    noteMode?: 'all' | 'single' | 'range';
    note?: number;
    noteMin?: number;
    noteMax?: number;
}

export interface PatchMidiCCInput extends PatchInterfaceEntryBase<'midi-cc-input'> {
    inputId?: string | 'default' | 'all' | null;
    channel?: number | 'all';
    cc: number;
}

export type PatchMidiInput = PatchMidiNoteInput | PatchMidiCCInput;

export interface PatchMidiNoteOutput extends PatchInterfaceEntryBase<'midi-note-output'> {
    outputId?: string | null;
    channel?: number;
    note?: number;
    frequency?: number;
    velocity?: number;
}

export interface PatchMidiCCOutput extends PatchInterfaceEntryBase<'midi-cc-output'> {
    outputId?: string | null;
    channel?: number;
    cc: number;
    valueFormat?: MidiValueFormat;
}

export interface PatchMidiSyncOutput extends PatchInterfaceEntryBase<'midi-sync-output'> {
    mode: MidiTransportSyncMode;
    inputId?: string | null;
    outputId?: string | null;
    sendStartStop?: boolean;
    sendClock?: boolean;
}

export type PatchMidiOutput = PatchMidiNoteOutput | PatchMidiCCOutput | PatchMidiSyncOutput;

export interface PatchInterface {
    inputs: readonly PatchInput[];
    events: readonly PatchEvent[];
    midiInputs: readonly PatchMidiInput[];
    midiOutputs: readonly PatchMidiOutput[];
}

export interface PatchDocument {
    version: 1;
    name: string;
    nodes: readonly PatchNode[];
    connections: readonly PatchConnection[];
    interface: PatchInterface;
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

export type NoiseType = 'white' | 'pink' | 'brown' | 'blue' | 'violet';

export type DistortionCurveType = 'soft' | 'hard' | 'fuzz' | 'bitcrush' | 'saturate';

export type WaveShaperCurvePreset = 'softClip' | 'hardClip' | 'saturate';

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

export interface ReverbImpulseFrames {
    left: Float32Array;
    right: Float32Array;
}

export interface DinCoreBackend {
    readonly runtime: 'fallback' | 'wasm';
    readonly patchDocumentVersion: 1;
    readonly patchInputHandlePrefix: 'param:';
    math: (operation: MathOperation, a?: number, b?: number, c?: number) => number;
    compare: (operation: CompareOperation, a?: number, b?: number) => number;
    mix: (a?: number, b?: number, t?: number, clampMix?: boolean) => number;
    clamp: (value?: number, min?: number, max?: number, mode?: ClampMode) => number;
    switchValue: (index: number, values: readonly number[], fallback?: number) => number;
    parseNote: (input: string | number) => ParsedNote;
    noteToMidi: (note: string, octave?: number | null) => number;
    midiToNote: (midi: number, preferFlats?: boolean) => string;
    midiToFreq: (midi: number) => number;
    noteToFreq: (note: string | number, octave?: number | null) => number;
    noteToFrench: (note: string) => string;
    noteFromFrench: (note: string) => string;
    createDistortionCurve: (
        type: DistortionCurveType,
        drive: number,
        samples?: number
    ) => Float32Array;
    createWaveShaperCurve: (
        amount: number,
        preset: WaveShaperCurvePreset,
        samples?: number
    ) => Float32Array;
    fillNoiseSamples: (
        type: NoiseType,
        sampleCount: number,
        target?: Float32Array
    ) => Float32Array;
    createReverbImpulseFrames: (
        sampleRate: number,
        decay: number,
        preDelay?: number,
        damping?: number
    ) => ReverbImpulseFrames;
    graphDocumentToPatch: (graph: GraphDocumentLike) => PatchDocument;
    migratePatchDocument: (patch: PatchDocument) => PatchDocument;
    patchToGraphDocument: (
        patch: PatchDocument,
        options?: PatchToGraphOptions
    ) => {
        id: string;
        name: string;
        nodes: Array<{
            id: string;
            type: string;
            position: { x: number; y: number };
            dragHandle: '.node-header';
            data: Record<string, unknown>;
        }>;
        edges: Array<{
            id: string;
            source: string;
            sourceHandle?: string;
            target: string;
            targetHandle?: string;
            animated: boolean;
            style: Record<string, string | number>;
        }>;
        createdAt: number;
        updatedAt: number;
        order: number;
    };
    isAudioConnectionLike: (
        connection: Pick<PatchConnection, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
        nodeById: Map<string, PatchNode>
    ) => boolean;
    getTransportConnections: (
        connections: readonly PatchConnection[],
        nodeById: Map<string, PatchNode>
    ) => Set<string>;
    resolvePatchAssetPath: (assetPath: string | undefined, assetRoot?: string) => string | undefined;
    buildPatchInterface: (nodes: readonly PatchNode[]) => PatchInterface;
}

export interface PatchMidiOutputSeed extends PatchInterfaceEntryBase<'midi-sync-output' | 'midi-note-output' | 'midi-cc-output'> {
    mode?: MidiTransportSyncMode;
    valueFormat?: MidiValueFormat;
}
