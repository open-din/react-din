import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';
import type { Logger } from './logger';
import type { BridgeEnvelope, BridgeHelloAck } from '../../../bridge/protocol';
import type {
    EditorSessionHello,
    EditorSessionState,
    EditorSessionSummary,
} from '../../../core';

interface PendingRequest {
    requestId: string;
    sessionId: string;
    type: BridgeEnvelope['type'];
    timeout: NodeJS.Timeout;
    resolve: (payload: unknown) => void;
    reject: (error: Error) => void;
}

interface SessionRecord {
    sessionId: string;
    appVersion: string;
    connectedAt: number;
    lastSeenAt: number;
    readOnly: boolean;
    capabilities: EditorSessionHello['capabilities'];
    snapshot: EditorSessionState;
    socket: WebSocket;
}

function nextSessionId(): string {
    if (typeof randomUUID === 'function') {
        return randomUUID();
    }
    return `din_editor_session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

export class SessionRegistry {
    private readonly sessions = new Map<string, SessionRecord>();
    private readonly sessionIdsBySocket = new Map<WebSocket, string>();
    private readonly pendingRequests = new Map<string, PendingRequest>();

    constructor(private readonly options: {
        bridgeToken: string;
        readOnly: boolean;
        requestTimeoutMs: number;
        serverVersion: string;
        logger: Logger;
    }) {}

    private createUniqueSessionId(desiredSessionId?: string | null): string {
        const normalized = desiredSessionId?.trim();
        if (!normalized) return nextSessionId();

        const existing = this.sessions.get(normalized);
        if (!existing || existing.socket.readyState !== WebSocket.OPEN) {
            if (existing) {
                this.removeSession(normalized, 'reusing disconnected session id');
            }
            return normalized;
        }

        return `${normalized}-${Date.now().toString(36)}`;
    }

    private toSummary(record: SessionRecord): EditorSessionSummary {
        return {
            sessionId: record.sessionId,
            appVersion: record.appVersion,
            connectedAt: record.connectedAt,
            lastSeenAt: record.lastSeenAt,
            project: record.snapshot.project,
            activeGraphId: record.snapshot.activeGraphId,
            graphCount: record.snapshot.graphs.length,
            readOnly: record.readOnly,
            midi: record.snapshot.midi,
            audio: record.snapshot.audio,
        };
    }

    private clearPendingRequestsForSession(sessionId: string, reason: string) {
        for (const [requestId, pending] of this.pendingRequests.entries()) {
            if (pending.sessionId !== sessionId) continue;
            clearTimeout(pending.timeout);
            pending.reject(new Error(reason));
            this.pendingRequests.delete(requestId);
        }
    }

    private removeSession(sessionId: string, reason: string) {
        const record = this.sessions.get(sessionId);
        if (!record) return;

        this.options.logger.info('Removing DIN Editor session', {
            sessionId,
            reason,
        });
        this.clearPendingRequestsForSession(sessionId, reason);
        this.sessionIdsBySocket.delete(record.socket);
        this.sessions.delete(sessionId);
    }

    listSessionSummaries(): EditorSessionSummary[] {
        return Array.from(this.sessions.values())
            .sort((left, right) => left.connectedAt - right.connectedAt)
            .map((record) => this.toSummary(record));
    }

    getSessionState(sessionId: string): EditorSessionState | null {
        return this.sessions.get(sessionId)?.snapshot ?? null;
    }

    resolveSession(sessionId?: string | null): SessionRecord {
        const normalized = sessionId?.trim();
        if (normalized) {
            const record = this.sessions.get(normalized);
            if (!record) {
                throw new Error(`DIN Editor session "${normalized}" was not found.`);
            }
            return record;
        }

        const sessions = Array.from(this.sessions.values());
        if (sessions.length === 0) {
            throw new Error('No DIN Editor session is connected.');
        }
        if (sessions.length > 1) {
            throw new Error('Multiple DIN Editor sessions are connected. Provide "sessionId" explicitly.');
        }

        return sessions[0]!;
    }

    registerHello(socket: WebSocket, hello: EditorSessionHello): BridgeHelloAck {
        if (hello.token !== this.options.bridgeToken) {
            throw new Error('Bridge token mismatch.');
        }

        const existingSessionId = this.sessionIdsBySocket.get(socket);
        if (existingSessionId) {
            this.removeSession(existingSessionId, 'socket re-registered');
        }

        const sessionId = this.createUniqueSessionId(hello.desiredSessionId);
        const now = Date.now();
        const record: SessionRecord = {
            sessionId,
            appVersion: hello.appVersion,
            connectedAt: now,
            lastSeenAt: now,
            readOnly: this.options.readOnly,
            capabilities: hello.capabilities,
            snapshot: hello.snapshot,
            socket,
        };

        this.sessions.set(sessionId, record);
        this.sessionIdsBySocket.set(socket, sessionId);
        this.options.logger.info('Registered DIN Editor session', {
            sessionId,
            appVersion: hello.appVersion,
            graphCount: hello.snapshot.graphs.length,
        });

        return {
            sessionId,
            readOnly: this.options.readOnly,
            serverVersion: this.options.serverVersion,
        };
    }

    detachSocket(socket: WebSocket, reason: string) {
        const sessionId = this.sessionIdsBySocket.get(socket);
        if (!sessionId) return;
        this.removeSession(sessionId, reason);
    }

    handleEnvelope(socket: WebSocket, envelope: BridgeEnvelope) {
        const sessionId = envelope.sessionId ?? this.sessionIdsBySocket.get(socket);
        if (!sessionId) {
            this.options.logger.warn('Ignoring bridge envelope without a session id', {
                type: envelope.type,
                requestId: envelope.requestId,
            });
            return;
        }

        const record = this.sessions.get(sessionId);
        if (!record) {
            this.options.logger.warn('Ignoring bridge envelope for an unknown session', {
                sessionId,
                type: envelope.type,
                requestId: envelope.requestId,
            });
            return;
        }

        record.lastSeenAt = Date.now();

        if (envelope.requestId && this.pendingRequests.has(envelope.requestId)) {
            const pending = this.pendingRequests.get(envelope.requestId)!;
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(envelope.requestId);

            if (envelope.ok === false || envelope.type === 'session.error') {
                pending.reject(new Error(
                    envelope.error?.message
                    ?? `DIN Editor session "${sessionId}" returned an error for ${pending.type}.`,
                ));
                return;
            }

            pending.resolve(envelope.payload);
            return;
        }

        if (envelope.type === 'session.snapshot') {
            record.snapshot = envelope.payload as EditorSessionState;
            return;
        }

        if (envelope.type === 'session.error') {
            this.options.logger.warn('Received unsolicited bridge error', {
                sessionId,
                requestId: envelope.requestId,
                error: envelope.error,
            });
            return;
        }

        this.options.logger.warn('Ignoring unsolicited bridge response', {
            sessionId,
            type: envelope.type,
            requestId: envelope.requestId,
        });
    }

    async request<TPayload, TResponse>(
        sessionId: string,
        type: BridgeEnvelope['type'],
        payload?: TPayload,
    ): Promise<TResponse> {
        const record = this.sessions.get(sessionId);
        if (!record) {
            throw new Error(`DIN Editor session "${sessionId}" was not found.`);
        }
        if (record.socket.readyState !== WebSocket.OPEN) {
            throw new Error(`DIN Editor session "${sessionId}" is disconnected.`);
        }

        const requestId = nextSessionId();
        return new Promise<TResponse>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Timed out waiting for "${type}" from DIN Editor session "${sessionId}".`));
            }, this.options.requestTimeoutMs);

            this.pendingRequests.set(requestId, {
                requestId,
                sessionId,
                type,
                timeout,
                resolve: (nextPayload) => resolve(nextPayload as TResponse),
                reject,
            });

            try {
                record.socket.send(JSON.stringify({
                    requestId,
                    type,
                    sessionId,
                    ok: true,
                    payload,
                } satisfies BridgeEnvelope));
            } catch (error) {
                clearTimeout(timeout);
                this.pendingRequests.delete(requestId);
                reject(new Error(errorMessage(error, `Failed to send "${type}" to DIN Editor session "${sessionId}".`)));
            }
        });
    }
}
