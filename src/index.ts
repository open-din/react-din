// =============================================================================
// @open-din/react — WASM-first audio runtime for React
// =============================================================================
// Published DSP runs in `din-wasm` (see `Patch`, `PatchRenderer`, `importPatch`).
// `AudioProvider` / `MidiProvider` / transport are host glue (AudioContext unlock,
// routing WASM output, MIDI I/O). Legacy Web Audio *node* components remain on
// deep imports such as `@open-din/react/nodes` for tooling only — do not use them
// in new applications.
// =============================================================================

// -----------------------------------------------------------------------------
// Core
// -----------------------------------------------------------------------------
export {
    // Components
    AudioProvider,
    LfoModulationProvider,
    // Hooks
    useAudio,
    useLfoModulatorId,
    // Internal (advanced use)
    AudioOutProvider,
    useAudioOut,
    // Modulatable utilities
    isLFOOutput,
    getNumericValue,
} from './core';

export type {
    AudioContextRef,
    AudioState,
    AudioProviderProps,
    AudioContextState,
    AudioOutContextValue,
    // Modulatable types
    ModulatableValue,
    LFOOutput,
    LFOWaveform,
} from './core';

// -----------------------------------------------------------------------------
// Transport
// -----------------------------------------------------------------------------
export {
    // Components
    TransportProvider,
    // Hooks
    useTransport,
    useBeat,
    useStep,
    useBar,
    usePhrase,
} from './transport';

export type {
    TimePosition,
    TransportConfig,
    TransportState,
    TransportEvents,
} from './transport';

// -----------------------------------------------------------------------------
// Sequencer
// -----------------------------------------------------------------------------
export {
    // Components
    Sequencer,
    Track,
    EventTrigger,
    // Hooks
    useTrigger,
    useOnTrigger,
    // Context (advanced)
    TriggerContext,
    useTriggerContext,
} from './sequencer';

export type {
    Pattern,
    TriggerEvent,
    EventTriggerMode,
    SequencerProps,
    TrackProps,
    EventTriggerProps,
    UseTriggerOptions,
    SequencerContextValue,
    TrackContextValue,
} from './sequencer';

// -----------------------------------------------------------------------------
// MIDI
// -----------------------------------------------------------------------------
export {
    createMidiRuntime,
    MidiProvider,
    MidiNoteInput,
    MidiCCInput,
    MidiNoteOutput,
    MidiCCOutput,
    MidiTransportSync,
    useMidi,
    useMidiNote,
    useMidiCC,
    useMidiClock,
} from './midi';

export type {
    MidiAccessStatus,
    MidiCCFilterOptions,
    MidiCCInputProps,
    MidiCCOutputProps,
    MidiCCState,
    MidiCCValue,
    MidiChannelFilter,
    MidiClockFilterOptions,
    MidiClockState,
    MidiClockValue,
    MidiContextValue,
    MidiInputEventData,
    MidiListenMode,
    MidiMessageKind,
    MidiNoteFilter,
    MidiNoteFilterOptions,
    MidiNoteInputProps,
    MidiNoteOutputProps,
    MidiNoteState,
    MidiNoteValue,
    MidiOutputEventData,
    MidiPortDescriptor,
    MidiPortSelection,
    MidiProviderProps,
    MidiRuntime,
    MidiRuntimeOptions,
    MidiRuntimeSnapshot,
    MidiSendOptions,
    MidiSourceInfo,
    MidiStateChangeEvent,
    MidiTransportSyncMode,
    MidiTransportSyncProps,
    MidiValue,
    MidiValueFormat,
} from './midi';

// -----------------------------------------------------------------------------
// Patch
// -----------------------------------------------------------------------------
export {
    PATCH_DOCUMENT_VERSION,
    PATCH_INPUT_HANDLE_PREFIX,
    graphDocumentToPatch,
    patchToGraphDocument,
    migratePatchDocument,
    Patch,
    PatchOutput,
    importPatch,
    PatchRenderer,
} from './patch';

export type {
    ImportPatchOptions,
    PatchAudioMetadata,
    PatchConnection,
    PatchDocument,
    PatchEvent,
    PatchInput,
    PatchInterface,
    PatchMidiBindings,
    PatchMidiCCInput,
    PatchMidiCCOutput,
    PatchMidiInput,
    PatchMidiInputBindings,
    PatchMidiNoteInput,
    PatchMidiNoteOutput,
    PatchMidiOutput,
    PatchMidiOutputBindings,
    PatchMidiSyncOutput,
    PatchNode,
    PatchNodeData,
    PatchPosition,
    PatchOutputProps,
    PatchProps,
    PatchRuntimeProps,
    PatchSlot,
    PatchRendererProps,
    SlotType,
} from './patch';

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------
export {
    useFrame,
    tickAudio,
    useAnimationFrame,
    isSSR,
    getAudioContext,
} from './utils';

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------
export {
    math,
    compare,
    mix,
    clamp,
    switchValue,
} from './data';

export type {
    MathOperation,
    CompareOperation,
    ClampMode,
} from './data';

// -----------------------------------------------------------------------------
// Notes
// -----------------------------------------------------------------------------
export {
    parseNote,
    noteToMidi,
    midiToNote,
    midiToFreq,
    noteToFreq,
    noteToFrench,
    noteFromFrench,
} from './notes';

export type {
    NoteName,
    FrenchNoteName,
    NoteString,
    NoteInput,
    ParsedNote,
} from './notes';
