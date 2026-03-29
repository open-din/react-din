import { cleanup, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach } from 'vitest';
import {
    createMidiRuntime,
    graphDocumentToPatch,
    importPatch,
    MidiProvider,
    PatchRenderer,
    type PatchDocument,
    type PatchNode,
} from '@din/react';

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
    it('exposes input props as flat numeric props and drives MIDI CC outputs', async () => {
        const access = new MockMIDIAccess();
        const output = new MockMIDIOutput('out-a', 'CC Out');
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([output]);
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
        const { rerender } = render(
            <MidiProvider runtime={runtime} requestOnMount>
                <Patch midi={{ outputs: { ccOut: {} } }} />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0xB0 && bytes[1] === 74 && bytes[2] === 64)).toBe(true);
        });

        rerender(
            <MidiProvider runtime={runtime} requestOnMount>
                <Patch cutoff={96} midi={{ outputs: { ccOut: {} } }} />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0xB0 && bytes[1] === 74 && bytes[2] === 96)).toBe(true);
        });
    });

    it('exposes event trigger props and drives MIDI note outputs', async () => {
        const access = new MockMIDIAccess();
        const output = new MockMIDIOutput('out-a', 'Synth');
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([output]);
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
        const { rerender } = render(
            <MidiProvider runtime={runtime} requestOnMount>
                <Patch bang={0} midi={{ outputs: { noteOut: {} } }} />
            </MidiProvider>
        );

        rerender(
            <MidiProvider runtime={runtime} requestOnMount>
                <Patch bang={1} midi={{ outputs: { noteOut: {} } }} />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0x90 && bytes[1] === 67)).toBe(true);
        });
    });

    it('accepts explicit midi note input bindings and routes them to note outputs', async () => {
        const access = new MockMIDIAccess();
        const output = new MockMIDIOutput('out-a', 'Synth');
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([output]);
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

        render(
            <MidiProvider runtime={runtime} requestOnMount>
                <Patch midi={{ inputs: { keys: noteValue }, outputs: { noteOut: {} } }} />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0x90 && bytes[1] === 64)).toBe(true);
        });
    });

    it('accepts explicit midi CC input bindings and routes them to CC outputs', async () => {
        const access = new MockMIDIAccess();
        const output = new MockMIDIOutput('out-a', 'FX');
        access.setInputs([new MockMIDIInput('in-a', 'Controller')]);
        access.setOutputs([output]);
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

        render(
            <MidiProvider runtime={runtime} requestOnMount>
                <Patch midi={{ inputs: { knob: ccValue }, outputs: { ccSend: {} } }} />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0xB0 && bytes[1] === 74 && bytes[2] === 99)).toBe(true);
        });
    });

    it('resolves sampler and convolver assets from assetRoot', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) })
            .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) });
        vi.stubGlobal('fetch', fetchMock);

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

        render(<PatchRenderer patch={patch} includeProvider assetRoot="/public" />);

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('/public/samples/kick.wav');
            expect(fetchMock).toHaveBeenCalledWith('/public/impulses/plate.wav');
        });
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
});
