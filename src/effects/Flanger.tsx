import { useEffect, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import type { FlangerProps } from './types';

export const Flanger: FC<FlangerProps> = ({
    children,
    mix = 0.5,
    bypass = false,
    rate = 0.2,
    depth = 2,
    feedback = 0.5,
    delay = 1,
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
        const delayNode = context.createDelay(0.05);
        const feedbackGain = context.createGain();
        const lfo = context.createOscillator();
        const lfoDepth = context.createGain();

        const delaySec = Math.max(0, delay) / 1000;
        const depthSec = Math.max(0, depth) / 1000;

        dry.gain.value = bypass ? 1 : 1 - mix;
        wet.gain.value = bypass ? 0 : mix;
        delayNode.delayTime.value = delaySec;
        feedbackGain.gain.value = Math.max(-0.95, Math.min(0.95, feedback));
        lfo.type = 'sine';
        lfo.frequency.value = Math.max(0.01, rate);
        lfoDepth.gain.value = depthSec;

        input.connect(dry);
        dry.connect(output);

        input.connect(delayNode);
        delayNode.connect(wet);
        wet.connect(output);

        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);

        lfo.connect(lfoDepth);
        lfoDepth.connect(delayNode.delayTime);

        output.connect(outputNode);
        lfo.start();
        inputRef.current = input;

        return () => {
            try { lfo.stop(); } catch { /* noop */ }
            try { input.disconnect(); } catch { /* noop */ }
            try { output.disconnect(); } catch { /* noop */ }
            try { dry.disconnect(); } catch { /* noop */ }
            try { wet.disconnect(); } catch { /* noop */ }
            try { delayNode.disconnect(); } catch { /* noop */ }
            try { feedbackGain.disconnect(); } catch { /* noop */ }
            try { lfo.disconnect(); } catch { /* noop */ }
            try { lfoDepth.disconnect(); } catch { /* noop */ }
            inputRef.current = null;
        };
    }, [context, outputNode, mix, bypass, rate, depth, feedback, delay]);

    return (
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
};
