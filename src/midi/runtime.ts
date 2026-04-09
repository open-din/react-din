import type {
    MidiCCSendOptions,
    MidiCCState,
    MidiClockState,
    MidiInputEventData,
    MidiListenMode,
    MidiMessageKind,
    MidiNoteSendOptions,
    MidiNoteState,
    MidiOutputEventData,
    MidiPortDescriptor,
    MidiRuntime,
    MidiRuntimeOptions,
    MidiRuntimeSnapshot,
    MidiSendOptions,
    MidiValueFormat,
} from './types';

const MAX_CLOCK_INTERVALS = 24;

const EMPTY_CLOCK_STATE: MidiClockState = {
    running: false,
    bpmEstimate: null,
    tickCount: 0,
    lastTickAt: null,
    sourceInputId: null,
};

function clampMidi(value: number): number {
    return Math.max(0, Math.min(127, Math.round(value)));
}

function clampChannel(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
    return Math.max(1, Math.min(16, Math.round(value)));
}

function normalizeValue(value: number, format: MidiValueFormat = 'normalized'): number {
    if (format === 'raw') {
        return clampMidi(value);
    }
    return clampMidi(Math.max(0, Math.min(1, value)) * 127);
}

function parsePort(port: MIDIPort): MidiPortDescriptor {
    return {
        id: port.id,
        type: port.type,
        name: port.name || (port.type === 'input' ? 'MIDI Input' : 'MIDI Output'),
        manufacturer: port.manufacturer || 'Unknown',
        state: port.state,
        connection: port.connection,
    };
}

function resolvePortId(selection: string | null | undefined, availableIds: Set<string>): string | null {
    if (!selection || selection === 'default' || selection === 'all') return null;
    return availableIds.has(selection) ? selection : null;
}

function resolveOutput(
    midiAccess: MIDIAccess | null,
    outputId: string | null | undefined,
    defaultOutputId: string | null
): MIDIOutput | null {
    if (!midiAccess) return null;

    if (outputId && outputId !== 'default') {
        return midiAccess.outputs.get(outputId) ?? null;
    }

    if (defaultOutputId) {
        const output = midiAccess.outputs.get(defaultOutputId);
        if (output) return output;
    }

    const first = midiAccess.outputs.values().next();
    return first.done ? null : first.value;
}

function bytesToReadonlyArray(bytes: Uint8Array): readonly number[] {
    return Array.from(bytes);
}

function getEventInputId(target: EventTarget | null): string | null {
    if (!target || typeof target !== 'object') return null;
    const candidate = target as { id?: unknown; type?: unknown };
    if (typeof candidate.id !== 'string') return null;
    if (candidate.type && candidate.type !== 'input') return null;
    return candidate.id;
}

function toNoteVelocity(rawVelocity: number): number {
    return Math.max(0, Math.min(1, rawVelocity / 127));
}

function getNow(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Converts an audio frequency in Hz to an equal-tempered MIDI note number (A4 = 69).
 *
 * @param frequency - Hertz; non-positive or non-finite values yield middle C-ish default (69).
 * @returns MIDI note number clamped to the valid MIDI range.
 */
export function freqToMidiNote(frequency: number): number {
    if (!Number.isFinite(frequency) || frequency <= 0) return 69;
    return clampMidi(69 + (12 * Math.log2(frequency / 440)));
}

/**
 * Creates a mutable MIDI runtime that manages Web MIDI access, ports, clock, and routing.
 *
 * @param options - Initial default ports and listen mode.
 * @returns Runtime handle with subscribe/getSnapshot and send helpers.
 */
export function createMidiRuntime(options: MidiRuntimeOptions = {}): MidiRuntime {
    let midiAccess: MIDIAccess | null = null;
    let status: MidiRuntimeSnapshot['status'] = typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function'
        ? 'idle'
        : 'unsupported';
    let error: Error | null = null;
    let inputs: MidiPortDescriptor[] = [];
    let outputs: MidiPortDescriptor[] = [];
    let defaultInputId = options.defaultInputId ?? null;
    let defaultOutputId = options.defaultOutputId ?? null;
    let listenMode: MidiListenMode = options.listenMode ?? 'default';
    let lastInputEvent: MidiInputEventData | null = null;
    let lastOutputEvent: MidiOutputEventData | null = null;
    let activeNotes = new Map<string, MidiNoteState>();
    let ccValues = new Map<string, MidiCCState>();
    let clock = { ...EMPTY_CLOCK_STATE };
    let version = 0;
    let seq = 0;
    let destroyed = false;
    let cachedSnapshot: MidiRuntimeSnapshot | null = null;
    let cachedSnapshotVersion = -1;
    const listeners = new Set<() => void>();
    const attachedInputs = new Map<string, MIDIInput>();
    const clockIntervals: number[] = [];

    const emit = () => {
        version += 1;
        listeners.forEach((listener) => listener());
    };

    const syncPorts = () => {
        if (!midiAccess) {
            inputs = [];
            outputs = [];
            return;
        }

        inputs = Array.from(midiAccess.inputs.values()).map(parsePort).sort((left, right) => left.name.localeCompare(right.name));
        outputs = Array.from(midiAccess.outputs.values()).map(parsePort).sort((left, right) => left.name.localeCompare(right.name));

        const inputIds = new Set(inputs.map((port) => port.id));
        const outputIds = new Set(outputs.map((port) => port.id));

        defaultInputId = resolvePortId(defaultInputId, inputIds) ?? inputs[0]?.id ?? null;
        defaultOutputId = resolvePortId(defaultOutputId, outputIds) ?? outputs[0]?.id ?? null;

        attachedInputs.forEach((input, inputId) => {
            if (inputIds.has(inputId)) return;
            input.removeEventListener('midimessage', handleMidiMessage as EventListener);
            attachedInputs.delete(inputId);
        });

        midiAccess.inputs.forEach((input) => {
            if (attachedInputs.has(input.id)) return;
            input.addEventListener('midimessage', handleMidiMessage as EventListener);
            attachedInputs.set(input.id, input);
        });
    };

    const handleClockMessage = (event: MidiInputEventData) => {
        if (event.kind === 'start') {
            clock = {
                running: true,
                bpmEstimate: null,
                tickCount: 0,
                lastTickAt: event.receivedAt,
                sourceInputId: event.inputId,
            };
            clockIntervals.length = 0;
            return;
        }

        if (event.kind === 'continue') {
            clock = {
                ...clock,
                running: true,
                sourceInputId: event.inputId,
            };
            return;
        }

        if (event.kind === 'stop') {
            clock = {
                ...clock,
                running: false,
                sourceInputId: event.inputId,
            };
            return;
        }

        if (event.kind !== 'clock') return;

        if (clock.lastTickAt !== null) {
            const interval = event.receivedAt - clock.lastTickAt;
            if (interval > 0) {
                clockIntervals.push(interval);
                if (clockIntervals.length > MAX_CLOCK_INTERVALS) {
                    clockIntervals.shift();
                }
            }
        }

        const average = clockIntervals.length > 0
            ? clockIntervals.reduce((sum, value) => sum + value, 0) / clockIntervals.length
            : null;

        const bpmEstimate = average && average > 0
            ? 60000 / (average * 24)
            : clock.bpmEstimate;

        clock = {
            running: true,
            bpmEstimate: bpmEstimate && Number.isFinite(bpmEstimate) ? bpmEstimate : null,
            tickCount: clock.tickCount + 1,
            lastTickAt: event.receivedAt,
            sourceInputId: event.inputId,
        };
    };

    const handleMidiMessage = (messageEvent: MIDIMessageEvent) => {
        if (destroyed) return;

        const inputId = getEventInputId(messageEvent.currentTarget) ?? getEventInputId(messageEvent.target) ?? '';
        if (!inputId) return;

        if (!messageEvent.data) return;
        const bytes = new Uint8Array(messageEvent.data);
        const statusByte = bytes[0] ?? 0;
        const data1 = bytes[1] ?? 0;
        const data2 = bytes[2] ?? 0;
        const receivedAt = getNow();
        const eventSeq = ++seq;

        let kind: MidiMessageKind = 'unknown';
        let channel: number | null = null;
        let note: number | null = null;
        let velocity: number | null = null;
        let cc: number | null = null;
        let rawValue: number | null = null;
        let normalizedValue: number | null = null;

        if (statusByte >= 0x80 && statusByte <= 0xEF) {
            channel = (statusByte & 0x0f) + 1;
            const messageType = statusByte & 0xf0;

            if (messageType === 0x90) {
                note = data1;
                velocity = toNoteVelocity(data2);
                kind = data2 === 0 ? 'noteoff' : 'noteon';
            } else if (messageType === 0x80) {
                note = data1;
                velocity = toNoteVelocity(data2);
                kind = 'noteoff';
            } else if (messageType === 0xB0) {
                cc = data1;
                rawValue = data2;
                normalizedValue = data2 / 127;
                kind = 'cc';
            }
        } else {
            if (statusByte === 0xF8) kind = 'clock';
            else if (statusByte === 0xFA) kind = 'start';
            else if (statusByte === 0xFB) kind = 'continue';
            else if (statusByte === 0xFC) kind = 'stop';
        }

        const nextEvent: MidiInputEventData = {
            seq: eventSeq,
            kind,
            inputId,
            channel,
            note,
            velocity,
            cc,
            rawValue,
            normalizedValue,
            bytes: bytesToReadonlyArray(bytes),
            receivedAt,
        };

        lastInputEvent = nextEvent;

        if (kind === 'noteon' && note !== null && channel !== null && velocity !== null) {
            activeNotes.set(`${inputId}:${channel}:${note}`, {
                inputId,
                channel,
                note,
                velocity,
                startedAt: receivedAt,
                lastUpdatedAt: receivedAt,
            });
        } else if (kind === 'noteoff' && note !== null && channel !== null) {
            activeNotes.delete(`${inputId}:${channel}:${note}`);
        } else if (kind === 'cc' && cc !== null && channel !== null && rawValue !== null && normalizedValue !== null) {
            ccValues.set(`${inputId}:${channel}:${cc}`, {
                inputId,
                channel,
                cc,
                raw: rawValue,
                normalized: normalizedValue,
                lastUpdatedAt: receivedAt,
            });
        }

        handleClockMessage(nextEvent);
        emit();
    };

    const handleStateChange = () => {
        syncPorts();
        emit();
    };

    const requestAccess = async (): Promise<MidiRuntimeSnapshot> => {
        if (destroyed) return getSnapshot();
        if (typeof navigator === 'undefined' || typeof navigator.requestMIDIAccess !== 'function') {
            status = 'unsupported';
            emit();
            return getSnapshot();
        }

        status = 'pending';
        error = null;
        emit();

        try {
            midiAccess = await navigator.requestMIDIAccess();
            midiAccess.onstatechange = handleStateChange;
            status = 'granted';
            syncPorts();
            emit();
        } catch (nextError) {
            error = nextError instanceof Error ? nextError : new Error('Failed to request MIDI access');
            status = error.name === 'SecurityError' || error.name === 'NotAllowedError' ? 'denied' : 'error';
            emit();
        }

        return getSnapshot();
    };

    const getSnapshot = (): MidiRuntimeSnapshot => {
        if (cachedSnapshot && cachedSnapshotVersion === version) {
            return cachedSnapshot;
        }

        cachedSnapshot = {
            supported: typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function',
            status,
            error,
            inputs,
            outputs,
            defaultInputId,
            defaultOutputId,
            listenMode,
            lastInputEvent,
            lastOutputEvent,
            activeNotes,
            ccValues,
            clock,
            version,
        };
        cachedSnapshotVersion = version;
        return cachedSnapshot;
    };

    const sendBytes = (
        kind: MidiMessageKind,
        bytes: number[],
        outputId: string | null | undefined,
        channel: number | null,
        note: number | null,
        velocity: number | null,
        cc: number | null,
        rawValue: number | null,
        normalizedValue: number | null
    ): boolean => {
        const output = resolveOutput(midiAccess, outputId, defaultOutputId);
        if (!output) return false;

        output.send(bytes);
        lastOutputEvent = {
            seq: ++seq,
            kind,
            outputId: output.id,
            channel,
            note,
            velocity,
            cc,
            rawValue,
            normalizedValue,
            bytes,
            sentAt: getNow(),
        };
        emit();
        return true;
    };

    const sendChannelMessage = (
        baseStatus: number,
        kind: MidiMessageKind,
        data1: number,
        data2: number,
        options?: MidiSendOptions,
        metadata?: { note?: number | null; velocity?: number | null; cc?: number | null; rawValue?: number | null; normalizedValue?: number | null }
    ) => {
        const channel = clampChannel(options?.channel);
        return sendBytes(
            kind,
            [baseStatus | (channel - 1), clampMidi(data1), clampMidi(data2)],
            options?.outputId,
            channel,
            metadata?.note ?? null,
            metadata?.velocity ?? null,
            metadata?.cc ?? null,
            metadata?.rawValue ?? null,
            metadata?.normalizedValue ?? null
        );
    };

    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        getSnapshot,
        requestAccess,
        destroy() {
            destroyed = true;
            attachedInputs.forEach((input) => {
                input.removeEventListener('midimessage', handleMidiMessage as EventListener);
            });
            attachedInputs.clear();
            if (midiAccess) {
                midiAccess.onstatechange = null;
            }
            listeners.clear();
        },
        setDefaultInputId(id) {
            defaultInputId = id;
            emit();
        },
        setDefaultOutputId(id) {
            defaultOutputId = id;
            emit();
        },
        setListenMode(mode) {
            listenMode = mode;
            emit();
        },
        sendNoteOn(options: MidiNoteSendOptions) {
            const velocity = Math.max(0, Math.min(1, options.velocity ?? 1));
            return sendChannelMessage(0x90, 'noteon', options.note, velocity * 127, options, {
                note: clampMidi(options.note),
                velocity,
            });
        },
        sendNoteOff(options: MidiNoteSendOptions) {
            const velocity = Math.max(0, Math.min(1, options.velocity ?? 0));
            return sendChannelMessage(0x80, 'noteoff', options.note, velocity * 127, options, {
                note: clampMidi(options.note),
                velocity,
            });
        },
        sendCC(options: MidiCCSendOptions) {
            const rawValue = normalizeValue(options.value, options.valueFormat);
            return sendChannelMessage(0xB0, 'cc', options.cc, rawValue, options, {
                cc: clampMidi(options.cc),
                rawValue,
                normalizedValue: rawValue / 127,
            });
        },
        sendStart(options?: MidiSendOptions) {
            return sendBytes('start', [0xFA], options?.outputId, null, null, null, null, null, null);
        },
        sendStop(options?: MidiSendOptions) {
            return sendBytes('stop', [0xFC], options?.outputId, null, null, null, null, null, null);
        },
        sendContinue(options?: MidiSendOptions) {
            return sendBytes('continue', [0xFB], options?.outputId, null, null, null, null, null, null);
        },
        sendClock(options?: MidiSendOptions) {
            return sendBytes('clock', [0xF8], options?.outputId, null, null, null, null, null, null);
        },
    };
}
