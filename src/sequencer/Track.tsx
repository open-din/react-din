import {
    useCallback,
    useEffect,
    useRef,
    useMemo,
    type FC,
} from 'react';
import type { TrackProps, TriggerEvent } from './types';
import { useSequencer } from './Sequencer';
import { TriggerProvider } from './TriggerContext';
import { useAudio } from '../core/AudioProvider';

/**
 * Normalize pattern value to velocity (0-1).
 */
function normalizeVelocity(value: boolean | number | null): number | null {
    if (value === null || value === false || value === 0) {
        return null;
    }
    if (value === true) {
        return 1;
    }
    return Math.max(0, Math.min(1, value));
}

/**
 * Track component that defines a pattern and triggers its children.
 *
 * Must be used within a Sequencer. Each Track provides its own
 * trigger context to children, enabling scoped trigger events.
 *
 * @example
 * ```tsx
 * <Track
 *   id="lead"
 *   pattern={[1, 0.5, 0, 0.8, 1, 0, 0, 0.3]}
 *   probability={0.9}
 * >
 *   <Synth />
 * </Track>
 * ```
 */
export const Track: FC<TrackProps> = ({
    children,
    id,
    steps: trackSteps,
    pattern = [],
    offset = 0,
    mute = false,
    solo: _solo = false,
    probability = 1,
    note = 60,
    data,
    onTrigger,
}) => {
    const { context } = useAudio();
    const { subscribe, totalSteps: sequencerSteps, bpm, stepsPerBeat } = useSequencer();

    const steps = trackSteps ?? sequencerSteps;
    const grid = Math.max(1, stepsPerBeat);
    const stepDuration = 60 / bpm / grid;

    const triggerEventRef = useRef<TriggerEvent | null>(null);
    const subscribersRef = useRef<Set<(event: TriggerEvent) => void>>(new Set());

    // Normalize pattern to full length
    const normalizedPattern = useMemo<(number | null)[]>(() => {
        const result: (number | null)[] = new Array(steps).fill(null);
        for (let i = 0; i < steps; i++) {
            const patternIndex = (i - offset + steps) % steps;
            if (patternIndex < pattern.length) {
                result[i] = normalizeVelocity(pattern[patternIndex]);
            }
        }
        return result;
    }, [pattern, steps, offset]);

    // Subscribe to sequencer steps
    useEffect(() => {
        if (!context) return;

        const unsubscribe = subscribe((sequencerStep, time) => {
            // Calculate which step this track is on
            const trackStep = sequencerStep % steps;
            const velocity = normalizedPattern[trackStep];

            // Check if we should trigger
            if (velocity === null || mute) {
                triggerEventRef.current = null;
                return;
            }

            // Apply probability
            if (probability < 1 && Math.random() > probability) {
                triggerEventRef.current = null;
                return;
            }

            // Create trigger event
            const event: TriggerEvent = {
                step: trackStep,
                velocity,
                time,
                duration: stepDuration,
                trackId: id,
                note,
                data,
            };

            triggerEventRef.current = event;

            // Notify subscribers
            subscribersRef.current.forEach((callback) => {
                callback(event);
            });

            // Fire onTrigger callback
            onTrigger?.(event);
        });

        return unsubscribe;
    }, [context, subscribe, steps, normalizedPattern, mute, probability, stepDuration, id, note, data, onTrigger]);

    /** Stable ref-backed subscribe so TriggerContext does not churn every Sequencer step. */
    const subscribeToTrigger = useCallback((callback: (event: TriggerEvent) => void) => {
        subscribersRef.current.add(callback);
        return () => {
            subscribersRef.current.delete(callback);
        };
    }, []);

    return (
        <TriggerProvider
            trackId={id}
            subscribe={subscribeToTrigger}
            currentTrigger={triggerEventRef.current}
        >
            {children}
        </TriggerProvider>
    );
};
