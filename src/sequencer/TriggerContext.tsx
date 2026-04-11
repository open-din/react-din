import { createContext, useContext, useMemo, type FC, type ReactNode } from 'react';
import type { TriggerEvent, TrackContextValue } from './types';

/**
 * Default trigger context value.
 */
const defaultValue: TrackContextValue = {
    trackId: '',
    subscribe: () => () => { },
    currentTrigger: null,
};

/**
 * Trigger context for scoped trigger events.
 * Each Track provides its own trigger context.
 */
export const TriggerContext = createContext<TrackContextValue>(defaultValue);

/**
 * Props for TriggerProvider.
 */
interface TriggerProviderProps {
    children: ReactNode;
    trackId: string;
    subscribe: (callback: (event: TriggerEvent) => void) => () => void;
    currentTrigger: TriggerEvent | null;
}

/**
 * Provider for trigger context within a Track.
 * @internal
 */
export const TriggerProvider: FC<TriggerProviderProps> = ({
    children,
    trackId,
    subscribe,
    currentTrigger,
}) => {
    const value = useMemo<TrackContextValue>(
        () => ({
            trackId,
            subscribe,
            currentTrigger,
        }),
        [trackId, subscribe, currentTrigger]
    );

    return (
        <TriggerContext.Provider value={value}>
            {children}
        </TriggerContext.Provider>
    );
};

/**
 * Hook to access the trigger context.
 * Returns the context for the nearest parent Track.
 */
export function useTriggerContext(): TrackContextValue {
    return useContext(TriggerContext);
}
