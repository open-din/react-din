import type { ReactNode } from 'react';

// =============================================================================
// SSR Safety
// =============================================================================

/**
 * SSR-safe AudioContext reference.
 * Will be null during server-side rendering.
 */
export type AudioContextRef = AudioContext | null;

/**
 * State of the audio system
 */
export type AudioState = 'suspended' | 'running' | 'closed';

// =============================================================================
// AudioProvider
// =============================================================================

/**
 * Configuration options for the AudioProvider component.
 */
export interface AudioProviderProps {
    children: ReactNode;

    /**
     * Override default AudioContext options.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext
     */
    contextOptions?: AudioContextOptions;

    /**
     * Disable automatic user gesture unlock.
     * When true, you must call `unlock()` manually from useAudio().
     * @default false
     */
    manualUnlock?: boolean;

    /**
     * Defer AudioContext creation until a user gesture is detected.
     * Useful for browsers that require activation before context creation.
     * @default false
     */
    createOnUserGesture?: boolean;

    /**
     * Master gain level (0-1).
     * Controls the volume of the master bus.
     * @default 1
     */
    masterGain?: number;

    /**
     * Callback fired when the AudioContext state changes.
     */
    onStateChange?: (state: AudioState) => void;

    /**
     * Callback fired when the AudioContext is successfully unlocked
     * after a user gesture.
     */
    onUnlock?: () => void;

    /**
     * Callback fired if AudioContext creation fails.
     */
    onError?: (error: Error) => void;

    /**
     * Enable debug logging for audio lifecycle and node connections.
     * @default false
     */
    debug?: boolean;

    /**
     * How real-time WASM node parameters are sent to the AudioWorklet.
     * - `auto`: SharedArrayBuffer when `crossOriginIsolated`, else postMessage
     * - `sab`: force SharedArrayBuffer (falls back internally if unavailable)
     * - `postMessage`: per-parameter messages only
     * @default 'auto'
     */
    paramTransport?: 'auto' | 'sab' | 'postMessage';
}

// =============================================================================
// Audio Context State
// =============================================================================

/**
 * Audio context state exposed via the useAudio() hook.
 * Provides access to the WebAudio context and system state.
 */
export interface AudioContextState {
    /**
     * The WebAudio AudioContext instance.
     * Will be null during SSR or before initialization.
     */
    context: AudioContextRef;

    /**
     * Current state of the AudioContext.
     */
    state: AudioState;

    /**
     * Master output node (GainNode).
     * All audio in the graph connects to this node before reaching destination.
     */
    masterBus: GainNode | null;

    /**
     * Whether the AudioContext has been unlocked via user gesture.
     * Many browsers require a user interaction before audio can play.
     */
    isUnlocked: boolean;

    /**
     * Whether debug logging is enabled.
     */
    debug: boolean;

    /**
     * Manually unlock/resume the AudioContext.
     * Typically called in response to a user gesture.
     * @returns Promise that resolves when context is running
     */
    unlock: () => Promise<void>;

    /**
     * Set the master gain level.
     * @param gain - Gain value (0 = silence, 1 = unity)
     */
    setMasterGain: (gain: number) => void;

    /**
     * Current sample rate of the AudioContext.
     */
    sampleRate: number;

    /**
     * Current time from the AudioContext's internal clock.
     * Use this for scheduling precise audio events.
     */
    currentTime: number;
}

// =============================================================================
// Internal Output Context
// =============================================================================

/**
 * Internal context value for tracking the current output node.
 * Used to automatically connect child nodes to their parent.
 * @internal
 */
export interface AudioOutContextValue {
    /**
     * The current output node that children should connect to.
     */
    outputNode: AudioNode | null;

    /**
     * Patch-graph node id routed as parent for WASM graph connections.
     */
    nodeId: string | null;

    /**
     * Input handle used when wiring a child node to the parent patch node.
     */
    inputHandle: string;

    /**
     * Register a new output node for children to connect to.
     * @param node - The AudioNode to set as the output
     */
    setOutputNode: (node: AudioNode) => void;
}
