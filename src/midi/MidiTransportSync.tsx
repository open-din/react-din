import { useEffect, useRef, type FC } from 'react';
import { useTransport } from '../transport';
import { useMidi, matchesInputSelection } from './useMidi';
import type { MidiTransportSyncProps } from './types';

export const MidiTransportSync: FC<MidiTransportSyncProps> = ({
    mode,
    inputId = null,
    outputId = null,
    sendStartStop = true,
    sendClock = true,
}) => {
    const midi = useMidi();
    const transport = useTransport();
    const lastHandledSeqRef = useRef(0);
    const clockTimeRef = useRef<number | null>(null);
    const previousTransportStateRef = useRef({
        isPlaying: transport.isPlaying,
        totalSteps: transport.totalSteps,
    });

    useEffect(() => {
        transport.setConfig({
            mode: mode === 'midi-master' ? 'manual' : 'raf',
        });
    }, [mode, transport.setConfig]);

    useEffect(() => {
        if (mode !== 'midi-master') return;

        const event = midi.lastInputEvent;
        if (!event || event.seq === lastHandledSeqRef.current) return;
        if (!matchesInputSelection(event.inputId, inputId ?? 'default', {
            supported: midi.supported,
            status: midi.status,
            error: midi.error,
            inputs: midi.inputs,
            outputs: midi.outputs,
            defaultInputId: midi.defaultInputId,
            defaultOutputId: midi.defaultOutputId,
            listenMode: midi.listenMode,
            lastInputEvent: midi.lastInputEvent,
            lastOutputEvent: midi.lastOutputEvent,
            activeNotes: new Map(),
            ccValues: new Map(),
            clock: midi.clock,
            version: 0,
        })) {
            return;
        }

        lastHandledSeqRef.current = event.seq;

        if (event.kind === 'start') {
            clockTimeRef.current = 0;
            transport.stop();
            transport.play();
            return;
        }

        if (event.kind === 'continue') {
            clockTimeRef.current = transport.totalTime;
            transport.play();
            return;
        }

        if (event.kind === 'stop') {
            clockTimeRef.current = 0;
            transport.stop();
            return;
        }

        if (event.kind !== 'clock') {
            return;
        }

        const bpm = midi.clock.bpmEstimate ?? transport.bpm;
        if (Number.isFinite(bpm) && bpm > 0) {
            transport.setBpm(bpm);
        }

        const tickDuration = 60 / (Math.max(1, bpm) * 24);
        const nextTime = (clockTimeRef.current ?? transport.totalTime) + tickDuration;
        clockTimeRef.current = nextTime;

        if (!transport.isPlaying) {
            transport.play();
        }

        transport.update(nextTime);
    }, [
        inputId,
        midi.clock,
        midi.defaultInputId,
        midi.error,
        midi.inputs,
        midi.lastInputEvent,
        midi.lastOutputEvent,
        midi.listenMode,
        midi.outputs,
        midi.status,
        midi.supported,
        mode,
        transport,
    ]);

    useEffect(() => {
        if (mode !== 'transport-master' || !sendStartStop) {
        previousTransportStateRef.current = {
            isPlaying: transport.isPlaying,
            totalSteps: transport.totalSteps,
        };
            return;
        }

        const previous = previousTransportStateRef.current;

        if (!previous.isPlaying && transport.isPlaying) {
            const nextState = {
                isPlaying: transport.isPlaying,
                totalSteps: transport.totalSteps,
            };
            if (transport.totalSteps > 0) {
                if (midi.sendContinue({ outputId, channel: 1 })) {
                    previousTransportStateRef.current = nextState;
                }
            } else {
                if (midi.sendStart({ outputId, channel: 1 })) {
                    previousTransportStateRef.current = nextState;
                }
            }
            return;
        } else if (previous.isPlaying && !transport.isPlaying) {
            if (midi.sendStop({ outputId, channel: 1 })) {
                previousTransportStateRef.current = {
                    isPlaying: transport.isPlaying,
                    totalSteps: transport.totalSteps,
                };
            }
            return;
        }

        previousTransportStateRef.current = {
            isPlaying: transport.isPlaying,
            totalSteps: transport.totalSteps,
        };
    }, [
        midi.sendContinue,
        midi.sendStart,
        midi.sendStop,
        midi.status,
        mode,
        outputId,
        sendStartStop,
        transport.isPlaying,
        transport.totalSteps,
    ]);

    useEffect(() => {
        if (mode !== 'transport-master' || !sendClock || !transport.isPlaying || typeof window === 'undefined') {
            return;
        }

        const intervalMs = 60000 / (Math.max(1, transport.bpm) * 24);
        const intervalId = window.setInterval(() => {
            midi.sendClock({ outputId, channel: 1 });
        }, intervalMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [midi.sendClock, midi.status, mode, outputId, sendClock, transport.bpm, transport.isPlaying]);

    return null;
};
