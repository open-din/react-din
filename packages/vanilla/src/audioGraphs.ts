import {
    dinCoreCreateDistortionCurve,
    dinCoreCreateReverbImpulseFrames,
    dinCoreCreateWaveShaperCurve,
    dinCoreFillNoiseSamples,
} from './core';

export type NoiseGeneratorType = 'white' | 'pink' | 'brown' | 'blue' | 'violet';
export type DistortionCurveType = 'soft' | 'hard' | 'fuzz' | 'bitcrush' | 'saturate';
export type WaveShaperCurvePreset = 'softClip' | 'hardClip' | 'saturate';

const MIN_EQ3_GAP_HZ = 50;

function safeDisconnect(node: AudioNode | null | undefined) {
    if (!node) return;
    try {
        node.disconnect();
    } catch {
        // The graph can already be partially disconnected during teardown.
    }
}

function setParamValue(param: AudioParam, value: number, currentTime?: number) {
    if (typeof currentTime === 'number' && typeof param.setTargetAtTime === 'function') {
        param.setTargetAtTime(value, currentTime, 0.01);
        return;
    }
    param.value = value;
}

export function createNoiseBuffer(
    context: AudioContext,
    type: NoiseGeneratorType,
    sampleCount?: number
): AudioBuffer {
    const length = sampleCount ?? (context.sampleRate * 2);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    dinCoreFillNoiseSamples(type, length, buffer.getChannelData(0));
    return buffer;
}

export function createReverbImpulseBuffer(
    context: AudioContext,
    decay: number,
    preDelay = 0,
    damping = 0
): AudioBuffer {
    const frames = dinCoreCreateReverbImpulseFrames(context.sampleRate, decay, preDelay, damping);
    const buffer = context.createBuffer(2, frames.left.length, context.sampleRate);
    buffer.getChannelData(0).set(frames.left);
    buffer.getChannelData(1).set(frames.right);
    return buffer;
}

export function createSharedWaveShaperCurve(
    amount: number,
    preset: WaveShaperCurvePreset
): Float32Array<ArrayBufferLike> {
    return dinCoreCreateWaveShaperCurve(amount, preset);
}

export function createSharedDistortionCurve(
    type: DistortionCurveType,
    drive: number
): Float32Array<ArrayBufferLike> {
    return dinCoreCreateDistortionCurve(type, drive);
}

export function clampPhaserStageCount(value: number | undefined) {
    if (!Number.isFinite(value)) return 4;
    return Math.max(2, Math.min(8, Math.floor(Number(value))));
}

export function deriveDistortionPreset(type: DistortionCurveType): WaveShaperCurvePreset {
    if (type === 'hard') return 'hardClip';
    if (type === 'saturate') return 'saturate';
    return 'softClip';
}

export interface ReverbGraph {
    input: GainNode;
    output: GainNode;
    convolver: ConvolverNode;
    dryGain: GainNode;
    wetGain: GainNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createReverbGraph(context: AudioContext, mix = 0.5): ReverbGraph {
    const input = context.createGain();
    const output = context.createGain();
    const convolver = context.createConvolver();
    const dryGain = context.createGain();
    const wetGain = context.createGain();

    input.connect(dryGain);
    input.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(output);
    wetGain.connect(output);

    updateDryWetGraph({ dryGain, wetGain }, mix);

    const nodes = [input, output, convolver, dryGain, wetGain];
    return {
        input,
        output,
        convolver,
        dryGain,
        wetGain,
        nodes,
        dispose: () => nodes.forEach(safeDisconnect),
    };
}

export function updateReverbMix(
    graph: Pick<ReverbGraph, 'dryGain' | 'wetGain'>,
    mix: number,
    bypass = false,
    currentTime?: number
) {
    const wet = bypass ? 0 : mix;
    const dry = bypass ? 1 : 1 - mix;
    setParamValue(graph.wetGain.gain, wet, currentTime);
    setParamValue(graph.dryGain.gain, dry, currentTime);
}

export async function applyReverbImpulse(
    graph: Pick<ReverbGraph, 'convolver'>,
    context: AudioContext,
    impulse: string | AudioBuffer | undefined,
    decay: number,
    preDelay = 0,
    damping = 0
) {
    if (typeof impulse === 'string') {
        const response = await fetch(impulse);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(arrayBuffer);
        graph.convolver.buffer = buffer;
        return;
    }

    graph.convolver.buffer = impulse instanceof AudioBuffer
        ? impulse
        : createReverbImpulseBuffer(context, decay, preDelay, damping);
}

export interface DistortionGraph {
    input: GainNode;
    output: GainNode;
    dryGain: GainNode;
    wetGain: GainNode;
    driveGain: GainNode;
    waveShaper: WaveShaperNode;
    toneFilter: BiquadFilterNode;
    levelGain: GainNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createDistortionGraph(context: AudioContext): DistortionGraph {
    const input = context.createGain();
    const output = context.createGain();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const driveGain = context.createGain();
    const waveShaper = context.createWaveShaper();
    const toneFilter = context.createBiquadFilter();
    const levelGain = context.createGain();

    input.connect(dryGain);
    dryGain.connect(output);
    input.connect(driveGain);
    driveGain.connect(waveShaper);
    waveShaper.connect(toneFilter);
    toneFilter.connect(levelGain);
    levelGain.connect(wetGain);
    wetGain.connect(output);

    toneFilter.type = 'lowpass';

    const nodes = [input, output, dryGain, wetGain, driveGain, waveShaper, toneFilter, levelGain];
    return {
        input,
        output,
        dryGain,
        wetGain,
        driveGain,
        waveShaper,
        toneFilter,
        levelGain,
        nodes,
        dispose: () => nodes.forEach(safeDisconnect),
    };
}

export function updateDistortionGraph(
    graph: DistortionGraph,
    options: {
        type: DistortionCurveType;
        drive: number;
        level: number;
        mix: number;
        tone: number;
        oversample: OverSampleType;
        bypass?: boolean;
    },
    currentTime?: number
) {
    setParamValue(graph.driveGain.gain, 1 + options.drive * 5, currentTime);
    graph.waveShaper.curve = createSharedDistortionCurve(options.type, options.drive) as Float32Array<ArrayBuffer>;
    graph.waveShaper.oversample = options.oversample;
    setParamValue(graph.toneFilter.frequency, options.tone, currentTime);
    setParamValue(graph.levelGain.gain, options.level, currentTime);
    updateDryWetGraph(graph, options.mix, options.bypass, currentTime);
}

export interface ChorusGraph {
    input: GainNode;
    output: GainNode;
    dryGain: GainNode;
    wetGain: GainNode;
    primaryDelay: DelayNode;
    primaryFeedbackGain: GainNode;
    primaryLfo: OscillatorNode;
    primaryLfoGain: GainNode;
    secondaryDelay?: DelayNode;
    secondaryFeedbackGain?: GainNode;
    secondaryLfo?: OscillatorNode;
    secondaryLfoGain?: GainNode;
    splitter?: ChannelSplitterNode;
    merger?: ChannelMergerNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createChorusGraph(context: AudioContext, stereo = true): ChorusGraph {
    const input = context.createGain();
    const output = context.createGain();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const primaryDelay = context.createDelay(0.2);
    const primaryFeedbackGain = context.createGain();
    const primaryLfo = context.createOscillator();
    const primaryLfoGain = context.createGain();
    const nodes: AudioNode[] = [
        input,
        output,
        dryGain,
        wetGain,
        primaryDelay,
        primaryFeedbackGain,
        primaryLfo,
        primaryLfoGain,
    ];

    input.connect(dryGain);
    dryGain.connect(output);

    primaryLfo.type = 'sine';
    primaryLfo.connect(primaryLfoGain);
    primaryLfoGain.connect(primaryDelay.delayTime);

    if (stereo) {
        const secondaryDelay = context.createDelay(0.2);
        const secondaryFeedbackGain = context.createGain();
        const secondaryLfo = context.createOscillator();
        const secondaryLfoGain = context.createGain();
        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);

        nodes.push(secondaryDelay, secondaryFeedbackGain, secondaryLfo, secondaryLfoGain, splitter, merger);

        secondaryLfo.type = 'sine';
        secondaryLfo.connect(secondaryLfoGain);
        secondaryLfoGain.connect(secondaryDelay.delayTime);

        input.connect(splitter);
        splitter.connect(primaryDelay, 0);
        splitter.connect(secondaryDelay, 1);

        primaryDelay.connect(primaryFeedbackGain);
        primaryFeedbackGain.connect(primaryDelay);
        primaryDelay.connect(merger, 0, 0);

        secondaryDelay.connect(secondaryFeedbackGain);
        secondaryFeedbackGain.connect(secondaryDelay);
        secondaryDelay.connect(merger, 0, 1);

        merger.connect(wetGain);
        wetGain.connect(output);

        return {
            input,
            output,
            dryGain,
            wetGain,
            primaryDelay,
            primaryFeedbackGain,
            primaryLfo,
            primaryLfoGain,
            secondaryDelay,
            secondaryFeedbackGain,
            secondaryLfo,
            secondaryLfoGain,
            splitter,
            merger,
            nodes,
            dispose: () => {
                try { primaryLfo.stop(); } catch { /* noop */ }
                try { secondaryLfo.stop(); } catch { /* noop */ }
                nodes.forEach(safeDisconnect);
            },
        };
    }

    input.connect(primaryDelay);
    primaryDelay.connect(primaryFeedbackGain);
    primaryFeedbackGain.connect(primaryDelay);
    primaryDelay.connect(wetGain);
    wetGain.connect(output);

    return {
        input,
        output,
        dryGain,
        wetGain,
        primaryDelay,
        primaryFeedbackGain,
        primaryLfo,
        primaryLfoGain,
        nodes,
        dispose: () => {
            try { primaryLfo.stop(); } catch { /* noop */ }
            nodes.forEach(safeDisconnect);
        },
    };
}

export function updateChorusGraph(
    graph: ChorusGraph,
    options: {
        rate: number;
        depth: number;
        feedback: number;
        delay: number;
        mix: number;
        bypass?: boolean;
        stereo?: boolean;
    },
    currentTime?: number
) {
    const delaySeconds = options.delay / 1000;
    const depthSeconds = options.depth / 1000;

    setParamValue(graph.primaryDelay.delayTime, delaySeconds, currentTime);
    setParamValue(graph.primaryFeedbackGain.gain, options.feedback, currentTime);
    setParamValue(graph.primaryLfo.frequency, Math.max(0.01, options.rate), currentTime);
    setParamValue(graph.primaryLfoGain.gain, depthSeconds, currentTime);

    if (graph.secondaryDelay && graph.secondaryFeedbackGain && graph.secondaryLfo && graph.secondaryLfoGain) {
        setParamValue(graph.secondaryDelay.delayTime, delaySeconds, currentTime);
        setParamValue(graph.secondaryFeedbackGain.gain, options.feedback, currentTime);
        setParamValue(
            graph.secondaryLfo.frequency,
            Math.max(0.01, options.stereo === false ? options.rate : options.rate * 1.01),
            currentTime
        );
        setParamValue(graph.secondaryLfoGain.gain, depthSeconds, currentTime);
    }

    updateDryWetGraph(graph, options.mix, options.bypass, currentTime);
}

export interface PhaserGraph {
    input: GainNode;
    output: GainNode;
    dryGain: GainNode;
    wetGain: GainNode;
    feedbackGain: GainNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    stages: BiquadFilterNode[];
    nodes: AudioNode[];
    dispose: () => void;
}

export function createPhaserGraph(context: AudioContext, stageCount: number): PhaserGraph {
    const input = context.createGain();
    const output = context.createGain();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const feedbackGain = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();
    const stages = Array.from({ length: clampPhaserStageCount(stageCount) }, () => {
        const stage = context.createBiquadFilter();
        stage.type = 'allpass';
        stage.Q.value = 0.5;
        return stage;
    });

    input.connect(dryGain);
    dryGain.connect(output);
    input.connect(stages[0]);
    for (let index = 0; index < stages.length - 1; index += 1) {
        stages[index].connect(stages[index + 1]);
    }
    stages[stages.length - 1].connect(wetGain);
    wetGain.connect(output);
    stages[stages.length - 1].connect(feedbackGain);
    feedbackGain.connect(stages[0]);

    lfo.type = 'sine';
    lfo.connect(lfoGain);
    stages.forEach((stage) => lfoGain.connect(stage.frequency));

    const nodes: AudioNode[] = [input, output, dryGain, wetGain, feedbackGain, lfo, lfoGain, ...stages];
    return {
        input,
        output,
        dryGain,
        wetGain,
        feedbackGain,
        lfo,
        lfoGain,
        stages,
        nodes,
        dispose: () => {
            try { lfo.stop(); } catch { /* noop */ }
            nodes.forEach(safeDisconnect);
        },
    };
}

export function updatePhaserGraph(
    graph: PhaserGraph,
    options: {
        rate: number;
        depth: number;
        feedback: number;
        baseFrequency: number;
        mix: number;
        bypass?: boolean;
    },
    currentTime?: number
) {
    const baseFrequency = Math.max(20, options.baseFrequency);
    graph.stages.forEach((stage) => setParamValue(stage.frequency, baseFrequency, currentTime));
    setParamValue(graph.feedbackGain.gain, Math.max(-0.95, Math.min(0.95, options.feedback)), currentTime);
    setParamValue(graph.lfo.frequency, Math.max(0.01, options.rate), currentTime);
    setParamValue(graph.lfoGain.gain, Math.max(0, options.depth) * Math.max(100, baseFrequency), currentTime);
    updateDryWetGraph(graph, options.mix, options.bypass, currentTime);
}

export interface FlangerGraph {
    input: GainNode;
    output: GainNode;
    dryGain: GainNode;
    wetGain: GainNode;
    delay: DelayNode;
    feedbackGain: GainNode;
    lfo: OscillatorNode;
    lfoGain: GainNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createFlangerGraph(context: AudioContext): FlangerGraph {
    const input = context.createGain();
    const output = context.createGain();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const delay = context.createDelay(0.05);
    const feedbackGain = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    input.connect(dryGain);
    dryGain.connect(output);
    input.connect(delay);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(output);

    lfo.type = 'sine';
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);

    const nodes = [input, output, dryGain, wetGain, delay, feedbackGain, lfo, lfoGain];
    return {
        input,
        output,
        dryGain,
        wetGain,
        delay,
        feedbackGain,
        lfo,
        lfoGain,
        nodes,
        dispose: () => {
            try { lfo.stop(); } catch { /* noop */ }
            nodes.forEach(safeDisconnect);
        },
    };
}

export function updateFlangerGraph(
    graph: FlangerGraph,
    options: {
        rate: number;
        depth: number;
        feedback: number;
        delay: number;
        mix: number;
        bypass?: boolean;
    },
    currentTime?: number
) {
    setParamValue(graph.delay.delayTime, Math.max(0, options.delay) / 1000, currentTime);
    setParamValue(graph.feedbackGain.gain, Math.max(-0.95, Math.min(0.95, options.feedback)), currentTime);
    setParamValue(graph.lfo.frequency, Math.max(0.01, options.rate), currentTime);
    setParamValue(graph.lfoGain.gain, Math.max(0, options.depth) / 1000, currentTime);
    updateDryWetGraph(graph, options.mix, options.bypass, currentTime);
}

export interface TremoloGraph {
    input: GainNode;
    output: GainNode;
    dryGain: GainNode;
    wetGain: GainNode;
    ampGain: GainNode;
    lfo: OscillatorNode;
    depthGain: GainNode;
    stereoAmpGain?: GainNode;
    stereoLfo?: OscillatorNode;
    stereoDepthGain?: GainNode;
    splitter?: ChannelSplitterNode;
    merger?: ChannelMergerNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createTremoloGraph(context: AudioContext, stereo = false): TremoloGraph {
    const input = context.createGain();
    const output = context.createGain();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const ampGain = context.createGain();
    const lfo = context.createOscillator();
    const depthGain = context.createGain();
    const nodes: AudioNode[] = [input, output, dryGain, wetGain, ampGain, lfo, depthGain];

    input.connect(dryGain);
    dryGain.connect(output);

    if (stereo) {
        const stereoAmpGain = context.createGain();
        const stereoLfo = context.createOscillator();
        const stereoDepthGain = context.createGain();
        const splitter = context.createChannelSplitter(2);
        const merger = context.createChannelMerger(2);

        nodes.push(stereoAmpGain, stereoLfo, stereoDepthGain, splitter, merger);

        input.connect(splitter);
        splitter.connect(ampGain, 0);
        splitter.connect(stereoAmpGain, 1);
        ampGain.connect(merger, 0, 0);
        stereoAmpGain.connect(merger, 0, 1);
        merger.connect(wetGain);
        wetGain.connect(output);

        lfo.connect(depthGain);
        depthGain.connect(ampGain.gain);

        stereoLfo.connect(stereoDepthGain);
        stereoDepthGain.connect(stereoAmpGain.gain);

        return {
            input,
            output,
            dryGain,
            wetGain,
            ampGain,
            lfo,
            depthGain,
            stereoAmpGain,
            stereoLfo,
            stereoDepthGain,
            splitter,
            merger,
            nodes,
            dispose: () => {
                try { lfo.stop(); } catch { /* noop */ }
                try { stereoLfo.stop(); } catch { /* noop */ }
                nodes.forEach(safeDisconnect);
            },
        };
    }

    input.connect(ampGain);
    ampGain.connect(wetGain);
    wetGain.connect(output);
    lfo.connect(depthGain);
    depthGain.connect(ampGain.gain);

    return {
        input,
        output,
        dryGain,
        wetGain,
        ampGain,
        lfo,
        depthGain,
        nodes,
        dispose: () => {
            try { lfo.stop(); } catch { /* noop */ }
            nodes.forEach(safeDisconnect);
        },
    };
}

export function updateTremoloGraph(
    graph: TremoloGraph,
    options: {
        rate: number;
        depth: number;
        waveform: OscillatorType;
        mix: number;
        bypass?: boolean;
    },
    currentTime?: number
) {
    const depth = Math.max(0, Math.min(1, options.depth));

    setParamValue(graph.lfo.frequency, Math.max(0.01, options.rate), currentTime);
    graph.lfo.type = options.waveform;
    setParamValue(graph.ampGain.gain, 1 - depth * 0.5, currentTime);
    setParamValue(graph.depthGain.gain, depth * 0.5, currentTime);

    if (graph.stereoAmpGain && graph.stereoLfo && graph.stereoDepthGain) {
        graph.stereoLfo.type = options.waveform;
        setParamValue(graph.stereoLfo.frequency, Math.max(0.01, options.rate), currentTime);
        setParamValue(graph.stereoAmpGain.gain, 1 - depth * 0.5, currentTime);
        setParamValue(graph.stereoDepthGain.gain, -Math.abs(depth * 0.5), currentTime);
    }

    updateDryWetGraph(graph, options.mix, options.bypass, currentTime);
}

export interface Eq3Graph {
    input: GainNode;
    output: GainNode;
    dryGain: GainNode;
    wetGain: GainNode;
    lowShelf: BiquadFilterNode;
    midPeak: BiquadFilterNode;
    highShelf: BiquadFilterNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createEq3Graph(context: AudioContext): Eq3Graph {
    const input = context.createGain();
    const output = context.createGain();
    const dryGain = context.createGain();
    const wetGain = context.createGain();
    const lowShelf = context.createBiquadFilter();
    const midPeak = context.createBiquadFilter();
    const highShelf = context.createBiquadFilter();

    lowShelf.type = 'lowshelf';
    midPeak.type = 'peaking';
    midPeak.Q.value = 0.707;
    highShelf.type = 'highshelf';

    input.connect(dryGain);
    dryGain.connect(output);
    input.connect(lowShelf);
    lowShelf.connect(midPeak);
    midPeak.connect(highShelf);
    highShelf.connect(wetGain);
    wetGain.connect(output);

    const nodes = [input, output, dryGain, wetGain, lowShelf, midPeak, highShelf];
    return {
        input,
        output,
        dryGain,
        wetGain,
        lowShelf,
        midPeak,
        highShelf,
        nodes,
        dispose: () => nodes.forEach(safeDisconnect),
    };
}

export function updateEq3Graph(
    graph: Eq3Graph,
    options: {
        low: number;
        mid: number;
        high: number;
        lowFrequency: number;
        highFrequency: number;
        mix: number;
        bypass?: boolean;
    },
    currentTime?: number
) {
    const lowFrequency = Math.max(20, options.lowFrequency);
    const highFrequency = Math.max(lowFrequency + MIN_EQ3_GAP_HZ, options.highFrequency);
    const midFrequency = Math.sqrt(lowFrequency * highFrequency);

    setParamValue(graph.lowShelf.gain, options.low, currentTime);
    setParamValue(graph.midPeak.gain, options.mid, currentTime);
    setParamValue(graph.highShelf.gain, options.high, currentTime);
    setParamValue(graph.lowShelf.frequency, lowFrequency, currentTime);
    setParamValue(graph.midPeak.frequency, midFrequency, currentTime);
    setParamValue(graph.highShelf.frequency, highFrequency, currentTime);
    updateDryWetGraph(graph, options.mix, options.bypass, currentTime);
}

export interface CompressorGraph {
    input: GainNode;
    output: GainNode;
    duckGain: GainNode;
    compressor: DynamicsCompressorNode;
    sidechainAnalyser: AnalyserNode;
    nodes: AudioNode[];
    dispose: () => void;
}

export function createCompressorGraph(context: AudioContext): CompressorGraph {
    const input = context.createGain();
    const output = context.createGain();
    const duckGain = context.createGain();
    const compressor = context.createDynamicsCompressor();
    const sidechainAnalyser = context.createAnalyser();

    sidechainAnalyser.fftSize = 256;
    sidechainAnalyser.smoothingTimeConstant = 0.85;
    duckGain.gain.value = 1;

    input.connect(duckGain);
    duckGain.connect(compressor);
    compressor.connect(output);

    const nodes = [input, output, duckGain, compressor, sidechainAnalyser];
    return {
        input,
        output,
        duckGain,
        compressor,
        sidechainAnalyser,
        nodes,
        dispose: () => nodes.forEach(safeDisconnect),
    };
}

export function updateCompressorGraph(
    graph: CompressorGraph,
    options: {
        threshold: number;
        knee: number;
        ratio: number;
        attack: number;
        release: number;
    },
    currentTime?: number
) {
    setParamValue(graph.compressor.threshold, options.threshold, currentTime);
    setParamValue(graph.compressor.knee, options.knee, currentTime);
    setParamValue(graph.compressor.ratio, options.ratio, currentTime);
    setParamValue(graph.compressor.attack, options.attack, currentTime);
    setParamValue(graph.compressor.release, options.release, currentTime);
}

export function updateDryWetGraph(
    graph: Pick<ReverbGraph | DistortionGraph | ChorusGraph | PhaserGraph | FlangerGraph | TremoloGraph | Eq3Graph, 'dryGain' | 'wetGain'>,
    mix: number,
    bypass = false,
    currentTime?: number
) {
    setParamValue(graph.dryGain.gain, bypass ? 1 : 1 - mix, currentTime);
    setParamValue(graph.wetGain.gain, bypass ? 0 : mix, currentTime);
}
