import { useEffect, useMemo, type FC } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { getNumericValue } from '../core/ModulatableValue';
import type { GainProps } from './types';
import { useWasmNode } from './useAudioNode';

export const Gain: FC<GainProps> = ({
    children,
    nodeRef: externalRef,
    bypass = false,
    gain = 1,
    gainBase,
    rampTo,
    rampType = 'exponential',
}) => {
    const gainValue = getNumericValue(gain, gainBase ?? 1);
    const wasmData = useMemo(
        () => ({
            gain: gainValue,
            gainBase,
            rampTo,
            rampType,
            bypass,
        }),
        [bypass, gainBase, gainValue, rampTo, rampType]
    );
    const { nodeId } = useWasmNode('gain', wasmData);

    useEffect(() => {
        if (!externalRef) return;
        (externalRef as React.MutableRefObject<AudioNode | null>).current = {} as AudioNode;
        return () => {
            (externalRef as React.MutableRefObject<AudioNode | null>).current = null;
        };
    }, [externalRef]);

    return (
        <AudioOutProvider node={null} nodeId={nodeId}>
            {children}
        </AudioOutProvider>
    );
};
