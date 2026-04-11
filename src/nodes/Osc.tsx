import { useEffect, useMemo, type FC } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { getNumericValue } from '../core/ModulatableValue';
import type { OscProps, OscillatorType } from './types';
import { useWasmNode } from './useAudioNode';

/** Indices match `din-core` WASM osc renderer (`NodeKind::Osc`). */
const WAVEFORM_INDEX: Record<OscillatorType, number> = {
    sine: 0,
    square: 1,
    sawtooth: 2,
    triangle: 3,
    custom: 0,
};

export const Osc: FC<OscProps> = ({
    children,
    nodeRef: externalRef,
    bypass = false,
    type = 'sine',
    frequency = 440,
    frequencyBase,
    detune = 0,
    detuneBase,
    autoStart = false,
    followMidiNote = false,
    useGlobalMidiGate = false,
}) => {
    const wasmData = useMemo(
        () => ({
            /** Do not use `type` here — `buildGraphDocument` overwrites `data.type` with the node kind (`osc`). */
            waveform: WAVEFORM_INDEX[type] ?? 0,
            frequency: getNumericValue(frequency, frequencyBase ?? 440),
            detune: getNumericValue(detune, detuneBase ?? 0),
            autoStart,
            bypass,
            followMidiNote,
            useGlobalMidiGate,
        }),
        [
            autoStart,
            bypass,
            detune,
            detuneBase,
            followMidiNote,
            frequency,
            frequencyBase,
            type,
            useGlobalMidiGate,
        ]
    );
    const { nodeId } = useWasmNode('osc', wasmData);

    useEffect(() => {
        if (!externalRef) return;
        (externalRef as React.MutableRefObject<OscillatorNode | null>).current = {} as OscillatorNode;
        return () => {
            (externalRef as React.MutableRefObject<OscillatorNode | null>).current = null;
        };
    }, [externalRef]);

    return (
        <AudioOutProvider node={null} nodeId={nodeId}>
            {children}
        </AudioOutProvider>
    );
};
