import { useEffect, useMemo, type FC } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { getNumericValue } from '../core/ModulatableValue';
import type { FilterProps } from './types';
import { useWasmNode } from './useAudioNode';

export const Filter: FC<FilterProps> = ({
    children,
    nodeRef: externalRef,
    bypass = false,
    type = 'lowpass',
    frequency = 350,
    frequencyBase,
    Q = 1,
    QBase,
    gain = 0,
    gainBase,
    detune = 0,
    detuneBase,
}) => {
    const wasmData = useMemo(
        () => ({
            type,
            frequency: getNumericValue(frequency, frequencyBase ?? 350),
            Q: getNumericValue(Q, QBase ?? 1),
            gain: getNumericValue(gain, gainBase ?? 0),
            detune: getNumericValue(detune, detuneBase ?? 0),
            bypass,
        }),
        [Q, QBase, bypass, detune, detuneBase, frequency, frequencyBase, gain, gainBase, type]
    );
    const { nodeId } = useWasmNode('filter', wasmData);

    useEffect(() => {
        if (!externalRef) return;
        (externalRef as React.MutableRefObject<BiquadFilterNode | null>).current = {} as BiquadFilterNode;
        return () => {
            (externalRef as React.MutableRefObject<BiquadFilterNode | null>).current = null;
        };
    }, [externalRef]);

    return (
        <AudioOutProvider node={null} nodeId={nodeId}>
            {children}
        </AudioOutProvider>
    );
};
