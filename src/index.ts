// =============================================================================
// react-din - Declarative WebAudio for React
// =============================================================================
// A React-first library for building audio graphs declaratively.
// =============================================================================

// -----------------------------------------------------------------------------
// Core
// -----------------------------------------------------------------------------
export {
    // Components
    AudioProvider,
    // Hooks
    useAudio,
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
// Nodes
// -----------------------------------------------------------------------------
export {
    // Components
    Gain,
    Filter,
    Osc,
    Delay,
    Compressor,
    Convolver,
    Panner,
    StereoPanner,
    WaveShaper,
    PresetWaveShaper,
    ADSR,
    DEFAULT_ADSR,
    // Hooks
    useAudioNode,
} from './nodes';

export type {
    AudioNodeProps,
    GainProps,
    FilterProps,
    FilterType,
    OscProps,
    OscillatorType,
    DelayProps,
    CompressorProps,
    ConvolverProps,
    PannerProps,
    StereoPannerProps,
    WaveShaperProps,
    OversampleType,
    WaveShaperPreset,
    PresetWaveShaperProps,
    ADSRProps,
    ADSRConfig,
} from './nodes';

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
// Analyzers
// -----------------------------------------------------------------------------
export {
    // Components
    Analyzer,
    // Hooks
    useAnalyzer,
    useFFT,
    useMeter,
    useWaveform,
    useRMS,
    usePeak,
} from './analyzers';

export type {
    AnalyzerData,
    AnalyzerProps,
    UseAnalyzerOptions,
    FFTData,
    WaveformData,
    MeterData,
} from './analyzers';

// -----------------------------------------------------------------------------
// Sources
// -----------------------------------------------------------------------------
export {
    Sampler,
    TriggeredSampler,
    Noise,
    NoiseBurst,
    MediaStream,
    ConstantSource,
    // LFO
    LFO,
    useLFO,
} from './sources';

export type {
    SourceNodeProps,
    SamplerProps,
    TriggeredSamplerProps,
    NoiseProps,
    NoiseType,
    NoiseBurstProps,
    MediaStreamProps,
    ConstantSourceProps,
    // LFO types
    LFOProps,
    UseLFOOptions,
} from './sources';


// -----------------------------------------------------------------------------
// Effects (Extension)
// -----------------------------------------------------------------------------
export {
    Reverb,
    Chorus,
    Distortion,
    Phaser,
    Flanger,
    Tremolo,
    EQ3,
} from './effects';

export type {
    EffectProps,
    ReverbProps,
    ReverbType,
    ChorusProps,
    DistortionProps,
    DistortionType,
    PhaserProps,
    FlangerProps,
    TremoloProps,
    EQ3Props,
} from './effects';

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------
export {
    AuxSend,
    AuxReturn,
    MatrixMixer,
} from './routing';

export type {
    RoutingNodeProps,
    AuxSendProps,
    AuxReturnProps,
    MatrixMixerProps,
} from './routing';

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

// -----------------------------------------------------------------------------
// Synths
// -----------------------------------------------------------------------------
export {
    Synth,
    MonoSynth,
    FMSynth,
    AMSynth,
    NoiseSynth,
    DrumSynth,
    Envelope,
    useEnvelope,
    DEFAULT_ENVELOPE,
    DEFAULT_OSCILLATOR,
    DEFAULT_FILTER,
    Voice,
    PolyVoice,
} from './synths';

export type {
    EnvelopeConfig,
    OscillatorConfig,
    OscillatorWaveType,
    FilterConfig,
    FilterTypeOption,
    BaseSynthProps,
    SynthProps,
    MonoSynthProps,
    FMSynthProps,
    AMSynthProps,
    NoiseSynthProps,
    EnvelopeProps,
    UseEnvelopeResult,
    DrumSynthProps,
    DrumOscillatorConfig,
    DrumNoiseConfig,
    VoiceProps,
    VoiceRenderProps,
    PolyVoiceProps,
} from './synths';
