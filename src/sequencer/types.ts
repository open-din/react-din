import type { ReactNode } from 'react';

// =============================================================================
// Pattern
// =============================================================================

/**
 * Pattern data for a track.
 *
 * Each element represents a step:
 * - `true` or `1` = trigger with full velocity
 * - `false`, `0`, or `null` = no trigger
 * - `0.5` = trigger with 50% velocity
 */
export type Pattern = (boolean | number | null)[];

// =============================================================================
// Trigger Event
// =============================================================================

/**
 * Trigger event data passed to instruments via useTrigger().
 */
export interface TriggerEvent {
    /**
     * The step index that triggered (0-indexed).
     */
    step: number;

    /**
     * Velocity/intensity of the trigger (0-1).
     * Derived from the pattern value.
     */
    velocity: number;

    /**
     * Precise AudioContext time when the trigger should occur.
     * Use this for sample-accurate scheduling.
     */
    time: number;

    /**
     * Duration in seconds until the next step.
     * Useful for setting note length.
     */
    duration: number;

    /**
     * ID of the track that owns this trigger.
     */
    trackId: string;

    /**
     * Additional custom data attached to the trigger.
     */
    /**
     * Additional custom data attached to the trigger.
     */
    data?: Record<string, unknown>;

    /**
     * MIDI note number (0-127).
     * @default 60 (C4)
     */
    note: number;
}

// =============================================================================
// Sequencer Props
// =============================================================================

/**
 * Props for the Sequencer component.
 */
export interface SequencerProps {
    children: ReactNode;

    /**
     * Tempo in BPM.
     * Overrides the global transport tempo if set.
     */
    bpm?: number;

    /**
     * Number of steps in the sequence.
     * @default 16
     */
    steps?: number;

    /**
     * Subdivision steps per quarter-note beat (e.g. 4 = sixteenth notes in 4/4).
     * This controls transport timing; it is **not** the pattern length — use `steps` for that.
     * @default 4
     */
    stepsPerBeat?: number;

    /**
     * When set, transport play/pause is controlled by the parent (e.g. keep the graph mounted while stopped).
     */
    playing?: boolean;

    /**
     * Auto-start playback on mount.
     * @default false
     */
    autoStart?: boolean;

    /**
     * Loop the sequence when it reaches the end.
     * @default true
     */
    loop?: boolean;

    /**
     * Look-ahead time in seconds for scheduling.
     * Higher values improve timing accuracy but increase latency.
     * @default 0.1
     */
    lookAhead?: number;

    /**
     * Schedule interval in milliseconds.
     * How often to check and schedule upcoming events.
     * @default 25
     */
    scheduleInterval?: number;

    /**
     * Callback fired on each step.
     */
    onStep?: (step: number, time: number) => void;

    /**
     * Callback fired when the sequence completes (if not looping).
     */
    onComplete?: () => void;

    /**
     * Callback fired when playback starts.
     */
    onStart?: () => void;

    /**
     * Callback fired when playback stops.
     */
    onStop?: () => void;
}

// =============================================================================
// Track Props
// =============================================================================

/**
 * Props for the Track component.
 */
export interface TrackProps {
    children: ReactNode;

    /**
     * Unique identifier for this track.
     * Required for scoped triggers and debugging.
     */
    id: string;

    /**
     * Number of steps for this track.
     * Inherits from parent Sequencer if not set.
     */
    steps?: number;

    /**
     * Pattern data defining when triggers fire.
     * @see Pattern
     */
    pattern?: Pattern;

    /**
     * Offset in steps from the sequence start.
     * Use for creating grooves and polyrhythms.
     * @default 0
     */
    offset?: number;

    /**
     * Mute this track (no triggers fire).
     * @default false
     */
    mute?: boolean;

    /**
     * Solo this track (only this track plays).
     * @default false
     */
    solo?: boolean;

    /**
     * Probability of each trigger firing (0-1).
     * 1 = always fire, 0.5 = 50% chance, etc.
     * @default 1
     */
    probability?: number;

    /**
     * MIDI note number (0-127) to use for triggers from this track.
     * @default 60
     */
    note?: number;

    /**
     * Custom data to attach to all triggers from this track.
     */
    data?: Record<string, unknown>;

    /**
     * Callback fired when this track triggers.
     */
    onTrigger?: (event: TriggerEvent) => void;
}

// =============================================================================
// EventTrigger Props
// =============================================================================

/**
 * Event trigger detection mode.
 */
export type EventTriggerMode = 'change' | 'rising';

/**
 * Props for the EventTrigger component.
 */
export interface EventTriggerProps {
    children: ReactNode;

    /**
     * Input token observed for event detection.
     * When this value changes (or rises in `rising` mode), a trigger is emitted.
     */
    token: unknown;

    /**
     * Detection mode.
     * @default 'change'
     */
    mode?: EventTriggerMode;

    /**
     * Minimum delay between emitted events in milliseconds.
     * @default 0
     */
    cooldownMs?: number;

    /**
     * Emitted trigger velocity.
     * @default 1
     */
    velocity?: number;

    /**
     * Emitted trigger duration in seconds.
     * @default 0.1
     */
    duration?: number;

    /**
     * Emitted trigger MIDI note.
     * @default 60
     */
    note?: number;

    /**
     * Track ID attached to emitted events.
     * @default 'event'
     */
    trackId?: string;

    /**
     * Custom payload attached to emitted trigger events.
     */
    data?: Record<string, unknown>;
}

// =============================================================================
// useTrigger Options
// =============================================================================

/**
 * Options for the useTrigger hook.
 */
export interface UseTriggerOptions {
    /**
     * Only receive triggers from a specific track ID.
     * By default, receives triggers from the nearest parent Track.
     */
    trackId?: string;

    /**
     * Minimum time between triggers in milliseconds.
     * Helps prevent rapid re-triggering.
     */
    debounce?: number;

    /**
     * Only fire on specific steps.
     * Array of step indices to respond to.
     */
    steps?: number[];
}

// =============================================================================
// Sequencer Context
// =============================================================================

/**
 * Sequencer context value for internal use.
 * @internal
 */
export interface SequencerContextValue {
    /**
     * Current step index.
     */
    currentStep: number;

    /**
     * Total number of steps.
     */
    totalSteps: number;

    /**
     * Steps per beat (timing grid), e.g. 4 for 16th notes.
     */
    stepsPerBeat: number;

    /**
     * Whether the sequencer is playing.
     */
    isPlaying: boolean;

    /**
     * Current tempo.
     */
    bpm: number;

    /**
     * Subscribe to step events.
     */
    subscribe: (callback: (step: number, time: number) => void) => () => void;
}

// =============================================================================
// Track Context
// =============================================================================

/**
 * Track context value for scoped triggers.
 * @internal
 */
export interface TrackContextValue {
    /**
     * Track ID.
     */
    trackId: string;

    /**
     * Subscribe to trigger events for this track.
     */
    subscribe: (callback: (event: TriggerEvent) => void) => () => void;

    /**
     * Current trigger event (if any).
     */
    currentTrigger: TriggerEvent | null;
}
