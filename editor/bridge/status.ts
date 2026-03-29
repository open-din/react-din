import { useSyncExternalStore } from 'react';

export type McpBridgePhase =
    | 'offline'
    | 'discovering'
    | 'connecting'
    | 'active'
    | 'error';

export interface McpBridgeStatus {
    phase: McpBridgePhase;
    message: string;
    sessionId: string | null;
    bridgeUrl: string | null;
    serverVersion: string | null;
    certificateFingerprint256: string | null;
    readOnly: boolean;
    updatedAt: number;
}

const DEFAULT_STATUS: McpBridgeStatus = {
    phase: 'offline',
    message: 'Waiting for the local MCP bridge.',
    sessionId: null,
    bridgeUrl: null,
    serverVersion: null,
    certificateFingerprint256: null,
    readOnly: false,
    updatedAt: 0,
};

let currentStatus: McpBridgeStatus = DEFAULT_STATUS;
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function getMcpBridgeStatus(): McpBridgeStatus {
    return currentStatus;
}

export function setMcpBridgeStatus(next: Partial<McpBridgeStatus>) {
    currentStatus = {
        ...currentStatus,
        ...next,
        updatedAt: Date.now(),
    };
    emit();
}

export function resetMcpBridgeStatus() {
    currentStatus = DEFAULT_STATUS;
    emit();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useMcpBridgeStatus() {
    return useSyncExternalStore(subscribe, getMcpBridgeStatus, getMcpBridgeStatus);
}
