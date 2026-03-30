import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import WebSocket from 'ws';
import { afterEach, describe, expect, it } from 'vitest';
import { BridgeServer } from '../src/bridgeServer';
import { createLogger } from '../src/logger';
import type { BridgeEnvelope } from '../../../bridge/protocol';
import type { EditorSessionState } from '../../../core';

function createEmptyState(): EditorSessionState {
    return {
        project: {
            id: null,
            name: null,
            storageKind: null,
            windowKind: 'launcher',
        },
        graphs: [],
        activeGraphId: null,
        selectedNodeId: null,
        isHydrated: true,
        midi: {
            status: 'unsupported',
            defaultInputId: null,
            defaultOutputId: null,
            inputCount: 0,
            outputCount: 0,
            clockRunning: false,
            clockBpmEstimate: null,
        },
        audio: {
            activeGraphPlaying: false,
            playingGraphIds: [],
        },
    };
}

async function openBridgeSocket(url: string): Promise<WebSocket> {
    return await new Promise<WebSocket>((resolve, reject) => {
        const socket = new WebSocket(url, {
            rejectUnauthorized: false,
        });
        socket.once('open', () => resolve(socket));
        socket.once('error', reject);
    });
}

async function nextEnvelope(socket: WebSocket): Promise<BridgeEnvelope> {
    return await new Promise<BridgeEnvelope>((resolve, reject) => {
        socket.once('message', (data) => {
            try {
                resolve(JSON.parse(String(data)) as BridgeEnvelope);
            } catch (error) {
                reject(error);
            }
        });
        socket.once('error', reject);
    });
}

describe('DIN Editor bridge server', () => {
    const servers: BridgeServer[] = [];
    const tlsDirectories: string[] = [];

    afterEach(async () => {
        await Promise.all(servers.splice(0).map((server) => server.close()));
        await Promise.all(tlsDirectories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
    });

    async function createTlsDirectory() {
        const directory = await mkdtemp(joinPath(tmpdir(), 'din-editor-mcp-tls-'));
        tlsDirectories.push(directory);
        return directory;
    }

    it('rejects a session hello with an invalid bridge token', async () => {
        const server = new BridgeServer({
            bridgeProtocol: 'http',
            bridgeHost: 'localhost',
            bridgePort: 0,
            bridgeToken: 'secret-token',
            tlsDirectory: await createTlsDirectory(),
            readOnly: false,
            requestTimeoutMs: 1000,
            serverVersion: 'test',
            logger: createLogger(),
        });
        servers.push(server);
        await server.start();

        const discovery = server.getDiscoveryInfo();
        expect(discovery.bridgeUrl.startsWith('ws://')).toBe(true);
        expect(discovery.bridgeInfoUrl.startsWith('http://')).toBe(true);
        expect(discovery.bridgeCaUrl).toBeNull();
        const socket = await openBridgeSocket(discovery.bridgeUrl);

        socket.send(JSON.stringify({
            requestId: 'hello-1',
            type: 'session.hello',
            sessionId: null,
            ok: true,
            payload: {
                token: 'wrong-token',
                appVersion: '1.0.0',
                capabilities: {
                    previewOperations: true,
                    applyOperations: true,
                    patchImportExport: true,
                    codegen: true,
                    assetLibrary: true,
                    offlinePatch: true,
                },
                snapshot: createEmptyState(),
            },
        } satisfies BridgeEnvelope));

        const response = await nextEnvelope(socket);
        expect(response.type).toBe('session.error');
        expect(response.ok).toBe(false);
        expect(response.error?.code).toBe('HELLO_REJECTED');

        socket.close();
    });

    it('routes a live request through a connected DIN Editor session', async () => {
        const server = new BridgeServer({
            bridgeProtocol: 'http',
            bridgeHost: 'localhost',
            bridgePort: 0,
            bridgeToken: 'secret-token',
            tlsDirectory: await createTlsDirectory(),
            readOnly: false,
            requestTimeoutMs: 1000,
            serverVersion: 'test',
            logger: createLogger(),
        });
        servers.push(server);
        await server.start();

        const discovery = server.getDiscoveryInfo();
        const socket = await openBridgeSocket(discovery.bridgeUrl);

        socket.send(JSON.stringify({
            requestId: 'hello-2',
            type: 'session.hello',
            sessionId: null,
            ok: true,
            payload: {
                token: discovery.bridgeToken,
                desiredSessionId: 'session-a',
                appVersion: '1.0.0',
                capabilities: {
                    previewOperations: true,
                    applyOperations: true,
                    patchImportExport: true,
                    codegen: true,
                    assetLibrary: true,
                    offlinePatch: true,
                },
                snapshot: createEmptyState(),
            },
        } satisfies BridgeEnvelope));

        const hello = await nextEnvelope(socket);
        expect(hello.type).toBe('session.hello');
        expect(hello.ok).toBe(true);
        expect(hello.sessionId).toBe('session-a');

        const pendingRequest = server.registry.request<{ operations: unknown[] }, { ok: boolean }>(
            'session-a',
            'graph.preview_operations',
            { operations: [] },
        );

        const request = await nextEnvelope(socket);
        expect(request.type).toBe('graph.preview_operations');
        expect(request.sessionId).toBe('session-a');

        socket.send(JSON.stringify({
            requestId: request.requestId,
            type: request.type,
            sessionId: request.sessionId,
            ok: true,
            payload: {
                ok: true,
            },
        } satisfies BridgeEnvelope));

        await expect(pendingRequest).resolves.toEqual({ ok: true });
        socket.close();
    });
});
