import { createMidiRuntime } from '../../../src/midi';
import { graphDocumentToPatch } from '../../../src/patch';
import { vi } from 'vitest';

describe('editor agent API', () => {
    it('applies guarded graph operations with deterministic playback cleanup', async () => {
        vi.resetModules();
        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const {
            applyEditorOperations,
            buildEditorSessionState,
        } = await import('../../core');

        const store = useAudioGraphStore.getState();
        const initialGraphId = store.activeGraphId;
        const midiSnapshot = createMidiRuntime().getSnapshot();
        const state = buildEditorSessionState({
            graphs: store.graphs,
            activeGraphId: store.activeGraphId,
            selectedNodeId: store.selectedNodeId,
            isHydrated: store.isHydrated,
            midiSnapshot,
        });

        const result = applyEditorOperations(state, [
            {
                type: 'add_node',
                nodeType: 'sampler',
                nodeId: 'sampler_1',
            },
            {
                type: 'bind_asset_to_node',
                nodeId: 'sampler_1',
                role: 'sampler',
                assetPath: '/samples/kick.wav',
                assetName: 'kick.wav',
            },
            {
                type: 'set_playing',
                playing: true,
            },
            {
                type: 'create_graph',
                name: 'Alt Graph',
            },
            {
                type: 'delete_graph',
                graphId: initialGraphId ?? undefined,
            },
        ], 'preview');

        expect(result.ok).toBe(true);
        expect(result.issues).toHaveLength(0);
        expect(result.summary.nodesCreated).toBe(1);
        expect(result.summary.assetsBound).toBe(1);
        expect(result.summary.playbackChanges).toBe(1);
        expect(result.summary.graphsCreated).toBe(1);
        expect(result.summary.graphsDeleted).toBe(1);
        expect(result.state.graphs).toHaveLength(1);
        expect(result.state.activeGraphId).not.toBe(initialGraphId);
        expect(result.state.audio.activeGraphPlaying).toBe(false);
        expect(result.state.graphs[0]?.name).toBe('Alt Graph');
    });

    it('normalizes offline patches and generates provider-wrapped code', async () => {
        vi.resetModules();
        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const {
            generateCodeFromOfflinePatch,
            validateOfflinePatchText,
        } = await import('../../core');

        const graph = useAudioGraphStore.getState().graphs[0];
        if (!graph) {
            throw new Error('Expected an initial DIN Editor graph.');
        }

        const patch = graphDocumentToPatch(graph);
        const validation = validateOfflinePatchText(`${JSON.stringify(patch, null, 2)}\n`);
        const code = generateCodeFromOfflinePatch(validation.patch, validation.patch.name, true);

        expect(validation.summary.nodeCount).toBeGreaterThan(0);
        expect(validation.normalizedText).toContain('"version": 1');
        expect(code).toContain('AudioProvider');
    });
});
