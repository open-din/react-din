import { useEffect, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import type { TremoloProps } from './types';

export const Tremolo: FC<TremoloProps> = ({
    children,
    mix = 0.5,
    bypass = false,
    rate = 4,
    depth = 0.5,
    waveform = 'sine',
    stereo = false,
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
        const modGainL = context.createGain();

        dry.gain.value = bypass ? 1 : 1 - mix;
        wet.gain.value = bypass ? 0 : mix;

        input.connect(dry);
        dry.connect(output);

        const modDepth = Math.max(0, Math.min(1, depth));
        modGainL.gain.value = 1 - modDepth * 0.5;

        if (stereo) {
            const splitter = context.createChannelSplitter(2);
            const merger = context.createChannelMerger(2);
            const modGainR = context.createGain();
            const lfoL = context.createOscillator();
            const lfoR = context.createOscillator();
            const lfoDepthL = context.createGain();
            const lfoDepthR = context.createGain();

            modGainR.gain.value = 1 - modDepth * 0.5;
            lfoDepthL.gain.value = modDepth * 0.5;
            lfoDepthR.gain.value = modDepth * 0.5;

            lfoL.type = waveform;
            lfoR.type = waveform;
            lfoL.frequency.value = Math.max(0.01, rate);
            lfoR.frequency.value = Math.max(0.01, rate);

            input.connect(splitter);
            splitter.connect(modGainL, 0);
            splitter.connect(modGainR, 1);
            modGainL.connect(merger, 0, 0);
            modGainR.connect(merger, 0, 1);
            merger.connect(wet);
            wet.connect(output);

            lfoL.connect(lfoDepthL);
            lfoDepthL.connect(modGainL.gain);
            lfoR.connect(lfoDepthR);
            lfoDepthR.gain.value = -Math.abs(lfoDepthR.gain.value);
            lfoDepthR.connect(modGainR.gain);

            output.connect(outputNode);
            lfoL.start();
            lfoR.start();
            inputRef.current = input;

            return () => {
                try { lfoL.stop(); } catch { /* noop */ }
                try { lfoR.stop(); } catch { /* noop */ }
                [input, output, dry, wet, modGainL, modGainR, splitter, merger, lfoL, lfoR, lfoDepthL, lfoDepthR].forEach((node) => {
                    try { node.disconnect(); } catch { /* noop */ }
                });
                inputRef.current = null;
            };
        }

        const lfo = context.createOscillator();
        const lfoDepth = context.createGain();

        lfo.type = waveform;
        lfo.frequency.value = Math.max(0.01, rate);
        lfoDepth.gain.value = modDepth * 0.5;

        input.connect(modGainL);
        modGainL.connect(wet);
        wet.connect(output);

        lfo.connect(lfoDepth);
        lfoDepth.connect(modGainL.gain);

        output.connect(outputNode);
        lfo.start();
        inputRef.current = input;

        return () => {
            try { lfo.stop(); } catch { /* noop */ }
            [input, output, dry, wet, modGainL, lfo, lfoDepth].forEach((node) => {
                try { node.disconnect(); } catch { /* noop */ }
            });
            inputRef.current = null;
        };
    }, [context, outputNode, mix, bypass, rate, depth, waveform, stereo]);

    return (
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
};
