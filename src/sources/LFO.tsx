import type { FC, ReactNode } from 'react';
import { AudioOutProvider } from '../core/AudioOutContext';
import { LfoModulationProvider } from '../core/LfoModulationContext';
import type { LFOOutput, LFOWaveform } from '../core/ModulatableValue';
import { useWasmNode } from '../nodes/useAudioNode';
import type { UseLFOOptions } from './useLFO';

/** Indices match `din-core` LFO waveform handling (`lfoWaveform` in patch data). */
const LFO_WAVEFORM_INDEX: Record<LFOWaveform, number> = {
    sine: 0,
    triangle: 1,
    sawtooth: 2,
    square: 3,
};

export interface LFOProps extends UseLFOOptions {
    children?: ReactNode | ((lfo: LFOOutput | null) => ReactNode);
}

export const LFO: FC<LFOProps> = ({
    children,
    rate = 1,
    depth = 100,
    waveform = 'sine',
    phase = 0,
    autoStart = true,
}) => {
    const { nodeId } = useWasmNode('lfo', {
        frequency: rate,
        depth,
        /** Do not use `type` — graph merge overwrites `data.type` with node kind (`lfo`). */
        lfoWaveform: LFO_WAVEFORM_INDEX[waveform] ?? 0,
        phase,
        autoStart,
    });

    const body =
        typeof children === 'function' ? (
            <>{children(null)}</>
        ) : (
            <AudioOutProvider node={null} nodeId={nodeId} inputHandle="control">
                {children}
            </AudioOutProvider>
        );

    return <LfoModulationProvider nodeId={nodeId}>{body}</LfoModulationProvider>;
};

export type { LFOWaveform, LFOOutput };
