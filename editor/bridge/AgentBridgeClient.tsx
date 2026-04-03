import { useEffect, useRef } from 'react';
import { graphDocumentToPatch } from '@din/react/patch';
import { audioEngine } from '../ui/editor/AudioEngine';
import { editorMidiRuntime } from '../ui/editor/midiRuntime';
import { generateCode } from '../ui/editor/CodeGenerator';
import { addAssetFromBlob, getAssetObjectUrl, listAssets } from '../ui/editor/audioLibrary';
import { useAudioGraphStore } from '../ui/editor/store';
import { getActiveProjectController, getProjectRepository } from '../project';
import {
    applyEditorOperations,
    buildEditorSessionState,
    type EditorOperation,
    type EditorSessionHello,
    type EditorSessionState,
} from '../core';
import type {
    BridgeApplyOperationsRequest,
    BridgeAssetIngestRequest,
    BridgeAssetIngestResponse,
    BridgeCodegenRequest,
    BridgeCodegenResponse,
    BridgeDiscoveryInfo,
    BridgeEnvelope,
    BridgeHelloAck,
    BridgePatchExportRequest,
    BridgePatchExportResponse,
    BridgePatchImportRequest,
    BridgePreviewOperationsRequest,
} from './protocol';
import { resetMcpBridgeStatus, setMcpBridgeStatus } from './status';

const DEFAULT_BRIDGE_PORT = Number(import.meta.env.VITE_DIN_EDITOR_MCP_BRIDGE_PORT ?? (import.meta.env.DEV ? 17374 : 17373));
const DEFAULT_BRIDGE_HOST = import.meta.env.VITE_DIN_EDITOR_MCP_HOST?.trim().toLowerCase() || 'localhost';
const DISCOVERY_PATH = '/bridge-info';
const SESSION_STORAGE_KEY = 'din-editor-agent-session-id';
let hasWarnedAboutTlsTrust = false;

function getDiscoveryProtocols(): Array<'http' | 'https'> {
    const configured = import.meta.env.VITE_DIN_EDITOR_MCP_PROTOCOL?.trim().toLowerCase();
    if (configured === 'http' || configured === 'https') {
        return [configured];
    }
    if (import.meta.env.DEV) {
        return ['http'];
    }
    return ['https', 'http'];
}

function getDiscoveryHosts(): string[] {
    return [DEFAULT_BRIDGE_HOST];
}

function makeRequestId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `bridge_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getOrCreateSessionId(): string {
    const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const next = makeRequestId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, next);
    return next;
}

function buildCurrentSessionState(): EditorSessionState {
    const store = useAudioGraphStore.getState();
    const activeProject = getActiveProjectController()?.project ?? null;
    const repository = getProjectRepository();
    return buildEditorSessionState({
        project: activeProject,
        windowKind: repository.windowKind,
        graphs: store.graphs,
        activeGraphId: store.activeGraphId,
        selectedNodeId: store.selectedNodeId,
        isHydrated: store.isHydrated,
        midiSnapshot: editorMidiRuntime.getSnapshot(),
    });
}

function getGraphById(
    state: EditorSessionState,
    graphId: string | null,
) {
    if (!graphId) return null;
    return state.graphs.find((graph) => graph.id === graphId) ?? null;
}

function commitSessionState(previousState: EditorSessionState, nextState: EditorSessionState) {
    const store = useAudioGraphStore.getState();
    const nextActiveGraph = getGraphById(nextState, nextState.activeGraphId);
    store.setGraphs(nextState.graphs, nextState.activeGraphId);
    store.setSelectedNode(nextState.selectedNodeId);
    store.setHydrated(nextState.isHydrated);

    if (nextActiveGraph && nextState.audio.activeGraphPlaying) {
        audioEngine.start(nextActiveGraph.nodes, nextActiveGraph.edges);
        return;
    }

    if (previousState.audio.activeGraphPlaying || audioEngine.playing) {
        audioEngine.stop();
    }
}

async function discoverBridge(): Promise<BridgeDiscoveryInfo | null> {
    let lastError: unknown = null;
    const protocols = getDiscoveryProtocols();
    const hosts = getDiscoveryHosts();

    for (const protocol of protocols) {
        for (const host of hosts) {
            const url = `${protocol}://${host}:${DEFAULT_BRIDGE_PORT}${DISCOVERY_PATH}`;

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-store',
                });
                if (!response.ok) continue;
                return await response.json() as BridgeDiscoveryInfo;
            } catch (error) {
                lastError = error;
            }
        }
    }

    if (!hasWarnedAboutTlsTrust && lastError) {
        hasWarnedAboutTlsTrust = true;
        console.warn(
            import.meta.env.DEV
                ? 'DIN Editor MCP discovery failed. Start `npm run editor:dev:mcp` for local HTTP mode, or trust the local CA if you are using the secure standalone MCP server.'
                : 'DIN Editor MCP discovery failed. If this is the first secure run, trust the local MCP CA certificate generated by the MCP server, then reload the editor.',
            lastError,
        );
    }

    return null;
}

function decodeBase64ToBlob(payload: BridgeAssetIngestRequest): Blob {
    const binary = window.atob(payload.bytesBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], {
        type: payload.mimeType || 'application/octet-stream',
    });
}

function respond(
    socket: WebSocket,
    type: BridgeEnvelope['type'],
    sessionId: string | null,
    requestId: string | null,
    payload: unknown,
    ok = true,
) {
    socket.send(JSON.stringify({
        requestId,
        type,
        sessionId,
        ok,
        payload,
    } satisfies BridgeEnvelope));
}

function respondError(
    socket: WebSocket,
    sessionId: string | null,
    requestId: string | null,
    code: string,
    message: string,
    details?: unknown,
) {
    socket.send(JSON.stringify({
        requestId,
        type: 'session.error',
        sessionId,
        ok: false,
        error: {
            code,
            message,
            details,
        },
    } satisfies BridgeEnvelope));
}

async function handleRequest(
    socket: WebSocket,
    sessionId: string | null,
    envelope: BridgeEnvelope,
) {
    const requestId = envelope.requestId;

    try {
        if (envelope.type === 'graph.preview_operations') {
            const payload = envelope.payload as BridgePreviewOperationsRequest;
            const result = applyEditorOperations(buildCurrentSessionState(), payload.operations, 'preview');
            respond(socket, envelope.type, sessionId, requestId, result);
            return;
        }

        if (envelope.type === 'graph.apply_operations') {
            const payload = envelope.payload as BridgeApplyOperationsRequest;
            const previousState = buildCurrentSessionState();
            const result = applyEditorOperations(previousState, payload.operations, 'apply');
            if (result.ok) {
                commitSessionState(previousState, result.state);
            }
            respond(socket, envelope.type, sessionId, requestId, result, result.ok);
            return;
        }

        if (envelope.type === 'patch.import') {
            const payload = envelope.payload as BridgePatchImportRequest;
            const operations: EditorOperation[] = [{
                type: 'import_patch_into_active_graph',
                graphId: payload.graphId,
                patch: payload.patch,
            }];
            const previousState = buildCurrentSessionState();
            const result = applyEditorOperations(previousState, operations, 'apply');
            if (result.ok) {
                commitSessionState(previousState, result.state);
            }
            respond(socket, envelope.type, sessionId, requestId, result, result.ok);
            return;
        }

        if (envelope.type === 'patch.export') {
            const payload = (envelope.payload ?? {}) as BridgePatchExportRequest;
            const state = buildCurrentSessionState();
            const graphId = payload.graphId ?? state.activeGraphId;
            const graph = state.graphs.find((entry) => entry.id === graphId);
            if (!graph) {
                respondError(socket, sessionId, requestId, 'GRAPH_NOT_FOUND', `Graph "${String(graphId)}" was not found.`);
                return;
            }

            const patch = graphDocumentToPatch(graph);
            const response: BridgePatchExportResponse = {
                patch,
                text: `${JSON.stringify(patch, null, 2)}\n`,
            };
            respond(socket, envelope.type, sessionId, requestId, response);
            return;
        }

        if (envelope.type === 'codegen.generate') {
            const payload = (envelope.payload ?? {}) as BridgeCodegenRequest;
            const state = buildCurrentSessionState();
            const graphId = payload.graphId ?? state.activeGraphId;
            const graph = state.graphs.find((entry) => entry.id === graphId);
            if (!graph) {
                respondError(socket, sessionId, requestId, 'GRAPH_NOT_FOUND', `Graph "${String(graphId)}" was not found.`);
                return;
            }

            const response: BridgeCodegenResponse = {
                graphName: graph.name,
                code: generateCode(graph.nodes, graph.edges, Boolean(payload.includeProvider), graph.name),
            };
            respond(socket, envelope.type, sessionId, requestId, response);
            return;
        }

        if (envelope.type === 'assets.list') {
            const assets = await listAssets();
            respond(socket, envelope.type, sessionId, requestId, assets);
            return;
        }

        if (envelope.type === 'assets.ingest_file') {
            const payload = envelope.payload as BridgeAssetIngestRequest;
            const blob = decodeBase64ToBlob(payload);
            const asset = await addAssetFromBlob(blob, payload.fileName);
            const objectUrl = await getAssetObjectUrl(asset.id);
            const response: BridgeAssetIngestResponse = {
                assetId: asset.id,
                name: asset.name,
                mimeType: asset.mimeType,
                size: asset.size,
                durationSec: asset.durationSec,
                objectUrl,
            };
            respond(socket, envelope.type, sessionId, requestId, response);
            return;
        }

        respondError(socket, sessionId, requestId, 'UNSUPPORTED_REQUEST', `Unsupported bridge request "${envelope.type}".`);
    } catch (error) {
        respondError(
            socket,
            sessionId,
            requestId,
            'BRIDGE_REQUEST_FAILED',
            error instanceof Error ? error.message : 'Bridge request failed.',
        );
    }
}

export function AgentBridgeClient() {
    const socketRef = useRef<WebSocket | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const snapshotTimerRef = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        const sendSnapshot = () => {
            const socket = socketRef.current;
            const sessionId = sessionIdRef.current;
            if (!socket || socket.readyState !== WebSocket.OPEN || !sessionId) return;

            socket.send(JSON.stringify({
                requestId: null,
                type: 'session.snapshot',
                sessionId,
                payload: buildCurrentSessionState(),
                ok: true,
            } satisfies BridgeEnvelope<EditorSessionState>));
        };

        const scheduleSnapshot = () => {
            if (snapshotTimerRef.current !== null) {
                window.clearTimeout(snapshotTimerRef.current);
            }
            snapshotTimerRef.current = window.setTimeout(() => {
                snapshotTimerRef.current = null;
                sendSnapshot();
            }, 100);
        };

        const connect = async () => {
            setMcpBridgeStatus({
                phase: 'discovering',
                message: 'Discovering the local MCP bridge.',
                sessionId: null,
            });

            const bridge = await discoverBridge();
            if (cancelled || !bridge) {
                setMcpBridgeStatus({
                    phase: 'offline',
                    message: import.meta.env.DEV
                        ? `Waiting for the local MCP bridge on http://${DEFAULT_BRIDGE_HOST}:${DEFAULT_BRIDGE_PORT}. Run \`npm run editor:dev:mcp\` or \`npm run editor:dev:stack\`.`
                        : 'Waiting for the local MCP bridge or trusted TLS certificate.',
                    sessionId: null,
                });
                reconnectTimerRef.current = window.setTimeout(() => {
                    void connect();
                }, 2000);
                return;
            }

            setMcpBridgeStatus({
                phase: 'connecting',
                message: 'Connecting to the local MCP bridge.',
                bridgeUrl: bridge.bridgeUrl,
                serverVersion: bridge.serverVersion,
                certificateFingerprint256: bridge.certificateFingerprint256,
                readOnly: bridge.readOnly,
                sessionId: null,
            });

            const socket = new window.WebSocket(bridge.bridgeUrl);
            socketRef.current = socket;
            const isCurrentSocket = () => socketRef.current === socket;

            socket.addEventListener('open', () => {
                if (!isCurrentSocket()) return;

                setMcpBridgeStatus({
                    phase: 'connecting',
                    message: 'MCP bridge connected, waiting for session handshake.',
                });

                const hello: EditorSessionHello = {
                    token: bridge.bridgeToken,
                    desiredSessionId: getOrCreateSessionId(),
                    appVersion: import.meta.env.VITE_DIN_EDITOR_VERSION ?? '0.0.0',
                    capabilities: {
                        previewOperations: true,
                        applyOperations: true,
                        patchImportExport: true,
                        codegen: true,
                        assetLibrary: true,
                        offlinePatch: true,
                    },
                    snapshot: buildCurrentSessionState(),
                };

                socket.send(JSON.stringify({
                    requestId: makeRequestId(),
                    type: 'session.hello',
                    sessionId: null,
                    payload: hello,
                    ok: true,
                } satisfies BridgeEnvelope<EditorSessionHello>));
            });

            socket.addEventListener('message', (event) => {
                if (!isCurrentSocket()) return;

                const envelope = JSON.parse(String(event.data)) as BridgeEnvelope;

                if (envelope.type === 'session.hello' && envelope.ok) {
                    const payload = envelope.payload as BridgeHelloAck;
                    sessionIdRef.current = payload.sessionId;
                    setMcpBridgeStatus({
                        phase: 'active',
                        message: bridge.readOnly
                            ? 'Connected to the local MCP bridge in read-only mode.'
                            : 'Connected to the local MCP bridge and ready for agent control.',
                        sessionId: payload.sessionId,
                        bridgeUrl: bridge.bridgeUrl,
                        serverVersion: payload.serverVersion,
                        certificateFingerprint256: bridge.certificateFingerprint256,
                        readOnly: payload.readOnly,
                    });
                    sendSnapshot();
                    return;
                }

                if (envelope.type === 'session.error') {
                    setMcpBridgeStatus({
                        phase: 'error',
                        message: envelope.error?.message ?? 'The MCP bridge returned an error.',
                    });
                    return;
                }

                void handleRequest(socket, sessionIdRef.current, envelope);
            });

            socket.addEventListener('error', () => {
                if (!isCurrentSocket()) return;

                setMcpBridgeStatus({
                    phase: 'error',
                    message: 'The local MCP bridge connection failed.',
                    sessionId: null,
                });
            });

            socket.addEventListener('close', () => {
                if (!isCurrentSocket()) return;

                socketRef.current = null;
                sessionIdRef.current = null;

                if (!cancelled) {
                    setMcpBridgeStatus({
                        phase: 'connecting',
                        message: 'The local MCP bridge disconnected. Reconnecting.',
                        sessionId: null,
                    });
                    reconnectTimerRef.current = window.setTimeout(() => {
                        void connect();
                    }, 2000);
                    return;
                }

                setMcpBridgeStatus({
                    phase: 'offline',
                    message: 'The local MCP bridge is disconnected.',
                    sessionId: null,
                });
            });
        };

        const unsubscribeStore = useAudioGraphStore.subscribe(() => {
            scheduleSnapshot();
        });
        const unsubscribeMidi = editorMidiRuntime.subscribe(() => {
            scheduleSnapshot();
        });

        void connect();

        return () => {
            cancelled = true;
            unsubscribeStore();
            unsubscribeMidi();

            if (snapshotTimerRef.current !== null) {
                window.clearTimeout(snapshotTimerRef.current);
            }
            if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current);
            }

            socketRef.current?.close();
            socketRef.current = null;
            resetMcpBridgeStatus();
        };
    }, []);

    return null;
}
