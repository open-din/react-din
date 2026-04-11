import type { FC } from 'react';
import { Filter } from '../nodes/Filter';
import { Gain } from '../nodes/Gain';
import { Osc } from '../nodes/Osc';
import type { MonoSynthProps } from './types';
import { DEFAULT_FILTER, DEFAULT_OSCILLATOR } from './types';
import {
    resolveMidiNote,
    useMirrorExternalNodeRef,
    useSynthTriggerToMidi,
} from './runtime';

/** Monophonic MIDI-gated oscillator (`osc` + `gain`). Portamento is not applied in the WASM engine v1. */
export const MonoSynth: FC<MonoSynthProps> = ({
    children,
    notes = [],
    oscillator = {},
    filter = {},
    volume = 0.5,
    bypass = false,
    nodeRef: externalRef,
}) => {
    const oscConfig = { ...DEFAULT_OSCILLATOR, ...oscillator };
    const filterCfg = { ...DEFAULT_FILTER, ...filter };

    useSynthTriggerToMidi((step, fallback) => resolveMidiNote(notes, step, fallback));
    useMirrorExternalNodeRef(externalRef);

    return (
        <Gain gain={volume} bypass={bypass} voice>
            <Filter
                type={filterCfg.type}
                frequency={filterCfg.frequency}
                Q={filterCfg.Q}
                gain={filterCfg.gain}
            >
                <Osc
                    type={oscConfig.type}
                    frequency={440}
                    detune={oscConfig.detune}
                    bypass={false}
                    followMidiNote={notes.length > 0}
                />
            </Filter>
            {children}
        </Gain>
    );
};
