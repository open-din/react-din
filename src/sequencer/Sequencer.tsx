import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    type FC,
} from 'react';
import type { SequencerProps, SequencerContextValue } from './types';
import { useAudio } from '../core/AudioProvider';
import {
    bumpWasmDebugCounter,
    getWasmModuleSync,
    isWasmReady,
} from '../runtime/wasm/loadWasmOnce';

const defaultValue: SequencerContextValue = {
    currentStep: 0,
    totalSteps: 16,
    stepsPerBeat: 4,
    isPlaying: false,
    bpm: 120,
    subscribe: () => () => { },
};

export const SequencerContext = createContext<SequencerContextValue>(defaultValue);

type TransportRuntimeLike = {
    play: () => void;
    stop: () => void;
    reset: () => void;
    isPlaying: () => boolean;
    advanceSeconds: (deltaSeconds: number) => unknown;
    stepIndex: () => bigint;
    secondsPerStep: () => number;
    free?: () => void;
    seekToStep?: (step: bigint) => void;
};

function createRuntime(bpm: number, stepsPerBeat: number): TransportRuntimeLike | null {
    if (!isWasmReady()) return null;
    const wasm = getWasmModuleSync();
    if (!wasm?.TransportRuntime?.fromConfig) return null;
    /** 5th arg is subdivisions per beat (e.g. 4 = 16ths), not total pattern length. */
    const runtime = wasm.TransportRuntime.fromConfig(
        bpm,
        4,
        4,
        1,
        Math.max(1, Math.floor(stepsPerBeat)),
        0,
        'tick'
    ) as TransportRuntimeLike;
    bumpWasmDebugCounter('sequencerRuntimeCreated');
    return runtime;
}

function readTransportTickStepIndex(tick: unknown): number {
    if (!tick || typeof tick !== 'object') return 0;
    const o = tick as Record<string, unknown>;
    const v = o.step_index ?? o.stepIndex;
    return typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0;
}

function seekRuntime(runtime: TransportRuntimeLike, step: number): void {
    const nextStep = BigInt(Math.max(0, Math.floor(step)));
    if (typeof runtime.seekToStep === 'function') {
        runtime.seekToStep(nextStep);
        return;
    }
    runtime.reset();
    const seconds = Number(nextStep) * runtime.secondsPerStep();
    if (seconds > 0) {
        runtime.advanceSeconds(seconds);
    }
}

export const Sequencer: FC<SequencerProps> = ({
    children,
    bpm = 120,
    steps = 16,
    stepsPerBeat = 4,
    playing: playingProp,
    autoStart = false,
    loop = true,
    onStep,
    onComplete,
    onStart,
    onStop: _onStop,
}) => {
    useAudio();
    const controlled = playingProp !== undefined;
    const [internalPlaying, setInternalPlaying] = useState(autoStart);
    const isPlaying = controlled ? Boolean(playingProp) : internalPlaying;
    const [currentStep, setCurrentStep] = useState(0);
    const currentStepRef = useRef(0);

    const subscribersRef = useRef<Set<(step: number, time: number) => void>>(new Set());
    const runtimeRef = useRef<TransportRuntimeLike | null>(null);
    const lastNowRef = useRef<number | null>(null);
    const fallbackCarryRef = useRef(0);
    const fallbackStepRef = useRef(0);

    useEffect(() => {
        currentStepRef.current = currentStep;
    }, [currentStep]);

    const subscribe = useCallback((callback: (step: number, time: number) => void) => {
        subscribersRef.current.add(callback);
        return () => {
            subscribersRef.current.delete(callback);
        };
    }, []);

    const start = useCallback(() => {
        if (runtimeRef.current) {
            runtimeRef.current.reset();
            runtimeRef.current.play();
        }
        setCurrentStep(0);
        if (!controlled) {
            setInternalPlaying(true);
        }
        lastNowRef.current = null;
        fallbackCarryRef.current = 0;
        fallbackStepRef.current = 0;
        onStart?.();
    }, [controlled, onStart]);

    useEffect(() => {
        const previous = runtimeRef.current;
        const nextRuntime = createRuntime(bpm, stepsPerBeat);
        const wasPlaying = isPlaying;
        const preserveStep = currentStepRef.current;
        runtimeRef.current = nextRuntime;
        previous?.free?.();
        if (!nextRuntime) {
            return;
        }
        seekRuntime(nextRuntime, preserveStep);
        if (wasPlaying) {
            nextRuntime.play();
        }
    }, [bpm, stepsPerBeat, isPlaying]);

    useEffect(() => {
        if (controlled || !autoStart || isPlaying) return;
        start();
    }, [autoStart, controlled, isPlaying, start]);

    useEffect(() => {
        let disposed = false;
        let rafId = 0;
        const tick = () => {
            if (disposed) return;
            const now = performance.now() / 1000;
            if (lastNowRef.current === null) {
                lastNowRef.current = now;
            }
            const delta = Math.max(0, now - lastNowRef.current);
            lastNowRef.current = now;

            const runtime = runtimeRef.current;
            if (!runtime && isPlaying) {
                const stepDuration = (60 / bpm) / Math.max(1, stepsPerBeat);
                fallbackCarryRef.current += delta;
                while (fallbackCarryRef.current >= stepDuration) {
                    fallbackCarryRef.current -= stepDuration;
                    const step = fallbackStepRef.current;
                    subscribersRef.current.forEach((callback) => {
                        callback(step, now);
                    });
                    onStep?.(step, now);
                    setCurrentStep(step);
                    fallbackStepRef.current += 1;
                    if (fallbackStepRef.current >= steps) {
                        if (loop) {
                            fallbackStepRef.current = 0;
                        } else {
                            if (!controlled) setInternalPlaying(false);
                            onComplete?.();
                            break;
                        }
                    }
                }
            } else if (runtime && isPlaying && runtime.isPlaying()) {
                bumpWasmDebugCounter('sequencerAdvanceCalls');
                const ticks = runtime.advanceSeconds(delta);
                const tickList = Array.isArray(ticks) ? ticks : [];
                for (let i = 0; i < tickList.length; i += 1) {
                    const absStep = readTransportTickStepIndex(tickList[i]);
                    const step = absStep % Math.max(1, steps);
                    subscribersRef.current.forEach((callback) => {
                        callback(step, now);
                    });
                    onStep?.(step, now);
                    setCurrentStep(step);
                    if (step === steps - 1) {
                        if (loop) {
                            runtime.reset();
                            runtime.play();
                        } else {
                            runtime.stop();
                            if (!controlled) setInternalPlaying(false);
                            onComplete?.();
                        }
                    }
                }
            }

            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => {
            disposed = true;
            cancelAnimationFrame(rafId);
        };
    }, [bpm, isPlaying, loop, onComplete, onStep, steps, stepsPerBeat]);

    useEffect(() => {
        return () => {
            runtimeRef.current?.free?.();
            runtimeRef.current = null;
        };
    }, []);

    const value: SequencerContextValue = {
        currentStep,
        totalSteps: steps,
        stepsPerBeat,
        isPlaying,
        bpm,
        subscribe,
    };

    return (
        <SequencerContext.Provider value={value}>
            {children}
        </SequencerContext.Provider>
    );
};

export function useSequencer(): SequencerContextValue {
    return useContext(SequencerContext);
}
