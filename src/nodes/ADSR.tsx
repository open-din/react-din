import { useEffect, type FC, type ReactNode } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { useWasmNode } from './useAudioNode';

export interface ADSRConfig {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    attackCurve?: 'linear' | 'exponential';
    releaseCurve?: 'linear' | 'exponential';
}

export const DEFAULT_ADSR: Required<Omit<ADSRConfig, 'attackCurve' | 'releaseCurve'>> & {
    attackCurve: 'linear' | 'exponential';
    releaseCurve: 'linear' | 'exponential';
} = {
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.3,
    attackCurve: 'linear',
    releaseCurve: 'exponential',
};

export interface ADSRProps extends ADSRConfig {
    children?: ReactNode;
    nodeRef?: React.RefObject<GainNode | null>;
    bypass?: boolean;
    trigger?: boolean;
    velocity?: number;
    duration?: number;
    initialGain?: number;
}

export const ADSR: FC<ADSRProps> = ({
    children,
    nodeRef: externalRef,
    bypass = false,
    trigger = false,
    velocity = 1,
    duration,
    initialGain = 0,
    attack = DEFAULT_ADSR.attack,
    decay = DEFAULT_ADSR.decay,
    sustain = DEFAULT_ADSR.sustain,
    release = DEFAULT_ADSR.release,
    attackCurve = DEFAULT_ADSR.attackCurve,
    releaseCurve = DEFAULT_ADSR.releaseCurve,
}) => {
    const { nodeId } = useWasmNode('adsr', {
        attack,
        decay,
        sustain,
        release,
        attackCurve,
        releaseCurve,
        /** WASM engine reads `gate` (0–1); `trigger` is not forwarded as a number by useWasmNode. */
        gate: trigger ? 1 : 0,
        velocity,
        duration,
        initialGain,
        bypass,
    });

    useEffect(() => {
        if (!externalRef) return;
        (externalRef as React.MutableRefObject<GainNode | null>).current = {} as GainNode;
        return () => {
            (externalRef as React.MutableRefObject<GainNode | null>).current = null;
        };
    }, [externalRef]);

    return (
        <AudioOutProvider node={null} nodeId={nodeId}>
            {children}
        </AudioOutProvider>
    );
};
