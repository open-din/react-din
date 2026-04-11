import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    type FC,
} from 'react';
import type {
    AudioProviderProps,
    AudioContextState,
    AudioState,
    AudioContextRef,
} from './types';
import { AudioOutProvider } from './AudioOutContext';
import { PATCH_MASTER_OUTPUT_NODE_ID, PatchGraphProvider } from './PatchGraphContext';
import { PatchRuntimeProvider } from './PatchRuntimeProvider';
import { ensureWasmInitialized } from '../runtime/wasm/loadWasmOnce';
import { ensureDinAudioWorkletLoaded } from '../runtime/wasm/loadDinAudioWorklet';
import { setupUnlock, setupGestureUnlock } from './unlock';

/**
 * Internal context for the audio system.
 */
const AudioContext = createContext<AudioContextState | null>(null);

/**
 * Root provider that owns the AudioContext and manages the audio graph.
 *
 * Features:
 * - Creates and owns the AudioContext (SSR-safe)
 * - Handles user gesture unlock automatically
 * - Provides master bus (GainNode) for global volume control
 * - Exposes context state via useAudio() hook
 *
 * @example
 * ```tsx
 * <AudioProvider masterGain={0.8} onUnlock={() => console.log('Audio ready!')}>
 *   <MyAudioGraph />
 * </AudioProvider>
 * ```
 */
export const AudioProvider: FC<AudioProviderProps> = ({
    children,
    contextOptions,
    manualUnlock = false,
    createOnUserGesture = false,
    debug = false,
    masterGain: initialMasterGain = 1,
    paramTransport = 'auto',
    onStateChange,
    onUnlock,
    onError,
}) => {
    // SSR safety: only create AudioContext on client
    const [context, setContext] = useState<AudioContextRef>(null);
    /** State (not only a ref) so children like `PatchRuntimeProvider` re-render when the bus exists. */
    const [masterBus, setMasterBus] = useState<GainNode | null>(null);
    const [state, setState] = useState<AudioState>('suspended');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const unlockedRef = useRef(false);
    const contextRef = useRef<AudioContextRef>(null);
    const masterBusRef = useRef<GainNode | null>(null);
    const contextCleanupRef = useRef<(() => void) | null>(null);
    const unlockCleanupRef = useRef<(() => void) | null>(null);

    const log = useCallback((...args: unknown[]) => {
        if (!debug) return;
        console.info('[@open-din/react]', ...args);
    }, [debug]);

    const createContext = useCallback((): AudioContextRef => {
        if (typeof window === 'undefined') return null;
        if (contextRef.current) return contextRef.current;

        try {
            const AudioContextClass =
                window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

            if (!AudioContextClass) {
                throw new Error('WebAudio API not supported');
            }

            const ctx = new AudioContextClass(contextOptions);
            const masterBus = ctx.createGain();
            masterBus.gain.value = initialMasterGain;
            masterBus.connect(ctx.destination);

            contextRef.current = ctx;
            masterBusRef.current = masterBus;
            setMasterBus(masterBus);
            setContext(ctx);
            setState(ctx.state as AudioState);
            log('AudioContext created', { state: ctx.state, sampleRate: ctx.sampleRate });

            unlockedRef.current = ctx.state === 'running';
            setIsUnlocked(unlockedRef.current);
            if (unlockedRef.current && !manualUnlock) {
                onUnlock?.();
                log('AudioContext already running');
            }

            const handleStateChange = () => {
                const newState = ctx.state as AudioState;
                setState(newState);
                onStateChange?.(newState);
                log('AudioContext state change', newState);

                if (newState === 'running' && !unlockedRef.current) {
                    unlockedRef.current = true;
                    setIsUnlocked(true);
                    onUnlock?.();
                    log('AudioContext unlocked');
                }
            };

            ctx.addEventListener('statechange', handleStateChange);

            contextCleanupRef.current = () => {
                ctx.removeEventListener('statechange', handleStateChange);
                ctx.close();
            };

            return ctx;
        } catch (error) {
            log('AudioContext creation failed', error);
            onError?.(error as Error);
            return null;
        }
    }, [contextOptions, initialMasterGain, log, manualUnlock, onError, onStateChange, onUnlock]);

    // Unlock function
    const unlock = useCallback(async () => {
        const ctx = contextRef.current ?? createContext();
        if (!ctx) {
            log('AudioContext unavailable, unlock skipped');
            return;
        }

        log('AudioContext unlock requested', { state: ctx.state });

        if (ctx.state === 'running') {
            void ensureDinAudioWorkletLoaded(ctx).catch(() => {});
            if (!unlockedRef.current) {
                unlockedRef.current = true;
                setIsUnlocked(true);
                onUnlock?.();
                log('AudioContext already running');
            }
            return;
        }

        try {
            await ctx.resume();
        } catch (error) {
            log('AudioContext resume failed', error);
            onError?.(error as Error);
            return;
        }

        void ensureDinAudioWorkletLoaded(ctx).catch(() => {
            /* worklet may still load on first PatchRuntime rebuild */
        });

        unlockedRef.current = true;
        setIsUnlocked(true);
        onUnlock?.();
        log('AudioContext unlocked');
    }, [createContext, log, onError, onUnlock]);

    // Initialize AudioContext and unlock handling
    useEffect(() => {
        if (typeof window === 'undefined') return;

        ensureWasmInitialized().catch((error) => {
            console.error('[AudioProvider] WASM init failed:', error);
        });

        unlockCleanupRef.current?.();
        unlockCleanupRef.current = null;

        if (createOnUserGesture) {
            if (!manualUnlock) {
                log('Waiting for user gesture to create AudioContext');
                unlockCleanupRef.current = setupGestureUnlock(() => {
                    log('User gesture detected');
                    void unlock();
                });
            }
            return;
        }

        const ctx = createContext();
        if (!ctx) return;

        if (!manualUnlock) {
            unlockCleanupRef.current = setupUnlock(ctx, () => {
                if (unlockedRef.current) return;
                unlockedRef.current = true;
                setIsUnlocked(true);
                onUnlock?.();
                log('AudioContext unlocked');
            });
        }
    }, [createContext, createOnUserGesture, log, manualUnlock, onUnlock, unlock]);

    useEffect(() => {
        return () => {
            unlockCleanupRef.current?.();
            unlockCleanupRef.current = null;
            contextCleanupRef.current?.();
            contextCleanupRef.current = null;
            contextRef.current = null;
            masterBusRef.current = null;
        };
    }, []);

    // Master gain control
    const setMasterGain = useCallback((gain: number) => {
        if (masterBusRef.current) {
            masterBusRef.current.gain.value = Math.max(0, Math.min(1, gain));
        }
    }, []);

    // Build context value
    const value: AudioContextState = {
        context,
        state,
        masterBus,
        isUnlocked,
        debug,
        unlock,
        setMasterGain,
        sampleRate: context?.sampleRate ?? 44100,
        get currentTime() {
            return context?.currentTime ?? 0;
        },
    };

    return (
        <AudioContext.Provider value={value}>
            <PatchGraphProvider>
                <PatchRuntimeProvider
                    masterBus={masterBus}
                    sampleRate={masterBus?.context.sampleRate ?? context?.sampleRate ?? 44100}
                    paramTransport={paramTransport}
                    debug={debug}
                >
                    <AudioOutProvider
                        node={masterBus}
                        nodeId={PATCH_MASTER_OUTPUT_NODE_ID}
                        inputHandle="input"
                    >
                        {children}
                    </AudioOutProvider>
                </PatchRuntimeProvider>
            </PatchGraphProvider>
        </AudioContext.Provider>
    );
};

/**
 * Hook to access the AudioContext and audio system state.
 * Must be used within an AudioProvider.
 *
 * @throws Error if used outside AudioProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { context, isUnlocked, currentTime } = useAudio();
 *   // ...
 * }
 * ```
 */
export function useAudio(): AudioContextState {
    const ctx = useContext(AudioContext);
    if (!ctx) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return ctx;
}
