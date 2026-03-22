import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    type FC,
    type ReactNode,
} from 'react';
import type { TransportState, TransportConfig, TimePosition, TransportEvents } from './types';
import { useAudio } from '../core/AudioProvider';

/**
 * Default transport configuration.
 */
const DEFAULT_CONFIG: TransportConfig = {
    bpm: 120,
    beatsPerBar: 4,
    beatUnit: 4,
    barsPerPhrase: 4,
    stepsPerBeat: 4,
    swing: 0,
    swingSubdivision: 2,
    mode: 'raf',
};

/**
 * Default time position.
 */
const DEFAULT_POSITION: TimePosition = {
    step: 0,
    beat: 0,
    bar: 0,
    phrase: 0,
    totalSteps: 0,
    totalTime: 0,
};

/**
 * Transport context for musical timing.
 */
export const TransportContext = createContext<TransportState | null>(null);

/**
 * Props for TransportProvider.
 */
export interface TransportProviderProps extends Partial<TransportConfig>, TransportEvents {
    children: ReactNode;
}

/**
 * Transport provider component for musical timing and playback control.
 *
 * Manages tempo, time signature, and provides timing information
 * to all child components.
 *
 * @example
 * ```tsx
 * <AudioProvider>
 *   <TransportProvider bpm={128} beatsPerBar={4}>
 *     <Sequencer>
 *       <Track id="drums">
 *         <DrumMachine />
 *       </Track>
 *     </Sequencer>
 *   </TransportProvider>
 * </AudioProvider>
 * ```
 */
export const TransportProvider: FC<TransportProviderProps> = ({
    children,
    bpm = DEFAULT_CONFIG.bpm,
    beatsPerBar = DEFAULT_CONFIG.beatsPerBar,
    beatUnit = DEFAULT_CONFIG.beatUnit,
    barsPerPhrase = DEFAULT_CONFIG.barsPerPhrase,
    stepsPerBeat = DEFAULT_CONFIG.stepsPerBeat,
    swing = DEFAULT_CONFIG.swing,
    swingSubdivision = DEFAULT_CONFIG.swingSubdivision,
    mode = DEFAULT_CONFIG.mode,
    onStep,
    onBeat,
    onBar,
    onPhrase,
    onPlay,
    onStop,
    onPause,
}) => {
    const { context, isUnlocked } = useAudio();
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState<TimePosition>(DEFAULT_POSITION);
    const [config, setConfigState] = useState<TransportConfig>({
        bpm,
        beatsPerBar,
        beatUnit,
        barsPerPhrase,
        stepsPerBeat,
        swing,
        swingSubdivision,
        mode,
    });

    const schedulerRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const nextStepTimeRef = useRef<number>(0);

    // Calculate durations
    const beatDuration = 60 / config.bpm;
    const stepDuration = beatDuration / config.stepsPerBeat;
    const barDuration = beatDuration * config.beatsPerBar;
    const phraseDuration = barDuration * config.barsPerPhrase;

    // Play control
    const play = useCallback(() => {
        if (!context || !isUnlocked) return;
        setIsPlaying(true);
        startTimeRef.current = context.currentTime;
        nextStepTimeRef.current = context.currentTime;
        onPlay?.();
    }, [context, isUnlocked, onPlay]);

    // Stop control
    const stop = useCallback(() => {
        setIsPlaying(false);
        setPosition(DEFAULT_POSITION);
        if (schedulerRef.current) {
            cancelAnimationFrame(schedulerRef.current);
            schedulerRef.current = null;
        }
        onStop?.();
    }, [onStop]);

    // Pause control
    const pause = useCallback(() => {
        setIsPlaying(false);
        if (schedulerRef.current) {
            cancelAnimationFrame(schedulerRef.current);
            schedulerRef.current = null;
        }
        onPause?.();
    }, [onPause]);

    // Seek to position
    const seek = useCallback((targetPosition: Partial<TimePosition>) => {
        const stepsPerBar = config.stepsPerBeat * config.beatsPerBar;
        const stepsPerPhrase = stepsPerBar * config.barsPerPhrase;

        const newPhrase = targetPosition.phrase ?? position.phrase;
        const newBar = targetPosition.bar ?? position.bar;
        const newBeat = targetPosition.beat ?? position.beat;
        const newStep = targetPosition.step ?? position.step;

        const totalSteps =
            newPhrase * stepsPerPhrase +
            newBar * stepsPerBar +
            newBeat * config.stepsPerBeat +
            newStep;

        setPosition({
            step: newStep,
            beat: newBeat,
            bar: newBar,
            phrase: newPhrase,
            totalSteps,
            totalTime: totalSteps * stepDuration,
        });
    }, [position, config, stepDuration]);

    // Set tempo
    const setTempo = useCallback((newBpm: number) => {
        const nextBpm = Math.max(20, Math.min(300, newBpm));
        setConfigState((prev) => (prev.bpm === nextBpm ? prev : { ...prev, bpm: nextBpm }));
    }, []);

    // Set config
    const setConfig = useCallback((updates: Partial<TransportConfig>) => {
        setConfigState((prev) => {
            const next = { ...prev, ...updates };
            const changed = Object.keys(updates).some((key) => {
                const typedKey = key as keyof TransportConfig;
                return !Object.is(prev[typedKey], next[typedKey]);
            });
            return changed ? next : prev;
        });
    }, []);

    // Toggle play/stop
    const toggle = useCallback(() => {
        if (isPlaying) {
            stop();
        } else {
            play();
        }
    }, [isPlaying, play, stop]);

    // Reset position without stopping
    const reset = useCallback(() => {
        setPosition(DEFAULT_POSITION);
        if (context) {
            nextStepTimeRef.current = context.currentTime;
        }
    }, [context]);

    // Manual update for 'manual' mode
    const update = useCallback((now?: number) => {
        if (config.mode !== 'manual' || !context || !isPlaying) return;

        const currentTime = now ?? context.currentTime;
        const stepsPerBar = config.stepsPerBeat * config.beatsPerBar;
        const stepsPerPhrase = stepsPerBar * config.barsPerPhrase;
        const lookAhead = 0.1;

        while (nextStepTimeRef.current < currentTime + lookAhead) {
            const stepTime = nextStepTimeRef.current;
            const totalSteps = position.totalSteps;

            const currentPhrase = Math.floor(totalSteps / stepsPerPhrase);
            const stepsInPhrase = totalSteps % stepsPerPhrase;
            const currentBar = Math.floor(stepsInPhrase / stepsPerBar);
            const stepsInBar = stepsInPhrase % stepsPerBar;
            const currentBeat = Math.floor(stepsInBar / config.stepsPerBeat);
            const currentStep = stepsInBar % config.stepsPerBeat;

            onStep?.(currentStep, stepTime);
            if (currentStep === 0) {
                onBeat?.(currentBeat, stepTime);
                if (currentBeat === 0) {
                    onBar?.(currentBar, stepTime);
                    if (currentBar === 0) {
                        onPhrase?.(currentPhrase, stepTime);
                    }
                }
            }

            setPosition({
                step: currentStep,
                beat: currentBeat,
                bar: currentBar,
                phrase: currentPhrase,
                totalSteps: totalSteps + 1,
                totalTime: (totalSteps + 1) * stepDuration,
            });

            let swingOffset = 0;
            if (config.swing && config.swingSubdivision) {
                const isSwungStep = (totalSteps + 1) % config.swingSubdivision === 1;
                if (isSwungStep) {
                    swingOffset = stepDuration * (config.swing ?? 0) * 0.5;
                }
            }

            nextStepTimeRef.current += stepDuration + swingOffset;
        }
    }, [config, context, isPlaying, position.totalSteps, stepDuration, onStep, onBeat, onBar, onPhrase]);

    // Individual setters
    const setBpm = useCallback((newBpm: number) => {
        const nextBpm = Math.max(20, Math.min(300, newBpm));
        setConfigState((prev) => (prev.bpm === nextBpm ? prev : { ...prev, bpm: nextBpm }));
    }, []);

    const setTimeSignature = useCallback((beatsPerBar: number, beatUnit = 4) => {
        setConfigState((prev) => (
            prev.beatsPerBar === beatsPerBar && prev.beatUnit === beatUnit
                ? prev
                : { ...prev, beatsPerBar, beatUnit }
        ));
    }, []);

    const setStepsPerBeat = useCallback((steps: number) => {
        setConfigState((prev) => (prev.stepsPerBeat === steps ? prev : { ...prev, stepsPerBeat: steps }));
    }, []);

    const setPhraseBars = useCallback((bars: number) => {
        setConfigState((prev) => (prev.barsPerPhrase === bars ? prev : { ...prev, barsPerPhrase: bars }));
    }, []);

    // Scheduler loop (only for 'raf' mode)
    useEffect(() => {
        if (!isPlaying || !context || config.mode === 'manual') return;

        const stepsPerBar = config.stepsPerBeat * config.beatsPerBar;
        const stepsPerPhrase = stepsPerBar * config.barsPerPhrase;

        const schedule = () => {
            const lookAhead = 0.1; // Look-ahead time in seconds
            const currentTime = context.currentTime;

            while (nextStepTimeRef.current < currentTime + lookAhead) {
                const stepTime = nextStepTimeRef.current;
                const totalSteps = position.totalSteps;

                // Calculate position from total steps
                const currentPhrase = Math.floor(totalSteps / stepsPerPhrase);
                const stepsInPhrase = totalSteps % stepsPerPhrase;
                const currentBar = Math.floor(stepsInPhrase / stepsPerBar);
                const stepsInBar = stepsInPhrase % stepsPerBar;
                const currentBeat = Math.floor(stepsInBar / config.stepsPerBeat);
                const currentStep = stepsInBar % config.stepsPerBeat;

                // Fire callbacks
                onStep?.(currentStep, stepTime);

                if (currentStep === 0) {
                    onBeat?.(currentBeat, stepTime);

                    if (currentBeat === 0) {
                        onBar?.(currentBar, stepTime);

                        if (currentBar === 0) {
                            onPhrase?.(currentPhrase, stepTime);
                        }
                    }
                }

                // Update position
                setPosition({
                    step: currentStep,
                    beat: currentBeat,
                    bar: currentBar,
                    phrase: currentPhrase,
                    totalSteps: totalSteps + 1,
                    totalTime: (totalSteps + 1) * stepDuration,
                });

                // Calculate next step time with swing
                let swingOffset = 0;
                if (config.swing && config.swingSubdivision) {
                    const isSwungStep = (totalSteps + 1) % config.swingSubdivision === 1;
                    if (isSwungStep) {
                        swingOffset = stepDuration * (config.swing ?? 0) * 0.5;
                    }
                }

                nextStepTimeRef.current += stepDuration + swingOffset;
            }

            schedulerRef.current = requestAnimationFrame(schedule);
        };

        schedulerRef.current = requestAnimationFrame(schedule);

        return () => {
            if (schedulerRef.current) {
                cancelAnimationFrame(schedulerRef.current);
            }
        };
    }, [isPlaying, context, config, position.totalSteps, stepDuration, onStep, onBeat, onBar, onPhrase]);

    // Build state value
    const value: TransportState = {
        ...position,
        isPlaying,
        bpm: config.bpm,
        stepDuration,
        beatDuration,
        barDuration,
        phraseDuration,
        play,
        stop,
        pause,
        seek,
        setTempo,
        setConfig,
        toggle,
        reset,
        update,
        setBpm,
        setTimeSignature,
        setStepsPerBeat,
        setPhraseBars,
    };

    return (
        <TransportContext.Provider value={value}>
            {children}
        </TransportContext.Provider>
    );
};
