import type { Node } from '@xyflow/react';
import type {
    AudioNodeData,
    InputNodeData,
    MidiCCNodeData,
    MidiCCOutputNodeData,
    MidiNoteNodeData,
    MidiNoteOutputNodeData,
    MidiSyncNodeData,
    OutputNodeData,
    TransportNodeData,
    UiTokensNodeData,
} from './store';
import type { EditorNodeType } from './nodeCatalog';
import { createUiTokenParams, normalizeUiTokensNodeData } from './uiTokens';

export const DEFAULT_NODE_SIZE = {
    width: 160,
    height: 120,
};

export const createDefaultOutputData = (): OutputNodeData => ({
    type: 'output',
    playing: false,
    masterGain: 0.5,
    label: 'Output',
});

export const createDefaultTransportData = (): TransportNodeData => ({
    type: 'transport',
    bpm: 120,
    playing: false,
    beatsPerBar: 4,
    beatUnit: 4,
    stepsPerBeat: 4,
    barsPerPhrase: 4,
    swing: 0,
    label: 'Transport',
});

export const createDefaultInputData = (): InputNodeData => ({
    type: 'input',
    params: [],
    label: 'Params',
});

export const createDefaultUiTokensData = (): UiTokensNodeData =>
    normalizeUiTokensNodeData({
        type: 'uiTokens',
        params: createUiTokenParams(),
        label: 'UI Tokens',
    });

export const createDefaultMidiNoteData = (): MidiNoteNodeData => ({
    type: 'midiNote',
    inputId: 'default',
    channel: 'all',
    noteMode: 'all',
    note: 60,
    noteMin: 48,
    noteMax: 72,
    mappingEnabled: false,
    mappings: [],
    activeMappingId: null,
    label: 'Midi In',
});

export const createDefaultMidiCCData = (): MidiCCNodeData => ({
    type: 'midiCC',
    inputId: 'default',
    channel: 'all',
    cc: 1,
    label: 'Knob / CC In',
});

export const createDefaultMidiNoteOutputData = (): MidiNoteOutputNodeData => ({
    type: 'midiNoteOutput',
    outputId: null,
    channel: 1,
    gate: 0,
    note: 60,
    frequency: 261.63,
    velocity: 1,
    label: 'Note Out',
});

export const createDefaultMidiCCOutputData = (): MidiCCOutputNodeData => ({
    type: 'midiCCOutput',
    outputId: null,
    channel: 1,
    cc: 1,
    value: 0,
    valueFormat: 'normalized',
    label: 'CC Out',
});

export const createDefaultMidiSyncData = (): MidiSyncNodeData => ({
    type: 'midiSync',
    mode: 'transport-master',
    inputId: null,
    outputId: null,
    sendStartStop: true,
    sendClock: true,
    label: 'Sync',
});

export function createEditorNode(
    id: string,
    type: EditorNodeType,
    position: { x: number; y: number }
): Node<AudioNodeData> | null {
    switch (type) {
        case 'osc':
            return {
                id,
                type: 'oscNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' } as AudioNodeData,
            };
        case 'gain':
            return {
                id,
                type: 'gainNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'gain', gain: 0.5, label: 'Gain' } as AudioNodeData,
            };
        case 'filter':
            return {
                id,
                type: 'filterNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'filter',
                    filterType: 'lowpass',
                    frequency: 1000,
                    detune: 0,
                    q: 1,
                    gain: 0,
                    label: 'Filter',
                } as AudioNodeData,
            };
        case 'output':
            return {
                id,
                type: 'outputNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultOutputData() as AudioNodeData,
            };
        case 'noise':
            return {
                id,
                type: 'noiseNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'noise', noiseType: 'white', label: 'Noise' } as AudioNodeData,
            };
        case 'delay':
            return {
                id,
                type: 'delayNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'delay', delayTime: 0.3, feedback: 0.4, label: 'Delay' } as AudioNodeData,
            };
        case 'reverb':
            return {
                id,
                type: 'reverbNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'reverb', decay: 2, mix: 0.5, label: 'Reverb' } as AudioNodeData,
            };
        case 'compressor':
            return {
                id,
                type: 'compressorNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'compressor',
                    threshold: -24,
                    knee: 30,
                    ratio: 12,
                    attack: 0.003,
                    release: 0.25,
                    sidechainStrength: 0.7,
                    label: 'Compressor',
                } as AudioNodeData,
            };
        case 'phaser':
            return {
                id,
                type: 'phaserNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'phaser', rate: 0.5, depth: 0.5, feedback: 0.7, baseFrequency: 1000, stages: 4, mix: 0.5, label: 'Phaser' } as AudioNodeData,
            };
        case 'flanger':
            return {
                id,
                type: 'flangerNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'flanger', rate: 0.2, depth: 2, feedback: 0.5, delay: 1, mix: 0.5, label: 'Flanger' } as AudioNodeData,
            };
        case 'tremolo':
            return {
                id,
                type: 'tremoloNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'tremolo', rate: 4, depth: 0.5, waveform: 'sine', stereo: false, mix: 0.5, label: 'Tremolo' } as AudioNodeData,
            };
        case 'eq3':
            return {
                id,
                type: 'eq3Node',
                position,
                dragHandle: '.node-header',
                data: { type: 'eq3', low: 0, mid: 0, high: 0, lowFrequency: 400, highFrequency: 2500, mix: 1, label: 'EQ3' } as AudioNodeData,
            };
        case 'distortion':
            return {
                id,
                type: 'distortionNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'distortion', distortionType: 'soft', drive: 0.5, level: 0.5, mix: 0.5, tone: 4000, label: 'Distortion' } as AudioNodeData,
            };
        case 'chorus':
            return {
                id,
                type: 'chorusNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'chorus', rate: 1.5, depth: 3.5, feedback: 0.2, delay: 20, mix: 0.5, stereo: true, label: 'Chorus' } as AudioNodeData,
            };
        case 'noiseBurst':
            return {
                id,
                type: 'noiseBurstNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'noiseBurst', noiseType: 'white', duration: 0.1, gain: 1, attack: 0.001, release: 0.05, label: 'Noise Burst' } as AudioNodeData,
            };
        case 'waveShaper':
            return {
                id,
                type: 'waveShaperNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'waveShaper', amount: 0.5, preset: 'softClip', oversample: '2x', label: 'WaveShaper' } as AudioNodeData,
            };
        case 'convolver':
            return {
                id,
                type: 'convolverNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'convolver', impulseSrc: '', impulseId: '', impulseFileName: '', normalize: true, label: 'Convolver' } as AudioNodeData,
            };
        case 'analyzer':
            return {
                id,
                type: 'analyzerNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'analyzer', fftSize: 2048, smoothingTimeConstant: 0.8, updateRate: 60, autoUpdate: true, label: 'Analyzer' } as AudioNodeData,
            };
        case 'panner3d':
            return {
                id,
                type: 'panner3dNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'panner3d', positionX: 0, positionY: 0, positionZ: 0, refDistance: 1, maxDistance: 10000, rolloffFactor: 1, panningModel: 'equalpower', distanceModel: 'inverse', label: 'Panner 3D' } as AudioNodeData,
            };
        case 'constantSource':
            return {
                id,
                type: 'constantSourceNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'constantSource', offset: 1, label: 'Constant Source' } as AudioNodeData,
            };
        case 'mediaStream':
            return {
                id,
                type: 'mediaStreamNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'mediaStream', requestMic: false, label: 'Media Stream' } as AudioNodeData,
            };
        case 'eventTrigger':
            return {
                id,
                type: 'eventTriggerNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 0, velocity: 1, duration: 0.1, note: 60, trackId: 'event', label: 'Event Trigger' } as AudioNodeData,
            };
        case 'panner':
            return {
                id,
                type: 'pannerNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'panner', pan: 0, label: 'Pan' } as AudioNodeData,
            };
        case 'mixer':
            return {
                id,
                type: 'mixerNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'mixer', inputs: 3, label: 'Mixer' } as AudioNodeData,
            };
        case 'auxSend':
            return {
                id,
                type: 'auxSendNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'auxSend', busId: 'aux', sendGain: 0.5, tap: 'pre', label: 'Aux Send' } as AudioNodeData,
            };
        case 'auxReturn':
            return {
                id,
                type: 'auxReturnNode',
                position,
                dragHandle: '.node-header',
                data: { type: 'auxReturn', busId: 'aux', gain: 1, label: 'Aux Return' } as AudioNodeData,
            };
        case 'matrixMixer':
            return {
                id,
                type: 'matrixMixerNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'matrixMixer',
                    inputs: 4,
                    outputs: 4,
                    matrix: [
                        [1, 0, 0, 0],
                        [0, 1, 0, 0],
                        [0, 0, 1, 0],
                        [0, 0, 0, 1],
                    ],
                    label: 'Matrix Mixer',
                } as AudioNodeData,
            };
        case 'input':
            return {
                id,
                type: 'inputNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultInputData() as AudioNodeData,
            };
        case 'uiTokens':
            return {
                id,
                type: 'uiTokensNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultUiTokensData() as AudioNodeData,
            };
        case 'note':
            return {
                id,
                type: 'noteNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'note',
                    note: 'C',
                    octave: 4,
                    frequency: 261.6,
                    language: 'en',
                    label: 'Note',
                } as AudioNodeData,
            };
        case 'stepSequencer':
            return {
                id,
                type: 'stepSequencerNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'stepSequencer',
                    steps: 16,
                    pattern: Array(16).fill(0.8),
                    activeSteps: Array(16).fill(false),
                    label: 'Step Sequencer',
                } as AudioNodeData,
            };
        case 'pianoRoll':
            return {
                id,
                type: 'pianoRollNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'pianoRoll',
                    steps: 16,
                    octaves: 2,
                    baseNote: 48,
                    notes: [],
                    label: 'Piano Roll',
                } as AudioNodeData,
            };
        case 'lfo':
            return {
                id,
                type: 'lfoNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'lfo',
                    rate: 1,
                    depth: 500,
                    waveform: 'sine',
                    label: 'LFO',
                } as AudioNodeData,
            };
        case 'adsr':
            return {
                id,
                type: 'adsrNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'adsr',
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.5,
                    release: 0.5,
                    label: 'ADSR',
                } as AudioNodeData,
            };
        case 'transport':
            return {
                id,
                type: 'transportNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultTransportData() as AudioNodeData,
            };
        case 'voice':
            return {
                id,
                type: 'voiceNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'voice',
                    portamento: 0,
                    label: 'Voice',
                } as AudioNodeData,
            };
        case 'sampler':
            return {
                id,
                type: 'samplerNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'sampler',
                    src: '',
                    loop: false,
                    playbackRate: 1,
                    detune: 0,
                    loaded: false,
                    label: 'Sampler',
                } as AudioNodeData,
            };
        case 'midiNote':
            return {
                id,
                type: 'midiNoteNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultMidiNoteData() as AudioNodeData,
            };
        case 'midiCC':
            return {
                id,
                type: 'midiCCNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultMidiCCData() as AudioNodeData,
            };
        case 'midiNoteOutput':
            return {
                id,
                type: 'midiNoteOutputNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultMidiNoteOutputData() as AudioNodeData,
            };
        case 'midiCCOutput':
            return {
                id,
                type: 'midiCCOutputNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultMidiCCOutputData() as AudioNodeData,
            };
        case 'midiSync':
            return {
                id,
                type: 'midiSyncNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultMidiSyncData() as AudioNodeData,
            };
        case 'math':
            return {
                id,
                type: 'mathNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'math',
                    operation: 'add',
                    a: 0,
                    b: 0,
                    c: 0,
                    label: 'Math',
                } as AudioNodeData,
            };
        case 'compare':
            return {
                id,
                type: 'compareNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'compare',
                    operation: 'gt',
                    a: 0,
                    b: 0,
                    label: 'Compare',
                } as AudioNodeData,
            };
        case 'mix':
            return {
                id,
                type: 'mixNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'mix',
                    a: 0,
                    b: 1,
                    t: 0.5,
                    clamp: true,
                    label: 'Mix',
                } as AudioNodeData,
            };
        case 'clamp':
            return {
                id,
                type: 'clampNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'clamp',
                    mode: 'range',
                    value: 0,
                    min: 0,
                    max: 1,
                    label: 'Clamp',
                } as AudioNodeData,
            };
        case 'switch':
            return {
                id,
                type: 'switchNode',
                position,
                dragHandle: '.node-header',
                data: {
                    type: 'switch',
                    inputs: 3,
                    selectedIndex: 0,
                    values: [0, 0, 0],
                    label: 'Switch',
                } as AudioNodeData,
            };
        default:
            return null;
    }
}
