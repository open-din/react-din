import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
    type FC,
} from 'react';
import type { MidiContextValue, MidiProviderProps, MidiRuntime } from './types';
import { createMidiRuntime } from './runtime';

const sharedRuntime = createMidiRuntime();
const MidiContext = createContext<MidiContextValue | null>(null);

function useMidiSnapshot(runtime: MidiRuntime) {
    return useSyncExternalStore(runtime.subscribe, runtime.getSnapshot, runtime.getSnapshot);
}

/**
 * React context provider that wires Web MIDI permissions, default ports, and error hooks.
 */
export const MidiProvider: FC<MidiProviderProps> = ({
    children,
    runtime = sharedRuntime,
    requestOnMount = false,
    defaultInputId,
    defaultOutputId,
    listenMode,
    onStateChange,
    onError,
}) => {
    const snapshot = useMidiSnapshot(runtime);

    useEffect(() => {
        if (defaultInputId !== undefined) {
            runtime.setDefaultInputId(defaultInputId);
        }
    }, [defaultInputId, runtime]);

    useEffect(() => {
        if (defaultOutputId !== undefined) {
            runtime.setDefaultOutputId(defaultOutputId);
        }
    }, [defaultOutputId, runtime]);

    useEffect(() => {
        if (listenMode !== undefined) {
            runtime.setListenMode(listenMode);
        }
    }, [listenMode, runtime]);

    useEffect(() => {
        if (!requestOnMount || snapshot.status === 'pending' || snapshot.status === 'granted') return;
        void runtime.requestAccess().catch((error) => {
            onError?.(error instanceof Error ? error : new Error('Failed to request MIDI access'));
        });
    }, [onError, requestOnMount, runtime, snapshot.status]);

    useEffect(() => {
        onStateChange?.({ snapshot });
    }, [onStateChange, snapshot]);

    useEffect(() => {
        if (!snapshot.error) return;
        onError?.(snapshot.error);
    }, [onError, snapshot.error]);

    const value = useMemo<MidiContextValue>(() => ({ runtime, snapshot }), [runtime, snapshot]);

    return (
        <MidiContext.Provider value={value}>
            {children}
        </MidiContext.Provider>
    );
};

/**
 * Returns the current MIDI React context (runtime + snapshot).
 *
 * @throws When used outside of `MidiProvider`.
 * @returns MIDI context value from the nearest provider.
 */
export function useMidiContext(): MidiContextValue {
    const context = useContext(MidiContext);
    if (!context) {
        throw new Error('useMidiContext must be used within a MidiProvider');
    }
    return context;
}
