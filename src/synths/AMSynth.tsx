import type { FC } from 'react';
import { Distortion } from '../effects/Distortion';
import { Filter } from '../nodes/Filter';
import { Gain } from '../nodes/Gain';
import { Osc } from '../nodes/Osc';
import type { AMSynthProps } from './types';
import { DEFAULT_FILTER, DEFAULT_OSCILLATOR } from './types';
import {
    resolveMidiNote,
    useMirrorExternalNodeRef,
    useSynthTriggerToMidi,
} from './runtime';

/**
 * AM-style ring-mod timbre is approximated with mild `distortion` + `filter` (true AM is not in WASM v1).
 * `modulationRate` is not applied in the WASM engine v1.
 */
export const AMSynth: FC<AMSynthProps> = ({
    children,
    notes = [],
    carrier = {},
    modulationDepth = 0.5,
    filter = {},
    volume = 0.5,
    bypass = false,
    nodeRef: externalRef,
}) => {
    const carrierCfg = { ...DEFAULT_OSCILLATOR, ...carrier };
    const filterCfg = { ...DEFAULT_FILTER, ...filter };
    const drive = Math.min(0.85, modulationDepth * 0.55);

    useSynthTriggerToMidi((step, fallback) => resolveMidiNote(notes, step, fallback));
    useMirrorExternalNodeRef(externalRef);

    return (
        <Gain gain={volume} bypass={bypass}>
            <Filter type={filterCfg.type} frequency={filterCfg.frequency} Q={filterCfg.Q} gain={filterCfg.gain}>
                <Distortion drive={drive} mix={0.42} level={0.65} tone={5200}>
                    <Osc type={carrierCfg.type} frequency={440} detune={carrierCfg.detune} bypass={false} />
                </Distortion>
            </Filter>
            {children}
        </Gain>
    );
};
