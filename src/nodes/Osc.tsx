import { useEffect, useMemo, type FC } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { getNumericValue } from '../core/ModulatableValue';
import type { OscProps } from './types';
import { useWasmNode } from './useAudioNode';

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
}) => {
    const wasmData = useMemo(
        () => ({
            type,
            frequency: getNumericValue(frequency, frequencyBase ?? 440),
            detune: getNumericValue(detune, detuneBase ?? 0),
            autoStart,
            bypass,
        }),
        [autoStart, bypass, detune, detuneBase, frequency, frequencyBase, type]
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
