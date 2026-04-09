import { cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach } from 'vitest';
import {
    createMidiRuntime,
    graphDocumentToPatch,
    importPatch,
    MidiProvider,
    Patch,
    patchToGraphDocument,
    PatchOutput,
    PatchRenderer,
    type PatchDocument,
    type PatchNode,
} from '@open-din/react';
import { getTransportConnections } from '../../src/patch/document';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

class MockMIDIInput extends EventTarget {
    readonly type = 'input';
    readonly state = 'connected';
    readonly connection = 'open';

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly manufacturer = 'PatchCo'
    ) {
        super();
    }
}

class MockMIDIOutput {
    readonly type = 'output';
    readonly state = 'connected';
    readonly connection = 'open';
    readonly sent: number[][] = [];

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly manufacturer = 'PatchCo'
    ) {}

    send(bytes: number[]) {
        this.sent.push(Array.from(bytes));
    }
}

class MockMIDIAccess {
    inputs = new Map<string, MockMIDIInput>();
    outputs = new Map<string, MockMIDIOutput>();
    onstatechange: ((event: Event) => void) | null = null;

    setInputs(inputs: MockMIDIInput[]) {
        this.inputs = new Map(inputs.map((input) => [input.id, input]));
        this.onstatechange?.(new Event('statechange'));
    }

    setOutputs(outputs: MockMIDIOutput[]) {
        this.outputs = new Map(outputs.map((output) => [output.id, output]));
        this.onstatechange?.(new Event('statechange'));
    }
}

function installMidiAccess(access: MockMIDIAccess) {
    Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', {
        configurable: true,
        value: vi.fn().mockResolvedValue(access),
    });
}

describe('patch import/export runtime', () => {
    it('mounts a CC-output patch through the wasm runtime without throwing', async () => {
        const access = new MockMIDIAccess();
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([new MockMIDIOutput('out-a', 'CC Out')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        const patch = graphDocumentToPatch({
            name: 'CC Patch',
            nodes: [
                {
                    id: 'input-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'input',
                        label: 'Params',
                        params: [
                            { id: 'cutoff', name: 'cutoff', label: 'Cutoff', type: 'float', value: 64, defaultValue: 64, min: 0, max: 127 },
                        ],
                    },
                },
                {
                    id: 'cc-out-1',
                    position: { x: 140, y: 0 },
                    data: {
                        type: 'midiCCOutput',
                        label: 'CC Out',
                        outputId: 'out-a',
                        channel: 1,
                        cc: 74,
                        value: 32,
                        valueFormat: 'raw',
                    },
                },
            ],
            edges: [
                {
                    id: 'cutoff-cc',
                    source: 'input-1',
                    sourceHandle: 'param:cutoff',
                    target: 'cc-out-1',
                    targetHandle: 'value',
                },
            ],
        });

        const Patch = importPatch(patch);
        expect(() =>
            render(
                <MidiProvider runtime={runtime} requestOnMount>
                    <Patch cutoff={96} midi={{ outputs: { ccOut: {} } }} />
                </MidiProvider>
            )
        ).not.toThrow();
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });
    });

    it('mounts an event-trigger + note-output patch through the wasm runtime', async () => {
        const access = new MockMIDIAccess();
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([new MockMIDIOutput('out-a', 'Synth')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();
        await runtime.requestAccess();

        const patch = graphDocumentToPatch({
            name: 'Event Patch',
            nodes: [
                {
                    id: 'event-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'eventTrigger',
                        label: 'Bang',
                        token: 0,
                        mode: 'change',
                        cooldownMs: 0,
                        velocity: 0.75,
                        duration: 0.05,
                        note: 67,
                        trackId: 'bang',
                    },
                },
                {
                    id: 'note-out-1',
                    position: { x: 140, y: 0 },
                    data: {
                        type: 'midiNoteOutput',
                        label: 'Note Out',
                        outputId: 'out-a',
                        channel: 1,
                        gate: 0,
                        note: 67,
                        frequency: 392,
                        velocity: 0.75,
                    },
                },
            ],
            edges: [
                {
                    id: 'bang-note',
                    source: 'event-1',
                    sourceHandle: 'trigger',
                    target: 'note-out-1',
                    targetHandle: 'trigger',
                },
            ],
        });

        const Patch = importPatch(patch);
        expect(() =>
            render(
                <MidiProvider runtime={runtime} requestOnMount>
                    <Patch bang={1} midi={{ outputs: { noteOut: {} } }} />
                </MidiProvider>
            )
        ).not.toThrow();
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });
    });

    it('accepts midi note input bindings in the wasm-backed patch renderer', async () => {
        const access = new MockMIDIAccess();
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([new MockMIDIOutput('out-a', 'Synth')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        const patch = graphDocumentToPatch({
            name: 'Midi Note Patch',
            nodes: [
                {
                    id: 'midi-note-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'midiNote',
                        label: 'Keys',
                        inputId: 'default',
                        channel: 'all',
                        noteMode: 'all',
                        note: 60,
                        noteMin: 0,
                        noteMax: 127,
                        mappingEnabled: false,
                        mappings: [],
                        activeMappingId: null,
                    },
                },
                {
                    id: 'note-out-1',
                    position: { x: 140, y: 0 },
                    data: {
                        type: 'midiNoteOutput',
                        label: 'Note Out',
                        outputId: 'out-a',
                        channel: 1,
                        gate: 0,
                        note: 60,
                        frequency: 261.63,
                        velocity: 0.5,
                    },
                },
            ],
            edges: [
                { id: 'keys-note', source: 'midi-note-1', sourceHandle: 'note', target: 'note-out-1', targetHandle: 'note' },
                { id: 'keys-gate', source: 'midi-note-1', sourceHandle: 'gate', target: 'note-out-1', targetHandle: 'gate' },
                { id: 'keys-trigger', source: 'midi-note-1', sourceHandle: 'trigger', target: 'note-out-1', targetHandle: 'trigger' },
            ],
        });

        const Patch = importPatch(patch);
        const noteValue = {
            gate: true,
            note: 64,
            frequency: 329.63,
            velocity: 0.9,
            channel: 1,
            triggerToken: 1,
            activeNotes: [],
            lastEvent: null,
            source: { id: 'in-a', name: 'Keyboard' },
        } as const;

        expect(() =>
            render(
                <MidiProvider runtime={runtime} requestOnMount>
                    <Patch midi={{ inputs: { keys: noteValue }, outputs: { noteOut: {} } }} />
                </MidiProvider>
            )
        ).not.toThrow();
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });
    });

    it('accepts midi CC input bindings in the wasm-backed patch renderer', async () => {
        const access = new MockMIDIAccess();
        access.setInputs([new MockMIDIInput('in-a', 'Controller')]);
        access.setOutputs([new MockMIDIOutput('out-a', 'FX')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        const patch = graphDocumentToPatch({
            name: 'Midi CC Patch',
            nodes: [
                {
                    id: 'midi-cc-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'midiCC',
                        label: 'Knob',
                        inputId: 'default',
                        channel: 'all',
                        cc: 21,
                    },
                },
                {
                    id: 'cc-out-1',
                    position: { x: 140, y: 0 },
                    data: {
                        type: 'midiCCOutput',
                        label: 'CC Send',
                        outputId: 'out-a',
                        channel: 1,
                        cc: 74,
                        value: 0,
                        valueFormat: 'raw',
                    },
                },
            ],
            edges: [
                { id: 'knob-value', source: 'midi-cc-1', sourceHandle: 'raw', target: 'cc-out-1', targetHandle: 'value' },
            ],
        });

        const Patch = importPatch(patch);
        const ccValue = {
            raw: 99,
            normalized: 99 / 127,
            channel: 1,
            lastEvent: null,
            source: { id: 'in-a', name: 'Controller' },
        } as const;

        expect(() =>
            render(
                <MidiProvider runtime={runtime} requestOnMount>
                    <Patch midi={{ inputs: { knob: ccValue }, outputs: { ccSend: {} } }} />
                </MidiProvider>
            )
        ).not.toThrow();
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });
    });

    it('renders sampler and convolver patch graphs with the wasm runtime', async () => {
        const patch = graphDocumentToPatch({
            name: 'Assets Patch',
            nodes: [
                {
                    id: 'sampler-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'sampler',
                        label: 'Sampler',
                        src: '',
                        assetPath: '/samples/kick.wav',
                        loop: false,
                        playbackRate: 1,
                        detune: 0,
                        loaded: false,
                    },
                },
                {
                    id: 'convolver-1',
                    position: { x: 140, y: 0 },
                    data: {
                        type: 'convolver',
                        label: 'Convolver',
                        impulseSrc: '',
                        assetPath: '/impulses/plate.wav',
                        normalize: true,
                    },
                },
                {
                    id: 'output-1',
                    position: { x: 280, y: 0 },
                    data: {
                        type: 'output',
                        label: 'Output',
                        playing: false,
                        masterGain: 0.5,
                    },
                },
            ],
            edges: [
                { id: 'sampler-convolver', source: 'sampler-1', sourceHandle: 'out', target: 'convolver-1', targetHandle: 'in' },
                { id: 'convolver-output', source: 'convolver-1', sourceHandle: 'out', target: 'output-1', targetHandle: 'in' },
            ],
        });

        expect(() => render(<PatchRenderer patch={patch} includeProvider assetRoot="/public" />)).not.toThrow();
        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });
    });

    it('renders nested patch nodes from inline sources before falling back to patchAsset', async () => {
        const access = new MockMIDIAccess();
        access.setOutputs([new MockMIDIOutput('out-a', 'Nested CC')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        const nestedPatch = graphDocumentToPatch({
            name: 'Nested Patch',
            nodes: [
                {
                    id: 'cc-out-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'midiCCOutput',
                        label: 'CC Out',
                        outputId: 'out-a',
                        channel: 1,
                        cc: 74,
                        value: 64,
                        valueFormat: 'raw',
                    },
                },
            ],
            edges: [],
        });

        const outerPatch = graphDocumentToPatch({
            name: 'Outer Patch',
            nodes: [
                {
                    id: 'patch-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'patch',
                        label: 'Nested Patch',
                        patchAsset: '/patches/ignored.patch.json',
                        patchInline: nestedPatch,
                        patchName: 'Nested Patch',
                    },
                },
            ],
            edges: [],
        });

        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        expect(() =>
            render(
                <MidiProvider runtime={runtime} requestOnMount>
                    <PatchRenderer patch={outerPatch} midi={{ outputs: { ccOut: {} } }} includeProvider />
                </MidiProvider>
            )
        ).not.toThrow();

        await waitFor(() => {
            expect(document.body).toBeTruthy();
        });

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('caches repeated asset-backed Patch loads by resolved asset path', async () => {
        const assetPatch = graphDocumentToPatch({
            name: 'Asset Patch',
            nodes: [],
            edges: [],
        });

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            text: async () => JSON.stringify(assetPatch),
        });
        vi.stubGlobal('fetch', fetchMock);

        render(
            <>
                <Patch patchAsset="/patches/shared.patch.json" />
                <Patch patchAsset="/patches/shared.patch.json" />
            </>
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });
    });

    it('renders PatchOutput as a transparent wrapper', () => {
        const { getByText } = render(
            <PatchOutput>
                <span>slot</span>
            </PatchOutput>
        );

        expect(getByText('slot')).toBeTruthy();
    });

    it('rejects recursive inline patch references', () => {
        const recursivePatch: PatchDocument = {
            version: 1,
            name: 'Recursive Patch',
            nodes: [],
            connections: [],
            interface: {
                inputs: [],
                events: [],
                midiInputs: [],
                midiOutputs: [],
            },
        };

        (recursivePatch as PatchDocument & { nodes: PatchNode[] }).nodes = [
            {
                id: 'patch-1',
                position: { x: 0, y: 0 },
                data: {
                    type: 'patch',
                    label: 'Recursive',
                    patchInline: recursivePatch,
                    patchName: 'Recursive Patch',
                },
            } as PatchNode,
        ];

        expect(() => {
            render(<Patch patchInline={recursivePatch} />);
        }).toThrow(/Recursive patch reference/i);
    });

    it('rejects invalid patches', () => {
        const validPatch = graphDocumentToPatch({
            name: 'Valid',
            nodes: [
                {
                    id: 'output-1',
                    position: { x: 0, y: 0 },
                    data: { type: 'output', label: 'Output', playing: false, masterGain: 0.5 },
                },
            ],
            edges: [],
        });

        const unsupportedVersion = { ...validPatch, version: 99 } as unknown as PatchDocument;
        const unknownNodeType = {
            ...validPatch,
            nodes: [
                {
                    id: 'unknown-1',
                    type: 'madeUpNode',
                    position: { x: 0, y: 0 },
                    data: { type: 'madeUpNode', label: 'Unknown' },
                },
            ],
        } as PatchDocument;
        const invalidHandle = {
            ...validPatch,
            nodes: [
                ...validPatch.nodes,
                {
                    id: 'osc-1',
                    type: 'osc',
                    position: { x: 0, y: 0 },
                    data: { type: 'osc', label: 'Osc', frequency: 440, detune: 0, waveform: 'sine' },
                } as PatchNode,
            ],
            connections: [
                {
                    id: 'bad-edge',
                    source: 'osc-1',
                    sourceHandle: 'out',
                    target: 'output-1',
                    targetHandle: 'bogus',
                },
            ],
        } as PatchDocument;

        expect(() => importPatch(unsupportedVersion)).toThrow(/Unsupported patch version/);
        expect(() => importPatch(unknownNodeType)).toThrow(/unsupported node type|unsupported source handle|unsupported target handle|missing a valid data\.type|mismatched type metadata/i);
        expect(() => importPatch(invalidHandle)).toThrow(/unsupported target handle/);
    });

    it('accepts patch nodes with implicit audio and named slot handles', () => {
        const inlinePatch = graphDocumentToPatch({
            name: 'Inline Child',
            nodes: [],
            edges: [],
        });

        const patch = graphDocumentToPatch({
            name: 'Nested Patch Contract',
            nodes: [
                {
                    id: 'event-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'eventTrigger',
                        label: 'Bang',
                        token: 0,
                        mode: 'change',
                        cooldownMs: 0,
                        velocity: 0.75,
                        duration: 0.05,
                        note: 67,
                        trackId: 'bang',
                    },
                },
                {
                    id: 'patch-1',
                    position: { x: 180, y: 0 },
                    data: {
                        type: 'patch',
                        label: 'Nested Patch',
                        patchAsset: '/patches/child.patch.json',
                        patchInline: inlinePatch,
                        patchName: 'Child Patch',
                        inputs: [{ id: 'keys', label: 'Keys', type: 'midi' }],
                        outputs: [{ id: 'mix', label: 'Mix', type: 'audio' }],
                        audio: {
                            input: { id: 'in', label: 'Audio In', type: 'audio' },
                            output: { id: 'out', label: 'Audio Out', type: 'audio' },
                        },
                    },
                },
                {
                    id: 'output-1',
                    position: { x: 360, y: 0 },
                    data: {
                        type: 'output',
                        label: 'Output',
                        playing: false,
                        masterGain: 0.5,
                    },
                },
            ],
            edges: [
                {
                    id: 'bang-in',
                    source: 'event-1',
                    sourceHandle: 'trigger',
                    target: 'patch-1',
                    targetHandle: 'in:keys',
                },
                {
                    id: 'patch-out',
                    source: 'patch-1',
                    sourceHandle: 'out',
                    target: 'output-1',
                    targetHandle: 'in',
                },
            ],
        });

        const Patch = importPatch(patch);

        expect(Patch).toBeTypeOf('function');
        expect(patch.nodes.find((node) => node.id === 'patch-1')?.data).toMatchObject({
            type: 'patch',
            patchAsset: '/patches/child.patch.json',
            patchName: 'Child Patch',
            inputs: [{ id: 'keys', label: 'Keys', type: 'midi' }],
            outputs: [{ id: 'mix', label: 'Mix', type: 'audio' }],
            audio: {
                input: { id: 'in', label: 'Audio In', type: 'audio' },
                output: { id: 'out', label: 'Audio Out', type: 'audio' },
            },
        });
    });

    it('round-trips dynamic graph handles through patch migration', () => {
        const patch = graphDocumentToPatch({
            name: 'Parity Graph',
            nodes: [
                {
                    id: 'input-1',
                    position: { x: 0, y: 0 },
                    data: {
                        type: 'input',
                        label: 'Input',
                        params: [{ id: 'gain', name: 'Gain', type: 'float', defaultValue: 0.5, value: 0.5, min: 0, max: 1 }],
                    },
                },
                {
                    id: 'switch-1',
                    position: { x: 100, y: 0 },
                    data: { type: 'switch', label: 'Switch', inputs: 4 },
                },
                {
                    id: 'matrix-1',
                    position: { x: 200, y: 0 },
                    data: { type: 'matrixMixer', label: 'Matrix', inputs: 2, outputs: 2 },
                },
                {
                    id: 'transport-1',
                    position: { x: 300, y: 0 },
                    data: { type: 'transport', label: 'Transport', bpm: 120, playing: false, beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4, barsPerPhrase: 4, swing: 0 },
                },
                {
                    id: 'player-1',
                    position: { x: 400, y: 0 },
                    data: { type: 'midiPlayer', label: 'MIDI Player', midiFileName: 'clip.mid', loaded: false, loop: false },
                },
            ],
            edges: [
                { source: 'input-1', sourceHandle: 'param:gain', target: 'switch-1', targetHandle: 'in_3' },
                { source: 'transport-1', sourceHandle: 'out', target: 'player-1', targetHandle: 'transport' },
            ],
        });

        const migrated = patchToGraphDocument(patch, { graphId: 'graph-1', createdAt: 1, updatedAt: 1, order: 0 });
        expect(migrated.edges.find((edge) => edge.target === 'switch-1')?.targetHandle).toBe('in_3');
        expect(migrated.nodes.find((node) => node.id === 'matrix-1')?.data).toMatchObject({ inputs: 2, outputs: 2 });

        const nodeById = new Map(patch.nodes.map((node) => [node.id, node] as const));
        expect(getTransportConnections(patch.connections, nodeById)).toEqual(new Set(['player-1']));
    });
});
