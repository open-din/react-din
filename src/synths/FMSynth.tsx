import type { FC } from 'react';
import { Filter } from '../nodes/Filter';
import { Gain } from '../nodes/Gain';
import { Osc } from '../nodes/Osc';
import type { FMSynthProps } from './types';
import { DEFAULT_FILTER, DEFAULT_OSCILLATOR } from './types';
import {
    resolveMidiNote,
    useMirrorExternalNodeRef,
    useSynthTriggerToMidi,
} from './runtime';

/**
 * FM-style timbre is approximated with a resonant `filter` around a MIDI-gated `osc` (true FM is not in WASM v1).
 */
export const FMSynth: FC<FMSynthProps> = ({
    children,
    notes = [],
    carrier = {},
    modulationRatio = 1,
    modulationIndex = 1,
    filter = {},
    volume = 0.5,
    bypass = false,
    nodeRef: externalRef,
}) => {
    const carrierCfg = { ...DEFAULT_OSCILLATOR, ...carrier };
    const filterCfg = { ...DEFAULT_FILTER, ...filter };
    const cutoff = Math.min(14_000, 400 + modulationIndex * modulationRatio * 450);
    const q = Math.min(12, 0.8 + modulationIndex * 0.9);

    useSynthTriggerToMidi((step, fallback) => resolveMidiNote(notes, step, fallback));
    useMirrorExternalNodeRef(externalRef);

    return (
        <Gain gain={volume} bypass={bypass}>
            <Filter type={filterCfg.type} frequency={cutoff} Q={q} gain={filterCfg.gain}>
                <Osc type={carrierCfg.type} frequency={440} detune={carrierCfg.detune} bypass={false} />
            </Filter>
            {children}
        </Gain>
    );
};
