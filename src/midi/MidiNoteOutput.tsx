import { useEffect, useRef, type FC } from 'react';
import { freqToMidiNote } from './runtime';
import { useMidi } from './useMidi';
import type { MidiNoteOutputProps } from './types';

function clampVelocity(value: number | undefined): number {
    if (!Number.isFinite(value)) return 1;
    return Math.max(0, Math.min(1, Number(value)));
}

export const MidiNoteOutput: FC<MidiNoteOutputProps> = ({
    outputId = null,
    channel = 1,
    gate = false,
    note = null,
    frequency = null,
    velocity = 1,
    triggerToken,
    duration = 0.1,
}) => {
    const { sendNoteOn, sendNoteOff, status } = useMidi();
    const lastStateRef = useRef<{
        active: boolean;
        outputId: string | null;
        channel: number;
        note: number | null;
        velocity: number;
    }>({
        active: false,
        outputId,
        channel,
        note: null,
        velocity: clampVelocity(velocity),
    });
    const lastTriggerRef = useRef<unknown>(triggerToken);

    useEffect(() => {
        const previous = lastStateRef.current;
        const resolvedNote = Number.isFinite(note)
            ? Math.round(Number(note))
            : Number.isFinite(frequency)
                ? freqToMidiNote(Number(frequency))
                : null;
        const nextVelocity = clampVelocity(velocity);
        const active = Boolean(gate) && resolvedNote !== null;
        const unchanged = active
            && previous.active
            && previous.note === resolvedNote
            && previous.channel === channel
            && previous.outputId === outputId
            && previous.velocity === nextVelocity;

        const nextState = {
            active: unchanged,
            outputId,
            channel,
            note: active ? resolvedNote : null,
            velocity: nextVelocity,
        };

        // Update the ref before sending so synchronous runtime emits do not
        // re-enter this effect with stale state and loop.
        lastStateRef.current = nextState;

        if (previous.active && previous.note !== null && (!active
            || previous.note !== resolvedNote
            || previous.channel !== channel
            || previous.outputId !== outputId)) {
            sendNoteOff({
                outputId: previous.outputId,
                channel: previous.channel,
                note: previous.note,
                velocity: 0,
            });
        }

        if (!unchanged && active && resolvedNote !== null) {
            const sent = sendNoteOn({
                outputId,
                channel,
                note: resolvedNote,
                velocity: nextVelocity,
            });
            lastStateRef.current = {
                ...nextState,
                active: sent,
            };
        }
    }, [channel, frequency, gate, note, outputId, sendNoteOff, sendNoteOn, status, velocity]);

    useEffect(() => {
        const resolvedNote = Number.isFinite(note)
            ? Math.round(Number(note))
            : Number.isFinite(frequency)
                ? freqToMidiNote(Number(frequency))
                : null;
        if (resolvedNote === null) {
            lastTriggerRef.current = triggerToken;
            return;
        }
        if (Object.is(lastTriggerRef.current, triggerToken)) return;
        lastTriggerRef.current = triggerToken;
        if (triggerToken == null) return;

        const nextVelocity = clampVelocity(velocity);
        const timeoutId = typeof window !== 'undefined'
            ? window.setTimeout(() => {
                sendNoteOff({
                    outputId,
                    channel,
                    note: resolvedNote,
                    velocity: 0,
                });
            }, Math.max(0.02, duration) * 1000)
            : null;

        sendNoteOn({
            outputId,
            channel,
            note: resolvedNote,
            velocity: nextVelocity,
        });

        return () => {
            if (timeoutId !== null && typeof window !== 'undefined') {
                window.clearTimeout(timeoutId);
            }
        };
    }, [channel, duration, frequency, note, outputId, sendNoteOff, sendNoteOn, triggerToken, velocity]);

    useEffect(() => {
        return () => {
            const previous = lastStateRef.current;
            if (!previous.active || previous.note === null) return;
            sendNoteOff({
                outputId: previous.outputId,
                channel: previous.channel,
                note: previous.note,
                velocity: 0,
            });
        };
    }, [sendNoteOff]);

    return null;
};
