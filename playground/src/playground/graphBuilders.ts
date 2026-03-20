import type { Node } from '@xyflow/react';
import type { AudioNodeData, OutputNodeData, TransportNodeData, InputNodeData } from './store';
import type { PlaygroundNodeType } from './nodeCatalog';

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

export function createPlaygroundNode(
    id: string,
    type: PlaygroundNodeType,
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
        case 'input':
            return {
                id,
                type: 'inputNode',
                position,
                dragHandle: '.node-header',
                data: createDefaultInputData() as AudioNodeData,
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
