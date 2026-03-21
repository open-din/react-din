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
});
