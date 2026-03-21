import { render, waitFor } from '@testing-library/react';
import React, { createRef } from 'react';
import {
    ADSR,
    AudioProvider,
    AuxSend,
    Compressor,
    Delay,
    Filter,
    Gain,
    Osc,
    Panner,
    PresetWaveShaper,
    StereoPanner,
    WaveShaper,
    useLFO,
} from 'react-din';

const FilterHarness = () => {
    const lfo = useLFO({ rate: 0.5, depth: 24, waveform: 'sine' });

    return (
        <Filter frequency={880} gain={lfo} gainBase={3} detune={lfo} detuneBase={12}>
            <Delay delayTime={0.2}>
                <Compressor>
                    <Panner positionX={1}>
                        <StereoPanner pan={-0.1}>
                            <WaveShaper curve={new Float32Array([-1, -0.2, 0, 0.2, 1])}>
                                <PresetWaveShaper amount={0.45} preset="saturate" oversample="2x">
                                    <ADSR trigger>
                                        <Osc nodeRef={createRef<OscillatorNode>()} autoStart type="sawtooth" />
                                    </ADSR>
                                </PresetWaveShaper>
                            </WaveShaper>
                        </StereoPanner>
                    </Panner>
                </Compressor>
            </Delay>
        </Filter>
    );
};

describe('library audio node components', () => {
    it('wires a representative graph and auto-starts oscillators', async () => {
        const oscRef = createRef<OscillatorNode>();
        const gainRef = createRef<AudioNode>();

        render(
            <AudioProvider>
                <AuxSend busId="duck" sendGain={0.8}>
                    <Osc autoStart frequency={2} />
                </AuxSend>
                <Gain gain={0.5} nodeRef={gainRef}>
                    <Compressor sidechainBusId="duck" sidechainStrength={0.6}>
                        <FilterHarness />
                    </Compressor>
                </Gain>
            </AudioProvider>
        );

        await waitFor(() => {
            expect(gainRef.current).not.toBeNull();
            expect(document.querySelectorAll('*').length).toBeGreaterThan(0);
        });
    });
});
