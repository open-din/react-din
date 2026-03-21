import type { ReactNode, RefObject } from 'react';
import type { ModulatableValue } from '../core/ModulatableValue';

// =============================================================================
// Base Node Props
// =============================================================================

/**
 * Base props shared by all audio node components.
 */
export interface AudioNodeProps {
    children?: ReactNode;

    /**
     * Ref to access the underlying WebAudio AudioNode instance.
     */
    nodeRef?: RefObject<AudioNode | null>;

    /**
     * Bypass this node in the audio graph.
     * When true, input is passed directly to output without processing.
     * @default false
     */
    bypass?: boolean;

    /**
     * Unique identifier for debugging and DevTools.
     */
    id?: string;
}

// =============================================================================
// Gain
// =============================================================================

/**
 * Props for the Gain component.
 */
export interface GainProps extends AudioNodeProps {
    /**
     * Gain value.
     * - 0 = silence
     * - 1 = unity (no change)
     * - >1 = amplification
     * Can be a fixed number or an LFO for modulation.
     * @default 1
     */
    gain?: ModulatableValue;

    /**
     * Base value when using LFO modulation.
     * The LFO will modulate around this value.
     * @default 1
     */
    gainBase?: number;

    /**
     * Target time for parameter automation (seconds from now).
     * When set, gain will ramp to the specified value over this duration.
     */
    rampTo?: number;

    /**
     * Type of ramp to use for automation.
     * @default 'exponential'
     */
    rampType?: 'linear' | 'exponential';
}

// =============================================================================
// Filter
// =============================================================================

/**
 * Filter types supported by BiquadFilterNode.
 */
export type FilterType =
    | 'lowpass'
    | 'highpass'
    | 'bandpass'
    | 'lowshelf'
    | 'highshelf'
    | 'peaking'
    | 'notch'
    | 'allpass';

/**
 * Props for the Filter component.
 */
export interface FilterProps extends AudioNodeProps {
    /**
     * Filter type.
     * @default 'lowpass'
     */
    type?: FilterType;

    /**
     * Cutoff/center frequency in Hz.
     * Can be a fixed number or an LFO for modulation.
     * @default 350
     */
    frequency?: ModulatableValue;

    /**
     * Base frequency when using LFO modulation.
     * The LFO will modulate around this value.
     */
    frequencyBase?: number;

    /**
     * Q (quality) factor.
     * Higher values create a narrower resonance.
     * Can be a fixed number or an LFO for modulation.
     * @default 1
     */
    Q?: ModulatableValue;

    /**
     * Base Q when using LFO modulation.
     */
    QBase?: number;

    /**
     * Gain in dB (for peaking and shelf filters).
     * @default 0
     */
    gain?: ModulatableValue;

    /**
     * Base gain in dB when using modulation.
     */
    gainBase?: number;

    /**
     * Detune in cents.
     * @default 0
     */
    detune?: ModulatableValue;

    /**
     * Base detune in cents when using modulation.
     */
    detuneBase?: number;
}

// =============================================================================
// Oscillator
// =============================================================================

/**
 * Oscillator waveform types.
 */
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'custom';

/**
 * Props for the Osc (oscillator) component.
 */
export interface OscProps extends AudioNodeProps {
    /**
     * Waveform type.
     * @default 'sine'
     */
    type?: OscillatorType;

    /**
     * Frequency in Hz.
     * Can be a fixed number or an LFO for modulation.
     * @default 440
     */
    frequency?: ModulatableValue;

    /**
     * Base frequency when using LFO modulation.
     * The LFO will modulate around this value.
     * @default 440
     */
    frequencyBase?: number;

    /**
     * Detune in cents.
     * Can be a fixed number or an LFO for modulation.
     * @default 0
     */
    detune?: ModulatableValue;

    /**
     * Base detune when using LFO modulation.
     * @default 0
     */
    detuneBase?: number;

    /**
     * Start the oscillator immediately on mount.
     * @default false
     */
    autoStart?: boolean;

    /**
     * Custom periodic wave for 'custom' type.
     */
    periodicWave?: PeriodicWave;

    /**
     * Override nodeRef type for OscillatorNode specifically.
     */
    nodeRef?: RefObject<OscillatorNode | null>;
}

// =============================================================================
// Delay
// =============================================================================

/**
 * Props for the Delay component.
 */
export interface DelayProps extends AudioNodeProps {
    /**
     * Delay time in seconds.
     * @default 0
     */
    delayTime?: number;

    /**
     * Maximum delay time in seconds.
     * Set at creation time and cannot be changed.
     * @default 1
     */
    maxDelayTime?: number;
}

// =============================================================================
// Compressor
// =============================================================================

/**
 * Props for the Compressor (DynamicsCompressor) component.
 */
export interface CompressorProps extends AudioNodeProps {
    /**
     * Threshold in dB above which compression starts.
     * @default -24
     */
    threshold?: number;

    /**
     * Knee width in dB for soft compression transition.
     * @default 30
     */
    knee?: number;

    /**
     * Compression ratio (e.g., 12 = 12:1).
     * @default 12
     */
    ratio?: number;

    /**
     * Attack time in seconds.
     * @default 0.003
     */
    attack?: number;

    /**
     * Release time in seconds.
     * @default 0.25
     */
    release?: number;

    /**
     * Optional sidechain bus identifier.
     * When set, the compressor listens to the matching aux bus and applies
     * ducking gain reduction to its main input.
     */
    sidechainBusId?: string;

    /**
     * Strength of sidechain ducking (0-1).
     * @default 0.7
     */
    sidechainStrength?: number;

    /**
     * Override nodeRef type for DynamicsCompressorNode specifically.
     */
    nodeRef?: RefObject<DynamicsCompressorNode | null>;
}

// =============================================================================
// Convolver
// =============================================================================

/**
 * Props for the Convolver component (convolution reverb).
 */
export interface ConvolverProps extends AudioNodeProps {
    /**
     * Impulse response buffer or URL to load.
     */
    impulse?: AudioBuffer | string;

    /**
     * Whether to normalize the impulse response.
     * @default true
     */
    normalize?: boolean;

    /**
     * Callback when impulse response is loaded (if URL provided).
     */
    onLoad?: (buffer: AudioBuffer) => void;

    /**
     * Callback on load error.
     */
    onError?: (error: Error) => void;

    /**
     * Override nodeRef type for ConvolverNode specifically.
     */
    nodeRef?: RefObject<ConvolverNode | null>;
}

// =============================================================================
// Panner (3D)
// =============================================================================

/**
 * Props for the Panner component (3D spatial audio).
 */
export interface PannerProps extends AudioNodeProps {
    /** X position in 3D space. @default 0 */
    positionX?: number;
    /** Y position in 3D space. @default 0 */
    positionY?: number;
    /** Z position in 3D space. @default 0 */
    positionZ?: number;

    /** X orientation. @default 1 */
    orientationX?: number;
    /** Y orientation. @default 0 */
    orientationY?: number;
    /** Z orientation. @default 0 */
    orientationZ?: number;

    /**
     * Panning algorithm.
     * @default 'equalpower'
     */
    panningModel?: 'equalpower' | 'HRTF';

    /**
     * Distance attenuation model.
     * @default 'inverse'
     */
    distanceModel?: 'linear' | 'inverse' | 'exponential';

    /** Reference distance. @default 1 */
    refDistance?: number;
    /** Maximum distance. @default 10000 */
    maxDistance?: number;
    /** Rolloff factor. @default 1 */
    rolloffFactor?: number;

    /** Cone inner angle in degrees. @default 360 */
    coneInnerAngle?: number;
    /** Cone outer angle in degrees. @default 360 */
    coneOuterAngle?: number;
    /** Gain outside the cone. @default 0 */
    coneOuterGain?: number;

    /**
     * Override nodeRef type for PannerNode specifically.
     */
    nodeRef?: RefObject<PannerNode | null>;
}

// =============================================================================
// StereoPanner
// =============================================================================

/**
 * Props for the StereoPanner component (simple left/right panning).
 */
export interface StereoPannerProps extends AudioNodeProps {
    /**
     * Pan value.
     * -1 = full left
     *  0 = center
     *  1 = full right
     * @default 0
     */
    pan?: number;

    /**
     * Override nodeRef type for StereoPannerNode specifically.
     */
    nodeRef?: RefObject<StereoPannerNode | null>;
}

// =============================================================================
// WaveShaper
// =============================================================================

/**
 * Oversample options for WaveShaper.
 */
export type OversampleType = 'none' | '2x' | '4x';

/**
 * Props for the WaveShaper component (distortion/waveshaping).
 */
export interface WaveShaperProps extends AudioNodeProps {
    /**
     * The shaping curve.
     * A Float32Array of values between -1 and 1.
     */
    curve?: Float32Array | null;

    /**
     * Oversampling rate for higher quality.
     * @default 'none'
     */
    oversample?: OversampleType;

    /**
     * Override nodeRef type for WaveShaperNode specifically.
     */
    nodeRef?: RefObject<WaveShaperNode | null>;
}
