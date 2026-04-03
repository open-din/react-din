import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type WebSocket from 'ws';
import { graphDocumentToPatch } from '@din/react/patch';
import { createLogger } from '../src/logger';
import { DinEditorMcpRuntime, offlinePatchUri } from '../src/runtime';
import { SessionRegistry } from '../src/sessionRegistry';
import type { EditorSessionState } from '../../../core';

function createState(name: string): EditorSessionState {
    return {
        project: {
            id: `${name}-project`,
            name,
            storageKind: 'browser-indexeddb',
            windowKind: 'project',
        },
        graphs: [{
            id: `${name}-graph`,
            name,
            nodes: [
                {
                    id: 'osc_1',
                    type: 'oscNode',
                    position: { x: 0, y: 0 },
                    dragHandle: '.node-header',
                    data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
                },
                {
                    id: 'gain_1',
                    type: 'gainNode',
                    position: { x: 100, y: 0 },
                    dragHandle: '.node-header',
                    data: { type: 'gain', gain: 0.5, label: 'Gain' },
                },
                {
                    id: 'output_1',
                    type: 'outputNode',
                    position: { x: 200, y: 0 },
                    dragHandle: '.node-header',
                    data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
                },
            ],
            edges: [
                { id: 'edge-1', source: 'osc_1', sourceHandle: 'out', target: 'gain_1', targetHandle: 'in' },
                { id: 'edge-2', source: 'gain_1', sourceHandle: 'out', target: 'output_1', targetHandle: 'in' },
            ],
            createdAt: 1,
            updatedAt: 1,
            order: 0,
        }],
        activeGraphId: `${name}-graph`,
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

function registerSession(registry: SessionRegistry, sessionId: string, state: EditorSessionState) {
    const socket = {
        readyState: 1,
        send: vi.fn(),
    } as unknown as WebSocket;

    registry.registerHello(socket, {
        token: 'secret-token',
        desiredSessionId: sessionId,
        appVersion: '1.0.0',
        capabilities: {
            previewOperations: true,
            applyOperations: true,
            patchImportExport: true,
            codegen: true,
            assetLibrary: true,
            offlinePatch: true,
        },
        snapshot: state,
    });
}

describe('DIN Editor MCP runtime', () => {
    it('validates, reads, and exports offline patches', async () => {
        const registry = new SessionRegistry({
            bridgeToken: 'secret-token',
            readOnly: false,
            requestTimeoutMs: 1000,
            serverVersion: 'test',
            logger: createLogger(),
        });
        const runtime = new DinEditorMcpRuntime(registry, {
            readOnly: false,
            serverVersion: 'test',
            logger: createLogger(),
        });

        const state = createState('Offline Test');
        const patch = graphDocumentToPatch(state.graphs[0]!);
        const text = `${JSON.stringify(patch, null, 2)}\n`;

        const validate = await runtime.callTool('editor_validate_patch', { text });
        expect(validate.isError).toBeFalsy();

        const tempDir = await mkdtemp(join(tmpdir(), 'din-editor-mcp-'));
        const patchPath = join(tempDir, 'offline.patch.json');
        const exportPath = join(tempDir, 'offline.normalized.patch.json');
        await writeFile(patchPath, text, 'utf8');

        const exportResult = await runtime.callTool('editor_export_patch', {
            path: patchPath,
            outputPath: exportPath,
        });
        expect(exportResult.isError).toBeFalsy();
        expect(await readFile(exportPath, 'utf8')).toContain('"version": 1');

        const codegen = await runtime.callTool('editor_generate_code', {
            path: patchPath,
            includeProvider: true,
        });
        expect(codegen.isError).toBeFalsy();
        expect(JSON.stringify(codegen.structuredContent)).toContain('AudioProvider');

        const resource = await runtime.readResource(offlinePatchUri(patchPath));
        expect(resource.contents[0]?.text).toContain('"nodes"');
    });

    it('requires an explicit session id when multiple DIN Editor sessions are connected', async () => {
        const registry = new SessionRegistry({
            bridgeToken: 'secret-token',
            readOnly: false,
            requestTimeoutMs: 1000,
            serverVersion: 'test',
            logger: createLogger(),
        });
        registerSession(registry, 'session-a', createState('A'));
        registerSession(registry, 'session-b', createState('B'));

        const runtime = new DinEditorMcpRuntime(registry, {
            readOnly: false,
            serverVersion: 'test',
            logger: createLogger(),
        });

        const result = await runtime.callTool('editor_get_state', {});
        expect(result.isError).toBe(true);
        expect(result.content[0]?.text).toContain('Multiple DIN Editor sessions are connected');
    });
});
