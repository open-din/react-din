import { useEffect, type RefObject } from 'react';
import { usePatchRuntime } from '../core/PatchRuntimeProvider';
import { noteToMidi } from '../notes';
import { useOnTrigger } from '../sequencer/useTrigger';

export function resolveMidiNote(
    notes: (number | string)[] | undefined,
    step: number,
    fallback: number
): number {
    if (!notes || notes.length === 0) return fallback;
    const raw = notes[step % notes.length];
    if (typeof raw === 'number') return Math.round(raw);
    if (typeof raw === 'string') return noteToMidi(raw);
    return fallback;
}

export function useSynthTriggerToMidi(
    resolveNote: (step: number, fallback: number) => number
): void {
    const { runtimeRef } = usePatchRuntime();
    useOnTrigger((event) => {
        const note = resolveNote(event.step, event.note);
        const velocity = Math.max(0, Math.min(127, Math.round(event.velocity * 127)));

        /** Note-on only: per-voice envelopes use Gain `voice` gating; a global `midi_gate` would mute other tracks. */
        const fireNoteOn = () => {
            runtimeRef.current?.pushMidi(0x90, note, velocity, 0);
        };

        if (runtimeRef.current) {
            fireNoteOn();
            return;
        }

        /** WASM worklet boots asynchronously; poll until `PatchRuntime` facade exists. */
        let frames = 0;
        const rafPoll = () => {
            if (runtimeRef.current) {
                fireNoteOn();
                return;
            }
            frames += 1;
            if (frames > 600) {
                return;
            }
            requestAnimationFrame(rafPoll);
        };
        requestAnimationFrame(rafPoll);
    });
}

export function useMirrorExternalNodeRef<TNode extends AudioNode>(
    externalRef?: RefObject<TNode | null>
): void {
    useEffect(() => {
        if (!externalRef) return;
        (externalRef as React.MutableRefObject<TNode | null>).current = null;
        return () => {
            (externalRef as React.MutableRefObject<TNode | null>).current = null;
        };
    }, [externalRef]);
}
