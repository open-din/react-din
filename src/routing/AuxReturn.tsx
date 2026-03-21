import { useEffect, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut } from '../core/AudioOutContext';
import type { AuxReturnProps } from './types';
import { getOrCreateBusNode } from './busRegistry';

export const AuxReturn: FC<AuxReturnProps> = ({
    busId = 'aux',
    gain = 1,
    bypass = false,
    nodeRef: externalRef,
}) => {
    const { context } = useAudio();
    const { outputNode } = useAudioOut();
    const returnGainRef = useRef<GainNode | null>(null);

    useEffect(() => {
        if (!context || !outputNode) return;

        const busNode = getOrCreateBusNode(context, busId);
        const returnGain = context.createGain();
        returnGain.gain.value = bypass ? 0 : Math.max(0, gain);

        busNode.connect(returnGain);
        returnGain.connect(outputNode);
        returnGainRef.current = returnGain;

        if (externalRef) {
            (externalRef as React.MutableRefObject<GainNode | null>).current = returnGain;
        }

        return () => {
            try { busNode.disconnect(returnGain); } catch { /* noop */ }
            try { returnGain.disconnect(); } catch { /* noop */ }
            returnGainRef.current = null;
            if (externalRef) {
                (externalRef as React.MutableRefObject<GainNode | null>).current = null;
            }
        };
    }, [context, outputNode, busId, externalRef]);

    useEffect(() => {
        if (!returnGainRef.current || !context) return;
        const next = bypass ? 0 : Math.max(0, gain);
        if (typeof returnGainRef.current.gain.setTargetAtTime === 'function') {
            returnGainRef.current.gain.setTargetAtTime(next, context.currentTime, 0.01);
        } else {
            returnGainRef.current.gain.value = next;
        }
    }, [context, gain, bypass]);

    return null;
};
