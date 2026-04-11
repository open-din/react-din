import { createContext, useContext, type FC, type ReactNode } from 'react';

/**
 * When set, descendants may register a WASM control edge from this LFO node id
 * (e.g. `lfo:out` → `filter:frequency`).
 */
const LfoModulationContext = createContext<string | null>(null);

export const LfoModulationProvider: FC<{ nodeId: string; children: ReactNode }> = ({
    nodeId,
    children,
}) => (
    <LfoModulationContext.Provider value={nodeId}>{children}</LfoModulationContext.Provider>
);

export function useLfoModulatorId(): string | null {
    return useContext(LfoModulationContext);
}
