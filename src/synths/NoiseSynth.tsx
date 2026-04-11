import type { FC } from 'react';
import { Filter } from '../nodes/Filter';
import { Gain } from '../nodes/Gain';
import { NoiseBurst } from '../sources/NoiseBurst';
import type { NoiseSynthProps } from './types';
import { DEFAULT_ENVELOPE, DEFAULT_FILTER } from './types';
import { useMirrorExternalNodeRef, useSynthTriggerToMidi } from './runtime';

/** Noise burst + optional filter + `gain`. */
export const NoiseSynth: FC<NoiseSynthProps> = ({
    children,
    noiseType = 'white',
    filter = {},
    envelope = {},
    volume = 0.5,
    bypass = false,
    nodeRef: externalRef,
}) => {
    const envConfig = { ...DEFAULT_ENVELOPE, ...envelope };
    const filterCfg = { ...DEFAULT_FILTER, ...filter };
    const duration = Math.max(0.02, envConfig.attack + envConfig.decay + 0.05);

    useSynthTriggerToMidi((_, fallback) => fallback);
    useMirrorExternalNodeRef(externalRef);

    return (
        <Gain gain={volume} bypass={bypass}>
            <Filter type={filterCfg.type} frequency={filterCfg.frequency} Q={filterCfg.Q} gain={filterCfg.gain}>
                <NoiseBurst
                    type={noiseType}
                    duration={duration}
                    gain={0.9}
                    attack={envConfig.attack}
                    release={envConfig.release}
                />
            </Filter>
            {children}
        </Gain>
    );
};
