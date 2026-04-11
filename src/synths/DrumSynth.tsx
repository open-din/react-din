import type { FC, ReactNode, RefObject } from 'react';
import { Distortion } from '../effects/Distortion';
import { Filter } from '../nodes/Filter';
import { Gain } from '../nodes/Gain';
import { Osc } from '../nodes/Osc';
import { NoiseBurst } from '../sources/NoiseBurst';
import type { EnvelopeConfig } from './types';
import { DEFAULT_ENVELOPE } from './types';
import { useMirrorExternalNodeRef } from './runtime';

export interface DrumOscillatorConfig {
    type?: OscillatorType;
    frequency: number;
    pitchDecay?: number;
    pitchDecayTime?: number;
    gain?: number;
    duration?: number;
}

export interface DrumNoiseConfig {
    type?: 'white' | 'pink' | 'brown';
    filterType?: BiquadFilterType;
    filterFrequency?: number;
    filterQ?: number;
    gain?: number;
    duration?: number;
}

export interface DrumSynthProps {
    children?: ReactNode;
    oscillators?: DrumOscillatorConfig[];
    noise?: DrumNoiseConfig[];
    envelope?: EnvelopeConfig;
    volume?: number;
    saturation?: boolean;
    saturationAmount?: number;
    bypass?: boolean;
    nodeRef?: RefObject<GainNode>;
    /** Sequencer gate on the root gain (default on for drums). */
    voice?: boolean;
}

/**
 * Drum voice built from WASM graph primitives (`osc`, `noiseBurst`, `filter`, `gain`, `distortion`).
 * Pitch-decay fields on oscillators are not modeled in the WASM engine v1 and are ignored.
 */
export const DrumSynth: FC<DrumSynthProps> = ({
    children,
    oscillators = [],
    noise = [],
    envelope = {},
    volume = 0.5,
    saturation = false,
    saturationAmount = 2,
    bypass = false,
    voice = true,
    nodeRef: externalRef,
}) => {
    const envConfig = { ...DEFAULT_ENVELOPE, ...envelope };
    const drive = Math.min(1, Math.max(0, saturationAmount / 4));

    const hasLayers = oscillators.length > 0 || noise.length > 0;

    const layers = (
        <>
            {oscillators.map((osc, i) => (
                <Gain key={`drum-osc-${i.toString()}`} gain={osc.gain ?? 1}>
                    <Osc type={osc.type ?? 'sine'} frequency={osc.frequency} detune={0} bypass={false} />
                </Gain>
            ))}
            {noise.map((n, i) => (
                <Gain key={`drum-nz-${i.toString()}`} gain={n.gain ?? 1}>
                    <Filter
                        type={n.filterType ?? 'bandpass'}
                        frequency={n.filterFrequency ?? 2000}
                        Q={n.filterQ ?? 1}
                    >
                        <NoiseBurst
                            type={n.type ?? 'white'}
                            duration={n.duration ?? 0.08}
                            gain={1}
                            attack={envConfig.attack}
                            release={envConfig.release}
                        />
                    </Filter>
                </Gain>
            ))}
        </>
    );

    const silent = (
        <Gain gain={0}>
            <Osc frequency={440} bypass={false} />
        </Gain>
    );

    const body = hasLayers ? layers : silent;

    useMirrorExternalNodeRef(externalRef);

    return (
        <Gain gain={volume} bypass={bypass} voice={voice}>
            {saturation ? (
                <Distortion drive={drive} mix={1} level={0.72} tone={6500}>
                    {body}
                </Distortion>
            ) : (
                body
            )}
            {children}
        </Gain>
    );
};
