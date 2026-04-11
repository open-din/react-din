import { useEffect, useMemo, type FC } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { useLfoModulatorId } from '../core/LfoModulationContext';
import { usePatchGraph } from '../core/PatchGraphContext';
import { getNumericValue } from '../core/ModulatableValue';
import type { GainProps } from './types';
import { useVoiceGateTrigger } from '../sequencer/useVoiceGateTrigger';
import { useWasmNode } from './useAudioNode';

export const Gain: FC<GainProps> = ({
    children,
    nodeRef: externalRef,
    bypass = false,
    gain = 1,
    gainBase,
    rampTo,
    rampType = 'exponential',
    voice = false,
}) => {
    const lfoModId = useLfoModulatorId();
    const graph = usePatchGraph();
    const gainValue = getNumericValue(gain, gainBase ?? 1);
    const wasmData = useMemo(
        () => ({
            gain: gainValue,
            gainBase,
            rampTo,
            rampType,
            bypass,
            ...(voice ? { gate: 0 } : {}),
        }),
        [bypass, gainBase, gainValue, rampTo, rampType, voice]
    );
    const { nodeId } = useWasmNode('gain', wasmData);
    useVoiceGateTrigger(nodeId, voice);

    useEffect(() => {
        if (!lfoModId) return;
        const connectionId = `${lfoModId}->${nodeId}:gain`;
        graph.addConnection(connectionId, lfoModId, 'out', nodeId, 'gain');
        return () => {
            graph.removeConnection(connectionId);
        };
    }, [graph, lfoModId, nodeId]);

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
