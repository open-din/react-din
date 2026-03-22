import type { ReactNode } from 'react';

export type MidiAccessStatus = 'unsupported' | 'idle' | 'pending' | 'granted' | 'denied' | 'error';
export type MidiListenMode = 'default' | 'all';
export type MidiPortSelection = string | 'default' | 'all' | null | undefined;
export type MidiChannelFilter = number | 'all' | null | undefined;
export type MidiNoteFilter = number | [number, number] | null | undefined;
export type MidiTransportSyncMode = 'midi-master' | 'transport-master';
export type MidiMessageKind = 'noteon' | 'noteoff' | 'cc' | 'clock' | 'start' | 'stop' | 'continue' | 'unknown';
export type MidiValueFormat = 'normalized' | 'raw';

export interface MidiPortDescriptor {
    id: string;
    type: 'input' | 'output';
    name: string;
    manufacturer: string;
    state: MIDIPortDeviceState;
    connection: MIDIPortConnectionState;
}

export interface MidiNoteState {
    inputId: string;
    channel: number;
    note: number;
    velocity: number;
    startedAt: number;
    lastUpdatedAt: number;
}

export interface MidiCCState {
    inputId: string;
    channel: number;
    cc: number;
    raw: number;
    normalized: number;
    lastUpdatedAt: number;
}

export interface MidiInputEventData {
    seq: number;
    kind: MidiMessageKind;
    inputId: string;
    channel: number | null;
    note: number | null;
    velocity: number | null;
    cc: number | null;
    rawValue: number | null;
    normalizedValue: number | null;
    bytes: readonly number[];
    receivedAt: number;
}

export interface MidiOutputEventData {
    seq: number;
    kind: MidiMessageKind;
    outputId: string;
    channel: number | null;
    note: number | null;
    velocity: number | null;
    cc: number | null;
    rawValue: number | null;
    normalizedValue: number | null;
    bytes: readonly number[];
    sentAt: number;
}

export interface MidiClockState {
    running: boolean;
    bpmEstimate: number | null;
    tickCount: number;
    lastTickAt: number | null;
    sourceInputId: string | null;
}

export interface MidiRuntimeSnapshot {
    supported: boolean;
    status: MidiAccessStatus;
    error: Error | null;
    inputs: MidiPortDescriptor[];
    outputs: MidiPortDescriptor[];
    defaultInputId: string | null;
    defaultOutputId: string | null;
    listenMode: MidiListenMode;
    lastInputEvent: MidiInputEventData | null;
    lastOutputEvent: MidiOutputEventData | null;
    activeNotes: ReadonlyMap<string, MidiNoteState>;
    ccValues: ReadonlyMap<string, MidiCCState>;
    clock: MidiClockState;
    version: number;
}

export interface MidiRuntimeOptions {
    defaultInputId?: string | null;
    defaultOutputId?: string | null;
    listenMode?: MidiListenMode;
}

export interface MidiSendOptions {
    outputId?: string | null;
    channel?: number;
}

export interface MidiNoteSendOptions extends MidiSendOptions {
    note: number;
    velocity?: number;
}

export interface MidiCCSendOptions extends MidiSendOptions {
    cc: number;
    value: number;
    valueFormat?: MidiValueFormat;
}

export interface MidiNoteFilterOptions {
    inputId?: MidiPortSelection;
    channel?: MidiChannelFilter;
    note?: MidiNoteFilter;
}

export interface MidiCCFilterOptions {
    inputId?: MidiPortSelection;
    channel?: MidiChannelFilter;
    cc: number;
}

export interface MidiClockFilterOptions {
    inputId?: MidiPortSelection;
}

export interface MidiSourceInfo {
    id: string | null;
    name: string | null;
}

export interface MidiNoteValue {
    gate: boolean;
    note: number | null;
    frequency: number | null;
    velocity: number;
    channel: number | null;
    triggerToken: number;
    activeNotes: MidiNoteState[];
    lastEvent: MidiInputEventData | null;
    source: MidiSourceInfo;
}

export interface MidiCCValue {
    raw: number;
    normalized: number;
    channel: number | null;
    lastEvent: MidiInputEventData | null;
    source: MidiSourceInfo;
}

export interface MidiClockValue {
    running: boolean;
    bpmEstimate: number | null;
    tickCount: number;
    lastTickAt: number | null;
    source: MidiSourceInfo;
}

export interface MidiValue {
    supported: boolean;
    status: MidiAccessStatus;
    error: Error | null;
    inputs: MidiPortDescriptor[];
    outputs: MidiPortDescriptor[];
    defaultInputId: string | null;
    defaultOutputId: string | null;
    defaultInput: MidiPortDescriptor | null;
    defaultOutput: MidiPortDescriptor | null;
    listenMode: MidiListenMode;
    lastInputEvent: MidiInputEventData | null;
    lastOutputEvent: MidiOutputEventData | null;
    clock: MidiClockState;
    requestAccess: () => Promise<MidiRuntimeSnapshot>;
    setDefaultInputId: (id: string | null) => void;
    setDefaultOutputId: (id: string | null) => void;
    setListenMode: (mode: MidiListenMode) => void;
    sendNoteOn: (options: MidiNoteSendOptions) => boolean;
    sendNoteOff: (options: MidiNoteSendOptions) => boolean;
    sendCC: (options: MidiCCSendOptions) => boolean;
    sendStart: (options?: MidiSendOptions) => boolean;
    sendStop: (options?: MidiSendOptions) => boolean;
    sendContinue: (options?: MidiSendOptions) => boolean;
    sendClock: (options?: MidiSendOptions) => boolean;
}

export interface MidiStateChangeEvent {
    snapshot: MidiRuntimeSnapshot;
}

export interface MidiProviderProps extends MidiRuntimeOptions {
    children: ReactNode;
    runtime?: MidiRuntime;
    requestOnMount?: boolean;
    onStateChange?: (event: MidiStateChangeEvent) => void;
    onError?: (error: Error) => void;
}

export interface MidiContextValue {
    runtime: MidiRuntime;
    snapshot: MidiRuntimeSnapshot;
}

export interface MidiNoteInputProps extends MidiNoteFilterOptions {
    children: (value: MidiNoteValue) => ReactNode;
}

export interface MidiCCInputProps extends MidiCCFilterOptions {
    children: (value: MidiCCValue) => ReactNode;
}

export interface MidiNoteOutputProps {
    outputId?: string | null;
    channel?: number;
    gate?: boolean;
    note?: number | null;
    frequency?: number | null;
    velocity?: number;
    triggerToken?: unknown;
    duration?: number;
}

export interface MidiCCOutputProps {
    outputId?: string | null;
    channel?: number;
    cc: number;
    value: number;
    valueFormat?: MidiValueFormat;
}

export interface MidiTransportSyncProps {
    mode: MidiTransportSyncMode;
    inputId?: string | null;
    outputId?: string | null;
    sendStartStop?: boolean;
    sendClock?: boolean;
}

export interface MidiRuntime {
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => MidiRuntimeSnapshot;
    requestAccess: () => Promise<MidiRuntimeSnapshot>;
    destroy: () => void;
    setDefaultInputId: (id: string | null) => void;
    setDefaultOutputId: (id: string | null) => void;
    setListenMode: (mode: MidiListenMode) => void;
    sendNoteOn: (options: MidiNoteSendOptions) => boolean;
    sendNoteOff: (options: MidiNoteSendOptions) => boolean;
    sendCC: (options: MidiCCSendOptions) => boolean;
    sendStart: (options?: MidiSendOptions) => boolean;
    sendStop: (options?: MidiSendOptions) => boolean;
    sendContinue: (options?: MidiSendOptions) => boolean;
    sendClock: (options?: MidiSendOptions) => boolean;
}
