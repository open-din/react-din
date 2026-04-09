import { useEffect, useMemo, useRef, useState } from 'react';
import { useMidiContext } from './MidiProvider';
import type {
    MidiCCFilterOptions,
    MidiCCState,
    MidiCCValue,
    MidiClockFilterOptions,
    MidiClockValue,
    MidiInputEventData,
    MidiListenMode,
    MidiNoteFilter,
    MidiNoteFilterOptions,
    MidiNoteState,
    MidiNoteValue,
    MidiPortDescriptor,
    MidiPortSelection,
    MidiRuntimeSnapshot,
    MidiValue,
} from './types';

function midiNoteToFrequency(note: number): number {
    return 440 * (2 ** ((note - 69) / 12));
}

function resolveSelection(selection: MidiPortSelection, listenMode: MidiListenMode): string | 'default' | 'all' {
    if (selection === 'all' || selection === 'default') return selection;
    if (typeof selection === 'string' && selection.trim().length > 0) return selection;
    return listenMode === 'all' ? 'all' : 'default';
}

function matchesChannelFilter(channel: number | null, filter: number | 'all' | null | undefined): boolean {
    if (filter === undefined || filter === null || filter === 'all') return true;
    return channel === filter;
}

function matchesNoteFilter(note: number | null, filter: MidiNoteFilter): boolean {
    if (filter === undefined || filter === null) return true;
    if (note === null) return false;
    if (Array.isArray(filter)) {
        const [min, max] = filter;
        return note >= min && note <= max;
    }
    return note === filter;
}

function getDefaultInputId(snapshot: MidiRuntimeSnapshot): string | null {
    return snapshot.defaultInputId ?? snapshot.inputs[0]?.id ?? null;
}

function getDefaultOutputId(snapshot: MidiRuntimeSnapshot): string | null {
    return snapshot.defaultOutputId ?? snapshot.outputs[0]?.id ?? null;
}

function getPortDescriptor(ports: MidiPortDescriptor[], id: string | null): MidiPortDescriptor | null {
    if (!id) return null;
    return ports.find((port) => port.id === id) ?? null;
}

/**
 * Returns whether an input port id matches the effective selection for the current snapshot.
 *
 * @param inputId - Port id under test.
 * @param selection - Requested selection (concrete id, `default`, or `all`).
 * @param snapshot - Latest runtime snapshot containing ports and listen mode.
 * @returns True when `inputId` is included per selection rules.
 */
export function matchesInputSelection(
    inputId: string,
    selection: MidiPortSelection,
    snapshot: MidiRuntimeSnapshot
): boolean {
    const resolvedSelection = resolveSelection(selection, snapshot.listenMode);
    if (resolvedSelection === 'all') return true;
    if (resolvedSelection === 'default') {
        return inputId === getDefaultInputId(snapshot);
    }
    return inputId === resolvedSelection;
}

function matchesNoteState(
    state: MidiNoteState,
    options: MidiNoteFilterOptions,
    snapshot: MidiRuntimeSnapshot
): boolean {
    return matchesInputSelection(state.inputId, options.inputId, snapshot)
        && matchesChannelFilter(state.channel, options.channel)
        && matchesNoteFilter(state.note, options.note);
}

function matchesCCState(
    state: MidiCCState,
    options: MidiCCFilterOptions,
    snapshot: MidiRuntimeSnapshot
): boolean {
    return matchesInputSelection(state.inputId, options.inputId, snapshot)
        && matchesChannelFilter(state.channel, options.channel)
        && state.cc === options.cc;
}

function matchesNoteEvent(
    event: MidiInputEventData,
    options: MidiNoteFilterOptions,
    snapshot: MidiRuntimeSnapshot
): boolean {
    if (event.kind !== 'noteon' && event.kind !== 'noteoff') return false;
    return matchesInputSelection(event.inputId, options.inputId, snapshot)
        && matchesChannelFilter(event.channel, options.channel)
        && matchesNoteFilter(event.note, options.note);
}

function matchesCCEvent(
    event: MidiInputEventData,
    options: MidiCCFilterOptions,
    snapshot: MidiRuntimeSnapshot
): boolean {
    if (event.kind !== 'cc') return false;
    return matchesInputSelection(event.inputId, options.inputId, snapshot)
        && matchesChannelFilter(event.channel, options.channel)
        && event.cc === options.cc;
}

function sortByLastUpdated<T extends { lastUpdatedAt: number }>(items: T[]): T[] {
    return [...items].sort((left, right) => left.lastUpdatedAt - right.lastUpdatedAt);
}

function getSourceInfo(snapshot: MidiRuntimeSnapshot, inputId: string | null) {
    const port = getPortDescriptor(snapshot.inputs, inputId);
    return {
        id: inputId,
        name: port?.name ?? null,
    };
}

/**
 * Hook exposing MIDI runtime state and imperative send helpers.
 *
 * @returns Memoized view of ports, status, transport clock, and outbound helpers.
 */
export function useMidi(): MidiValue {
    const { runtime, snapshot } = useMidiContext();

    return useMemo(() => ({
        supported: snapshot.supported,
        status: snapshot.status,
        error: snapshot.error,
        inputs: snapshot.inputs,
        outputs: snapshot.outputs,
        defaultInputId: snapshot.defaultInputId,
        defaultOutputId: snapshot.defaultOutputId,
        defaultInput: getPortDescriptor(snapshot.inputs, getDefaultInputId(snapshot)),
        defaultOutput: getPortDescriptor(snapshot.outputs, getDefaultOutputId(snapshot)),
        listenMode: snapshot.listenMode,
        lastInputEvent: snapshot.lastInputEvent,
        lastOutputEvent: snapshot.lastOutputEvent,
        clock: snapshot.clock,
        requestAccess: runtime.requestAccess,
        setDefaultInputId: runtime.setDefaultInputId,
        setDefaultOutputId: runtime.setDefaultOutputId,
        setListenMode: runtime.setListenMode,
        sendNoteOn: runtime.sendNoteOn,
        sendNoteOff: runtime.sendNoteOff,
        sendCC: runtime.sendCC,
        sendStart: runtime.sendStart,
        sendStop: runtime.sendStop,
        sendContinue: runtime.sendContinue,
        sendClock: runtime.sendClock,
    }), [runtime, snapshot]);
}

/**
 * Subscribes to filtered note-on/note-off activity derived from the shared MIDI snapshot.
 *
 * @param options - Channel, note, and input filters.
 * @returns Gate, pitch, velocity, trigger token, and active note list for matching input.
 */
export function useMidiNote(options: MidiNoteFilterOptions = {}): MidiNoteValue {
    const { snapshot } = useMidiContext();
    const [lastMatchingEvent, setLastMatchingEvent] = useState<MidiInputEventData | null>(null);
    const [triggerToken, setTriggerToken] = useState(0);
    const lastHandledEventSeq = useRef<number>(0);

    useEffect(() => {
        const event = snapshot.lastInputEvent;
        if (!event || event.seq === lastHandledEventSeq.current) return;
        lastHandledEventSeq.current = event.seq;
        if (!matchesNoteEvent(event, options, snapshot)) return;
        setLastMatchingEvent(event);
        if (event.kind === 'noteon') {
            setTriggerToken((value) => value + 1);
        }
    }, [options, snapshot]);

    const activeNotes = useMemo(() => {
        return sortByLastUpdated(
            Array.from(snapshot.activeNotes.values()).filter((state) => matchesNoteState(state, options, snapshot))
        );
    }, [options, snapshot]);

    const currentNote = activeNotes.length > 0 ? activeNotes[activeNotes.length - 1] : null;
    const retainedEvent = lastMatchingEvent && matchesNoteEvent(lastMatchingEvent, options, snapshot)
        ? lastMatchingEvent
        : null;
    const sourceId = currentNote?.inputId ?? retainedEvent?.inputId ?? null;

    return {
        gate: Boolean(currentNote),
        note: currentNote?.note ?? null,
        frequency: currentNote ? midiNoteToFrequency(currentNote.note) : null,
        velocity: currentNote?.velocity ?? 0,
        channel: currentNote?.channel ?? retainedEvent?.channel ?? null,
        triggerToken,
        activeNotes,
        lastEvent: retainedEvent,
        source: getSourceInfo(snapshot, sourceId),
    };
}

/**
 * Subscribes to a filtered control-change stream and latest matching CC state.
 *
 * @param options - Channel, CC number, and input filters.
 * @returns Normalized and raw CC values plus last event metadata.
 */
export function useMidiCC(options: MidiCCFilterOptions): MidiCCValue {
    const { snapshot } = useMidiContext();
    const [lastMatchingEvent, setLastMatchingEvent] = useState<MidiInputEventData | null>(null);
    const lastHandledEventSeq = useRef<number>(0);

    useEffect(() => {
        const event = snapshot.lastInputEvent;
        if (!event || event.seq === lastHandledEventSeq.current) return;
        lastHandledEventSeq.current = event.seq;
        if (!matchesCCEvent(event, options, snapshot)) return;
        setLastMatchingEvent(event);
    }, [options, snapshot]);

    const ccState = useMemo(() => {
        const values = sortByLastUpdated(
            Array.from(snapshot.ccValues.values()).filter((state) => matchesCCState(state, options, snapshot))
        );
        return values.length > 0 ? values[values.length - 1] : null;
    }, [options, snapshot]);

    const retainedEvent = lastMatchingEvent && matchesCCEvent(lastMatchingEvent, options, snapshot)
        ? lastMatchingEvent
        : null;
    const sourceId = ccState?.inputId ?? retainedEvent?.inputId ?? null;

    return {
        raw: ccState?.raw ?? 0,
        normalized: ccState?.normalized ?? 0,
        channel: ccState?.channel ?? retainedEvent?.channel ?? null,
        lastEvent: retainedEvent,
        source: getSourceInfo(snapshot, sourceId),
    };
}

/**
 * Exposes filtered MIDI clock / transport timing derived from the runtime snapshot.
 *
 * @param options - Optional input selection override for clock source matching.
 * @returns BPM estimate, tick counters, and source descriptor when matched.
 */
export function useMidiClock(options: MidiClockFilterOptions = {}): MidiClockValue {
    const { snapshot } = useMidiContext();
    const selection = options.inputId ?? (snapshot.listenMode === 'all' ? 'all' : 'default');
    const sourceId = snapshot.clock.sourceInputId;
    const matches = sourceId ? matchesInputSelection(sourceId, selection, snapshot) : selection === 'all';

    if (!matches) {
        return {
            running: false,
            bpmEstimate: null,
            tickCount: 0,
            lastTickAt: null,
            source: getSourceInfo(snapshot, null),
        };
    }

    return {
        running: snapshot.clock.running,
        bpmEstimate: snapshot.clock.bpmEstimate,
        tickCount: snapshot.clock.tickCount,
        lastTickAt: snapshot.clock.lastTickAt,
        source: getSourceInfo(snapshot, snapshot.clock.sourceInputId),
    };
}
