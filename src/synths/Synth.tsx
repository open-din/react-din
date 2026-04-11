import type { FC } from 'react';
import { Filter } from '../nodes/Filter';
import { Gain } from '../nodes/Gain';
import { Osc } from '../nodes/Osc';
import type { SynthProps } from './types';
import { DEFAULT_FILTER, DEFAULT_OSCILLATOR } from './types';
import {
    resolveMidiNote,
    useMirrorExternalNodeRef,
    useSynthTriggerToMidi,
} from './runtime';

/** Single-voice subtractive stack (`osc` → `filter` → `gain`). Polyphony is not modeled in WASM v1. */
export const Synth: FC<SynthProps> = ({
    children,
    notes = [],
    oscillator = {},
    filter = {},
    volume = 0.5,
    bypass = false,
    nodeRef: externalRef,
}) => {
    const oscConfig = { ...DEFAULT_OSCILLATOR, ...oscillator };
    const filterConfig = { ...DEFAULT_FILTER, ...filter };

    useSynthTriggerToMidi((step, fallback) => resolveMidiNote(notes, step, fallback));
    useMirrorExternalNodeRef(externalRef);

    return (
        <Gain gain={volume} bypass={bypass} voice>
            <Filter
                type={filterConfig.type}
                frequency={filterConfig.frequency}
                Q={filterConfig.Q}
                gain={filterConfig.gain}
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
