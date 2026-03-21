import { useEffect, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import type { EQ3Props } from './types';

const MIN_CROSSOVER_GAP = 50;

export const EQ3: FC<EQ3Props> = ({
    children,
    mix = 1,
    bypass = false,
    low = 0,
    mid = 0,
    high = 0,
    lowFrequency = 400,
    highFrequency = 2500,
}) => {
    const { context } = useAudio();
    const { outputNode } = useAudioOut();
    const inputRef = useRef<GainNode | null>(null);

    useEffect(() => {
        if (!context || !outputNode) return;

        const input = context.createGain();
        const output = context.createGain();
        const dry = context.createGain();
        const wet = context.createGain();
        const lowShelf = context.createBiquadFilter();
        const midPeak = context.createBiquadFilter();
        const highShelf = context.createBiquadFilter();

        const safeLowFreq = Math.max(20, lowFrequency);
        const safeHighFreq = Math.max(safeLowFreq + MIN_CROSSOVER_GAP, highFrequency);
        const midFrequency = Math.sqrt(safeLowFreq * safeHighFreq);

        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = safeLowFreq;
        lowShelf.gain.value = low;

        midPeak.type = 'peaking';
        midPeak.frequency.value = midFrequency;
        midPeak.Q.value = 0.707;
        midPeak.gain.value = mid;

        highShelf.type = 'highshelf';
        highShelf.frequency.value = safeHighFreq;
        highShelf.gain.value = high;

        dry.gain.value = bypass ? 1 : 1 - mix;
        wet.gain.value = bypass ? 0 : mix;

        input.connect(dry);
        dry.connect(output);

        input.connect(lowShelf);
        lowShelf.connect(midPeak);
        midPeak.connect(highShelf);
        highShelf.connect(wet);
        wet.connect(output);

        output.connect(outputNode);
        inputRef.current = input;

        return () => {
            [input, output, dry, wet, lowShelf, midPeak, highShelf].forEach((node) => {
                try { node.disconnect(); } catch { /* noop */ }
            });
            inputRef.current = null;
        };
    }, [context, outputNode, mix, bypass, low, mid, high, lowFrequency, highFrequency]);

    return (
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
};
