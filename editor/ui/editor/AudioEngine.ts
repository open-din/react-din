import type { Node, Edge } from '@xyflow/react';
import type {
    AudioNodeData,
    ADSRNodeData,
    MidiCCNodeData,
    MidiCCOutputNodeData,
    MidiNoteNodeData,
    MidiNoteOutputNodeData,
    MidiSyncNodeData,
    PianoRollNodeData,
    OscNodeData,
    GainNodeData,
    FilterNodeData,
    OutputNodeData,
    NoiseNodeData,
    DelayNodeData,
    ReverbNodeData,
    CompressorNodeData,
    PhaserNodeData,
    FlangerNodeData,
    TremoloNodeData,
    EQ3NodeData,
    DistortionNodeData,
    ChorusNodeData,
    NoiseBurstNodeData,
    WaveShaperNodeData,
    ConvolverNodeData,
    AnalyzerNodeData,
    Panner3DNodeData,
    ConstantSourceNodeData,
    MediaStreamNodeData,
    EventTriggerNodeData,
    StereoPannerNodeData,
    MixerNodeData,
    AuxSendNodeData,
    AuxReturnNodeData,
    MatrixMixerNodeData,
    InputNodeData,
    UiTokensNodeData,
    NoteNodeData,
    StepSequencerNodeData,
    TransportNodeData,
    VoiceNodeData,
    SamplerNodeData,
    MathNodeData,
    CompareNodeData,
    MixNodeData,
    ClampNodeData,
    SwitchNodeData,
} from './store';
import { math, compare, mix, clamp, switchValue } from '../../../src/data/values';
import { editorMidiRuntime } from './midiRuntime';
import {
    getInputParamHandleId,
    getTransportConnections,
    isAudioConnection,
    isDataNodeType,
    resolveInputParamByHandle,
} from './nodeHelpers';

interface AudioNodeInstance {
    node: AudioNode;
    type: AudioNodeData['type'];
    inputNode?: AudioNode;
    internalNodes?: AudioNode[];
    feedbackGain?: GainNode;
    reverbConvolver?: ConvolverNode;
    reverbDryGain?: GainNode;
    reverbWetGain?: GainNode;
    distortionWaveShaper?: WaveShaperNode;
    distortionDriveGain?: GainNode;
    distortionToneFilter?: BiquadFilterNode;
    distortionDryGain?: GainNode;
    distortionWetGain?: GainNode;
    distortionOutputGain?: GainNode;
    chorusDelay?: DelayNode;
    chorusFeedbackGain?: GainNode;
    chorusDryGain?: GainNode;
    chorusWetGain?: GainNode;
    chorusLfoGain?: GainNode;
    phaserDryGain?: GainNode;
    phaserWetGain?: GainNode;
    phaserFeedbackGain?: GainNode;
    phaserLfoGain?: GainNode;
    phaserStages?: BiquadFilterNode[];
    flangerDelay?: DelayNode;
    flangerFeedbackGain?: GainNode;
    flangerDryGain?: GainNode;
    flangerWetGain?: GainNode;
    flangerLfoGain?: GainNode;
    tremoloDryGain?: GainNode;
    tremoloWetGain?: GainNode;
    tremoloAmpGain?: GainNode;
    tremoloDepthGain?: GainNode;
    tremoloDepthGainR?: GainNode;
    eq3DryGain?: GainNode;
    eq3WetGain?: GainNode;
    eq3LowShelf?: BiquadFilterNode;
    eq3MidPeak?: BiquadFilterNode;
    eq3HighShelf?: BiquadFilterNode;
    auxSendGain?: GainNode;
    auxBusId?: string;
    auxReturnGain?: GainNode;
    matrixInputs?: number;
    matrixOutputs?: number;
    matrixInputMerger?: ChannelMergerNode;
    matrixSplitter?: ChannelSplitterNode;
    matrixOutputMerger?: ChannelMergerNode;
    matrixOutputSplitter?: ChannelSplitterNode;
    matrixCells?: GainNode[][];
    matrixChannelOutputs?: GainNode[];
    compressorNode?: DynamicsCompressorNode;
    compressorDuckGain?: GainNode;
    sidechainAnalyser?: AnalyserNode;
    sidechainIntervalId?: number;
    sidechainConnectionCount?: number;
    sidechainSourceNodes?: Set<AudioNode>;
    convolverNode?: ConvolverNode;
    mediaStreamSource?: MediaStreamAudioSourceNode;
    mediaStream?: MediaStream;
    // Map handle ID (e.g., 'frequency') to AudioParam
    params?: Map<string, AudioParam>;
    // Map output handle ID to AudioNode (for InputNode multiple outputs)
    outputs?: Map<string, AudioNode>;
    // Custom data
    sequencerData?: Pick<StepSequencerNodeData, 'steps' | 'pattern' | 'activeSteps'>;
    pianoRollData?: Pick<PianoRollNodeData, 'steps' | 'octaves' | 'baseNote' | 'notes'>;
    adsrData?: Pick<ADSRNodeData, 'attack' | 'decay' | 'sustain' | 'release'>;
    voiceData?: Pick<VoiceNodeData, 'portamento'>;
    samplerData?: {
        src: string;
        loop: boolean;
        playbackRate: number;
        detune: number;
        buffer: AudioBuffer | null;
    };
    noiseBurstData?: {
        noiseType: 'white' | 'pink' | 'brown';
        duration: number;
        gain: number;
        attack: number;
        release: number;
    };
    eventTriggerData?: {
        token: number;
        mode: 'change' | 'rising';
        cooldownMs: number;
        velocity: number;
        duration: number;
        note: number;
        trackId: string;
        lastEmitAtMs: number;
    };
    lfoOsc?: OscillatorNode; // For LFO waveform updates
    lastTriggerValue?: number;
    midiNoteOutputState?: {
        active: boolean;
        note: number | null;
        outputId: string | null;
        channel: number;
        velocity: number;
    };
    midiCCOutputState?: {
        signature: string;
    };
    lastMidiEventSeq?: number;
}

/**
 * Creates a noise buffer for white/pink/brown noise
 */
function createNoiseBuffer(
    ctx: AudioContext,
    type: 'white' | 'pink' | 'brown',
    sampleCount?: number
): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleCount ?? (sampleRate * 2); // 2 seconds default
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
        for (let i = 0; i < length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } else if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    } else { // brown
        let lastOut = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }
    }

    return buffer;
}

/**
 * Creates a simple impulse response for reverb
 */
function createReverbImpulse(ctx: AudioContext, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * decay;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
        }
    }

    return buffer;
}

function createWaveShaperCurve(amount: number, preset: 'softClip' | 'hardClip' | 'saturate'): Float32Array {
    const samples = 512;
    const curve = new Float32Array(samples);
    const k = Math.max(0, amount) * 100;

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;

        if (preset === 'hardClip') {
            curve[i] = Math.max(-1, Math.min(1, x * (1 + k / 8)));
        } else if (preset === 'saturate') {
            const amt = 1 + k / 20;
            curve[i] = ((3 + amt) * x * 20) / (Math.PI + (amt * Math.abs(x * 20)));
        } else {
            curve[i] = Math.tanh(x * (1 + k / 12));
        }
    }

    return curve;
}

const MIN_EQ3_GAP_HZ = 50;

function clampMatrixSize(value: number | undefined, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(2, Math.min(8, Math.floor(Number(value))));
}

function clampPhaserStages(value: number | undefined): number {
    if (!Number.isFinite(value)) return 4;
    return Math.max(2, Math.min(8, Math.floor(Number(value))));
}

function getSafeMatrixCellValue(matrix: number[][] | undefined, row: number, column: number): number {
    const value = matrix?.[row]?.[column];
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.min(1, value));
    }
    return row === column ? 1 : 0;
}

/**
 * Audio Engine - Manages the actual Web Audio API graph
 */
export class AudioEngine {
    private audioContext: AudioContext | null = null;
    private audioNodes: Map<string, AudioNodeInstance> = new Map();
    private visualNodes: Node<AudioNodeData>[] = [];
    private nodeById: Map<string, Node<AudioNodeData>> = new Map();
    private isPlaying = false;
    private edges: Edge[] = [];
    private sampleBufferCache: Map<string, AudioBuffer> = new Map();
    private busNodes: Map<string, GainNode> = new Map();
    private liveControlInputValues: Map<string, number> = new Map();
    private controlValueTimerID: number | undefined = undefined;
    private midiRuntimeUnsubscribe: (() => void) | null = null;

    constructor() {
        this.audioContext = null;
        this.midiRuntimeUnsubscribe = editorMidiRuntime.subscribe(() => {
            this.handleMidiRuntimeChange();
        });
    }

    private syncVisualGraph(nodes: Node<AudioNodeData>[], edges: Edge[]) {
        this.visualNodes = nodes;
        this.nodeById = new Map(nodes.map((node) => [node.id, node]));
        this.edges = edges;
    }

    private getControlInputKey(nodeId: string, targetHandle: string): string {
        return `${nodeId}:${targetHandle}`;
    }

    public getControlInputValue(nodeId: string, targetHandle: string): number | null {
        return this.liveControlInputValues.get(this.getControlInputKey(nodeId, targetHandle)) ?? null;
    }

    public getSourceOutputValue(nodeId: string, sourceHandle: string): number | null {
        const instance = this.audioNodes.get(nodeId);
        if (!instance?.outputs) return null;
        const output = instance.outputs.get(sourceHandle);
        if (output instanceof ConstantSourceNode) {
            return output.offset.value;
        }
        return null;
    }

    private startControlValueLoop() {
        if (this.controlValueTimerID !== undefined || typeof window === 'undefined') return;

        const tick = () => {
            if (!this.isPlaying || !this.audioContext) {
                this.stopControlValueLoop();
                return;
            }

            this.updateDataValues(this.visualNodes, this.edges);
            this.controlValueTimerID = window.setTimeout(tick, 50);
        };

        tick();
    }

    private stopControlValueLoop() {
        if (this.controlValueTimerID === undefined) return;
        window.clearTimeout(this.controlValueTimerID);
        this.controlValueTimerID = undefined;
    }

    private getTransportData(): TransportNodeData | null {
        const transportNode = this.visualNodes.find((node) => node.data.type === 'transport');
        return transportNode ? transportNode.data as TransportNodeData : null;
    }

    private isTransportRunning(): boolean {
        const transport = this.getTransportData();
        return transport ? transport.playing : false;
    }

    private sanitizePositiveNumber(value: number | undefined, fallback: number): number {
        return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
    }

    private sanitizeBpm(value: number | undefined): number {
        return this.sanitizePositiveNumber(value, 120);
    }

    private matchesMidiInputSelection(
        inputId: string,
        selection: string | 'default' | 'all',
        snapshot: ReturnType<typeof editorMidiRuntime.getSnapshot>
    ): boolean {
        if (selection === 'all') return true;
        const defaultInputId = snapshot.defaultInputId ?? snapshot.inputs[0]?.id ?? null;
        if (selection === 'default') {
            return inputId === defaultInputId;
        }
        return inputId === selection;
    }

    private matchesMidiChannel(channel: number, filter: number | 'all'): boolean {
        return filter === 'all' || channel === filter;
    }

    private matchesMidiNote(
        note: number,
        data: MidiNoteNodeData
    ): boolean {
        if (data.noteMode === 'single') return note === data.note;
        if (data.noteMode === 'range') return note >= data.noteMin && note <= data.noteMax;
        return true;
    }

    private getMidiNoteDuration(): number {
        return 0.25;
    }

    private frequencyToMidiNote(frequency: number): number {
        if (!Number.isFinite(frequency) || frequency <= 0) return 60;
        return Math.max(0, Math.min(127, Math.round(69 + (12 * Math.log2(frequency / 440)))));
    }

    private handleMidiRuntimeChange(): void {
        if (!this.isPlaying || !this.audioContext) return;

        const snapshot = editorMidiRuntime.getSnapshot();
        const now = this.audioContext.currentTime;

        this.visualNodes.forEach((node) => {
            const instance = this.audioNodes.get(node.id);
            if (!instance?.outputs) return;

            if (node.data.type === 'midiNote') {
                const midiData = node.data as MidiNoteNodeData;
                const matchingNotes = Array.from(snapshot.activeNotes.values())
                    .filter((activeNote) => this.matchesMidiInputSelection(activeNote.inputId, midiData.inputId, snapshot)
                        && this.matchesMidiChannel(activeNote.channel, midiData.channel)
                        && this.matchesMidiNote(activeNote.note, midiData))
                    .sort((left, right) => left.lastUpdatedAt - right.lastUpdatedAt);
                const current = matchingNotes.length > 0 ? matchingNotes[matchingNotes.length - 1] : null;

                const noteOutput = instance.outputs.get('note');
                if (noteOutput instanceof ConstantSourceNode) {
                    noteOutput.offset.setTargetAtTime(current?.note ?? 0, now, 0.01);
                }

                const frequencyOutput = instance.outputs.get('frequency');
                if (frequencyOutput instanceof ConstantSourceNode) {
                    const frequency = current
                        ? 440 * Math.pow(2, (current.note - 69) / 12)
                        : 0;
                    frequencyOutput.offset.setTargetAtTime(frequency, now, 0.01);
                }

                const gateOutput = instance.outputs.get('gate');
                if (gateOutput instanceof ConstantSourceNode) {
                    gateOutput.offset.setTargetAtTime(current ? 1 : 0, now, 0.01);
                }

                const velocityOutput = instance.outputs.get('velocity');
                if (velocityOutput instanceof ConstantSourceNode) {
                    velocityOutput.offset.setTargetAtTime(current?.velocity ?? 0, now, 0.01);
                }

                const event = snapshot.lastInputEvent;
                if (event && event.seq !== instance.lastMidiEventSeq) {
                    instance.lastMidiEventSeq = event.seq;
                    if (
                        event.kind === 'noteon'
                        && event.note !== null
                        && event.velocity !== null
                        && event.channel !== null
                        && this.matchesMidiInputSelection(event.inputId, midiData.inputId, snapshot)
                        && this.matchesMidiChannel(event.channel, midiData.channel)
                        && this.matchesMidiNote(event.note, midiData)
                    ) {
                        const triggerOutput = instance.outputs.get('trigger');
                        if (triggerOutput instanceof ConstantSourceNode) {
                            triggerOutput.offset.cancelScheduledValues(now);
                            triggerOutput.offset.setValueAtTime(event.seq, now);
                            triggerOutput.offset.setValueAtTime(0, now + 0.02);
                        }

                        this.triggerSequencerTargets(
                            node.id,
                            now,
                            event.velocity,
                            this.getMidiNoteDuration(),
                            event.note
                        );
                    }
                }
            }

            if (node.data.type === 'midiCC') {
                const midiData = node.data as MidiCCNodeData;
                const matchingCC = Array.from(snapshot.ccValues.values())
                    .filter((ccValue) => this.matchesMidiInputSelection(ccValue.inputId, midiData.inputId, snapshot)
                        && this.matchesMidiChannel(ccValue.channel, midiData.channel)
                        && ccValue.cc === midiData.cc)
                    .sort((left, right) => left.lastUpdatedAt - right.lastUpdatedAt);
                const current = matchingCC.length > 0 ? matchingCC[matchingCC.length - 1] : null;

                const normalizedOutput = instance.outputs.get('normalized');
                if (normalizedOutput instanceof ConstantSourceNode) {
                    normalizedOutput.offset.setTargetAtTime(current?.normalized ?? 0, now, 0.01);
                }

                const rawOutput = instance.outputs.get('raw');
                if (rawOutput instanceof ConstantSourceNode) {
                    rawOutput.offset.setTargetAtTime(current?.raw ?? 0, now, 0.01);
                }
            }
        });

        const syncNode = this.visualNodes.find((node) => node.data.type === 'midiSync');
        const transportNode = this.visualNodes.find((node) => node.data.type === 'transport');
        if (!syncNode || !transportNode) return;

        const syncData = syncNode.data as MidiSyncNodeData;
        if (syncData.mode !== 'midi-master' || !snapshot.clock.running) return;
        if (!snapshot.clock.sourceInputId || !this.matchesMidiInputSelection(snapshot.clock.sourceInputId, syncData.inputId ?? 'default', snapshot)) {
            return;
        }

        if (snapshot.clock.bpmEstimate) {
            this.updateNode(transportNode.id, { bpm: snapshot.clock.bpmEstimate } as Partial<AudioNodeData>);
        }
    }

    private getOrCreateBusNode(busId: string | undefined): GainNode | null {
        if (!this.audioContext) return null;
        const key = (busId || 'aux').trim() || 'aux';
        const existing = this.busNodes.get(key);
        if (existing) return existing;
        const bus = this.audioContext.createGain();
        bus.gain.value = 1;
        this.busNodes.set(key, bus);
        return bus;
    }

    private clearCompressorSidechain(instance: AudioNodeInstance) {
        if (instance.sidechainIntervalId !== undefined && typeof window !== 'undefined') {
            window.clearInterval(instance.sidechainIntervalId);
        }
        instance.sidechainIntervalId = undefined;
        instance.sidechainConnectionCount = 0;
        instance.sidechainSourceNodes?.clear();
        if (instance.compressorDuckGain && this.audioContext) {
            instance.compressorDuckGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.02);
        }
    }

    private startCompressorSidechain(instance: AudioNodeInstance, data: CompressorNodeData) {
        if (!this.audioContext || !instance.sidechainAnalyser || !instance.compressorDuckGain) return;
        if ((instance.sidechainConnectionCount ?? 0) <= 0) {
            this.clearCompressorSidechain(instance);
            return;
        }
        if (instance.sidechainIntervalId !== undefined || typeof window === 'undefined') return;

        const analyser = instance.sidechainAnalyser;
        const duckGain = instance.compressorDuckGain;
        const waveform = new Float32Array(analyser.fftSize);

        const threshold = typeof data.threshold === 'number' ? data.threshold : -24;
        const sidechainStrength = Math.max(0, Math.min(1, data.sidechainStrength ?? 0.7));
        const attack = Math.max(0.005, data.attack ?? 0.003);

        instance.sidechainIntervalId = window.setInterval(() => {
            if (!this.audioContext) return;
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
            const ducking = normalized * sidechainStrength;
            const targetGain = Math.max(0.05, 1 - ducking);
            duckGain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, attack);
        }, 20);
    }

    private resyncSchedulerClock(resetStep = false): void {
        if (!this.audioContext) return;
        if (resetStep) {
            this.currentStep = 0;
        }
        this.nextNoteTime = this.audioContext.currentTime;
    }

    private getStepDuration(): number {
        const transport = this.getTransportData();
        const beatUnit = this.sanitizePositiveNumber(transport?.beatUnit, 4);
        const stepsPerBeat = this.sanitizePositiveNumber(transport?.stepsPerBeat, 4);
        const bpm = this.sanitizeBpm(this.bpm);
        const secondsPerBeat = (60 / bpm) * (4 / beatUnit);
        const stepDuration = secondsPerBeat / stepsPerBeat;
        return Number.isFinite(stepDuration) && stepDuration > 0 ? stepDuration : (60 / 120) / 4;
    }

    private getSwingOffset(stepIndex: number): number {
        const swing = Math.max(0, Math.min(1, this.getTransportData()?.swing ?? 0));
        return stepIndex % 2 === 1 ? this.getStepDuration() * swing * 0.5 : 0;
    }

    private getTransportConnectedIds(): Set<string> {
        return getTransportConnections(this.edges, this.nodeById);
    }

    private getSequencerLoopLength(): number {
        const connectedIds = this.getTransportConnectedIds();
        let maxSteps = 0;

        connectedIds.forEach((id) => {
            const node = this.nodeById.get(id);
            if (!node) return;
            if (node.data.type === 'stepSequencer') {
                maxSteps = Math.max(maxSteps, Math.max(1, node.data.steps || 16));
            }
            if (node.data.type === 'pianoRoll') {
                maxSteps = Math.max(maxSteps, Math.max(1, node.data.steps || 16));
            }
        });

        return Math.max(maxSteps, 16);
    }

    private getInputNode(instance: AudioNodeInstance): AudioNode {
        return instance.inputNode ?? instance.node;
    }

    private startInstance(instance: AudioNodeInstance) {
        if (instance.node instanceof OscillatorNode) {
            instance.node.start();
        } else if (instance.node instanceof AudioBufferSourceNode) {
            instance.node.loop = true;
            instance.node.start();
        } else if (instance.node instanceof ConstantSourceNode) {
            instance.node.start();
        }

        if (instance.lfoOsc) {
            instance.lfoOsc.start();
        }

        if (instance.outputs) {
            instance.outputs.forEach((output) => {
                if (output instanceof ConstantSourceNode || output instanceof OscillatorNode) {
                    output.start();
                }
            });
        }
    }

    private disconnectInstance(instance: AudioNodeInstance) {
        if (instance.type === 'compressor') {
            this.clearCompressorSidechain(instance);
        }
        if (instance.type === 'auxReturn' && instance.auxReturnGain) {
            const bus = this.getOrCreateBusNode(instance.auxBusId);
            if (bus) {
                try { bus.disconnect(instance.auxReturnGain); } catch { /* noop */ }
            }
        }
        try {
            instance.node.disconnect();
        } catch {
            // Ignore disconnect errors during graph rewiring.
        }

        instance.internalNodes?.forEach((node) => {
            try {
                node.disconnect();
            } catch {
                // Ignore disconnect errors during graph rewiring.
            }
        });
    }

    private restoreInternalConnections(instance: AudioNodeInstance) {
        if (instance.type === 'delay' && instance.feedbackGain) {
            instance.node.connect(instance.feedbackGain);
            instance.feedbackGain.connect(instance.node);
        }

        if (
            instance.type === 'reverb'
            && instance.inputNode
            && instance.reverbConvolver
            && instance.reverbDryGain
            && instance.reverbWetGain
        ) {
            instance.inputNode.connect(instance.reverbDryGain);
            instance.inputNode.connect(instance.reverbConvolver);
            instance.reverbConvolver.connect(instance.reverbWetGain);
            instance.reverbDryGain.connect(instance.node);
            instance.reverbWetGain.connect(instance.node);
        }

        if (
            instance.type === 'distortion'
            && instance.inputNode
            && instance.distortionDriveGain
            && instance.distortionWaveShaper
            && instance.distortionToneFilter
            && instance.distortionOutputGain
            && instance.distortionDryGain
            && instance.distortionWetGain
        ) {
            instance.inputNode.connect(instance.distortionDryGain);
            instance.distortionDryGain.connect(instance.node);
            instance.inputNode.connect(instance.distortionDriveGain);
            instance.distortionDriveGain.connect(instance.distortionWaveShaper);
            instance.distortionWaveShaper.connect(instance.distortionToneFilter);
            instance.distortionToneFilter.connect(instance.distortionOutputGain);
            instance.distortionOutputGain.connect(instance.distortionWetGain);
            instance.distortionWetGain.connect(instance.node);
        }

        if (
            instance.type === 'chorus'
            && instance.inputNode
            && instance.chorusDelay
            && instance.chorusFeedbackGain
            && instance.chorusDryGain
            && instance.chorusWetGain
        ) {
            instance.inputNode.connect(instance.chorusDryGain);
            instance.chorusDryGain.connect(instance.node);
            instance.inputNode.connect(instance.chorusDelay);
            instance.chorusDelay.connect(instance.chorusFeedbackGain);
            instance.chorusFeedbackGain.connect(instance.chorusDelay);
            instance.chorusDelay.connect(instance.chorusWetGain);
            instance.chorusWetGain.connect(instance.node);
            if (instance.lfoOsc && instance.chorusLfoGain) {
                instance.lfoOsc.connect(instance.chorusLfoGain);
                instance.chorusLfoGain.connect(instance.chorusDelay.delayTime);
            }
        }

        if (
            instance.type === 'compressor'
            && instance.inputNode
            && instance.compressorDuckGain
            && instance.compressorNode
        ) {
            instance.inputNode.connect(instance.compressorDuckGain);
            instance.compressorDuckGain.connect(instance.compressorNode);
            instance.compressorNode.connect(instance.node);
        }

        if (
            instance.type === 'phaser'
            && instance.inputNode
            && instance.phaserDryGain
            && instance.phaserWetGain
            && instance.phaserFeedbackGain
            && instance.phaserStages
            && instance.phaserStages.length > 0
        ) {
            const firstStage = instance.phaserStages[0];
            const lastStage = instance.phaserStages[instance.phaserStages.length - 1];
            instance.inputNode.connect(instance.phaserDryGain);
            instance.phaserDryGain.connect(instance.node);
            instance.inputNode.connect(firstStage);
            for (let i = 0; i < instance.phaserStages.length - 1; i++) {
                instance.phaserStages[i].connect(instance.phaserStages[i + 1]);
            }
            lastStage.connect(instance.phaserWetGain);
            instance.phaserWetGain.connect(instance.node);
            lastStage.connect(instance.phaserFeedbackGain);
            instance.phaserFeedbackGain.connect(firstStage);
            if (instance.lfoOsc && instance.phaserLfoGain) {
                instance.lfoOsc.connect(instance.phaserLfoGain);
                instance.phaserStages.forEach((stage) => instance.phaserLfoGain?.connect(stage.frequency));
            }
        }

        if (
            instance.type === 'flanger'
            && instance.inputNode
            && instance.flangerDelay
            && instance.flangerFeedbackGain
            && instance.flangerDryGain
            && instance.flangerWetGain
        ) {
            instance.inputNode.connect(instance.flangerDryGain);
            instance.flangerDryGain.connect(instance.node);
            instance.inputNode.connect(instance.flangerDelay);
            instance.flangerDelay.connect(instance.flangerFeedbackGain);
            instance.flangerFeedbackGain.connect(instance.flangerDelay);
            instance.flangerDelay.connect(instance.flangerWetGain);
            instance.flangerWetGain.connect(instance.node);
            if (instance.lfoOsc && instance.flangerLfoGain) {
                instance.lfoOsc.connect(instance.flangerLfoGain);
                instance.flangerLfoGain.connect(instance.flangerDelay.delayTime);
            }
        }

        if (
            instance.type === 'tremolo'
            && instance.inputNode
            && instance.tremoloDryGain
            && instance.tremoloWetGain
            && instance.tremoloAmpGain
        ) {
            instance.inputNode.connect(instance.tremoloDryGain);
            instance.tremoloDryGain.connect(instance.node);
            instance.inputNode.connect(instance.tremoloAmpGain);
            instance.tremoloAmpGain.connect(instance.tremoloWetGain);
            instance.tremoloWetGain.connect(instance.node);
            if (instance.lfoOsc && instance.tremoloDepthGain) {
                instance.lfoOsc.connect(instance.tremoloDepthGain);
                instance.tremoloDepthGain.connect(instance.tremoloAmpGain.gain);
            }
        }

        if (
            instance.type === 'eq3'
            && instance.inputNode
            && instance.eq3DryGain
            && instance.eq3WetGain
            && instance.eq3LowShelf
            && instance.eq3MidPeak
            && instance.eq3HighShelf
        ) {
            instance.inputNode.connect(instance.eq3DryGain);
            instance.eq3DryGain.connect(instance.node);
            instance.inputNode.connect(instance.eq3LowShelf);
            instance.eq3LowShelf.connect(instance.eq3MidPeak);
            instance.eq3MidPeak.connect(instance.eq3HighShelf);
            instance.eq3HighShelf.connect(instance.eq3WetGain);
            instance.eq3WetGain.connect(instance.node);
        }

        if (instance.type === 'auxSend' && instance.inputNode && instance.auxSendGain) {
            instance.inputNode.connect(instance.node);
            instance.inputNode.connect(instance.auxSendGain);
            const bus = this.getOrCreateBusNode(instance.auxBusId);
            if (bus) {
                instance.auxSendGain.connect(bus);
            }
        }

        if (instance.type === 'auxReturn' && instance.auxReturnGain) {
            const bus = this.getOrCreateBusNode(instance.auxBusId);
            if (bus) {
                bus.connect(instance.auxReturnGain);
            }
        }

        if (
            instance.type === 'matrixMixer'
            && instance.matrixInputMerger
            && instance.matrixSplitter
            && instance.matrixOutputMerger
            && instance.matrixCells
        ) {
            instance.matrixInputMerger.connect(instance.matrixSplitter);
            instance.matrixCells.forEach((row, rowIndex) => {
                row.forEach((cellGain, columnIndex) => {
                    instance.matrixSplitter?.connect(cellGain, rowIndex, 0);
                    cellGain.connect(instance.matrixOutputMerger!, 0, columnIndex);
                });
            });
            instance.matrixOutputMerger.connect(instance.node);
            if (instance.matrixOutputSplitter && instance.matrixChannelOutputs) {
                instance.matrixOutputMerger.connect(instance.matrixOutputSplitter);
                instance.matrixChannelOutputs.forEach((channelGain, index) => {
                    instance.matrixOutputSplitter?.connect(channelGain, index, 0);
                });
            }
        }
    }

    private connectGraph(nodes: Node<AudioNodeData>[], edges: Edge[]) {
        const nodeById = new Map(nodes.map((node) => [node.id, node]));

        this.audioNodes.forEach((instance) => {
            this.disconnectInstance(instance);
        });

        this.audioNodes.forEach((instance) => {
            this.restoreInternalConnections(instance);
        });

        this.audioNodes.forEach((instance) => {
            if (instance.type !== 'compressor') return;
            if (instance.sidechainSourceNodes && instance.sidechainAnalyser) {
                instance.sidechainSourceNodes.forEach((sourceNode) => {
                    try { sourceNode.disconnect(instance.sidechainAnalyser!); } catch { /* noop */ }
                });
            }
            this.clearCompressorSidechain(instance);
        });

        edges.forEach((edge) => {
            const sourceInstance = this.audioNodes.get(edge.source);
            const targetInstance = this.audioNodes.get(edge.target);

            if (!sourceInstance || !targetInstance) return;

            try {
                let sourceNode: AudioNode = sourceInstance.node;
                if (edge.sourceHandle && sourceInstance.outputs) {
                    const specificOutput = sourceInstance.outputs.get(edge.sourceHandle);
                    if (specificOutput) {
                        sourceNode = specificOutput;
                    }
                }

                if (
                    targetInstance.type === 'compressor'
                    && edge.targetHandle === 'sidechainIn'
                    && targetInstance.sidechainAnalyser
                ) {
                    sourceNode.connect(targetInstance.sidechainAnalyser);
                    targetInstance.sidechainConnectionCount = (targetInstance.sidechainConnectionCount ?? 0) + 1;
                    if (!targetInstance.sidechainSourceNodes) {
                        targetInstance.sidechainSourceNodes = new Set();
                    }
                    targetInstance.sidechainSourceNodes.add(sourceNode);
                    return;
                }

                if (
                    targetInstance.type === 'matrixMixer'
                    && edge.targetHandle
                    && /^in\d+$/.test(edge.targetHandle)
                ) {
                    const channelIndex = Math.max(0, Number(edge.targetHandle.slice(2)) - 1);
                    sourceNode.connect(this.getInputNode(targetInstance), 0, channelIndex);
                    return;
                }

                if (targetInstance.params && edge.targetHandle && targetInstance.params.has(edge.targetHandle)) {
                    const param = targetInstance.params.get(edge.targetHandle);
                    if (param) {
                        sourceNode.connect(param);
                        if ((sourceInstance.type === 'note' || sourceInstance.type === 'voice') && edge.targetHandle === 'frequency') {
                            param.value = 0;
                        }
                    }
                } else if (isAudioConnection(edge, nodeById)) {
                    sourceNode.connect(this.getInputNode(targetInstance));
                }
            } catch (error) {
                console.warn('Failed to connect nodes:', error);
            }
        });

        nodes.forEach((node) => {
            const instance = this.audioNodes.get(node.id);
            if (!instance || instance.type !== 'compressor') return;
            this.startCompressorSidechain(instance, node.data as CompressorNodeData);
        });

        const outputNode = nodes.find((node) => node.data.type === 'output');
        if (outputNode) {
            const outputInstance = this.audioNodes.get(outputNode.id);
            if (outputInstance && this.audioContext) {
                outputInstance.node.connect(this.audioContext.destination);
            }
        }
    }

    private triggerSampler(nodeId: string, time: number, duration: number) {
        const instance = this.audioNodes.get(nodeId);
        if (!instance?.samplerData) return;

        this.playSampler(nodeId, instance.samplerData);

        if (instance.samplerData.loop) {
            const delay = Math.max(0, time + duration - (this.audioContext?.currentTime ?? 0)) * 1000;
            window.setTimeout(() => {
                this.stopSampler(nodeId);
            }, delay);
        }
    }

    private triggerNoiseBurst(nodeId: string, time: number, velocity: number): void {
        const instance = this.audioNodes.get(nodeId);
        if (!instance?.noiseBurstData || !this.audioContext) return;

        const { noiseType, duration, gain, attack, release } = instance.noiseBurstData;
        const totalDuration = Math.max(0.005, attack + duration + release);
        const sampleCount = Math.max(1, Math.ceil(this.audioContext.sampleRate * totalDuration));
        const buffer = createNoiseBuffer(this.audioContext, noiseType, sampleCount);

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const envelope = this.audioContext.createGain();
        const startTime = Math.max(time, this.audioContext.currentTime);
        const targetGain = Math.max(0, Math.min(1, gain * velocity));

        envelope.gain.setValueAtTime(0, startTime);
        envelope.gain.linearRampToValueAtTime(targetGain, startTime + attack);
        envelope.gain.setValueAtTime(targetGain, startTime + attack + duration);
        envelope.gain.linearRampToValueAtTime(0, startTime + totalDuration);

        source.connect(envelope);
        envelope.connect(instance.node);

        source.start(startTime);
        source.stop(startTime + totalDuration + 0.01);
        source.onended = () => {
            try { source.disconnect(); } catch { /* noop */ }
            try { envelope.disconnect(); } catch { /* noop */ }
        };
    }

    private triggerMidiNoteOutput(
        nodeId: string,
        time: number,
        velocity: number,
        duration: number,
        midiPitch?: number
    ) {
        const visualData = this.nodeById.get(nodeId)?.data as MidiNoteOutputNodeData | undefined;
        if (!visualData) return;

        const frequencyInput = this.getControlInputValue(nodeId, 'frequency');
        const noteInput = this.getControlInputValue(nodeId, 'note');
        const velocityInput = this.getControlInputValue(nodeId, 'velocity');
        const note = typeof midiPitch === 'number'
            ? midiPitch
            : typeof noteInput === 'number'
                ? Math.round(noteInput)
                : typeof frequencyInput === 'number'
                    ? this.frequencyToMidiNote(frequencyInput)
                    : Math.round(visualData.note);
        const nextVelocity = Math.max(
            0,
            Math.min(1, typeof velocityInput === 'number' ? velocityInput : velocity)
        );
        const outputId = visualData.outputId ?? null;
        const channel = visualData.channel;

        editorMidiRuntime.sendNoteOn({
            outputId,
            channel,
            note,
            velocity: nextVelocity,
        });

        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                editorMidiRuntime.sendNoteOff({
                    outputId,
                    channel,
                    note,
                    velocity: 0,
                });
            }, Math.max(0.02, duration) * 1000);
        }
    }

    private triggerSequencerTargets(sourceId: string, time: number, velocity: number, duration: number, midiPitch?: number) {
        const connectedEdges = this.edges.filter((edge) => edge.source === sourceId);

        connectedEdges.forEach((edge) => {
            const targetInstance = this.audioNodes.get(edge.target);
            if (!targetInstance) return;

            if (targetInstance.type === 'adsr' && edge.targetHandle === 'gate') {
                this.triggerAdsr(edge.target, time, velocity, duration);
            } else if (targetInstance.type === 'voice' && edge.targetHandle === 'trigger') {
                if (typeof midiPitch === 'number') {
                    this.triggerVoiceWithPitch(edge.target, time, midiPitch, velocity, duration);
                } else {
                    this.triggerVoice(edge.target, time, velocity, duration);
                }
            } else if (targetInstance.type === 'sampler' && edge.targetHandle === 'trigger') {
                this.triggerSampler(edge.target, time, duration);
            } else if (targetInstance.type === 'noiseBurst' && edge.targetHandle === 'trigger') {
                this.triggerNoiseBurst(edge.target, time, velocity);
            } else if (targetInstance.type === 'midiNoteOutput' && edge.targetHandle === 'trigger') {
                this.triggerMidiNoteOutput(edge.target, time, velocity, duration, midiPitch);
            }
        });
    }

    /**
     * Load a sample buffer from URL, with caching
     */
    async loadSamplerBuffer(_nodeId: string, url: string): Promise<AudioBuffer | null> {
        if (!this.audioContext) return null;

        // Check cache first
        if (this.sampleBufferCache.has(url)) {
            return this.sampleBufferCache.get(url)!;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`[AudioEngine] Failed to load sample: ${url}`);
                return null;
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sampleBufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.warn(`[AudioEngine] Error loading sample ${url}:`, error);
            return null;
        }
    }

    private async loadConvolverImpulse(nodeId: string, url: string): Promise<void> {
        if (!url || !this.audioContext) return;
        const instance = this.audioNodes.get(nodeId);
        if (!instance?.convolverNode) return;

        try {
            const response = await fetch(url);
            if (!response.ok) return;
            const arrayBuffer = await response.arrayBuffer();
            const decoded = await this.audioContext.decodeAudioData(arrayBuffer);
            instance.convolverNode.buffer = decoded;
        } catch {
            // Ignore fetch/decode errors in editor mode.
        }
    }

    private async attachMediaStream(nodeId: string, requestMic: boolean): Promise<void> {
        const instance = this.audioNodes.get(nodeId);
        if (!instance || instance.type !== 'mediaStream' || !this.audioContext) return;

        if (instance.mediaStreamSource) {
            try { instance.mediaStreamSource.disconnect(); } catch { /* noop */ }
            instance.mediaStreamSource = undefined;
        }
        if (instance.mediaStream) {
            instance.mediaStream.getTracks().forEach((track) => track.stop());
            instance.mediaStream = undefined;
        }

        if (!requestMic) return;
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            instance.mediaStream = stream;
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(instance.node);
            instance.mediaStreamSource = source;
        } catch {
            // Ignore permission or browser capability errors in editor mode.
        }
    }

    // Track active sampler sources
    private activeSamplerSources: Map<string, AudioBufferSourceNode> = new Map();

    /**
     * Play a sampler (one-shot or looped)
     */
    playSampler(nodeId: string, data: { src: string; loop: boolean; playbackRate: number; detune: number }): void {
        if (!data.src) return;
        if (!this.audioContext) {
            this.init();
        }
        const ctx = this.audioContext!;

        // Stop any existing playback first
        this.stopSampler(nodeId);

        // Get buffer from cache
        const buffer = this.sampleBufferCache.get(data.src);
        if (!buffer) {
            console.warn(`[AudioEngine] Buffer not loaded for ${data.src}`);
            // Try to load it
            this.loadSamplerBuffer(nodeId, data.src).then(loadedBuffer => {
                if (loadedBuffer) {
                    this.playSampler(nodeId, data);
                }
            });
            return;
        }

        // Create buffer source
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = data.loop;
        source.playbackRate.value = data.playbackRate;
        source.detune.value = data.detune;

        // Connect to destination (or to the sampler's output node if it exists)
        const instance = this.audioNodes.get(nodeId);
        if (instance && instance.node) {
            source.connect(instance.node);
        } else {
            // Fallback: connect to destination directly
            source.connect(ctx.destination);
        }

        // Track the source
        this.activeSamplerSources.set(nodeId, source);

        // Clean up when finished (for non-looping samples)
        const samplerNodeId = nodeId; // Capture for closure
        source.onended = () => {
            this.activeSamplerSources.delete(samplerNodeId);
            this.notifySamplerEnd(samplerNodeId);
        };

        // Start playback
        source.start(0);
    }

    /**
     * Stop a sampler playback
     */
    stopSampler(nodeId: string): void {
        const source = this.activeSamplerSources.get(nodeId);
        if (source) {
            try {
                source.stop();
            } catch {
                // Already stopped
            }
            this.activeSamplerSources.delete(nodeId);
        }
    }

    private stopSamplerPlayback(): void {
        Array.from(this.activeSamplerSources.keys()).forEach((nodeId) => this.stopSampler(nodeId));
    }

    /**
     * Update sampler parameter in real-time
     */
    updateSamplerParam(nodeId: string, param: 'playbackRate' | 'detune', value: number): void {
        const source = this.activeSamplerSources.get(nodeId);
        if (source) {
            if (param === 'playbackRate') {
                source.playbackRate.value = value;
            } else if (param === 'detune') {
                source.detune.value = value;
            }
        }
    }

    // Callbacks for sampler end events
    private samplerEndCallbacks: Map<string, Set<() => void>> = new Map();

    /**
     * Subscribe to end-of-playback events for a sampler
     */
    onSamplerEnd(nodeId: string, callback: () => void): () => void {
        if (!this.samplerEndCallbacks.has(nodeId)) {
            this.samplerEndCallbacks.set(nodeId, new Set());
        }
        this.samplerEndCallbacks.get(nodeId)!.add(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.samplerEndCallbacks.get(nodeId);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Notify subscribers that a sampler has ended
     */
    private notifySamplerEnd(nodeId: string): void {
        const callbacks = this.samplerEndCallbacks.get(nodeId);
        if (callbacks) {
            callbacks.forEach(cb => cb());
        }
    }

    /**
     * Initialize the AudioContext (requires user gesture)
     */
    init(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    // Scheduler
    private nextNoteTime: number = 0.0;
    private currentStep: number = 0;

    // Callbacks
    private stepCallbacks: Set<(step: number) => void> = new Set();

    // Subscribe to step events
    public subscribeStep(callback: (step: number) => void): () => void {
        this.stepCallbacks.add(callback);
        return () => this.stepCallbacks.delete(callback);
    }
    private scheduleAheadTime: number = 0.1; // seconds
    private lookahead: number = 25.0; // milliseconds
    private timerID: number | undefined = undefined;
    private bpm: number = 120;

    /**
     * Start the scheduler loop
     */
    private startScheduler() {
        if (this.timerID) return;

        const nextNote = () => {
            const stepDuration = this.getStepDuration();
            if (!Number.isFinite(stepDuration) || stepDuration <= 0) {
                this.resyncSchedulerClock();
                return;
            }
            this.nextNoteTime += stepDuration;
            this.currentStep = (this.currentStep + 1) % this.getSequencerLoopLength();
        };

        const scheduleNote = (stepNumber: number, time: number) => {
            const connectedIds = this.getTransportConnectedIds();
            const eventTime = time + this.getSwingOffset(stepNumber);
            const stepDuration = this.getStepDuration();

            if (this.audioContext) {
                const delay = (eventTime - this.audioContext.currentTime) * 1000;
                if (delay >= 0) {
                    window.setTimeout(() => {
                        this.stepCallbacks.forEach((cb) => cb(stepNumber));
                    }, delay);
                }
            }

            this.audioNodes.forEach((instance, id) => {
                if (instance.type === 'stepSequencer' && instance.sequencerData && connectedIds.has(id)) {
                    const { steps, pattern, activeSteps } = instance.sequencerData;
                    const stepIndex = stepNumber % (steps || 16);

                    if (activeSteps[stepIndex]) {
                        const velocity = pattern[stepIndex] || 0.8;
                        const node = instance.node as ConstantSourceNode;

                        node.offset.setValueAtTime(velocity, eventTime);
                        node.offset.setValueAtTime(0, eventTime + (stepDuration * 0.8));
                        this.triggerSequencerTargets(id, eventTime, velocity, stepDuration * 0.8);
                    }
                }

                if (instance.type === 'pianoRoll' && instance.pianoRollData && connectedIds.has(id)) {
                    const { steps, notes } = instance.pianoRollData;
                    const stepIndex = stepNumber % (steps || 16);
                    const notesAtStep = notes.filter((note) => note.step === stepIndex);

                    notesAtStep.forEach((noteEvent) => {
                        const noteDuration = noteEvent.duration * stepDuration;
                        this.triggerSequencerTargets(
                            id,
                            eventTime,
                            noteEvent.velocity,
                            noteDuration * 0.9,
                            noteEvent.pitch
                        );
                    });
                }
            });
        };

        const scheduler = () => {
            if (!this.audioContext) return;
            if (!this.isTransportRunning()) {
                this.timerID = window.setTimeout(scheduler, this.lookahead);
                return;
            }

            if (!Number.isFinite(this.nextNoteTime)) {
                this.resyncSchedulerClock();
            }

            while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
                scheduleNote(this.currentStep, this.nextNoteTime);
                nextNote();
            }
            this.timerID = window.setTimeout(scheduler, this.lookahead);
        };

        this.resyncSchedulerClock(true);
        scheduler();
    }

    private applyVoicePitch(
        freqSource: ConstantSourceNode | undefined,
        frequency: number,
        time: number,
        portamento: number
    ) {
        if (!freqSource) return;
        freqSource.offset.cancelScheduledValues(time);
        if (portamento > 0) {
            freqSource.offset.setTargetAtTime(frequency, time, portamento);
        } else {
            freqSource.offset.setValueAtTime(frequency, time);
        }
    }

    private triggerVoiceGateTargets(voiceId: string, time: number, velocity: number, duration: number) {
        const connectedEdges = this.edges.filter((edge) => edge.source === voiceId && edge.sourceHandle === 'gate');
        connectedEdges.forEach((edge) => {
            const targetInstance = this.audioNodes.get(edge.target);
            if (!targetInstance) return;

            if (targetInstance.type === 'adsr' && edge.targetHandle === 'gate') {
                this.triggerAdsr(edge.target, time, velocity, duration);
            } else if (targetInstance.type === 'voice' && edge.targetHandle === 'trigger') {
                this.triggerVoice(edge.target, time, velocity, duration);
            } else if (targetInstance.type === 'sampler' && edge.targetHandle === 'trigger') {
                this.triggerSampler(edge.target, time, duration);
            } else if (targetInstance.type === 'noiseBurst' && edge.targetHandle === 'trigger') {
                this.triggerNoiseBurst(edge.target, time, velocity);
            } else if (targetInstance.type === 'midiNoteOutput' && edge.targetHandle === 'trigger') {
                this.triggerMidiNoteOutput(edge.target, time, velocity, duration);
            }
        });
    }

    private triggerVoice(voiceId: string, time: number, velocity: number, duration: number) {
        const instance = this.audioNodes.get(voiceId);
        if (!instance || !instance.outputs) return;

        const freqSource = instance.outputs.get('note') as ConstantSourceNode | undefined;
        const gateSource = instance.outputs.get('gate') as ConstantSourceNode | undefined;
        const velocitySource = instance.outputs.get('velocity') as ConstantSourceNode | undefined;
        const portamento = instance.voiceData?.portamento ?? 0;

        this.applyVoicePitch(freqSource, 261.63, time, portamento);

        if (gateSource) {
            gateSource.offset.setValueAtTime(1, time);
            gateSource.offset.setValueAtTime(0, time + duration);
            this.triggerVoiceGateTargets(voiceId, time, velocity, duration);
        }

        if (velocitySource) {
            velocitySource.offset.setValueAtTime(velocity, time);
        }
    }

    private triggerVoiceWithPitch(voiceId: string, time: number, midiPitch: number, velocity: number, duration: number) {
        const instance = this.audioNodes.get(voiceId);
        if (!instance || !instance.outputs) return;

        const freqSource = instance.outputs.get('note') as ConstantSourceNode | undefined;
        const gateSource = instance.outputs.get('gate') as ConstantSourceNode | undefined;
        const velocitySource = instance.outputs.get('velocity') as ConstantSourceNode | undefined;
        const portamento = instance.voiceData?.portamento ?? 0;
        const frequency = 440 * Math.pow(2, (midiPitch - 69) / 12);

        this.applyVoicePitch(freqSource, frequency, time, portamento);

        if (gateSource) {
            gateSource.offset.setValueAtTime(1, time);
            gateSource.offset.setValueAtTime(0, time + duration);
            this.triggerVoiceGateTargets(voiceId, time, velocity, duration);
        }

        if (velocitySource) {
            velocitySource.offset.setValueAtTime(velocity, time);
        }
    }


    private triggerAdsr(adsrId: string, time: number, velocity: number, duration: number) {
        const instance = this.audioNodes.get(adsrId);
        if (!instance || !instance.adsrData) return;

        const { attack, decay, sustain, release } = instance.adsrData;
        const node = instance.node as ConstantSourceNode;
        const param = node.offset;

        // Cancel scheduled values
        param.cancelScheduledValues(time);

        // Attack
        param.setValueAtTime(0, time);
        param.linearRampToValueAtTime(velocity, time + attack);

        // Decay -> Sustain
        param.linearRampToValueAtTime(velocity * sustain, time + attack + decay);

        // Release (at end of step/gate)
        // Wait until gate is done (time + duration) to release?
        // ADSR typically: A->D->S (hold while gate high) -> R (when gate low)
        // Here we schedule the Release phase to start at `time + duration`
        // Note: If gate matches step duration, it's roughly rhythmic.

        param.setValueAtTime(velocity * sustain, time + duration); // Anchor for release
        param.linearRampToValueAtTime(0, time + duration + release);
    }

    private stopScheduler() {
        if (this.timerID) {
            window.clearTimeout(this.timerID);
            this.timerID = undefined;
        }
        this.currentStep = 0;
        this.stepCallbacks.forEach((cb) => cb(-1));
    }

    /**
     * Build and start the audio graph from visual nodes
     */
    start(nodes: Node<AudioNodeData>[], edges: Edge[]): void {
        if (this.isPlaying) return;

        this.syncVisualGraph(nodes, edges);

        const ctx = this.init();
        this.cleanup();

        const transportNode = nodes.find((node) => node.data.type === 'transport');
        if (transportNode) {
            this.bpm = this.sanitizeBpm((transportNode.data as TransportNodeData).bpm);
        }

        nodes.forEach((node) => {
            const audioNode = this.createAudioNode(ctx, node);
            if (audioNode) {
                this.audioNodes.set(node.id, audioNode);
                if (node.data.type === 'mediaStream' && (node.data as MediaStreamNodeData).requestMic) {
                    this.attachMediaStream(node.id, true);
                }
            }
        });

        this.connectGraph(nodes, edges);
        this.audioNodes.forEach((instance) => this.startInstance(instance));

        this.updateDataValues(nodes, edges);

        this.isPlaying = true;
        this.handleMidiRuntimeChange();
        this.startControlValueLoop();
        if (this.isTransportRunning()) {
            this.startScheduler();
        }
    }

    /**
     * Stop all audio and cleanup
     */
    stop(): void {
        this.stopScheduler();
        this.stopControlValueLoop();
        this.cleanup();
        this.liveControlInputValues.clear();
        this.isPlaying = false;
    }

    /**
     * Cleanup all audio nodes
     */
    private cleanup(): void {
        this.audioNodes.forEach((instance) => {
            try {
                if (instance.midiNoteOutputState?.active && instance.midiNoteOutputState.note !== null) {
                    editorMidiRuntime.sendNoteOff({
                        outputId: instance.midiNoteOutputState.outputId,
                        channel: instance.midiNoteOutputState.channel,
                        note: instance.midiNoteOutputState.note,
                        velocity: 0,
                    });
                }
                if (instance.node instanceof OscillatorNode ||
                    instance.node instanceof AudioBufferSourceNode ||
                    instance.node instanceof ConstantSourceNode) {
                    try { instance.node.stop(); } catch (e) { }
                }

                // Stop params
                if (instance.outputs) {
                    instance.outputs.forEach(output => {
                        if (output instanceof ConstantSourceNode || output instanceof OscillatorNode) {
                            try { output.stop(); } catch (e) { }
                        }
                    });
                }

                if (instance.lfoOsc) {
                    try { instance.lfoOsc.stop(); } catch (e) { }
                }

                if (instance.mediaStream) {
                    instance.mediaStream.getTracks().forEach((track) => track.stop());
                    instance.mediaStream = undefined;
                }
                if (instance.mediaStreamSource) {
                    try { instance.mediaStreamSource.disconnect(); } catch { /* noop */ }
                    instance.mediaStreamSource = undefined;
                }

                this.disconnectInstance(instance);
            } catch (e) {
                // Ignore errors during cleanup
            }
        });
        this.stopSamplerPlayback();
        this.audioNodes.clear();
        this.busNodes.forEach((busNode) => {
            try { busNode.disconnect(); } catch { /* noop */ }
        });
        this.busNodes.clear();
        this.liveControlInputValues.clear();
    }

    /**
     * Create an AudioNode from a visual node
     */
    private createAudioNode(ctx: AudioContext, node: Node<AudioNodeData>): AudioNodeInstance | null {
        const data = node.data;

        switch (data.type) {
            case 'adsr': {
                const adsrData = data as ADSRNodeData;
                const source = ctx.createConstantSource();
                source.offset.value = 0;
                return {
                    node: source,
                    type: 'adsr',
                    adsrData: {
                        attack: adsrData.attack,
                        decay: adsrData.decay,
                        sustain: adsrData.sustain,
                        release: adsrData.release
                    }
                };
            }
            case 'voice': {
                const voiceData = data as VoiceNodeData;
                const dummy = ctx.createGain(); // Dummy main node, we use outputs

                const outputs = new Map<string, AudioNode>();

                const freqSource = ctx.createConstantSource();
                freqSource.offset.value = 440;
                outputs.set('note', freqSource); // Handle ID 'note' (Frequency)

                const gateSource = ctx.createConstantSource();
                gateSource.offset.value = 0;
                outputs.set('gate', gateSource);

                const velocitySource = ctx.createConstantSource();
                velocitySource.offset.value = 0;
                outputs.set('velocity', velocitySource);

                return {
                    node: dummy,
                    type: 'voice',
                    outputs,
                    voiceData: {
                        portamento: voiceData.portamento
                    }
                };
            }
            case 'stepSequencer': {
                const seqData = data as StepSequencerNodeData;
                const source = ctx.createConstantSource();
                source.offset.value = 0;

                return {
                    node: source,
                    type: 'stepSequencer',
                    sequencerData: {
                        steps: seqData.steps,
                        pattern: seqData.pattern,
                        activeSteps: seqData.activeSteps
                    }
                };
            }
            case 'pianoRoll': {
                const prData = data as PianoRollNodeData;
                const source = ctx.createConstantSource();
                source.offset.value = 0;

                return {
                    node: source,
                    type: 'pianoRoll',
                    pianoRollData: {
                        steps: prData.steps,
                        octaves: prData.octaves,
                        baseNote: prData.baseNote,
                        notes: prData.notes || []
                    }
                };
            }
            case 'lfo': {
                const lfoData = data;
                const lfo = ctx.createOscillator();
                lfo.type = lfoData.waveform || 'sine';
                lfo.frequency.value = lfoData.rate || 1;

                const depthGain = ctx.createGain();
                depthGain.gain.value = lfoData.depth || 500;

                lfo.connect(depthGain);

                const params = new Map<string, AudioParam>();
                params.set('rate', lfo.frequency);
                params.set('depth', depthGain.gain);

                return {
                    node: depthGain, // Output the depthGain so it can modulate other params
                    type: 'lfo',
                    params,
                    lfoOsc: lfo // Store ref so we can update waveform
                };
            }
            case 'transport': {
                return null;
            }
            case 'osc': {
                const oscData = data as OscNodeData;
                const osc = ctx.createOscillator();
                osc.type = oscData.waveform;
                osc.frequency.value = oscData.frequency;
                osc.detune.value = oscData.detune;

                const params = new Map<string, AudioParam>();
                params.set('frequency', osc.frequency);
                params.set('detune', osc.detune);

                return { node: osc, type: 'osc', params };
            }
            case 'gain': {
                const gainData = data as GainNodeData;
                const gain = ctx.createGain();
                gain.gain.value = gainData.gain;

                const params = new Map<string, AudioParam>();
                params.set('gain', gain.gain);

                return { node: gain, type: 'gain', params };
            }
            case 'filter': {
                const filterData = data as FilterNodeData;
                const filter = ctx.createBiquadFilter();
                filter.type = filterData.filterType;
                filter.frequency.value = filterData.frequency;
                filter.Q.value = filterData.q;
                filter.detune.value = filterData.detune;
                filter.gain.value = filterData.gain;

                const params = new Map<string, AudioParam>();
                params.set('frequency', filter.frequency);
                params.set('q', filter.Q);
                params.set('detune', filter.detune);
                params.set('gain', filter.gain);

                return { node: filter, type: 'filter', params };
            }
            case 'output': {
                const outputData = data as OutputNodeData;
                const masterGain = ctx.createGain();
                masterGain.gain.value = outputData.masterGain;
                const params = new Map<string, AudioParam>();
                params.set('masterGain', masterGain.gain);
                return { node: masterGain, type: 'output', params };
            }
            case 'noise': {
                const noiseData = data as NoiseNodeData;
                const buffer = createNoiseBuffer(ctx, noiseData.noiseType);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                return { node: source, type: 'noise' };
            }
            case 'delay': {
                const delayData = data as DelayNodeData;
                const delay = ctx.createDelay(5);
                delay.delayTime.value = delayData.delayTime;

                const feedbackGain = ctx.createGain();
                feedbackGain.gain.value = delayData.feedback;
                delay.connect(feedbackGain);
                feedbackGain.connect(delay);

                const params = new Map<string, AudioParam>();
                params.set('delayTime', delay.delayTime);
                params.set('feedback', feedbackGain.gain);

                return { node: delay, type: 'delay', feedbackGain, params };
            }
            case 'reverb': {
                const reverbData = data as ReverbNodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const convolver = ctx.createConvolver();
                convolver.buffer = createReverbImpulse(ctx, reverbData.decay);
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                dryGain.gain.value = 1 - reverbData.mix;
                wetGain.gain.value = reverbData.mix;

                inputGain.connect(dryGain);
                inputGain.connect(convolver);
                convolver.connect(wetGain);
                dryGain.connect(outputGain);
                wetGain.connect(outputGain);

                const params = new Map<string, AudioParam>();
                params.set('mix', wetGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, convolver, dryGain, wetGain],
                    type: 'reverb',
                    reverbConvolver: convolver,
                    reverbDryGain: dryGain,
                    reverbWetGain: wetGain,
                    params,
                };
            }
            case 'compressor': {
                const compressorData = data as CompressorNodeData;
                const inputGain = ctx.createGain();
                const duckGain = ctx.createGain();
                const compressor = ctx.createDynamicsCompressor();
                const outputGain = ctx.createGain();
                const sidechainAnalyser = ctx.createAnalyser();

                duckGain.gain.value = 1;
                compressor.threshold.value = compressorData.threshold;
                compressor.knee.value = compressorData.knee;
                compressor.ratio.value = compressorData.ratio;
                compressor.attack.value = compressorData.attack;
                compressor.release.value = compressorData.release;
                sidechainAnalyser.fftSize = 256;
                sidechainAnalyser.smoothingTimeConstant = 0.85;

                inputGain.connect(duckGain);
                duckGain.connect(compressor);
                compressor.connect(outputGain);

                const params = new Map<string, AudioParam>();
                params.set('threshold', compressor.threshold);
                params.set('knee', compressor.knee);
                params.set('ratio', compressor.ratio);
                params.set('attack', compressor.attack);
                params.set('release', compressor.release);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, duckGain, compressor, sidechainAnalyser],
                    type: 'compressor',
                    params,
                    compressorNode: compressor,
                    compressorDuckGain: duckGain,
                    sidechainAnalyser,
                    sidechainConnectionCount: 0,
                    sidechainSourceNodes: new Set<AudioNode>(),
                };
            }
            case 'phaser': {
                const phaserData = data as PhaserNodeData;
                const stageCount = clampPhaserStages(phaserData.stages);

                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                const feedbackGain = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                const stageNodes: BiquadFilterNode[] = [];

                for (let i = 0; i < stageCount; i++) {
                    const stage = ctx.createBiquadFilter();
                    stage.type = 'allpass';
                    stage.frequency.value = Math.max(20, phaserData.baseFrequency);
                    stage.Q.value = 0.5;
                    stageNodes.push(stage);
                }

                dryGain.gain.value = 1 - phaserData.mix;
                wetGain.gain.value = phaserData.mix;
                feedbackGain.gain.value = Math.max(-0.95, Math.min(0.95, phaserData.feedback));
                lfo.type = 'sine';
                lfo.frequency.value = Math.max(0.01, phaserData.rate);
                lfoGain.gain.value = Math.max(0, phaserData.depth) * Math.max(100, phaserData.baseFrequency);

                inputGain.connect(dryGain);
                dryGain.connect(outputGain);
                inputGain.connect(stageNodes[0]);
                for (let i = 0; i < stageNodes.length - 1; i++) {
                    stageNodes[i].connect(stageNodes[i + 1]);
                }
                stageNodes[stageNodes.length - 1].connect(wetGain);
                wetGain.connect(outputGain);
                stageNodes[stageNodes.length - 1].connect(feedbackGain);
                feedbackGain.connect(stageNodes[0]);
                lfo.connect(lfoGain);
                stageNodes.forEach((stage) => lfoGain.connect(stage.frequency));

                const params = new Map<string, AudioParam>();
                params.set('rate', lfo.frequency);
                params.set('depth', lfoGain.gain);
                params.set('feedback', feedbackGain.gain);
                params.set('baseFrequency', stageNodes[0].frequency);
                params.set('mix', wetGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, outputGain, dryGain, wetGain, feedbackGain, lfo, lfoGain, ...stageNodes],
                    type: 'phaser',
                    params,
                    lfoOsc: lfo,
                    phaserDryGain: dryGain,
                    phaserWetGain: wetGain,
                    phaserFeedbackGain: feedbackGain,
                    phaserLfoGain: lfoGain,
                    phaserStages: stageNodes,
                };
            }
            case 'flanger': {
                const flangerData = data as FlangerNodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                const delay = ctx.createDelay(0.05);
                const feedbackGain = ctx.createGain();
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();

                const delaySec = Math.max(0, flangerData.delay) / 1000;
                const depthSec = Math.max(0, flangerData.depth) / 1000;

                dryGain.gain.value = 1 - flangerData.mix;
                wetGain.gain.value = flangerData.mix;
                delay.delayTime.value = delaySec;
                feedbackGain.gain.value = Math.max(-0.95, Math.min(0.95, flangerData.feedback));
                lfo.type = 'sine';
                lfo.frequency.value = Math.max(0.01, flangerData.rate);
                lfoGain.gain.value = depthSec;

                inputGain.connect(dryGain);
                dryGain.connect(outputGain);
                inputGain.connect(delay);
                delay.connect(feedbackGain);
                feedbackGain.connect(delay);
                delay.connect(wetGain);
                wetGain.connect(outputGain);
                lfo.connect(lfoGain);
                lfoGain.connect(delay.delayTime);

                const params = new Map<string, AudioParam>();
                params.set('rate', lfo.frequency);
                params.set('depth', lfoGain.gain);
                params.set('feedback', feedbackGain.gain);
                params.set('delay', delay.delayTime);
                params.set('mix', wetGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, outputGain, dryGain, wetGain, delay, feedbackGain, lfo, lfoGain],
                    type: 'flanger',
                    params,
                    lfoOsc: lfo,
                    flangerDelay: delay,
                    flangerFeedbackGain: feedbackGain,
                    flangerDryGain: dryGain,
                    flangerWetGain: wetGain,
                    flangerLfoGain: lfoGain,
                };
            }
            case 'tremolo': {
                const tremoloData = data as TremoloNodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                const ampGain = ctx.createGain();
                const lfo = ctx.createOscillator();
                const depth = Math.max(0, Math.min(1, tremoloData.depth));

                dryGain.gain.value = 1 - tremoloData.mix;
                wetGain.gain.value = tremoloData.mix;
                ampGain.gain.value = 1 - depth * 0.5;
                lfo.type = tremoloData.waveform;
                lfo.frequency.value = Math.max(0.01, tremoloData.rate);

                inputGain.connect(dryGain);
                dryGain.connect(outputGain);
                inputGain.connect(ampGain);
                ampGain.connect(wetGain);
                wetGain.connect(outputGain);

                const lfoDepthGain = ctx.createGain();
                lfoDepthGain.gain.value = depth * 0.5;
                lfo.connect(lfoDepthGain);
                lfoDepthGain.connect(ampGain.gain);

                const params = new Map<string, AudioParam>();
                params.set('rate', lfo.frequency);
                params.set('depth', lfoDepthGain.gain);
                params.set('mix', wetGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, outputGain, dryGain, wetGain, ampGain, lfo, lfoDepthGain],
                    type: 'tremolo',
                    params,
                    lfoOsc: lfo,
                    tremoloDryGain: dryGain,
                    tremoloWetGain: wetGain,
                    tremoloAmpGain: ampGain,
                    tremoloDepthGain: lfoDepthGain,
                };
            }
            case 'eq3': {
                const eqData = data as EQ3NodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                const lowShelf = ctx.createBiquadFilter();
                const midPeak = ctx.createBiquadFilter();
                const highShelf = ctx.createBiquadFilter();

                const lowFrequency = Math.max(20, eqData.lowFrequency);
                const highFrequency = Math.max(lowFrequency + MIN_EQ3_GAP_HZ, eqData.highFrequency);
                const midFrequency = Math.sqrt(lowFrequency * highFrequency);

                lowShelf.type = 'lowshelf';
                lowShelf.frequency.value = lowFrequency;
                lowShelf.gain.value = eqData.low;
                midPeak.type = 'peaking';
                midPeak.frequency.value = midFrequency;
                midPeak.Q.value = 0.707;
                midPeak.gain.value = eqData.mid;
                highShelf.type = 'highshelf';
                highShelf.frequency.value = highFrequency;
                highShelf.gain.value = eqData.high;

                dryGain.gain.value = 1 - eqData.mix;
                wetGain.gain.value = eqData.mix;

                inputGain.connect(dryGain);
                dryGain.connect(outputGain);
                inputGain.connect(lowShelf);
                lowShelf.connect(midPeak);
                midPeak.connect(highShelf);
                highShelf.connect(wetGain);
                wetGain.connect(outputGain);

                const params = new Map<string, AudioParam>();
                params.set('low', lowShelf.gain);
                params.set('mid', midPeak.gain);
                params.set('high', highShelf.gain);
                params.set('lowFrequency', lowShelf.frequency);
                params.set('highFrequency', highShelf.frequency);
                params.set('mix', wetGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, outputGain, dryGain, wetGain, lowShelf, midPeak, highShelf],
                    type: 'eq3',
                    params,
                    eq3DryGain: dryGain,
                    eq3WetGain: wetGain,
                    eq3LowShelf: lowShelf,
                    eq3MidPeak: midPeak,
                    eq3HighShelf: highShelf,
                };
            }
            case 'distortion': {
                const distortionData = data as DistortionNodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                const driveGain = ctx.createGain();
                const waveShaper = ctx.createWaveShaper();
                const toneFilter = ctx.createBiquadFilter();
                const postGain = ctx.createGain();

                driveGain.gain.value = 1 + distortionData.drive * 5;
                waveShaper.curve = createWaveShaperCurve(distortionData.drive, 'softClip');
                waveShaper.oversample = '2x';
                toneFilter.type = 'lowpass';
                toneFilter.frequency.value = distortionData.tone;
                postGain.gain.value = distortionData.level;
                wetGain.gain.value = distortionData.mix;
                dryGain.gain.value = 1 - distortionData.mix;

                inputGain.connect(dryGain);
                dryGain.connect(outputGain);
                inputGain.connect(driveGain);
                driveGain.connect(waveShaper);
                waveShaper.connect(toneFilter);
                toneFilter.connect(postGain);
                postGain.connect(wetGain);
                wetGain.connect(outputGain);

                const params = new Map<string, AudioParam>();
                params.set('drive', driveGain.gain);
                params.set('level', postGain.gain);
                params.set('mix', wetGain.gain);
                params.set('tone', toneFilter.frequency);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, dryGain, wetGain, driveGain, waveShaper, toneFilter, postGain],
                    type: 'distortion',
                    params,
                    distortionWaveShaper: waveShaper,
                    distortionDriveGain: driveGain,
                    distortionToneFilter: toneFilter,
                    distortionDryGain: dryGain,
                    distortionWetGain: wetGain,
                    distortionOutputGain: postGain,
                };
            }
            case 'chorus': {
                const chorusData = data as ChorusNodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const dryGain = ctx.createGain();
                const wetGain = ctx.createGain();
                const delay = ctx.createDelay(0.2);
                const feedbackGain = ctx.createGain();
                const lfoOsc = ctx.createOscillator();
                const lfoGain = ctx.createGain();

                delay.delayTime.value = chorusData.delay / 1000;
                feedbackGain.gain.value = chorusData.feedback;
                lfoOsc.type = 'sine';
                lfoOsc.frequency.value = chorusData.rate;
                lfoGain.gain.value = chorusData.depth / 1000;
                wetGain.gain.value = chorusData.mix;
                dryGain.gain.value = 1 - chorusData.mix;

                inputGain.connect(dryGain);
                dryGain.connect(outputGain);
                inputGain.connect(delay);
                delay.connect(feedbackGain);
                feedbackGain.connect(delay);
                delay.connect(wetGain);
                wetGain.connect(outputGain);
                lfoOsc.connect(lfoGain);
                lfoGain.connect(delay.delayTime);

                const params = new Map<string, AudioParam>();
                params.set('rate', lfoOsc.frequency);
                params.set('depth', lfoGain.gain);
                params.set('feedback', feedbackGain.gain);
                params.set('delay', delay.delayTime);
                params.set('mix', wetGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, dryGain, wetGain, delay, feedbackGain, lfoOsc, lfoGain],
                    type: 'chorus',
                    params,
                    lfoOsc,
                    chorusDelay: delay,
                    chorusFeedbackGain: feedbackGain,
                    chorusDryGain: dryGain,
                    chorusWetGain: wetGain,
                    chorusLfoGain: lfoGain,
                };
            }
            case 'noiseBurst': {
                const burstData = data as NoiseBurstNodeData;
                const output = ctx.createGain();
                return {
                    node: output,
                    type: 'noiseBurst',
                    noiseBurstData: {
                        noiseType: burstData.noiseType,
                        duration: burstData.duration,
                        gain: burstData.gain,
                        attack: burstData.attack,
                        release: burstData.release,
                    },
                };
            }
            case 'waveShaper': {
                const waveShaperData = data as WaveShaperNodeData;
                const waveShaper = ctx.createWaveShaper();
                waveShaper.curve = createWaveShaperCurve(waveShaperData.amount, waveShaperData.preset);
                waveShaper.oversample = waveShaperData.oversample;
                return { node: waveShaper, type: 'waveShaper' };
            }
            case 'convolver': {
                const convolverData = data as ConvolverNodeData;
                const convolver = ctx.createConvolver();
                convolver.normalize = convolverData.normalize;
                if (convolverData.impulseSrc) {
                    this.loadConvolverImpulse(node.id, convolverData.impulseSrc);
                }
                return { node: convolver, type: 'convolver', convolverNode: convolver };
            }
            case 'analyzer': {
                const analyzerData = data as AnalyzerNodeData;
                const analyzer = ctx.createAnalyser();
                analyzer.fftSize = analyzerData.fftSize;
                analyzer.smoothingTimeConstant = analyzerData.smoothingTimeConstant;
                return { node: analyzer, type: 'analyzer' };
            }
            case 'panner3d': {
                const pannerData = data as Panner3DNodeData;
                const panner = ctx.createPanner();
                panner.panningModel = pannerData.panningModel;
                panner.distanceModel = pannerData.distanceModel;
                panner.positionX.value = pannerData.positionX;
                panner.positionY.value = pannerData.positionY;
                panner.positionZ.value = pannerData.positionZ;
                panner.refDistance = pannerData.refDistance;
                panner.maxDistance = pannerData.maxDistance;
                panner.rolloffFactor = pannerData.rolloffFactor;

                const params = new Map<string, AudioParam>();
                params.set('positionX', panner.positionX);
                params.set('positionY', panner.positionY);
                params.set('positionZ', panner.positionZ);
                return { node: panner, type: 'panner3d', params };
            }
            case 'panner': {
                const pannerData = data as StereoPannerNodeData;
                const panner = ctx.createStereoPanner();
                panner.pan.value = pannerData.pan;
                const params = new Map<string, AudioParam>();
                params.set('pan', panner.pan);
                return { node: panner, type: 'panner', params };
            }
            case 'mixer': {
                // Mixer is just a gain node that sums inputs
                const mixerGain = ctx.createGain();
                mixerGain.gain.value = 1;
                return { node: mixerGain, type: 'mixer' };
            }
            case 'auxSend': {
                const auxData = data as AuxSendNodeData;
                const inputGain = ctx.createGain();
                const outputGain = ctx.createGain();
                const sendGain = ctx.createGain();
                const busId = (auxData.busId || 'aux').trim() || 'aux';
                const bus = this.getOrCreateBusNode(busId);

                outputGain.gain.value = 1;
                sendGain.gain.value = Math.max(0, auxData.sendGain);
                inputGain.connect(outputGain);
                inputGain.connect(sendGain);
                if (bus) {
                    sendGain.connect(bus);
                }

                const params = new Map<string, AudioParam>();
                params.set('sendGain', sendGain.gain);

                return {
                    node: outputGain,
                    inputNode: inputGain,
                    internalNodes: [inputGain, outputGain, sendGain],
                    type: 'auxSend',
                    params,
                    auxSendGain: sendGain,
                    auxBusId: busId,
                };
            }
            case 'auxReturn': {
                const auxData = data as AuxReturnNodeData;
                const busId = (auxData.busId || 'aux').trim() || 'aux';
                const outputGain = ctx.createGain();
                const bus = this.getOrCreateBusNode(busId);

                outputGain.gain.value = Math.max(0, auxData.gain);
                if (bus) {
                    bus.connect(outputGain);
                }

                const params = new Map<string, AudioParam>();
                params.set('gain', outputGain.gain);

                return {
                    node: outputGain,
                    type: 'auxReturn',
                    params,
                    auxReturnGain: outputGain,
                    auxBusId: busId,
                };
            }
            case 'matrixMixer': {
                const matrixData = data as MatrixMixerNodeData;
                const inputCount = clampMatrixSize(matrixData.inputs, 4);
                const outputCount = clampMatrixSize(matrixData.outputs, 4);

                const inputMerger = ctx.createChannelMerger(inputCount);
                const splitter = ctx.createChannelSplitter(inputCount);
                const outputMerger = ctx.createChannelMerger(outputCount);
                const outputSplitter = ctx.createChannelSplitter(outputCount);
                const outputGain = ctx.createGain();
                const cells: GainNode[][] = [];
                const channelOutputs: GainNode[] = Array.from({ length: outputCount }, () => ctx.createGain());
                const params = new Map<string, AudioParam>();
                const outputs = new Map<string, AudioNode>();

                inputMerger.connect(splitter);
                for (let row = 0; row < inputCount; row++) {
                    cells[row] = [];
                    for (let column = 0; column < outputCount; column++) {
                        const cellGain = ctx.createGain();
                        cellGain.gain.value = getSafeMatrixCellValue(matrixData.matrix, row, column);
                        splitter.connect(cellGain, row, 0);
                        cellGain.connect(outputMerger, 0, column);
                        cells[row][column] = cellGain;
                        params.set(`cell:${row}:${column}`, cellGain.gain);
                    }
                }
                outputMerger.connect(outputGain);
                outputMerger.connect(outputSplitter);
                channelOutputs.forEach((channelGain, index) => {
                    outputSplitter.connect(channelGain, index, 0);
                    outputs.set(`out${index + 1}`, channelGain);
                });
                outputs.set('out', outputGain);

                return {
                    node: outputGain,
                    inputNode: inputMerger,
                    internalNodes: [inputMerger, splitter, outputMerger, outputSplitter, outputGain, ...channelOutputs, ...cells.flat()],
                    type: 'matrixMixer',
                    params,
                    outputs,
                    matrixInputs: inputCount,
                    matrixOutputs: outputCount,
                    matrixInputMerger: inputMerger,
                    matrixSplitter: splitter,
                    matrixOutputMerger: outputMerger,
                    matrixOutputSplitter: outputSplitter,
                    matrixCells: cells,
                    matrixChannelOutputs: channelOutputs,
                };
            }
            case 'input': {
                const inputData = data as InputNodeData;
                const dummy = ctx.createGain();

                const outputs = new Map<string, AudioNode>();

                if (inputData.params) {
                    inputData.params.forEach((param) => {
                        const paramSource = ctx.createConstantSource();
                        paramSource.offset.value = param.value;
                        outputs.set(getInputParamHandleId(param), paramSource);
                    });
                }

                return { node: dummy, type: 'input', outputs };
            }
            case 'uiTokens': {
                const inputData = data as UiTokensNodeData;
                const dummy = ctx.createGain();
                const outputs = new Map<string, AudioNode>();

                if (inputData.params) {
                    inputData.params.forEach((param) => {
                        const paramSource = ctx.createConstantSource();
                        paramSource.offset.value = param.value;
                        outputs.set(getInputParamHandleId(param), paramSource);
                    });
                }

                return { node: dummy, type: 'uiTokens', outputs };
            }
            case 'constantSource': {
                const sourceData = data as ConstantSourceNodeData;
                const source = ctx.createConstantSource();
                source.offset.value = sourceData.offset;
                const params = new Map<string, AudioParam>();
                params.set('offset', source.offset);
                return { node: source, type: 'constantSource', params };
            }
            case 'mediaStream': {
                const gain = ctx.createGain();
                return { node: gain, type: 'mediaStream' };
            }
            case 'note': {
                const noteData = data as NoteNodeData;
                const freqSource = ctx.createConstantSource();
                freqSource.offset.value = noteData.frequency;

                return { node: freqSource, type: 'note' };
            }
            case 'midiNote': {
                const dummy = ctx.createGain();
                const outputs = new Map<string, AudioNode>();

                const triggerSource = ctx.createConstantSource();
                triggerSource.offset.value = 0;
                outputs.set('trigger', triggerSource);

                const frequencySource = ctx.createConstantSource();
                frequencySource.offset.value = 0;
                outputs.set('frequency', frequencySource);

                const noteSource = ctx.createConstantSource();
                noteSource.offset.value = 0;
                outputs.set('note', noteSource);

                const gateSource = ctx.createConstantSource();
                gateSource.offset.value = 0;
                outputs.set('gate', gateSource);

                const velocitySource = ctx.createConstantSource();
                velocitySource.offset.value = 0;
                outputs.set('velocity', velocitySource);

                return { node: dummy, type: 'midiNote', outputs };
            }
            case 'midiCC': {
                const dummy = ctx.createGain();
                const outputs = new Map<string, AudioNode>();

                const normalizedSource = ctx.createConstantSource();
                normalizedSource.offset.value = 0;
                outputs.set('normalized', normalizedSource);

                const rawSource = ctx.createConstantSource();
                rawSource.offset.value = 0;
                outputs.set('raw', rawSource);

                return { node: dummy, type: 'midiCC', outputs };
            }
            case 'eventTrigger': {
                const triggerData = data as EventTriggerNodeData;
                const source = ctx.createConstantSource();
                source.offset.value = 0;
                return {
                    node: source,
                    type: 'eventTrigger',
                    eventTriggerData: {
                        token: triggerData.token,
                        mode: triggerData.mode,
                        cooldownMs: triggerData.cooldownMs,
                        velocity: triggerData.velocity,
                        duration: triggerData.duration,
                        note: triggerData.note,
                        trackId: triggerData.trackId,
                        lastEmitAtMs: -Infinity,
                    },
                };
            }
            case 'sampler': {
                const samplerData = data as SamplerNodeData;
                const samplerOutput = ctx.createGain();
                samplerOutput.gain.value = 1;

                const samplerInstance: AudioNodeInstance = {
                    node: samplerOutput,
                    type: 'sampler',
                    samplerData: {
                        src: samplerData.src,
                        loop: samplerData.loop,
                        playbackRate: samplerData.playbackRate,
                        detune: samplerData.detune,
                        buffer: null as AudioBuffer | null,
                    }
                };

                if (samplerData.src) {
                    this.loadSamplerBuffer(node.id, samplerData.src).then(buffer => {
                        if (buffer && samplerInstance.samplerData) {
                            samplerInstance.samplerData.buffer = buffer;
                        }
                    });
                }

                return samplerInstance;
            }
            case 'math':
            case 'compare':
            case 'mix':
            case 'clamp':
            case 'switch': {
                const source = ctx.createConstantSource();
                source.offset.value = 0;
                return { node: source, type: data.type };
            }
            case 'midiNoteOutput': {
                const dummy = ctx.createGain();
                return {
                    node: dummy,
                    type: 'midiNoteOutput',
                    midiNoteOutputState: {
                        active: false,
                        note: null,
                        outputId: null,
                        channel: 1,
                        velocity: 1,
                    },
                };
            }
            case 'midiCCOutput': {
                const dummy = ctx.createGain();
                return {
                    node: dummy,
                    type: 'midiCCOutput',
                    midiCCOutputState: {
                        signature: '',
                    },
                };
            }
            case 'midiSync':
                return null;
            default:
                return null;
        }
    }

    private updateDataValues(nodes: Node<AudioNodeData>[], edges: Edge[]): void {
        if (!this.audioContext) return;
        this.liveControlInputValues.clear();

        const nodeById = new Map(nodes.map((node) => [node.id, node]));
        const controlEdgesByTarget = new Map<string, Edge[]>();

        edges.forEach((edge) => {
            if (isAudioConnection(edge, nodeById)) return;
            const list = controlEdgesByTarget.get(edge.target) ?? [];
            list.push(edge);
            controlEdgesByTarget.set(edge.target, list);
        });

        const cache = new Map<string, number>();
        const visiting = new Set<string>();
        const now = this.audioContext.currentTime;

        const getSourceValue = (edge: Edge): number | null => {
            const sourceNode = nodeById.get(edge.source);
            if (!sourceNode) return null;

            switch (sourceNode.data.type) {
                case 'input': {
                    const inputData = sourceNode.data as InputNodeData;
                    const resolved = resolveInputParamByHandle(inputData.params, edge.sourceHandle);
                    return resolved?.param.value ?? null;
                }
                case 'uiTokens': {
                    const inputData = sourceNode.data as UiTokensNodeData;
                    const resolved = resolveInputParamByHandle(inputData.params, edge.sourceHandle);
                    return resolved?.param.value ?? null;
                }
                case 'note': {
                    const noteData = sourceNode.data as NoteNodeData;
                    return Number.isFinite(noteData.frequency) ? noteData.frequency : null;
                }
                case 'midiNote':
                case 'midiCC':
                case 'voice': {
                    const instance = this.audioNodes.get(sourceNode.id);
                    if (!instance?.outputs) return null;
                    const output = instance.outputs.get(edge.sourceHandle ?? '');
                    if (output instanceof ConstantSourceNode) {
                        return output.offset.value;
                    }
                    return null;
                }
                case 'lfo': {
                    const lfoData = sourceNode.data as AudioNodeData & { rate?: number; depth?: number; waveform?: string };
                    const rate = typeof lfoData.rate === 'number' ? lfoData.rate : 1;
                    const depth = typeof lfoData.depth === 'number' ? lfoData.depth : 0;
                    const phase = now * rate * Math.PI * 2;
                    const normalizedPhase = phase / (Math.PI * 2);
                    let wave = 0;

                    switch (lfoData.waveform) {
                        case 'square':
                            wave = Math.sign(Math.sin(phase)) || 1;
                            break;
                        case 'triangle':
                            wave = (2 * Math.asin(Math.sin(phase))) / Math.PI;
                            break;
                        case 'sawtooth':
                            wave = 2 * (normalizedPhase - Math.floor(normalizedPhase + 0.5));
                            break;
                        default:
                            wave = Math.sin(phase);
                    }

                    return wave * depth;
                }
                case 'adsr':
                case 'stepSequencer':
                case 'pianoRoll': {
                    const instance = this.audioNodes.get(sourceNode.id);
                    if (instance?.node instanceof ConstantSourceNode) {
                        return instance.node.offset.value;
                    }
                    return null;
                }
                case 'constantSource':
                case 'eventTrigger': {
                    const instance = this.audioNodes.get(sourceNode.id);
                    if (instance?.node instanceof ConstantSourceNode) {
                        return instance.node.offset.value;
                    }
                    return null;
                }
                case 'math':
                case 'compare':
                case 'mix':
                case 'clamp':
                case 'switch':
                    return evaluateDataNode(sourceNode.id);
                default:
                    return null;
            }
        };

        const getHandleValue = (nodeId: string, handle: string, fallback: number) => {
            const edgesForTarget = controlEdgesByTarget.get(nodeId) ?? [];
            const edge = edgesForTarget.find((item) => item.targetHandle === handle);
            if (!edge) return fallback;
            const value = getSourceValue(edge);
            return value ?? fallback;
        };

        const evaluateDataNode = (nodeId: string): number => {
            if (cache.has(nodeId)) return cache.get(nodeId)!;
            if (visiting.has(nodeId)) return 0;
            const node = nodeById.get(nodeId);
            if (!node || !isDataNodeType(node.data.type)) return 0;

            visiting.add(nodeId);

            let result = 0;
            switch (node.data.type) {
                case 'math': {
                    const data = node.data as MathNodeData;
                    const a = getHandleValue(nodeId, 'a', data.a);
                    const b = getHandleValue(nodeId, 'b', data.b);
                    const c = getHandleValue(nodeId, 'c', data.c);
                    result = math(data.operation, a, b, c);
                    break;
                }
                case 'compare': {
                    const data = node.data as CompareNodeData;
                    const a = getHandleValue(nodeId, 'a', data.a);
                    const b = getHandleValue(nodeId, 'b', data.b);
                    result = compare(data.operation, a, b);
                    break;
                }
                case 'mix': {
                    const data = node.data as MixNodeData;
                    const a = getHandleValue(nodeId, 'a', data.a);
                    const b = getHandleValue(nodeId, 'b', data.b);
                    const t = getHandleValue(nodeId, 't', data.t);
                    result = mix(a, b, t, data.clamp);
                    break;
                }
                case 'clamp': {
                    const data = node.data as ClampNodeData;
                    const value = getHandleValue(nodeId, 'value', data.value);
                    const min = getHandleValue(nodeId, 'min', data.min);
                    const max = getHandleValue(nodeId, 'max', data.max);
                    result = clamp(value, min, max, data.mode);
                    break;
                }
                case 'switch': {
                    const data = node.data as SwitchNodeData;
                    const inputs = Math.max(1, data.inputs || data.values?.length || 1);
                    const values = Array.from({ length: inputs }, (_, index) => {
                        const fallback = data.values?.[index] ?? 0;
                        return getHandleValue(nodeId, `in_${index}`, fallback);
                    });
                    const indexValue = getHandleValue(nodeId, 'index', data.selectedIndex);
                    result = switchValue(indexValue, values, values[0] ?? 0);
                    break;
                }
                default:
                    result = 0;
            }

            cache.set(nodeId, result);
            visiting.delete(nodeId);
            return result;
        };

        nodes.forEach((node) => {
            if (!isDataNodeType(node.data.type)) return;
            const value = evaluateDataNode(node.id);
            const instance = this.audioNodes.get(node.id);
            const output = instance?.node;
            if (output instanceof ConstantSourceNode) {
                output.offset.setTargetAtTime(value, now, 0.01);
            }
        });

        const liveControlHandles = new Set([
            'frequency',
            'detune',
            'gain',
            'q',
            'delayTime',
            'feedback',
            'mix',
            'pan',
            'positionX',
            'positionY',
            'positionZ',
            'masterGain',
            'rate',
            'depth',
            'attack',
            'decay',
            'sustain',
            'release',
            'sidechainStrength',
            'portamento',
            'playbackRate',
            'threshold',
            'knee',
            'ratio',
            'low',
            'mid',
            'high',
            'lowFrequency',
            'highFrequency',
            'baseFrequency',
            'stages',
            'level',
            'tone',
            'drive',
            'sendGain',
            'duration',
            'offset',
            'refDistance',
            'maxDistance',
            'rolloffFactor',
            'token',
            'gate',
            'note',
            'velocity',
            'value',
        ]);

        controlEdgesByTarget.forEach((edgesForTarget, targetNodeId) => {
            edgesForTarget.forEach((edge) => {
                const targetHandle = edge.targetHandle;
                const value = getSourceValue(edge);
                if (!targetHandle || value === null) return;
                this.liveControlInputValues.set(this.getControlInputKey(targetNodeId, targetHandle), value);
                if (liveControlHandles.has(targetHandle) || targetHandle.startsWith('cell:')) {
                    this.updateNode(targetNodeId, { [targetHandle]: value } as Partial<AudioNodeData>);
                }
            });
        });
    }

    refreshDataValues(nodes: Node<AudioNodeData>[], edges: Edge[]): void {
        if (!this.isPlaying || !this.audioContext) return;
        this.updateDataValues(nodes, edges);
    }

    /**
     * Refresh connections and sync nodes (Hot-swapping & Dynamic Add/Remove)
     */
    refreshConnections(nodes: Node<AudioNodeData>[], edges: Edge[]): void {
        if (!this.isPlaying || !this.audioContext) return;

        this.syncVisualGraph(nodes, edges);
        const ctx = this.audioContext;

        const activeIds = new Set(nodes.map((node) => node.id));

        for (const [id, instance] of this.audioNodes.entries()) {
            if (!activeIds.has(id)) {
                try {
                    if (instance.node instanceof OscillatorNode ||
                        instance.node instanceof AudioBufferSourceNode ||
                        instance.node instanceof ConstantSourceNode) {
                        try { instance.node.stop(); } catch (e) { }
                    }
                    if (instance.outputs) {
                        instance.outputs.forEach(output => {
                            if (output instanceof ConstantSourceNode || output instanceof OscillatorNode) {
                                try { output.stop(); } catch (e) { }
                            }
                        });
                    }
                    if (instance.mediaStream) {
                        instance.mediaStream.getTracks().forEach((track) => track.stop());
                        instance.mediaStream = undefined;
                    }
                    if (instance.mediaStreamSource) {
                        try { instance.mediaStreamSource.disconnect(); } catch { /* noop */ }
                        instance.mediaStreamSource = undefined;
                    }
                    this.disconnectInstance(instance);
                } catch {
                    // Ignore cleanup failures while removing nodes.
                }
                this.audioNodes.delete(id);
            }
        }

        nodes.forEach((node) => {
            if (!this.audioNodes.has(node.id)) {
                const instance = this.createAudioNode(ctx, node);
                if (instance) {
                    this.audioNodes.set(node.id, instance);
                    this.startInstance(instance);
                    if (node.data.type === 'mediaStream' && (node.data as MediaStreamNodeData).requestMic) {
                        this.attachMediaStream(node.id, true);
                    }
                }
            }
        });

        this.connectGraph(nodes, edges);
        this.updateDataValues(nodes, edges);
        if (this.isTransportRunning() && !this.timerID) {
            this.startScheduler();
        } else if (!this.isTransportRunning() && this.timerID) {
            this.stopScheduler();
        }
    }

    /**
     * Update a specific parameter in real-time
     */
    updateNode(nodeId: string, data: Partial<AudioNodeData>): void {
        const visualNode = this.nodeById.get(nodeId);
        if (visualNode) {
            const nextNode = { ...visualNode, data: { ...visualNode.data, ...data } as AudioNodeData };
            this.nodeById.set(nodeId, nextNode);
            this.visualNodes = this.visualNodes.map((node) => node.id === nodeId ? nextNode : node);
        }

        const instance = this.audioNodes.get(nodeId);

        if ('bpm' in data && typeof data.bpm === 'number') {
            this.bpm = this.sanitizeBpm(data.bpm);
        }

        if (visualNode?.data.type === 'transport') {
            const transportTimingChanged = 'bpm' in data
                || 'beatsPerBar' in data
                || 'beatUnit' in data
                || 'stepsPerBeat' in data
                || 'barsPerPhrase' in data
                || 'swing' in data;

            if (this.isPlaying) {
                if (this.isTransportRunning() && !this.timerID) {
                    this.startScheduler();
                } else if (!this.isTransportRunning() && this.timerID) {
                    this.stopScheduler();
                }
                if (transportTimingChanged && this.isTransportRunning()) {
                    this.resyncSchedulerClock();
                }
            }
            if (!instance || !this.audioContext) return;
        }

        if (!instance || !this.audioContext) return;

        const currentTime = this.audioContext.currentTime;

        if (instance.type === 'osc') {
            const node = instance.node as OscillatorNode;
            if ('frequency' in data && typeof data.frequency === 'number') {
                node.frequency.setTargetAtTime(data.frequency, currentTime, 0.01);
            }
            if ('detune' in data && typeof data.detune === 'number') {
                node.detune.setTargetAtTime(data.detune, currentTime, 0.01);
            }
            if ('waveform' in data && typeof data.waveform === 'string') {
                node.type = data.waveform as OscillatorType;
            }
        } else if (instance.type === 'gain') {
            const node = instance.node as GainNode;
            if ('gain' in data && typeof data.gain === 'number') {
                node.gain.setTargetAtTime(data.gain, currentTime, 0.01);
            }
        } else if (instance.type === 'filter') {
            const node = instance.node as BiquadFilterNode;
            if ('frequency' in data && typeof data.frequency === 'number') node.frequency.setTargetAtTime(data.frequency, currentTime, 0.01);
            if ('q' in data && typeof data.q === 'number') node.Q.setTargetAtTime(data.q, currentTime, 0.01);
            if ('detune' in data && typeof data.detune === 'number') node.detune.setTargetAtTime(data.detune, currentTime, 0.01);
            if ('gain' in data && typeof data.gain === 'number') node.gain.setTargetAtTime(data.gain, currentTime, 0.01);
            if ('filterType' in data && typeof data.filterType === 'string') node.type = data.filterType as BiquadFilterType;
        } else if (instance.type === 'input' || instance.type === 'uiTokens') {
            const inputData = data as InputNodeData | UiTokensNodeData;
            if ('params' in inputData && instance.outputs) {
                const outputs = instance.outputs;
                inputData.params.forEach((param) => {
                    const paramId = getInputParamHandleId(param);
                    if (outputs.has(paramId)) {
                        const paramNode = outputs.get(paramId) as ConstantSourceNode;
                        paramNode.offset.setTargetAtTime(param.value, currentTime, 0.01);
                    }
                });
            }
        } else if (instance.type === 'constantSource') {
            const node = instance.node as ConstantSourceNode;
            if ('offset' in data && typeof data.offset === 'number') {
                node.offset.setTargetAtTime(data.offset, currentTime, 0.01);
            }
        } else if (instance.type === 'note') {
            const noteData = data as NoteNodeData;
            const node = instance.node as ConstantSourceNode;
            if ('frequency' in noteData) {
                node.offset.setTargetAtTime(noteData.frequency, currentTime, 0.01);
            }
        } else if (instance.type === 'delay') {
            const node = instance.node as DelayNode;
            if ('delayTime' in data && typeof data.delayTime === 'number') node.delayTime.setTargetAtTime(data.delayTime, currentTime, 0.01);
            if ('feedback' in data && typeof data.feedback === 'number' && instance.feedbackGain) {
                instance.feedbackGain.gain.setTargetAtTime(data.feedback, currentTime, 0.01);
            }
        } else if (instance.type === 'reverb') {
            const wetNode = instance.reverbWetGain;
            const dryNode = instance.reverbDryGain;
            if ('mix' in data && typeof data.mix === 'number') {
                wetNode?.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                dryNode?.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
            if ('decay' in data && typeof data.decay === 'number' && instance.reverbConvolver) {
                instance.reverbConvolver.buffer = createReverbImpulse(this.audioContext, data.decay);
            }
        } else if (instance.type === 'compressor') {
            const compressor = instance.compressorNode;
            if (!compressor) return;
            if ('threshold' in data && typeof data.threshold === 'number') compressor.threshold.setTargetAtTime(data.threshold, currentTime, 0.01);
            if ('knee' in data && typeof data.knee === 'number') compressor.knee.setTargetAtTime(data.knee, currentTime, 0.01);
            if ('ratio' in data && typeof data.ratio === 'number') compressor.ratio.setTargetAtTime(data.ratio, currentTime, 0.01);
            if ('attack' in data && typeof data.attack === 'number') compressor.attack.setTargetAtTime(data.attack, currentTime, 0.01);
            if ('release' in data && typeof data.release === 'number') compressor.release.setTargetAtTime(data.release, currentTime, 0.01);
            const visualData = this.nodeById.get(nodeId)?.data as CompressorNodeData | undefined;
            if (visualData && instance.sidechainConnectionCount && instance.sidechainConnectionCount > 0) {
                this.clearCompressorSidechain(instance);
                this.startCompressorSidechain(instance, visualData);
            } else if ('sidechainStrength' in data && instance.compressorDuckGain) {
                // Without an active sidechain input, compressor gain must stay transparent.
                instance.compressorDuckGain.gain.setTargetAtTime(1, currentTime, 0.01);
            }
        } else if (instance.type === 'phaser') {
            if ('rate' in data && typeof data.rate === 'number' && instance.lfoOsc) {
                instance.lfoOsc.frequency.setTargetAtTime(Math.max(0.01, data.rate), currentTime, 0.01);
            }
            if ('depth' in data && typeof data.depth === 'number' && instance.phaserLfoGain) {
                const baseFrequency = (this.nodeById.get(nodeId)?.data as PhaserNodeData | undefined)?.baseFrequency ?? 1000;
                instance.phaserLfoGain.gain.setTargetAtTime(Math.max(0, data.depth) * Math.max(100, baseFrequency), currentTime, 0.01);
            }
            if ('feedback' in data && typeof data.feedback === 'number' && instance.phaserFeedbackGain) {
                instance.phaserFeedbackGain.gain.setTargetAtTime(Math.max(-0.95, Math.min(0.95, data.feedback)), currentTime, 0.01);
            }
            if ('mix' in data && typeof data.mix === 'number' && instance.phaserWetGain && instance.phaserDryGain) {
                instance.phaserWetGain.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                instance.phaserDryGain.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
            if ('baseFrequency' in data && typeof data.baseFrequency === 'number' && instance.phaserStages) {
                const value = Math.max(20, data.baseFrequency);
                instance.phaserStages.forEach((stage) => stage.frequency.setTargetAtTime(value, currentTime, 0.01));
            }
            if ('stages' in data && typeof data.stages === 'number') {
                this.refreshConnections(this.visualNodes, this.edges);
            }
        } else if (instance.type === 'flanger') {
            if ('rate' in data && typeof data.rate === 'number' && instance.lfoOsc) {
                instance.lfoOsc.frequency.setTargetAtTime(Math.max(0.01, data.rate), currentTime, 0.01);
            }
            if ('depth' in data && typeof data.depth === 'number' && instance.flangerLfoGain) {
                instance.flangerLfoGain.gain.setTargetAtTime(Math.max(0, data.depth) / 1000, currentTime, 0.01);
            }
            if ('feedback' in data && typeof data.feedback === 'number' && instance.flangerFeedbackGain) {
                instance.flangerFeedbackGain.gain.setTargetAtTime(Math.max(-0.95, Math.min(0.95, data.feedback)), currentTime, 0.01);
            }
            if ('delay' in data && typeof data.delay === 'number' && instance.flangerDelay) {
                instance.flangerDelay.delayTime.setTargetAtTime(Math.max(0, data.delay) / 1000, currentTime, 0.01);
            }
            if ('mix' in data && typeof data.mix === 'number' && instance.flangerWetGain && instance.flangerDryGain) {
                instance.flangerWetGain.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                instance.flangerDryGain.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
        } else if (instance.type === 'tremolo') {
            if ('rate' in data && typeof data.rate === 'number' && instance.lfoOsc) {
                instance.lfoOsc.frequency.setTargetAtTime(Math.max(0.01, data.rate), currentTime, 0.01);
            }
            if ('waveform' in data && typeof data.waveform === 'string' && instance.lfoOsc) {
                instance.lfoOsc.type = data.waveform as OscillatorType;
            }
            if ('depth' in data && typeof data.depth === 'number' && instance.tremoloDepthGain && instance.tremoloAmpGain) {
                const depthAmount = Math.max(0, Math.min(1, data.depth));
                instance.tremoloAmpGain.gain.setTargetAtTime(1 - depthAmount * 0.5, currentTime, 0.01);
                instance.tremoloDepthGain.gain.setTargetAtTime(depthAmount * 0.5, currentTime, 0.01);
            }
            if ('mix' in data && typeof data.mix === 'number' && instance.tremoloWetGain && instance.tremoloDryGain) {
                instance.tremoloWetGain.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                instance.tremoloDryGain.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
        } else if (instance.type === 'eq3') {
            if ('low' in data && typeof data.low === 'number' && instance.eq3LowShelf) {
                instance.eq3LowShelf.gain.setTargetAtTime(data.low, currentTime, 0.01);
            }
            if ('mid' in data && typeof data.mid === 'number' && instance.eq3MidPeak) {
                instance.eq3MidPeak.gain.setTargetAtTime(data.mid, currentTime, 0.01);
            }
            if ('high' in data && typeof data.high === 'number' && instance.eq3HighShelf) {
                instance.eq3HighShelf.gain.setTargetAtTime(data.high, currentTime, 0.01);
            }
            if (
                ('lowFrequency' in data || 'highFrequency' in data)
                && instance.eq3LowShelf
                && instance.eq3MidPeak
                && instance.eq3HighShelf
            ) {
                const visual = this.nodeById.get(nodeId)?.data as EQ3NodeData | undefined;
                const lowFrequency = Math.max(20, ('lowFrequency' in data && typeof data.lowFrequency === 'number') ? data.lowFrequency : (visual?.lowFrequency ?? 400));
                const highFrequency = Math.max(lowFrequency + MIN_EQ3_GAP_HZ, ('highFrequency' in data && typeof data.highFrequency === 'number') ? data.highFrequency : (visual?.highFrequency ?? 2500));
                const midFrequency = Math.sqrt(lowFrequency * highFrequency);
                instance.eq3LowShelf.frequency.setTargetAtTime(lowFrequency, currentTime, 0.01);
                instance.eq3MidPeak.frequency.setTargetAtTime(midFrequency, currentTime, 0.01);
                instance.eq3HighShelf.frequency.setTargetAtTime(highFrequency, currentTime, 0.01);
            }
            if ('mix' in data && typeof data.mix === 'number' && instance.eq3WetGain && instance.eq3DryGain) {
                instance.eq3WetGain.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                instance.eq3DryGain.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
        } else if (instance.type === 'distortion') {
            if ('drive' in data && typeof data.drive === 'number' && instance.distortionDriveGain) {
                instance.distortionDriveGain.gain.setTargetAtTime(1 + data.drive * 5, currentTime, 0.01);
                if (instance.distortionWaveShaper) {
                    const visualData = this.nodeById.get(nodeId)?.data as DistortionNodeData | undefined;
                    const preset = visualData?.distortionType === 'hard'
                        ? 'hardClip'
                        : visualData?.distortionType === 'saturate'
                            ? 'saturate'
                            : 'softClip';
                    instance.distortionWaveShaper.curve = createWaveShaperCurve(data.drive, preset);
                }
            }
            if ('level' in data && typeof data.level === 'number' && instance.distortionOutputGain) {
                instance.distortionOutputGain.gain.setTargetAtTime(data.level, currentTime, 0.01);
            }
            if ('mix' in data && typeof data.mix === 'number' && instance.distortionWetGain && instance.distortionDryGain) {
                instance.distortionWetGain.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                instance.distortionDryGain.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
            if ('tone' in data && typeof data.tone === 'number' && instance.distortionToneFilter) {
                instance.distortionToneFilter.frequency.setTargetAtTime(data.tone, currentTime, 0.01);
            }
            if ('distortionType' in data && typeof data.distortionType === 'string' && instance.distortionWaveShaper) {
                const visualData = this.nodeById.get(nodeId)?.data as DistortionNodeData | undefined;
                const drive = visualData?.drive ?? 0.5;
                const preset = data.distortionType === 'hard'
                    ? 'hardClip'
                    : data.distortionType === 'saturate'
                        ? 'saturate'
                        : 'softClip';
                instance.distortionWaveShaper.curve = createWaveShaperCurve(drive, preset);
            }
        } else if (instance.type === 'chorus') {
            if ('rate' in data && typeof data.rate === 'number' && instance.lfoOsc) {
                instance.lfoOsc.frequency.setTargetAtTime(data.rate, currentTime, 0.01);
            }
            if ('depth' in data && typeof data.depth === 'number' && instance.chorusLfoGain) {
                instance.chorusLfoGain.gain.setTargetAtTime(data.depth / 1000, currentTime, 0.01);
            }
            if ('feedback' in data && typeof data.feedback === 'number' && instance.chorusFeedbackGain) {
                instance.chorusFeedbackGain.gain.setTargetAtTime(data.feedback, currentTime, 0.01);
            }
            if ('delay' in data && typeof data.delay === 'number' && instance.chorusDelay) {
                instance.chorusDelay.delayTime.setTargetAtTime(data.delay / 1000, currentTime, 0.01);
            }
            if ('mix' in data && typeof data.mix === 'number' && instance.chorusWetGain && instance.chorusDryGain) {
                instance.chorusWetGain.gain.setTargetAtTime(data.mix, currentTime, 0.01);
                instance.chorusDryGain.gain.setTargetAtTime(1 - data.mix, currentTime, 0.01);
            }
        } else if (instance.type === 'noiseBurst') {
            if (instance.noiseBurstData) {
                if ('noiseType' in data && typeof data.noiseType === 'string') instance.noiseBurstData.noiseType = data.noiseType as NoiseBurstNodeData['noiseType'];
                if ('duration' in data && typeof data.duration === 'number') instance.noiseBurstData.duration = data.duration;
                if ('gain' in data && typeof data.gain === 'number') instance.noiseBurstData.gain = data.gain;
                if ('attack' in data && typeof data.attack === 'number') instance.noiseBurstData.attack = data.attack;
                if ('release' in data && typeof data.release === 'number') instance.noiseBurstData.release = data.release;
            }
        } else if (instance.type === 'waveShaper') {
            const node = instance.node as WaveShaperNode;
            const visualData = this.nodeById.get(nodeId)?.data as WaveShaperNodeData | undefined;
            const preset = visualData?.preset ?? 'softClip';
            const amount = typeof data.amount === 'number' ? data.amount : (visualData?.amount ?? 0.5);
            node.curve = createWaveShaperCurve(amount, preset);
            if ('oversample' in data && typeof data.oversample === 'string') {
                node.oversample = data.oversample as OverSampleType;
            }
            if ('preset' in data && typeof data.preset === 'string') {
                const presetValue = data.preset === 'hardClip'
                    ? 'hardClip'
                    : data.preset === 'saturate'
                        ? 'saturate'
                        : 'softClip';
                node.curve = createWaveShaperCurve(amount, presetValue);
            }
        } else if (instance.type === 'convolver') {
            const node = instance.node as ConvolverNode;
            if ('normalize' in data && typeof data.normalize === 'boolean') node.normalize = data.normalize;
            if ('impulseSrc' in data && typeof data.impulseSrc === 'string' && data.impulseSrc) {
                this.loadConvolverImpulse(nodeId, data.impulseSrc);
            }
        } else if (instance.type === 'analyzer') {
            const node = instance.node as AnalyserNode;
            if ('fftSize' in data && typeof data.fftSize === 'number') node.fftSize = data.fftSize;
            if ('smoothingTimeConstant' in data && typeof data.smoothingTimeConstant === 'number') node.smoothingTimeConstant = data.smoothingTimeConstant;
        } else if (instance.type === 'panner3d') {
            const node = instance.node as PannerNode;
            if ('positionX' in data && typeof data.positionX === 'number') node.positionX.setTargetAtTime(data.positionX, currentTime, 0.01);
            if ('positionY' in data && typeof data.positionY === 'number') node.positionY.setTargetAtTime(data.positionY, currentTime, 0.01);
            if ('positionZ' in data && typeof data.positionZ === 'number') node.positionZ.setTargetAtTime(data.positionZ, currentTime, 0.01);
            if ('refDistance' in data && typeof data.refDistance === 'number') node.refDistance = data.refDistance;
            if ('maxDistance' in data && typeof data.maxDistance === 'number') node.maxDistance = data.maxDistance;
            if ('rolloffFactor' in data && typeof data.rolloffFactor === 'number') node.rolloffFactor = data.rolloffFactor;
            if ('panningModel' in data && typeof data.panningModel === 'string') node.panningModel = data.panningModel as PanningModelType;
            if ('distanceModel' in data && typeof data.distanceModel === 'string') node.distanceModel = data.distanceModel as DistanceModelType;
        } else if (instance.type === 'panner') {
            const node = instance.node as StereoPannerNode;
            if ('pan' in data && typeof data.pan === 'number') node.pan.setTargetAtTime(data.pan, currentTime, 0.01);
        } else if (instance.type === 'auxSend') {
            if ('sendGain' in data && typeof data.sendGain === 'number' && instance.auxSendGain) {
                instance.auxSendGain.gain.setTargetAtTime(Math.max(0, data.sendGain), currentTime, 0.01);
            }
            if ('busId' in data && typeof data.busId === 'string') {
                instance.auxBusId = data.busId.trim() || 'aux';
                this.refreshConnections(this.visualNodes, this.edges);
            }
        } else if (instance.type === 'auxReturn') {
            if ('gain' in data && typeof data.gain === 'number' && instance.auxReturnGain) {
                instance.auxReturnGain.gain.setTargetAtTime(Math.max(0, data.gain), currentTime, 0.01);
            }
            if ('busId' in data && typeof data.busId === 'string') {
                instance.auxBusId = data.busId.trim() || 'aux';
                this.refreshConnections(this.visualNodes, this.edges);
            }
        } else if (instance.type === 'matrixMixer') {
            const matrixData = this.nodeById.get(nodeId)?.data as MatrixMixerNodeData | undefined;
            if (!matrixData) return;
            if (
                ('inputs' in data && typeof data.inputs === 'number')
                || ('outputs' in data && typeof data.outputs === 'number')
            ) {
                this.refreshConnections(this.visualNodes, this.edges);
                return;
            }
            const cellEntries = Object.entries(data).filter(([key, value]) => key.startsWith('cell:') && typeof value === 'number');
            cellEntries.forEach(([key, value]) => {
                const match = /^cell:(\d+):(\d+)$/.exec(key);
                if (!match || !instance.matrixCells) return;
                const row = Number(match[1]);
                const column = Number(match[2]);
                const cellGain = instance.matrixCells[row]?.[column];
                if (!cellGain) return;
                cellGain.gain.setTargetAtTime(Math.max(0, Math.min(1, value as number)), currentTime, 0.01);
            });
        } else if (instance.type === 'mediaStream') {
            if ('requestMic' in data && typeof data.requestMic === 'boolean') {
                this.attachMediaStream(nodeId, data.requestMic);
            }
        } else if (instance.type === 'output') {
            const node = instance.node as GainNode;
            if ('masterGain' in data && typeof data.masterGain === 'number') node.gain.setTargetAtTime(data.masterGain, currentTime, 0.01);
        } else if (instance.type === 'stepSequencer') {
            if (instance.sequencerData) {
                if ('pattern' in data) instance.sequencerData.pattern = data.pattern as number[];
                if ('activeSteps' in data) instance.sequencerData.activeSteps = data.activeSteps as boolean[];
                if ('steps' in data && typeof data.steps === 'number') instance.sequencerData.steps = data.steps;
            }
        } else if (instance.type === 'pianoRoll') {
            if (instance.pianoRollData) {
                if ('notes' in data) instance.pianoRollData.notes = data.notes as PianoRollNodeData['notes'];
                if ('steps' in data && typeof data.steps === 'number') instance.pianoRollData.steps = data.steps;
                if ('octaves' in data && typeof data.octaves === 'number') instance.pianoRollData.octaves = data.octaves;
                if ('baseNote' in data && typeof data.baseNote === 'number') instance.pianoRollData.baseNote = data.baseNote;
            }
        } else if (instance.type === 'adsr') {
            if (instance.adsrData) {
                if ('attack' in data && typeof data.attack === 'number') instance.adsrData.attack = data.attack;
                if ('decay' in data && typeof data.decay === 'number') instance.adsrData.decay = data.decay;
                if ('sustain' in data && typeof data.sustain === 'number') instance.adsrData.sustain = data.sustain;
                if ('release' in data && typeof data.release === 'number') instance.adsrData.release = data.release;
            }
        } else if (instance.type === 'voice') {
            if ('portamento' in data && typeof data.portamento === 'number' && instance.voiceData) {
                instance.voiceData.portamento = data.portamento;
            }
        } else if (instance.type === 'lfo') {
            if ('rate' in data && typeof data.rate === 'number' && instance.lfoOsc) {
                instance.lfoOsc.frequency.setTargetAtTime(data.rate, currentTime, 0.01);
            }
            if ('depth' in data && typeof data.depth === 'number' && instance.params) {
                const depthParam = instance.params.get('depth');
                if (depthParam) depthParam.setTargetAtTime(data.depth, currentTime, 0.01);
            }
            if ('waveform' in data && typeof data.waveform === 'string' && instance.lfoOsc) {
                instance.lfoOsc.type = data.waveform as OscillatorType;
            }
        } else if (instance.type === 'eventTrigger') {
            if (!instance.eventTriggerData || !(instance.node instanceof ConstantSourceNode)) return;

            if ('mode' in data && typeof data.mode === 'string') instance.eventTriggerData.mode = data.mode as EventTriggerNodeData['mode'];
            if ('cooldownMs' in data && typeof data.cooldownMs === 'number') instance.eventTriggerData.cooldownMs = Math.max(0, data.cooldownMs);
            if ('velocity' in data && typeof data.velocity === 'number') instance.eventTriggerData.velocity = Math.max(0, Math.min(1, data.velocity));
            if ('duration' in data && typeof data.duration === 'number') instance.eventTriggerData.duration = Math.max(0, data.duration);
            if ('note' in data && typeof data.note === 'number') instance.eventTriggerData.note = data.note;
            if ('trackId' in data && typeof data.trackId === 'string') instance.eventTriggerData.trackId = data.trackId;

            if ('token' in data && typeof data.token === 'number') {
                const previous = instance.eventTriggerData.token;
                const next = data.token;
                instance.eventTriggerData.token = next;

                const shouldEmit = instance.eventTriggerData.mode === 'rising'
                    ? next > previous
                    : !Object.is(next, previous);
                if (!shouldEmit) return;

                const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
                if ((nowMs - instance.eventTriggerData.lastEmitAtMs) < instance.eventTriggerData.cooldownMs) return;
                instance.eventTriggerData.lastEmitAtMs = nowMs;

                const startTime = Math.max(currentTime, this.audioContext.currentTime);
                instance.node.offset.cancelScheduledValues(startTime);
                instance.node.offset.setValueAtTime(1, startTime);
                instance.node.offset.setValueAtTime(0, startTime + 0.02);

                this.triggerSequencerTargets(
                    nodeId,
                    startTime,
                    instance.eventTriggerData.velocity,
                    Math.max(0.01, instance.eventTriggerData.duration),
                    instance.eventTriggerData.note
                );
            }
        } else if (instance.type === 'midiNoteOutput') {
            if (!instance.midiNoteOutputState) return;
            const visualData = this.nodeById.get(nodeId)?.data as MidiNoteOutputNodeData | undefined;
            if (!visualData) return;

            const gateInput = this.getControlInputValue(nodeId, 'gate');
            const noteInput = this.getControlInputValue(nodeId, 'note');
            const frequencyInput = this.getControlInputValue(nodeId, 'frequency');
            const velocityInput = this.getControlInputValue(nodeId, 'velocity');
            const nextGate = (typeof gateInput === 'number' ? gateInput : visualData.gate) > 0.5;
            const nextVelocity = Math.max(0, Math.min(1, typeof velocityInput === 'number' ? velocityInput : visualData.velocity));
            const nextNote = typeof noteInput === 'number'
                ? Math.round(noteInput)
                : typeof frequencyInput === 'number'
                    ? this.frequencyToMidiNote(frequencyInput)
                    : Math.round(visualData.note);
            const previous = instance.midiNoteOutputState;

            if (
                previous.active
                && previous.note !== null
                && (
                    !nextGate
                    || previous.note !== nextNote
                    || previous.outputId !== visualData.outputId
                    || previous.channel !== visualData.channel
                )
            ) {
                editorMidiRuntime.sendNoteOff({
                    outputId: previous.outputId,
                    channel: previous.channel,
                    note: previous.note,
                    velocity: 0,
                });
            }

            if (
                nextGate
                && (
                    !previous.active
                    || previous.note !== nextNote
                    || previous.outputId !== visualData.outputId
                    || previous.channel !== visualData.channel
                    || previous.velocity !== nextVelocity
                )
            ) {
                editorMidiRuntime.sendNoteOn({
                    outputId: visualData.outputId ?? null,
                    channel: visualData.channel,
                    note: nextNote,
                    velocity: nextVelocity,
                });
            }

            instance.midiNoteOutputState = {
                active: nextGate,
                note: nextNote,
                outputId: visualData.outputId ?? null,
                channel: visualData.channel,
                velocity: nextVelocity,
            };
        } else if (instance.type === 'midiCCOutput') {
            if (!instance.midiCCOutputState) return;
            const visualData = this.nodeById.get(nodeId)?.data as MidiCCOutputNodeData | undefined;
            if (!visualData) return;

            const valueInput = this.getControlInputValue(nodeId, 'value');
            const nextValue = typeof valueInput === 'number' ? valueInput : visualData.value;
            const signature = `${visualData.outputId ?? 'default'}:${visualData.channel}:${visualData.cc}:${visualData.valueFormat}:${nextValue}`;
            if (signature === instance.midiCCOutputState.signature || !Number.isFinite(nextValue)) return;

            instance.midiCCOutputState.signature = signature;
            editorMidiRuntime.sendCC({
                outputId: visualData.outputId ?? null,
                channel: visualData.channel,
                cc: visualData.cc,
                value: nextValue,
                valueFormat: visualData.valueFormat,
            });
        } else if (instance.type === 'sampler' && instance.samplerData) {
            if ('src' in data && typeof data.src === 'string') instance.samplerData.src = data.src;
            if ('loop' in data && typeof data.loop === 'boolean') instance.samplerData.loop = data.loop;
            if ('playbackRate' in data && typeof data.playbackRate === 'number') {
                instance.samplerData.playbackRate = data.playbackRate;
                this.updateSamplerParam(nodeId, 'playbackRate', data.playbackRate);
            }
            if ('detune' in data && typeof data.detune === 'number') {
                instance.samplerData.detune = data.detune;
                this.updateSamplerParam(nodeId, 'detune', data.detune);
            }
        }
    }

    get playing(): boolean {
        return this.isPlaying;
    }
}

// Singleton instance
export const audioEngine = new AudioEngine();
