import type {
    MidiCCOutputProps,
    MidiCCValue,
    MidiNoteOutputProps,
    MidiNoteValue,
    MidiTransportSyncMode,
    MidiTransportSyncProps,
    MidiValueFormat,
} from '../midi/types';

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

interface PatchInterfaceEntryBase<TKind extends string = string> {
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

export interface ImportPatchOptions {
    includeProvider?: boolean;
    assetRoot?: string;
}

export interface PatchMidiNoteOutputBinding extends Omit<MidiNoteOutputProps, 'gate' | 'note' | 'frequency' | 'velocity' | 'triggerToken' | 'duration'> {}

export interface PatchMidiCCOutputBinding extends Omit<MidiCCOutputProps, 'value'> {}

export interface PatchMidiSyncOutputBinding extends MidiTransportSyncProps {}

type InterfaceItems<TPatch extends PatchDocument, TKey extends keyof PatchInterface> =
    TPatch['interface'][TKey] extends readonly (infer TItem)[] ? TItem : never;

type KeysOf<TItems> = TItems extends { key: infer TKey extends string } ? TKey : never;
type ItemByKey<TItems, TKey extends string> = Extract<TItems, { key: TKey }>;

type MidiInputValueFor<TItem> =
    TItem extends { kind: 'midi-note-input' } ? MidiNoteValue
        : TItem extends { kind: 'midi-cc-input' } ? MidiCCValue
            : never;

type MidiOutputBindingFor<TItem> =
    TItem extends { kind: 'midi-note-output' } ? PatchMidiNoteOutputBinding
        : TItem extends { kind: 'midi-cc-output' } ? PatchMidiCCOutputBinding
            : TItem extends { kind: 'midi-sync-output' } ? PatchMidiSyncOutputBinding
                : never;

export type PatchInputProps<TPatch extends PatchDocument> = {
    [TKey in KeysOf<InterfaceItems<TPatch, 'inputs'>>]?: number;
};

export type PatchEventProps<TPatch extends PatchDocument> = {
    [TKey in KeysOf<InterfaceItems<TPatch, 'events'>>]?: unknown;
};

export type PatchMidiInputBindings<TPatch extends PatchDocument> = {
    [TKey in KeysOf<InterfaceItems<TPatch, 'midiInputs'>>]?: MidiInputValueFor<ItemByKey<InterfaceItems<TPatch, 'midiInputs'>, TKey>>;
};

export type PatchMidiOutputBindings<TPatch extends PatchDocument> = {
    [TKey in KeysOf<InterfaceItems<TPatch, 'midiOutputs'>>]?: MidiOutputBindingFor<ItemByKey<InterfaceItems<TPatch, 'midiOutputs'>, TKey>>;
};

export interface PatchMidiBindings<TPatch extends PatchDocument> {
    inputs?: PatchMidiInputBindings<TPatch>;
    outputs?: PatchMidiOutputBindings<TPatch>;
}

export type PatchProps<TPatch extends PatchDocument> =
    PatchInputProps<TPatch>
    & PatchEventProps<TPatch>
    & {
        midi?: PatchMidiBindings<TPatch>;
    };

export type PatchRendererProps<TPatch extends PatchDocument> = PatchProps<TPatch> & {
    patch: TPatch;
    includeProvider?: boolean;
    assetRoot?: string;
};
