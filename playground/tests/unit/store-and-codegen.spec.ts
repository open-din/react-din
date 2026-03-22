import { vi } from 'vitest';

describe('playground store and code generation', () => {
    it('adds nodes and updates node data through the zustand store', async () => {
        vi.resetModules();
        const { audioEngine } = await import('../../src/playground/AudioEngine');
        const refreshConnections = vi.spyOn(audioEngine, 'refreshConnections').mockImplementation(() => {});
        const refreshDataValues = vi.spyOn(audioEngine, 'refreshDataValues').mockImplementation(() => {});
        const updateNode = vi.spyOn(audioEngine, 'updateNode').mockImplementation(() => {});
        const { useAudioGraphStore } = await import('../../src/playground/store');
        const initialLength = useAudioGraphStore.getState().nodes.length;

        useAudioGraphStore.getState().addNode('mix');
        const mixNode = useAudioGraphStore.getState().nodes.at(-1);
        expect(useAudioGraphStore.getState().nodes).toHaveLength(initialLength + 1);
        expect(mixNode?.data.type).toBe('mix');

        useAudioGraphStore.getState().addNode('uiTokens');
        const uiTokensNode = useAudioGraphStore.getState().nodes.at(-1);
        expect(uiTokensNode?.data.type).toBe('uiTokens');
        if (!uiTokensNode) {
            throw new Error('Expected a uiTokens node');
        }
        useAudioGraphStore.getState().removeNode(uiTokensNode.id);
        expect(useAudioGraphStore.getState().nodes.some((node) => node.id === uiTokensNode.id)).toBe(false);

        if (!mixNode) {
            throw new Error('Expected a mix node');
        }

        useAudioGraphStore.getState().updateNodeData(mixNode.id, { t: 0.75 });
        const updated = useAudioGraphStore.getState().nodes.find((node) => node.id === mixNode.id);

        expect((updated?.data as { t: number }).t).toBe(0.75);
        expect(refreshConnections).toHaveBeenCalled();
        expect(refreshDataValues).toHaveBeenCalled();
        expect(updateNode).toHaveBeenCalledWith(mixNode.id, { t: 0.75 });

        refreshConnections.mockRestore();
        refreshDataValues.mockRestore();
        updateNode.mockRestore();
    });

    it('auto-adds and connects nodes using the same defaults and edge styling', async () => {
        vi.resetModules();
        const { audioEngine } = await import('../../src/playground/AudioEngine');
        const refreshConnections = vi.spyOn(audioEngine, 'refreshConnections').mockImplementation(() => {});
        const { useAudioGraphStore } = await import('../../src/playground/store');

        useAudioGraphStore.getState().loadGraph(
            [
                {
                    id: 'osc-1',
                    type: 'oscNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
                },
            ],
            []
        );

        const nodeId = useAudioGraphStore.getState().addNodeAndConnect(
            'filter',
            {
                source: 'osc-1',
                sourceHandle: 'out',
                target: '__suggestion__filter',
                targetHandle: 'in',
            },
            { x: 120, y: 120 }
        );

        const state = useAudioGraphStore.getState();
        const filterNode = state.nodes.find((node) => node.id === nodeId);
        const filterEdge = state.edges.find((edge) => edge.target === nodeId);

        expect(filterNode?.data.type).toBe('filter');
        expect((filterNode?.data as { label?: string })?.label).toBe('Filter');
        expect(filterEdge?.source).toBe('osc-1');
        expect(filterEdge?.targetHandle).toBe('in');
        expect(filterEdge?.style).toMatchObject({ stroke: '#44cc44', strokeWidth: 3 });
        expect(filterEdge?.animated).toBe(false);

        refreshConnections.mockRestore();
    });

    it('auto-connects correctly when the dragged handle started from a target', async () => {
        vi.resetModules();
        const { audioEngine } = await import('../../src/playground/AudioEngine');
        const refreshConnections = vi.spyOn(audioEngine, 'refreshConnections').mockImplementation(() => {});
        const { useAudioGraphStore } = await import('../../src/playground/store');

        useAudioGraphStore.getState().loadGraph(
            [
                {
                    id: 'osc-1',
                    type: 'oscNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
                },
            ],
            []
        );

        const nodeId = useAudioGraphStore.getState().addNodeAndConnect(
            'voice',
            {
                source: '__suggestion__voice',
                sourceHandle: 'note',
                target: 'osc-1',
                targetHandle: 'frequency',
            },
            { x: 80, y: 80 }
        );

        const state = useAudioGraphStore.getState();
        const edge = state.edges.find((item) => item.source === nodeId && item.target === 'osc-1');

        expect(state.nodes.find((node) => node.id === nodeId)?.data.type).toBe('voice');
        expect(edge?.sourceHandle).toBe('note');
        expect(edge?.targetHandle).toBe('frequency');
        expect(edge?.animated).toBe(true);
        expect(edge?.style).toMatchObject({ stroke: '#4488ff', strokeWidth: 2, strokeDasharray: '5,5' });

        refreshConnections.mockRestore();
    });

    it('adds MIDI nodes with friendly defaults and keeps sync singleton', async () => {
        vi.resetModules();
        const { audioEngine } = await import('../../src/playground/AudioEngine');
        const refreshConnections = vi.spyOn(audioEngine, 'refreshConnections').mockImplementation(() => {});
        const { useAudioGraphStore } = await import('../../src/playground/store');

        useAudioGraphStore.getState().addNode('midiNote');
        useAudioGraphStore.getState().addNode('midiCC');
        useAudioGraphStore.getState().addNode('midiNoteOutput');
        useAudioGraphStore.getState().addNode('midiCCOutput');
        useAudioGraphStore.getState().addNode('midiSync');
        useAudioGraphStore.getState().addNode('midiSync');

        const state = useAudioGraphStore.getState();

        expect(state.nodes.find((node) => node.data.type === 'midiNote')?.data).toMatchObject({
            type: 'midiNote',
            label: 'Midi In',
            inputId: 'default',
            mappingEnabled: false,
            mappings: [],
            activeMappingId: null,
        });
        expect(state.nodes.find((node) => node.data.type === 'midiCC')?.data).toMatchObject({
            type: 'midiCC',
            label: 'Knob / CC In',
            cc: 1,
        });
        expect(state.nodes.find((node) => node.data.type === 'midiNoteOutput')?.data).toMatchObject({
            type: 'midiNoteOutput',
            label: 'Note Out',
            channel: 1,
        });
        expect(state.nodes.find((node) => node.data.type === 'midiCCOutput')?.data).toMatchObject({
            type: 'midiCCOutput',
            label: 'CC Out',
            valueFormat: 'normalized',
        });
        expect(state.nodes.filter((node) => node.data.type === 'midiSync')).toHaveLength(1);
        expect(state.nodes.find((node) => node.data.type === 'midiSync')?.data).toMatchObject({
            type: 'midiSync',
            label: 'Sync',
            mode: 'transport-master',
        });

        refreshConnections.mockRestore();
    });

    it('sanitizes persisted graphs and emits component names for generated code', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');
        const { sanitizeGraphForStorage, toPascalCase } = await import('../../src/playground/graphUtils');
        const { useAudioGraphStore } = await import('../../src/playground/store');
        const state = useAudioGraphStore.getState();

        const graph = sanitizeGraphForStorage({
            id: 'graph-1',
            name: 'Bass Lab',
            nodes: state.nodes.map((node) =>
                node.data.type === 'output'
                    ? { ...node, data: { ...node.data, playing: true } }
                    : node
            ),
            edges: state.edges,
            createdAt: 0,
            updatedAt: 0,
            order: 0,
        });

        expect(graph.name).toBe('Bass Lab');
        expect(graph.nodes.some((node) => node.data.type === 'output' && (node.data as { playing: boolean }).playing)).toBe(false);
        expect(graph.nodes.some((node) => node.data.type === 'transport' && (node.data as { playing: boolean }).playing)).toBe(false);
        expect(toPascalCase('bass lab')).toBe('BassLab');

        const code = generateCode(state.nodes, state.edges, true, 'Bass Lab');
        expect(code).toContain('export const BassLabRoot');
        expect(code).toContain('<AudioProvider>');
    });

    it('generates MIDI hooks, providers, outputs, and sync wrappers from MIDI graphs', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');

        const nodes = [
            {
                id: 'transport-1',
                type: 'transportNode',
                position: { x: 0, y: 0 },
                data: { type: 'transport', bpm: 121, playing: false, beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4, barsPerPhrase: 4, swing: 0, label: 'Transport' },
            },
            {
                id: 'midi-note-1',
                type: 'midiNoteNode',
                position: { x: 0, y: 0 },
                data: { type: 'midiNote', inputId: 'keys-in', channel: 2, noteMode: 'range', note: 60, noteMin: 48, noteMax: 72, mappingEnabled: false, mappings: [], activeMappingId: null, label: 'Midi In' },
            },
            {
                id: 'midi-cc-1',
                type: 'midiCCNode',
                position: { x: 0, y: 0 },
                data: { type: 'midiCC', inputId: 'knobs-in', channel: 3, cc: 74, label: 'Knob / CC In' },
            },
            {
                id: 'midi-note-out-1',
                type: 'midiNoteOutputNode',
                position: { x: 0, y: 0 },
                data: { type: 'midiNoteOutput', outputId: 'synth-out', channel: 5, gate: 0, note: 60, frequency: 261.63, velocity: 0.9, label: 'Note Out' },
            },
            {
                id: 'midi-cc-out-1',
                type: 'midiCCOutputNode',
                position: { x: 0, y: 0 },
                data: { type: 'midiCCOutput', outputId: 'fx-out', channel: 6, cc: 71, value: 96, valueFormat: 'raw', label: 'CC Out' },
            },
            {
                id: 'midi-sync-1',
                type: 'midiSyncNode',
                position: { x: 0, y: 0 },
                data: { type: 'midiSync', mode: 'midi-master', inputId: 'clock-in', outputId: 'clock-out', sendStartStop: false, sendClock: false, label: 'Sync' },
            },
            {
                id: 'osc-1',
                type: 'oscNode',
                position: { x: 0, y: 0 },
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sawtooth', label: 'Oscillator' },
            },
            {
                id: 'filter-1',
                type: 'filterNode',
                position: { x: 0, y: 0 },
                data: { type: 'filter', filterType: 'lowpass', frequency: 1200, detune: 0, q: 1, gain: 0, label: 'Filter' },
            },
            {
                id: 'output-1',
                type: 'outputNode',
                position: { x: 0, y: 0 },
                data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
            },
        ];

        const edges = [
            { id: 'mn-osc', source: 'midi-note-1', sourceHandle: 'frequency', target: 'osc-1', targetHandle: 'frequency' },
            { id: 'mc-filter', source: 'midi-cc-1', sourceHandle: 'normalized', target: 'filter-1', targetHandle: 'frequency' },
            { id: 'osc-filter', source: 'osc-1', sourceHandle: 'out', target: 'filter-1', targetHandle: 'in' },
            { id: 'filter-out', source: 'filter-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
            { id: 'mn-note-out-note', source: 'midi-note-1', sourceHandle: 'note', target: 'midi-note-out-1', targetHandle: 'note' },
            { id: 'mn-note-out-gate', source: 'midi-note-1', sourceHandle: 'gate', target: 'midi-note-out-1', targetHandle: 'gate' },
            { id: 'mn-note-out-trigger', source: 'midi-note-1', sourceHandle: 'trigger', target: 'midi-note-out-1', targetHandle: 'trigger' },
            { id: 'mc-cc-out', source: 'midi-cc-1', sourceHandle: 'raw', target: 'midi-cc-out-1', targetHandle: 'value' },
        ];

        const code = generateCode(nodes as any, edges as any, true, 'Midi Playground');

        expect(code).toContain('<MidiProvider>');
        expect(code).toContain('useMidiNote({ inputId: "keys-in", channel: 2, note: [48, 72] })');
        expect(code).toContain('useMidiCC({ cc: 74, inputId: "knobs-in", channel: 3 })');
        expect(code).toContain('<MidiNoteOutput');
        expect(code).toContain('outputId="synth-out"');
        expect(code).toContain('triggerToken={midiIn.triggerToken}');
        expect(code).toContain('<MidiCCOutput');
        expect(code).toContain('value={knobCCIn.raw}');
        expect(code).toContain('valueFormat="raw"');
        expect(code).toContain('<MidiTransportSync mode="midi-master" inputId="clock-in" outputId="clock-out" sendStartStop={false} sendClock={false} />');
        expect(code).toContain('<TransportProvider');
        expect(code).toContain('mode="manual"');
    });

    it('sanitizes convolver asset URLs and exports file-based sampler/convolver paths', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');
        const { sanitizeGraphForStorage } = await import('../../src/playground/graphUtils');

        const graph = sanitizeGraphForStorage({
            id: 'graph-assets',
            name: 'Assets',
            nodes: [
                {
                    id: 'sampler-1',
                    type: 'samplerNode',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'sampler',
                        src: 'blob:sampler-asset',
                        sampleId: 'sample-1',
                        fileName: 'kick.wav',
                        loop: false,
                        playbackRate: 1,
                        detune: 0,
                        loaded: true,
                        label: 'Sampler',
                    },
                },
                {
                    id: 'convolver-1',
                    type: 'convolverNode',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'convolver',
                        impulseSrc: 'blob:impulse-asset',
                        impulseId: 'impulse-1',
                        impulseFileName: 'plate.wav',
                        normalize: true,
                        label: 'Convolver',
                    },
                },
            ] as any,
            edges: [],
            createdAt: 0,
            updatedAt: 0,
            order: 0,
        });

        const sanitizedConvolver = graph.nodes.find((node) => node.id === 'convolver-1');
        expect((sanitizedConvolver?.data as any).impulseSrc).toBe('');

        const code = generateCode(graph.nodes as any, graph.edges as any, false, 'Assets');
        expect(code).toContain('src="/samples/kick.wav"');
        expect(code).toContain('impulse="/impulses/plate.wav"');
        expect(code).not.toContain('blob:');
    });

    it('exports versioned patch interfaces and round-trips MIDI and asset metadata', async () => {
        vi.resetModules();
        const { PATCH_DOCUMENT_VERSION, graphDocumentToPatch, patchToGraphDocument } = await import('../../../src/patch');

        const nodes = [
            {
                id: 'input-1',
                type: 'inputNode',
                position: { x: 20, y: 10 },
                data: {
                    type: 'input',
                    label: 'Params',
                    params: [{ id: 'cutoff', name: 'cutoff', label: 'Cutoff', type: 'float', value: 72, defaultValue: 64, min: 0, max: 127 }],
                },
            },
            {
                id: 'event-1',
                type: 'eventTriggerNode',
                position: { x: 40, y: 30 },
                data: { type: 'eventTrigger', label: 'Bang', token: 0, mode: 'change', cooldownMs: 0, velocity: 1, duration: 0.1, note: 60, trackId: 'event' },
            },
            {
                id: 'midi-note-1',
                type: 'midiNoteNode',
                position: { x: 80, y: 50 },
                data: {
                    type: 'midiNote',
                    label: 'Keys',
                    inputId: 'keys-in',
                    channel: 2,
                    noteMode: 'range',
                    note: 60,
                    noteMin: 48,
                    noteMax: 72,
                    mappingEnabled: false,
                    mappings: [],
                    activeMappingId: null,
                },
            },
            {
                id: 'midi-cc-1',
                type: 'midiCCNode',
                position: { x: 100, y: 70 },
                data: { type: 'midiCC', label: 'Knob', inputId: 'knobs-in', channel: 3, cc: 74 },
            },
            {
                id: 'midi-note-out-1',
                type: 'midiNoteOutputNode',
                position: { x: 120, y: 90 },
                data: { type: 'midiNoteOutput', label: 'Note Out', outputId: 'synth-out', channel: 4, gate: 0, note: 60, frequency: 261.63, velocity: 0.8 },
            },
            {
                id: 'midi-cc-out-1',
                type: 'midiCCOutputNode',
                position: { x: 140, y: 110 },
                data: { type: 'midiCCOutput', label: 'CC Out', outputId: 'fx-out', channel: 5, cc: 71, value: 96, valueFormat: 'raw' },
            },
            {
                id: 'midi-sync-1',
                type: 'midiSyncNode',
                position: { x: 160, y: 130 },
                data: { type: 'midiSync', label: 'Sync', mode: 'midi-master', inputId: 'clock-in', outputId: 'clock-out', sendStartStop: false, sendClock: false },
            },
            {
                id: 'sampler-1',
                type: 'samplerNode',
                position: { x: 180, y: 150 },
                data: {
                    type: 'sampler',
                    label: 'Sampler',
                    src: '',
                    assetPath: '/samples/kick.wav',
                    sampleId: 'sample-1',
                    fileName: 'kick.wav',
                    loop: false,
                    playbackRate: 1,
                    detune: 0,
                    loaded: false,
                },
            },
            {
                id: 'convolver-1',
                type: 'convolverNode',
                position: { x: 200, y: 170 },
                data: {
                    type: 'convolver',
                    label: 'Convolver',
                    impulseSrc: '',
                    assetPath: '/impulses/plate.wav',
                    impulseId: 'impulse-1',
                    impulseFileName: 'plate.wav',
                    normalize: true,
                },
            },
        ];

        const edges = [
            { id: 'input-cc', source: 'input-1', sourceHandle: 'param:cutoff', target: 'midi-cc-out-1', targetHandle: 'value' },
            { id: 'event-note', source: 'event-1', sourceHandle: 'trigger', target: 'midi-note-out-1', targetHandle: 'trigger' },
            { id: 'note-note', source: 'midi-note-1', sourceHandle: 'note', target: 'midi-note-out-1', targetHandle: 'note' },
            { id: 'note-gate', source: 'midi-note-1', sourceHandle: 'gate', target: 'midi-note-out-1', targetHandle: 'gate' },
        ];

        const patch = graphDocumentToPatch({
            name: 'Patch Round Trip',
            nodes: nodes as any,
            edges: edges as any,
        });

        expect(patch.version).toBe(PATCH_DOCUMENT_VERSION);
        expect(patch.interface.inputs).toMatchObject([
            { label: 'Cutoff', key: 'cutoff', kind: 'input', nodeId: 'input-1', paramId: 'cutoff', min: 0, max: 127 },
        ]);
        expect(patch.interface.events).toMatchObject([
            { label: 'Bang', key: 'bang', kind: 'event', nodeId: 'event-1' },
        ]);
        expect(patch.interface.midiInputs).toMatchObject([
            { label: 'Keys', key: 'keys', kind: 'midi-note-input', nodeId: 'midi-note-1', inputId: 'keys-in', channel: 2, noteMode: 'range', noteMin: 48, noteMax: 72 },
            { label: 'Knob', key: 'knob', kind: 'midi-cc-input', nodeId: 'midi-cc-1', inputId: 'knobs-in', channel: 3, cc: 74 },
        ]);
        expect(patch.interface.midiOutputs).toMatchObject([
            { label: 'Note Out', key: 'noteOut', kind: 'midi-note-output', nodeId: 'midi-note-out-1', outputId: 'synth-out', channel: 4 },
            { label: 'CC Out', key: 'ccOut', kind: 'midi-cc-output', nodeId: 'midi-cc-out-1', outputId: 'fx-out', channel: 5, cc: 71, valueFormat: 'raw' },
            { label: 'Sync', key: 'sync', kind: 'midi-sync-output', nodeId: 'midi-sync-1', mode: 'midi-master', inputId: 'clock-in', outputId: 'clock-out', sendStartStop: false, sendClock: false },
        ]);
        expect(patch.nodes.find((node) => node.id === 'sampler-1')?.data).toMatchObject({
            type: 'sampler',
            assetPath: '/samples/kick.wav',
            src: '',
        });
        expect(patch.nodes.find((node) => node.id === 'convolver-1')?.data).toMatchObject({
            type: 'convolver',
            assetPath: '/impulses/plate.wav',
            impulseSrc: '',
        });

        const roundTripGraph = patchToGraphDocument(patch, {
            graphId: 'graph-imported',
            createdAt: 123,
            updatedAt: 456,
            order: 7,
        });

        expect(roundTripGraph).toMatchObject({
            id: 'graph-imported',
            name: 'Patch Round Trip',
            createdAt: 123,
            updatedAt: 456,
            order: 7,
        });
        expect(roundTripGraph.nodes.find((node) => node.id === 'midi-note-1')).toMatchObject({
            type: 'midiNoteNode',
            position: { x: 80, y: 50 },
            data: { type: 'midiNote', inputId: 'keys-in', channel: 2, noteMode: 'range', noteMin: 48, noteMax: 72, label: 'Keys' },
        });
        expect(roundTripGraph.nodes.find((node) => node.id === 'midi-sync-1')).toMatchObject({
            type: 'midiSyncNode',
            data: { type: 'midiSync', mode: 'midi-master', inputId: 'clock-in', outputId: 'clock-out', sendStartStop: false, sendClock: false },
        });
        expect(roundTripGraph.nodes.find((node) => node.id === 'sampler-1')).toMatchObject({
            type: 'samplerNode',
            position: { x: 180, y: 150 },
            data: { type: 'sampler', assetPath: '/samples/kick.wav', src: '', sampleId: '', loaded: false, fileName: 'kick.wav' },
        });
        expect(roundTripGraph.nodes.find((node) => node.id === 'convolver-1')).toMatchObject({
            type: 'convolverNode',
            position: { x: 200, y: 170 },
            data: { type: 'convolver', assetPath: '/impulses/plate.wav', impulseSrc: '', impulseId: '', impulseFileName: 'plate.wav' },
        });
        expect(roundTripGraph.edges).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'input-cc', sourceHandle: 'param:cutoff', targetHandle: 'value' }),
                expect.objectContaining({ id: 'event-note', sourceHandle: 'trigger', targetHandle: 'trigger' }),
            ])
        );
    });

    it('migrates legacy handles, rejects removed note triggers, and keeps singleton transport/output nodes', async () => {
        vi.resetModules();
        const { useAudioGraphStore } = await import('../../src/playground/store');

        useAudioGraphStore.getState().loadGraph(
            [
                {
                    id: 'input-1',
                    type: 'inputNode',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'input',
                        label: 'Params',
                        params: [{ id: 'cutoff', name: 'cutoff', label: 'Cutoff', type: 'float', value: 440, defaultValue: 440, min: 20, max: 20000 }],
                    },
                },
                {
                    id: 'transport-a',
                    type: 'transportNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'transport', bpm: 120, playing: false, label: 'Transport' },
                },
                {
                    id: 'transport-b',
                    type: 'transportNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'transport', bpm: 90, playing: false, label: 'Transport 2' },
                },
                {
                    id: 'legacy-ui-tokens',
                    type: 'inputNode',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'input',
                        label: 'UI Tokens',
                        params: [
                            { id: 'hoverToken', name: 'hoverToken', label: 'Hover Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                            { id: 'successToken', name: 'successToken', label: 'Success Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                            { id: 'errorToken', name: 'errorToken', label: 'Error Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        ],
                    },
                },
                {
                    id: 'seq-1',
                    type: 'stepSequencerNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'stepSequencer', steps: 16, pattern: Array(16).fill(0.8), activeSteps: Array(16).fill(false), label: 'Step Sequencer' },
                },
                {
                    id: 'osc-1',
                    type: 'oscNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
                },
                {
                    id: 'note-1',
                    type: 'noteNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'note', note: 'C', octave: 4, frequency: 261.6, language: 'en', label: 'Note' },
                },
                {
                    id: 'output-a',
                    type: 'outputNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
                },
                {
                    id: 'output-b',
                    type: 'outputNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'output', playing: false, masterGain: 0.8, label: 'Output 2' },
                },
            ],
            [
                { id: 'legacy-input', source: 'input-1', sourceHandle: 'param_0', target: 'osc-1', targetHandle: 'frequency' },
                { id: 'legacy-ui-token', source: 'legacy-ui-tokens', sourceHandle: 'param_1', target: 'osc-1', targetHandle: 'frequency' },
                { id: 'legacy-transport', source: 'transport-a', target: 'seq-1' },
                { id: 'dead-note-trigger', source: 'osc-1', sourceHandle: 'out', target: 'note-1', targetHandle: 'trigger' },
            ]
        );

        const state = useAudioGraphStore.getState();

        expect(state.nodes.filter((node) => node.data.type === 'transport')).toHaveLength(1);
        expect(state.nodes.filter((node) => node.data.type === 'output')).toHaveLength(1);
        expect(state.nodes.find((node) => node.id === 'legacy-ui-tokens')?.data.type).toBe('uiTokens');
        expect(state.nodes.find((node) => node.id === 'legacy-ui-tokens')?.type).toBe('uiTokensNode');
        expect(state.edges.find((edge) => edge.id === 'legacy-input')?.sourceHandle).toBe('param:cutoff');
        expect(state.edges.find((edge) => edge.id === 'legacy-ui-token')?.sourceHandle).toBe('param:successToken');
        expect(state.edges.find((edge) => edge.id === 'legacy-transport')?.targetHandle).toBe('transport');
        expect(state.edges.some((edge) => edge.id === 'dead-note-trigger')).toBe(false);
    });

    it('gates generated sequencing on transport links and emits helper components for delay feedback and sampler triggers', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');

        const nodes = [
            {
                id: 'transport-1',
                type: 'transportNode',
                position: { x: 0, y: 0 },
                data: { type: 'transport', bpm: 128, playing: false, beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4, barsPerPhrase: 4, swing: 0.2, label: 'Transport' },
            },
            {
                id: 'seq-1',
                type: 'stepSequencerNode',
                position: { x: 0, y: 0 },
                data: { type: 'stepSequencer', steps: 32, pattern: Array(32).fill(0.8), activeSteps: Array(32).fill(true), label: 'Step Sequencer' },
            },
            {
                id: 'input-1',
                type: 'inputNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'input',
                    label: 'Params',
                    params: [{ id: 'cutoff', name: 'cutoff', label: 'Cutoff', type: 'float', value: 880, defaultValue: 880, min: 20, max: 20000 }],
                },
            },
            {
                id: 'osc-1',
                type: 'oscNode',
                position: { x: 0, y: 0 },
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
            },
            {
                id: 'filter-1',
                type: 'filterNode',
                position: { x: 0, y: 0 },
                data: { type: 'filter', filterType: 'lowpass', frequency: 1000, detune: 0, q: 1, gain: 0, label: 'Filter' },
            },
            {
                id: 'sampler-1',
                type: 'samplerNode',
                position: { x: 0, y: 0 },
                data: { type: 'sampler', src: '/samples/kick.wav', loop: false, playbackRate: 1, detune: 0, loaded: true, label: 'Sampler' },
            },
            {
                id: 'delay-1',
                type: 'delayNode',
                position: { x: 0, y: 0 },
                data: { type: 'delay', delayTime: 0.25, feedback: 0.6, label: 'Delay' },
            },
            {
                id: 'output-1',
                type: 'outputNode',
                position: { x: 0, y: 0 },
                data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
            },
        ];

        const edges = [
            { id: 'transport', source: 'transport-1', sourceHandle: 'out', target: 'seq-1', targetHandle: 'transport' },
            { id: 'seq-sampler', source: 'seq-1', sourceHandle: 'trigger', target: 'sampler-1', targetHandle: 'trigger' },
            { id: 'input-filter', source: 'input-1', sourceHandle: 'param:cutoff', target: 'filter-1', targetHandle: 'frequency' },
            { id: 'osc-filter', source: 'osc-1', sourceHandle: 'out', target: 'filter-1', targetHandle: 'in' },
            { id: 'filter-output', source: 'filter-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
            { id: 'sampler-delay', source: 'sampler-1', sourceHandle: 'out', target: 'delay-1', targetHandle: 'in' },
            { id: 'delay-output', source: 'delay-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
        ];

        const connectedCode = generateCode(nodes as any, edges as any, true, 'Bass Lab');
        const disconnectedCode = generateCode(nodes as any, edges.filter((edge) => edge.id !== 'transport') as any, true, 'Bass Lab');

        expect(connectedCode).toContain('const FeedbackDelay');
        expect(connectedCode).toContain('TriggeredSampler');
        expect(connectedCode).not.toContain('const TriggeredSampler');
        expect(connectedCode).toContain('cutoff?: number;');
        expect(connectedCode).toContain('<Sequencer');
        expect(connectedCode).toContain('<TransportProvider');
        expect(connectedCode).not.toContain('param_0');
        expect(disconnectedCode).not.toContain('<Sequencer');
    });

    it('generates extended MVP nodes and wraps event-driven chains with EventTrigger', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');

        const nodes = [
            {
                id: 'input-1',
                type: 'uiTokensNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'uiTokens',
                    label: 'UI Tokens',
                    params: [
                        { id: 'hoverToken', name: 'hoverToken', label: 'Hover Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        { id: 'successToken', name: 'successToken', label: 'Success Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        { id: 'errorToken', name: 'errorToken', label: 'Error Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                    ],
                },
            },
            {
                id: 'event-1',
                type: 'eventTriggerNode',
                position: { x: 0, y: 0 },
                data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 40, velocity: 1, duration: 0.1, note: 60, trackId: 'hover', label: 'Event Trigger' },
            },
            {
                id: 'noise-burst-1',
                type: 'noiseBurstNode',
                position: { x: 0, y: 0 },
                data: { type: 'noiseBurst', noiseType: 'white', duration: 0.03, gain: 0.6, attack: 0.001, release: 0.02, label: 'Noise Burst' },
            },
            {
                id: 'distortion-1',
                type: 'distortionNode',
                position: { x: 0, y: 0 },
                data: { type: 'distortion', distortionType: 'soft', drive: 0.35, level: 0.65, mix: 0.5, tone: 2400, label: 'Distortion' },
            },
            {
                id: 'wave-shaper-1',
                type: 'waveShaperNode',
                position: { x: 0, y: 0 },
                data: { type: 'waveShaper', amount: 0.45, preset: 'saturate', oversample: '2x', label: 'WaveShaper' },
            },
            {
                id: 'convolver-1',
                type: 'convolverNode',
                position: { x: 0, y: 0 },
                data: { type: 'convolver', impulseSrc: 'data:audio/wav;base64,ZmFrZS1pcg==', impulseFileName: 'plate.wav', normalize: true, label: 'Convolver' },
            },
            {
                id: 'chorus-1',
                type: 'chorusNode',
                position: { x: 0, y: 0 },
                data: { type: 'chorus', rate: 1.1, depth: 2.2, feedback: 0.12, delay: 16, mix: 0.2, stereo: true, label: 'Chorus' },
            },
            {
                id: 'panner3d-1',
                type: 'panner3dNode',
                position: { x: 0, y: 0 },
                data: { type: 'panner3d', positionX: 0, positionY: 0, positionZ: -1, refDistance: 1, maxDistance: 10000, rolloffFactor: 1, panningModel: 'HRTF', distanceModel: 'inverse', label: 'Panner 3D' },
            },
            {
                id: 'analyzer-1',
                type: 'analyzerNode',
                position: { x: 0, y: 0 },
                data: { type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.8, updateRate: 60, autoUpdate: true, label: 'Analyzer' },
            },
            {
                id: 'output-1',
                type: 'outputNode',
                position: { x: 0, y: 0 },
                data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
            },
        ];

        const edges = [
            { id: 'token-link', source: 'input-1', sourceHandle: 'param:hoverToken', target: 'event-1', targetHandle: 'token' },
            { id: 'trigger-link', source: 'event-1', sourceHandle: 'trigger', target: 'noise-burst-1', targetHandle: 'trigger' },
            { id: 'a1', source: 'noise-burst-1', sourceHandle: 'out', target: 'distortion-1', targetHandle: 'in' },
            { id: 'a2', source: 'distortion-1', sourceHandle: 'out', target: 'wave-shaper-1', targetHandle: 'in' },
            { id: 'a3', source: 'wave-shaper-1', sourceHandle: 'out', target: 'convolver-1', targetHandle: 'in' },
            { id: 'a4', source: 'convolver-1', sourceHandle: 'out', target: 'chorus-1', targetHandle: 'in' },
            { id: 'a5', source: 'chorus-1', sourceHandle: 'out', target: 'panner3d-1', targetHandle: 'in' },
            { id: 'a6', source: 'panner3d-1', sourceHandle: 'out', target: 'analyzer-1', targetHandle: 'in' },
            { id: 'a7', source: 'analyzer-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
        ];

        const code = generateCode(nodes as any, edges as any, true, 'UI Feedback');

        expect(code).toContain('EventTrigger');
        expect(code).toContain('NoiseBurst');
        expect(code).toContain('Distortion');
        expect(code).toContain('Convolver');
        expect(code).toContain('Chorus');
        expect(code).toContain('Panner');
        expect(code).toContain('Analyzer');
        expect(code).toContain('PresetWaveShaper');
        expect(code).not.toContain('const PresetWaveShaper');
        expect(code).toContain('impulse="/impulses/plate.wav"');
        expect(code).not.toContain('data:audio/wav;base64');
        expect(code).toContain('<EventTrigger token={hoverToken}');
    });

    it('generates new effects and advanced routing nodes including sidechain bus wiring', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');

        const nodes = [
            { id: 'osc-main', type: 'oscNode', position: { x: 0, y: 0 }, data: { type: 'osc', frequency: 220, detune: 0, waveform: 'sawtooth', label: 'Main Osc' } },
            { id: 'osc-sc', type: 'oscNode', position: { x: 0, y: 0 }, data: { type: 'osc', frequency: 4, detune: 0, waveform: 'square', label: 'SC Osc' } },
            { id: 'phaser-1', type: 'phaserNode', position: { x: 0, y: 0 }, data: { type: 'phaser', rate: 0.6, depth: 0.4, feedback: 0.3, baseFrequency: 1200, stages: 4, mix: 0.5, label: 'Phaser' } },
            { id: 'flanger-1', type: 'flangerNode', position: { x: 0, y: 0 }, data: { type: 'flanger', rate: 0.2, depth: 2, feedback: 0.25, delay: 1.2, mix: 0.45, label: 'Flanger' } },
            { id: 'tremolo-1', type: 'tremoloNode', position: { x: 0, y: 0 }, data: { type: 'tremolo', rate: 5, depth: 0.7, waveform: 'triangle', stereo: true, mix: 0.6, label: 'Tremolo' } },
            { id: 'eq3-1', type: 'eq3Node', position: { x: 0, y: 0 }, data: { type: 'eq3', low: 2, mid: -1, high: 3, lowFrequency: 300, highFrequency: 2800, mix: 1, label: 'EQ3' } },
            { id: 'compressor-1', type: 'compressorNode', position: { x: 0, y: 0 }, data: { type: 'compressor', threshold: -26, knee: 20, ratio: 8, attack: 0.01, release: 0.2, sidechainStrength: 0.8, label: 'Compressor' } },
            { id: 'aux-send-1', type: 'auxSendNode', position: { x: 0, y: 0 }, data: { type: 'auxSend', busId: 'fx', sendGain: 0.4, tap: 'pre', label: 'Aux Send' } },
            { id: 'aux-return-1', type: 'auxReturnNode', position: { x: 0, y: 0 }, data: { type: 'auxReturn', busId: 'fx', gain: 0.7, label: 'Aux Return' } },
            { id: 'matrix-1', type: 'matrixMixerNode', position: { x: 0, y: 0 }, data: { type: 'matrixMixer', inputs: 2, outputs: 2, matrix: [[1, 0.25], [0.1, 1]], label: 'Matrix Mixer' } },
            { id: 'output-1', type: 'outputNode', position: { x: 0, y: 0 }, data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' } },
        ];

        const edges = [
            { id: 'a1', source: 'osc-main', sourceHandle: 'out', target: 'phaser-1', targetHandle: 'in' },
            { id: 'a2', source: 'phaser-1', sourceHandle: 'out', target: 'flanger-1', targetHandle: 'in' },
            { id: 'a3', source: 'flanger-1', sourceHandle: 'out', target: 'tremolo-1', targetHandle: 'in' },
            { id: 'a4', source: 'tremolo-1', sourceHandle: 'out', target: 'eq3-1', targetHandle: 'in' },
            { id: 'a5', source: 'eq3-1', sourceHandle: 'out', target: 'compressor-1', targetHandle: 'in' },
            { id: 'a6', source: 'compressor-1', sourceHandle: 'out', target: 'aux-send-1', targetHandle: 'in' },
            { id: 'a7', source: 'aux-send-1', sourceHandle: 'out', target: 'matrix-1', targetHandle: 'in1' },
            { id: 'a8', source: 'aux-return-1', sourceHandle: 'out', target: 'matrix-1', targetHandle: 'in2' },
            { id: 'a9', source: 'matrix-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
            { id: 'sc', source: 'osc-sc', sourceHandle: 'out', target: 'compressor-1', targetHandle: 'sidechainIn' },
        ];

        const code = generateCode(nodes as any, edges as any, true, 'Routing Lab');

        expect(code).toContain('Phaser');
        expect(code).toContain('Flanger');
        expect(code).toContain('Tremolo');
        expect(code).toContain('EQ3');
        expect(code).toContain('AuxSend');
        expect(code).toContain('AuxReturn');
        expect(code).toContain('MatrixMixer');
        expect(code).toContain('sidechainBusId="sc-osc-sc-compressor-1"');
        expect(code).toContain('<AuxSend busId="sc-osc-sc-compressor-1" sendGain={1}>');
    });

    it('generates atmospheric piano-roll sidechain graph with matrix routing and event trigger wrappers', async () => {
        vi.resetModules();
        const { generateCode } = await import('../../src/playground/CodeGenerator');

        const notes = [
            { pitch: 60, step: 0, duration: 4, velocity: 0.62 },
            { pitch: 67, step: 6, duration: 6, velocity: 0.58 },
            { pitch: 64, step: 14, duration: 5, velocity: 0.54 },
            { pitch: 71, step: 22, duration: 6, velocity: 0.5 },
        ];

        const nodes = [
            { id: 'transport', type: 'transportNode', position: { x: 0, y: 0 }, data: { type: 'transport', bpm: 84, playing: false, label: 'Transport' } },
            { id: 'pianoroll', type: 'pianoRollNode', position: { x: 0, y: 0 }, data: { type: 'pianoRoll', steps: 32, octaves: 3, baseNote: 48, notes, label: 'Piano Roll' } },
            { id: 'voice', type: 'voiceNode', position: { x: 0, y: 0 }, data: { type: 'voice', portamento: 0.08, label: 'Voice' } },
            { id: 'osc-pad-a', type: 'oscNode', position: { x: 0, y: 0 }, data: { type: 'osc', frequency: 0, detune: -6, waveform: 'sine', label: 'Osc Pad A' } },
            { id: 'osc-pad-b', type: 'oscNode', position: { x: 0, y: 0 }, data: { type: 'osc', frequency: 0, detune: 5, waveform: 'triangle', label: 'Osc Pad B' } },
            { id: 'adsr-pad', type: 'adsrNode', position: { x: 0, y: 0 }, data: { type: 'adsr', attack: 0.35, decay: 1.8, sustain: 0.72, release: 2.8, label: 'ADSR Pad' } },
            { id: 'gain-a', type: 'gainNode', position: { x: 0, y: 0 }, data: { type: 'gain', gain: 0, label: 'Gain A' } },
            { id: 'gain-b', type: 'gainNode', position: { x: 0, y: 0 }, data: { type: 'gain', gain: 0, label: 'Gain B' } },
            {
                id: 'input-ui',
                type: 'uiTokensNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'uiTokens',
                    params: [
                        { id: 'hoverToken', name: 'hoverToken', label: 'Hover Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        { id: 'successToken', name: 'successToken', label: 'Success Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        { id: 'errorToken', name: 'errorToken', label: 'Error Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                    ],
                    label: 'UI Tokens',
                },
            },
            { id: 'evt-hover', type: 'eventTriggerNode', position: { x: 0, y: 0 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 120, velocity: 0.5, duration: 0.18, note: 79, trackId: 'hover', label: 'Event Trigger' } },
            { id: 'noise-accent', type: 'noiseBurstNode', position: { x: 0, y: 0 }, data: { type: 'noiseBurst', noiseType: 'pink', duration: 0.12, gain: 0.35, attack: 0.004, release: 0.08, label: 'Noise Burst Accent' } },
            { id: 'pump-seq', type: 'stepSequencerNode', position: { x: 0, y: 0 }, data: { type: 'stepSequencer', steps: 16, pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], activeSteps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], label: 'Step Sequencer Pump' } },
            { id: 'noise-pump', type: 'noiseBurstNode', position: { x: 0, y: 0 }, data: { type: 'noiseBurst', noiseType: 'white', duration: 0.05, gain: 1, attack: 0.001, release: 0.025, label: 'Noise Burst Pump' } },
            { id: 'matrix', type: 'matrixMixerNode', position: { x: 0, y: 0 }, data: { type: 'matrixMixer', inputs: 3, outputs: 3, matrix: [[0.9, 0.08, 0.04], [0.84, 0.06, 0.03], [0.22, 0.02, 0.01]], label: 'Matrix Mixer' } },
            { id: 'compressor', type: 'compressorNode', position: { x: 0, y: 0 }, data: { type: 'compressor', threshold: -28, knee: 20, ratio: 8, attack: 0.012, release: 0.24, sidechainStrength: 0.86, label: 'Compressor' } },
            { id: 'reverb', type: 'reverbNode', position: { x: 0, y: 0 }, data: { type: 'reverb', decay: 3.6, mix: 0.42, label: 'Reverb' } },
            { id: 'output', type: 'outputNode', position: { x: 0, y: 0 }, data: { type: 'output', playing: false, masterGain: 0.45, label: 'Output' } },
        ];

        const edges = [
            { id: 'e-t-pr', source: 'transport', sourceHandle: 'out', target: 'pianoroll', targetHandle: 'transport' },
            { id: 'e-pr-v', source: 'pianoroll', sourceHandle: 'trigger', target: 'voice', targetHandle: 'trigger' },
            { id: 'e-v-osc-a', source: 'voice', sourceHandle: 'note', target: 'osc-pad-a', targetHandle: 'frequency' },
            { id: 'e-v-osc-b', source: 'voice', sourceHandle: 'note', target: 'osc-pad-b', targetHandle: 'frequency' },
            { id: 'e-v-adsr', source: 'voice', sourceHandle: 'gate', target: 'adsr-pad', targetHandle: 'gate' },
            { id: 'e-osc-a-gain-a', source: 'osc-pad-a', sourceHandle: 'out', target: 'gain-a', targetHandle: 'in' },
            { id: 'e-osc-b-gain-b', source: 'osc-pad-b', sourceHandle: 'out', target: 'gain-b', targetHandle: 'in' },
            { id: 'e-adsr-gain-a', source: 'adsr-pad', sourceHandle: 'envelope', target: 'gain-a', targetHandle: 'gain' },
            { id: 'e-adsr-gain-b', source: 'adsr-pad', sourceHandle: 'envelope', target: 'gain-b', targetHandle: 'gain' },
            { id: 'e-gain-a-matrix', source: 'gain-a', sourceHandle: 'out', target: 'matrix', targetHandle: 'in1' },
            { id: 'e-gain-b-matrix', source: 'gain-b', sourceHandle: 'out', target: 'matrix', targetHandle: 'in2' },
            { id: 'e-ui-hover-token', source: 'input-ui', sourceHandle: 'param:hoverToken', target: 'evt-hover', targetHandle: 'token' },
            { id: 'e-evt-accent', source: 'evt-hover', sourceHandle: 'trigger', target: 'noise-accent', targetHandle: 'trigger' },
            { id: 'e-accent-matrix', source: 'noise-accent', sourceHandle: 'out', target: 'matrix', targetHandle: 'in3' },
            { id: 'e-t-pump', source: 'transport', sourceHandle: 'out', target: 'pump-seq', targetHandle: 'transport' },
            { id: 'e-pump-trigger', source: 'pump-seq', sourceHandle: 'trigger', target: 'noise-pump', targetHandle: 'trigger' },
            { id: 'e-sidechain', source: 'noise-pump', sourceHandle: 'out', target: 'compressor', targetHandle: 'sidechainIn' },
            { id: 'e-matrix-comp', source: 'matrix', sourceHandle: 'out', target: 'compressor', targetHandle: 'in' },
            { id: 'e-comp-reverb', source: 'compressor', sourceHandle: 'out', target: 'reverb', targetHandle: 'in' },
            { id: 'e-reverb-output', source: 'reverb', sourceHandle: 'out', target: 'output', targetHandle: 'in' },
        ];

        const code = generateCode(nodes as any, edges as any, true, 'Atmospheric Sidechain');

        expect(code).toContain('Track id="pianoroll"');
        expect(code).toContain('EventTrigger');
        expect(code).toContain('MatrixMixer');
        expect(code).toContain('sidechainBusId="sc-noise-pump-compressor"');
    });
});
