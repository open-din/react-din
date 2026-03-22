import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { afterEach } from 'vitest';
import {
    AudioProvider,
    createMidiRuntime,
    MidiCCOutput,
    MidiNoteOutput,
    MidiProvider,
    MidiTransportSync,
    TransportProvider,
    useMidi,
    useMidiCC,
    useMidiNote,
    useTransport,
} from 'react-din';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

class MockMIDIInput extends EventTarget {
    readonly type = 'input';
    readonly state = 'connected';
    readonly connection = 'open';

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly manufacturer = 'TestCo'
    ) {
        super();
    }

    emit(bytes: number[]) {
        const event = new Event('midimessage') as Event & { data?: Uint8Array };
        event.data = Uint8Array.from(bytes);
        Object.defineProperty(event, 'target', {
            configurable: true,
            value: this,
        });
        Object.defineProperty(event, 'currentTarget', {
            configurable: true,
            value: this,
        });
        this.dispatchEvent(event);
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
        public readonly manufacturer = 'TestCo'
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

function MidiStateProbe() {
    const midi = useMidi();
    return (
        <div>
            <span data-testid="midi-status">{midi.status}</span>
            <span data-testid="midi-default-input">{midi.defaultInput?.name ?? 'none'}</span>
            <span data-testid="midi-default-output">{midi.defaultOutput?.name ?? 'none'}</span>
        </div>
    );
}

function MidiNoteProbe() {
    const value = useMidiNote();
    return (
        <div>
            <span data-testid="note-gate">{value.gate ? 'on' : 'off'}</span>
            <span data-testid="note-value">{value.note ?? 'none'}</span>
            <span data-testid="note-velocity">{value.velocity.toFixed(2)}</span>
        </div>
    );
}

function MidiCCProbe() {
    const value = useMidiCC({ cc: 1 });
    return (
        <div>
            <span data-testid="cc-raw">{value.raw}</span>
            <span data-testid="cc-normalized">{value.normalized.toFixed(2)}</span>
        </div>
    );
}

function TransportProbe() {
    const transport = useTransport();
    return (
        <div>
            <button type="button" onClick={transport.play}>play</button>
            <button type="button" onClick={transport.stop}>stop</button>
            <span data-testid="transport-running">{transport.isPlaying ? 'running' : 'idle'}</span>
            <span data-testid="transport-bpm">{transport.bpm.toFixed(1)}</span>
        </div>
    );
}

describe('midi components and hooks', () => {
    it('requests MIDI access and exposes ports through useMidi', async () => {
        const access = new MockMIDIAccess();
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([new MockMIDIOutput('out-a', 'Synth')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        render(
            <MidiProvider runtime={runtime} requestOnMount>
                <MidiStateProbe />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('midi-status')).toHaveTextContent('granted');
            expect(screen.getByTestId('midi-default-input')).toHaveTextContent('Keyboard');
            expect(screen.getByTestId('midi-default-output')).toHaveTextContent('Synth');
        });
    });

    it('updates note and CC hooks from inbound MIDI messages', async () => {
        const access = new MockMIDIAccess();
        const input = new MockMIDIInput('in-a', 'Keyboard');
        access.setInputs([input]);
        access.setOutputs([new MockMIDIOutput('out-a', 'Synth')]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        render(
            <MidiProvider runtime={runtime} requestOnMount>
                <MidiStateProbe />
                <MidiNoteProbe />
                <MidiCCProbe />
            </MidiProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('midi-status')).toHaveTextContent('granted');
        });

        act(() => {
            input.emit([0x90, 60, 96]);
            input.emit([0xB0, 1, 64]);
        });

        await waitFor(() => {
            expect(screen.getByTestId('note-gate')).toHaveTextContent('on');
            expect(screen.getByTestId('note-value')).toHaveTextContent('60');
            expect(screen.getByTestId('cc-raw')).toHaveTextContent('64');
        });

        act(() => {
            input.emit([0x80, 60, 0]);
        });

        await waitFor(() => {
            expect(screen.getByTestId('note-gate')).toHaveTextContent('off');
        });
    });

    it('sends note and CC messages from declarative outputs', async () => {
        const access = new MockMIDIAccess();
        const output = new MockMIDIOutput('out-a', 'Synth');
        access.setInputs([new MockMIDIInput('in-a', 'Keyboard')]);
        access.setOutputs([output]);
        installMidiAccess(access);
        const runtime = createMidiRuntime();

        function Harness() {
            const [gate, setGate] = useState(false);
            return (
                <MidiProvider runtime={runtime} requestOnMount>
                    <button type="button" onClick={() => setGate((value) => !value)}>toggle</button>
                    <MidiNoteOutput gate={gate} note={64} velocity={0.75} />
                    <MidiCCOutput cc={1} value={0.5} />
                </MidiProvider>
            );
        }

        render(<Harness />);

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0xB0 && bytes[1] === 1)).toBe(true);
        });

        fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0x90 && bytes[1] === 64)).toBe(true);
        });

        fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0x80 && bytes[1] === 64)).toBe(true);
        });
    });

    it('syncs transport from MIDI clock in both directions', async () => {
        const access = new MockMIDIAccess();
        const input = new MockMIDIInput('in-a', 'Clock In');
        const output = new MockMIDIOutput('out-a', 'Clock Out');
        access.setInputs([input]);
        access.setOutputs([output]);
        installMidiAccess(access);
        const masterRuntime = createMidiRuntime();
        const slaveRuntime = createMidiRuntime();

        function MasterHarness() {
            return (
                <AudioProvider>
                    <MidiProvider runtime={masterRuntime} requestOnMount>
                        <MidiStateProbe />
                        <TransportProvider bpm={120}>
                            <MidiTransportSync mode="transport-master" />
                            <TransportProbe />
                        </TransportProvider>
                    </MidiProvider>
                </AudioProvider>
            );
        }

        const master = render(<MasterHarness />);
        fireEvent.click(document);

        await waitFor(() => {
            expect(screen.getByTestId('midi-status')).toHaveTextContent('granted');
            expect(screen.getByTestId('transport-running')).toHaveTextContent('idle');
        });

        fireEvent.click(screen.getByRole('button', { name: 'play' }));

        await waitFor(() => {
            expect(output.sent.some((bytes) => bytes[0] === 0xFA)).toBe(true);
            expect(output.sent.some((bytes) => bytes[0] === 0xF8)).toBe(true);
        });

        fireEvent.click(screen.getByRole('button', { name: 'stop' }));
        master.unmount();

        function SlaveHarness() {
            return (
                <AudioProvider>
                    <MidiProvider runtime={slaveRuntime} requestOnMount>
                        <MidiStateProbe />
                        <TransportProvider bpm={90}>
                            <MidiTransportSync mode="midi-master" />
                            <TransportProbe />
                        </TransportProvider>
                    </MidiProvider>
                </AudioProvider>
            );
        }

        const slave = render(<SlaveHarness />);
        fireEvent.click(document);

        await waitFor(() => {
            expect(screen.getByTestId('midi-status')).toHaveTextContent('granted');
        });

        act(() => {
            input.emit([0xFA]);
            input.emit([0xF8]);
        });

        await waitFor(() => {
            const probes = screen.getAllByTestId('transport-running');
            expect(probes[probes.length - 1]).toHaveTextContent('running');
        });

        slave.unmount();
    });
});
