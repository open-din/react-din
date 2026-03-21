import { useEffect, useRef, type FC } from 'react';
import type { CompressorProps } from './types';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import { getOrCreateBusNode } from '../routing/busRegistry';

/**
 * DynamicsCompressor node component for dynamic range compression.
 *
 * @example
 * ```tsx
 * // Gentle compression
 * <Compressor threshold={-18} ratio={4} attack={0.01} release={0.1}>
 *   <Sampler src="/drums.wav" />
 * </Compressor>
 *
 * // Heavy limiting
 * <Compressor threshold={-6} ratio={20} knee={0} attack={0.001}>
 *   <Sampler src="/master.wav" />
 * </Compressor>
 * ```
 */
export const Compressor: FC<CompressorProps> = ({
    children,
    nodeRef: externalRef,
    bypass = false,
    threshold = -24,
    knee = 30,
    ratio = 12,
    attack = 0.003,
    release = 0.25,
    sidechainBusId,
    sidechainStrength = 0.7,
    id,
}) => {
    const { context } = useAudio();
    const { outputNode } = useAudioOut();
    const inputRef = useRef<GainNode | null>(null);
    const duckGainRef = useRef<GainNode | null>(null);
    const compressorRef = useRef<DynamicsCompressorNode | null>(null);

    useEffect(() => {
        if (!context || !outputNode) return;

        const input = context.createGain();
        const duckGain = context.createGain();
        const compressor = context.createDynamicsCompressor();

        duckGain.gain.value = 1;

        input.connect(duckGain);
        duckGain.connect(compressor);
        compressor.connect(outputNode);

        inputRef.current = input;
        duckGainRef.current = duckGain;
        compressorRef.current = compressor;

        if (externalRef) {
            (externalRef as React.MutableRefObject<DynamicsCompressorNode | null>).current = compressor;
        }

        return () => {
            try { input.disconnect(); } catch { /* noop */ }
            try { duckGain.disconnect(); } catch { /* noop */ }
            try { compressor.disconnect(); } catch { /* noop */ }
            inputRef.current = null;
            duckGainRef.current = null;
            compressorRef.current = null;
            if (externalRef) {
                (externalRef as React.MutableRefObject<DynamicsCompressorNode | null>).current = null;
            }
        };
    }, [context, outputNode, externalRef]);

    useEffect(() => {
        if (!context || !compressorRef.current) return;
        const currentTime = context.currentTime;
        compressorRef.current.threshold.setTargetAtTime(threshold, currentTime, 0.01);
        compressorRef.current.knee.setTargetAtTime(knee, currentTime, 0.01);
        compressorRef.current.ratio.setTargetAtTime(ratio, currentTime, 0.01);
        compressorRef.current.attack.setTargetAtTime(attack, currentTime, 0.01);
        compressorRef.current.release.setTargetAtTime(release, currentTime, 0.01);
    }, [context, threshold, knee, ratio, attack, release]);

    useEffect(() => {
        if (!context || !duckGainRef.current) return;
        if (!sidechainBusId) {
            duckGainRef.current.gain.setTargetAtTime(1, context.currentTime, 0.02);
            return;
        }

        const busNode = getOrCreateBusNode(context, sidechainBusId);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.85;
        const waveform = new Float32Array(analyser.fftSize);

        busNode.connect(analyser);

        const intervalId = window.setInterval(() => {
            if (!duckGainRef.current) return;
            analyser.getFloatTimeDomainData(waveform);
            let sumSquares = 0;
            for (let i = 0; i < waveform.length; i++) {
                const sample = waveform[i];
                sumSquares += sample * sample;
            }

            const rms = Math.sqrt(sumSquares / waveform.length);
            const levelDb = 20 * Math.log10(Math.max(rms, 0.0001));
            const overThreshold = Math.max(0, levelDb - threshold);
            const normalized = Math.min(1, overThreshold / 24);
            const ducking = normalized * Math.max(0, Math.min(1, sidechainStrength));
            const targetGain = Math.max(0.05, 1 - ducking);
            duckGainRef.current.gain.setTargetAtTime(
                targetGain,
                context.currentTime,
                Math.max(0.005, attack || 0.005)
            );
        }, 20);

        return () => {
            window.clearInterval(intervalId);
            try { busNode.disconnect(analyser); } catch { /* noop */ }
            try { analyser.disconnect(); } catch { /* noop */ }
            if (duckGainRef.current) {
                duckGainRef.current.gain.setTargetAtTime(1, context.currentTime, Math.max(0.005, release || 0.005));
            }
        };
    }, [context, sidechainBusId, sidechainStrength, threshold, attack, release]);

    return (
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
};
