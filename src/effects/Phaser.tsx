import { useEffect, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import type { PhaserProps } from './types';

const clampStageCount = (value: number | undefined) => {
    if (!Number.isFinite(value)) return 4;
    return Math.max(2, Math.min(8, Math.floor(Number(value))));
};

export const Phaser: FC<PhaserProps> = ({
    children,
    mix = 0.5,
    bypass = false,
    rate = 0.5,
    depth = 0.5,
    feedback = 0.7,
    baseFrequency = 1000,
    stages = 4,
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
        const feedbackGain = context.createGain();
        const lfo = context.createOscillator();
        const lfoDepth = context.createGain();
        const stageNodes: BiquadFilterNode[] = [];

        const stageCount = clampStageCount(stages);
        for (let i = 0; i < stageCount; i++) {
            const stage = context.createBiquadFilter();
            stage.type = 'allpass';
            stage.frequency.value = Math.max(20, baseFrequency);
            stage.Q.value = 0.5;
            stageNodes.push(stage);
        }

        dry.gain.value = bypass ? 1 : 1 - mix;
        wet.gain.value = bypass ? 0 : mix;
        feedbackGain.gain.value = Math.max(-0.95, Math.min(0.95, feedback));
        lfo.type = 'sine';
        lfo.frequency.value = Math.max(0.01, rate);
        lfoDepth.gain.value = Math.max(0, depth) * Math.max(100, baseFrequency);

        input.connect(dry);
        dry.connect(output);

        input.connect(stageNodes[0]);
        for (let i = 0; i < stageNodes.length - 1; i++) {
            stageNodes[i].connect(stageNodes[i + 1]);
        }
        stageNodes[stageNodes.length - 1].connect(wet);
        wet.connect(output);

        stageNodes[stageNodes.length - 1].connect(feedbackGain);
        feedbackGain.connect(stageNodes[0]);

        lfo.connect(lfoDepth);
        stageNodes.forEach((node) => {
            lfoDepth.connect(node.frequency);
        });

        output.connect(outputNode);
        lfo.start();
        inputRef.current = input;

        return () => {
            try { lfo.stop(); } catch { /* noop */ }
            try { input.disconnect(); } catch { /* noop */ }
            try { output.disconnect(); } catch { /* noop */ }
            try { dry.disconnect(); } catch { /* noop */ }
            try { wet.disconnect(); } catch { /* noop */ }
            try { feedbackGain.disconnect(); } catch { /* noop */ }
            try { lfo.disconnect(); } catch { /* noop */ }
            try { lfoDepth.disconnect(); } catch { /* noop */ }
            stageNodes.forEach((node) => {
                try { node.disconnect(); } catch { /* noop */ }
            });
            inputRef.current = null;
        };
    }, [context, outputNode, mix, bypass, rate, depth, feedback, baseFrequency, stages]);

    return (
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
};
