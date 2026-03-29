import { describe, expect, it } from 'vitest';

import type { Node } from '@xyflow/react';

import type { AudioNodeData } from '../../ui/editor/store';
import {
    getCompatibleExistingHandleMatches,
    getCompatibleNodeSuggestions,
    canConnect,
    normalizeTransportNodeData,
    normalizeConnectionFromStart,
} from '../../ui/editor/nodeHelpers';

const createNode = (node: Node<AudioNodeData>) => node;

describe('editor connection assist helpers', () => {
    it('normalizes invalid transport timing values to safe defaults', () => {
        const normalized = normalizeTransportNodeData({
            type: 'transport',
            bpm: 0,
            playing: true,
            beatsPerBar: -2,
            beatUnit: 0,
            stepsPerBeat: NaN,
            barsPerPhrase: Infinity,
            swing: 10,
            label: '  Transport  ',
        });

        expect(normalized).toMatchObject({
            type: 'transport',
            bpm: 120,
            playing: true,
            beatsPerBar: 4,
            beatUnit: 4,
            stepsPerBeat: 4,
            barsPerPhrase: 4,
            swing: 1,
            label: 'Transport',
        });
    });

    it('finds compatible existing targets from a source drag', () => {
        const nodes = [
            createNode({
                id: 'osc-1',
                type: 'oscNode',
                position: { x: 0, y: 0 },
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
            }),
            createNode({
                id: 'gain-1',
                type: 'gainNode',
                position: { x: 0, y: 0 },
                data: { type: 'gain', gain: 0.5, label: 'Gain' },
            }),
            createNode({
                id: 'output-1',
                type: 'outputNode',
                position: { x: 0, y: 0 },
                data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
            }),
        ];

        const matches = getCompatibleExistingHandleMatches({
            nodeId: 'osc-1',
            handleId: 'out',
            handleType: 'source',
        }, nodes);

        expect(matches.map((match) => match.key)).toEqual(expect.arrayContaining([
            'gain-1:in',
            'output-1:in',
        ]));
    });

    it('reverses compatibility for a target-start drag', () => {
        const nodes = [
            createNode({
                id: 'osc-1',
                type: 'oscNode',
                position: { x: 0, y: 0 },
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
            }),
            createNode({
                id: 'voice-1',
                type: 'voiceNode',
                position: { x: 0, y: 0 },
                data: { type: 'voice', portamento: 0, label: 'Voice' },
            }),
            createNode({
                id: 'note-1',
                type: 'noteNode',
                position: { x: 0, y: 0 },
                data: { type: 'note', note: 'C', octave: 4, frequency: 261.6, language: 'en', label: 'Note' },
            }),
        ];

        const matches = getCompatibleExistingHandleMatches({
            nodeId: 'osc-1',
            handleId: 'frequency',
            handleType: 'target',
        }, nodes);

        expect(matches.map((match) => `${match.nodeId}:${match.handleId}`)).toEqual(expect.arrayContaining([
            'voice-1:note',
            'note-1:freq',
        ]));

        expect(normalizeConnectionFromStart(
            { nodeId: 'osc-1', handleId: 'frequency', handleType: 'target' },
            { nodeId: 'voice-1', handleId: 'note', handleType: 'source' }
        )).toEqual({
            source: 'voice-1',
            sourceHandle: 'note',
            target: 'osc-1',
            targetHandle: 'frequency',
        });
    });

    it('filters singleton node suggestions and keeps menu labels stable', () => {
        const nodes = [
            createNode({
                id: 'osc-1',
                type: 'oscNode',
                position: { x: 0, y: 0 },
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
            }),
            createNode({
                id: 'output-1',
                type: 'outputNode',
                position: { x: 0, y: 0 },
                data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
            }),
        ];

        const suggestions = getCompatibleNodeSuggestions({
            nodeId: 'osc-1',
            handleId: 'out',
            handleType: 'source',
        }, nodes);

        expect(suggestions.some((suggestion) => suggestion.type === 'output')).toBe(false);
        expect(suggestions.some((suggestion) => suggestion.title === 'Filter -> In')).toBe(true);
        expect(suggestions.some((suggestion) => suggestion.title === 'Mixer -> In 1')).toBe(true);
    });

    it('offers ADSR envelope targets and add-on-drop suggestions', () => {
        const nodes = [
            createNode({
                id: 'adsr-1',
                type: 'adsrNode',
                position: { x: 0, y: 0 },
                data: { type: 'adsr', attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5, label: 'ADSR' },
            }),
            createNode({
                id: 'filter-1',
                type: 'filterNode',
                position: { x: 0, y: 0 },
                data: { type: 'filter', filterType: 'lowpass', frequency: 1000, detune: 0, q: 1, gain: 0, label: 'Filter' },
            }),
        ];

        const matches = getCompatibleExistingHandleMatches({
            nodeId: 'adsr-1',
            handleId: 'envelope',
            handleType: 'source',
        }, nodes);

        expect(matches.map((match) => `${match.nodeId}:${match.handleId}`)).toEqual(expect.arrayContaining([
            'filter-1:frequency',
            'filter-1:q',
            'filter-1:gain',
        ]));

        const suggestions = getCompatibleNodeSuggestions({
            nodeId: 'adsr-1',
            handleId: 'envelope',
            handleType: 'source',
        }, [nodes[0]]);

        expect(suggestions.some((suggestion) => suggestion.title === 'Gain -> Gain')).toBe(true);
        expect(suggestions.some((suggestion) => suggestion.title === 'Filter -> Freq')).toBe(true);
    });

    it('treats uiTokens outputs as control sources for compatible targets', () => {
        const nodes = [
            createNode({
                id: 'ui-1',
                type: 'uiTokensNode',
                position: { x: 0, y: 0 },
                data: {
                    type: 'uiTokens',
                    label: 'UI Tokens',
                    params: [
                        { id: 'hoverToken', name: 'hoverToken', label: 'Hover Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        { id: 'successToken', name: 'successToken', label: 'Success Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                        { id: 'errorToken', name: 'errorToken', label: 'Error Token', type: 'float', value: 0, defaultValue: 0, min: 0, max: 9999 },
                    ],
                },
            }),
            createNode({
                id: 'event-1',
                type: 'eventTriggerNode',
                position: { x: 0, y: 0 },
                data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 0, velocity: 1, duration: 0.1, note: 60, trackId: 'event', label: 'Event Trigger' },
            }),
        ];

        const matches = getCompatibleExistingHandleMatches({
            nodeId: 'ui-1',
            handleId: 'param:hoverToken',
            handleType: 'source',
        }, nodes);

        expect(matches.map((match) => `${match.nodeId}:${match.handleId}`)).toContain('event-1:token');
    });

    it('accepts audio sidechain links and matrix cell modulation links', () => {
        const nodes = [
            createNode({
                id: 'osc-1',
                type: 'oscNode',
                position: { x: 0, y: 0 },
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
            }),
            createNode({
                id: 'lfo-1',
                type: 'lfoNode',
                position: { x: 0, y: 0 },
                data: { type: 'lfo', rate: 1, depth: 0.5, waveform: 'sine', label: 'LFO' },
            }),
            createNode({
                id: 'compressor-1',
                type: 'compressorNode',
                position: { x: 0, y: 0 },
                data: { type: 'compressor', threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25, sidechainStrength: 0.7, label: 'Compressor' },
            }),
            createNode({
                id: 'matrix-1',
                type: 'matrixMixerNode',
                position: { x: 0, y: 0 },
                data: { type: 'matrixMixer', inputs: 2, outputs: 2, matrix: [[1, 0], [0, 1]], label: 'Matrix Mixer' },
            }),
        ];

        const nodeById = new Map(nodes.map((node) => [node.id, node]));

        expect(canConnect({
            source: 'osc-1',
            sourceHandle: 'out',
            target: 'compressor-1',
            targetHandle: 'sidechainIn',
        }, nodeById)).toBe(true);

        expect(canConnect({
            source: 'matrix-1',
            sourceHandle: 'out2',
            target: 'compressor-1',
            targetHandle: 'in',
        }, nodeById)).toBe(true);

        expect(canConnect({
            source: 'lfo-1',
            sourceHandle: 'out',
            target: 'matrix-1',
            targetHandle: 'cell:0:1',
        }, nodeById)).toBe(true);
    });

    it('prioritizes MIDI suggestions and supports MIDI output targets', () => {
        const midiNoteNode = createNode({
            id: 'midi-note-1',
            type: 'midiNoteNode',
            position: { x: 0, y: 0 },
            data: { type: 'midiNote', inputId: 'default', channel: 'all', noteMode: 'all', note: 60, noteMin: 48, noteMax: 72, mappingEnabled: false, mappings: [], activeMappingId: null, label: 'Midi In' },
        });
        const midiCCNode = createNode({
            id: 'midi-cc-1',
            type: 'midiCCNode',
            position: { x: 0, y: 0 },
            data: { type: 'midiCC', inputId: 'default', channel: 'all', cc: 1, label: 'Knob / CC In' },
        });
        const voiceNode = createNode({
            id: 'voice-1',
            type: 'voiceNode',
            position: { x: 0, y: 0 },
            data: { type: 'voice', portamento: 0, label: 'Voice' },
        });
        const adsrNode = createNode({
            id: 'adsr-1',
            type: 'adsrNode',
            position: { x: 0, y: 0 },
            data: { type: 'adsr', attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5, label: 'ADSR' },
        });
        const samplerNode = createNode({
            id: 'sampler-1',
            type: 'samplerNode',
            position: { x: 0, y: 0 },
            data: { type: 'sampler', src: '', loop: false, playbackRate: 1, detune: 0, loaded: false, label: 'Sampler' },
        });
        const noiseBurstNode = createNode({
            id: 'noise-burst-1',
            type: 'noiseBurstNode',
            position: { x: 0, y: 0 },
            data: { type: 'noiseBurst', noiseType: 'white', duration: 0.1, gain: 1, attack: 0.001, release: 0.05, label: 'Noise Burst' },
        });
        const filterNode = createNode({
            id: 'filter-1',
            type: 'filterNode',
            position: { x: 0, y: 0 },
            data: { type: 'filter', filterType: 'lowpass', frequency: 1000, detune: 0, q: 1, gain: 0, label: 'Filter' },
        });
        const gainNode = createNode({
            id: 'gain-1',
            type: 'gainNode',
            position: { x: 0, y: 0 },
            data: { type: 'gain', gain: 0.5, label: 'Gain' },
        });
        const pannerNode = createNode({
            id: 'panner-1',
            type: 'stereoPannerNode',
            position: { x: 0, y: 0 },
            data: { type: 'panner', pan: 0, label: 'Pan' },
        });
        const lfoNode = createNode({
            id: 'lfo-1',
            type: 'lfoNode',
            position: { x: 0, y: 0 },
            data: { type: 'lfo', rate: 1, depth: 0.5, waveform: 'sine', label: 'LFO' },
        });
        const midiNoteOutputNode = createNode({
            id: 'midi-note-out-1',
            type: 'midiNoteOutputNode',
            position: { x: 0, y: 0 },
            data: { type: 'midiNoteOutput', outputId: null, channel: 1, gate: 0, note: 60, frequency: 261.63, velocity: 1, label: 'Note Out' },
        });
        const midiCCOutputNode = createNode({
            id: 'midi-cc-out-1',
            type: 'midiCCOutputNode',
            position: { x: 0, y: 0 },
            data: { type: 'midiCCOutput', outputId: null, channel: 1, cc: 1, value: 0, valueFormat: 'normalized', label: 'CC Out' },
        });

        const nodes = [
            midiNoteNode,
            midiCCNode,
            voiceNode,
            adsrNode,
            samplerNode,
            noiseBurstNode,
            filterNode,
            gainNode,
            pannerNode,
            lfoNode,
            midiNoteOutputNode,
            midiCCOutputNode,
        ];
        const nodeById = new Map(nodes.map((node) => [node.id, node]));

        const midiTriggerMatches = getCompatibleExistingHandleMatches({
            nodeId: 'midi-note-1',
            handleId: 'trigger',
            handleType: 'source',
        }, nodes);

        expect(midiTriggerMatches.map((match) => `${match.nodeId}:${match.handleId}`)).toEqual(expect.arrayContaining([
            'voice-1:trigger',
            'adsr-1:gate',
            'sampler-1:trigger',
            'noise-burst-1:trigger',
            'midi-note-out-1:trigger',
        ]));

        const midiTriggerSuggestions = getCompatibleNodeSuggestions({
            nodeId: 'midi-note-1',
            handleId: 'trigger',
            handleType: 'source',
        }, [midiNoteNode]);

        expect(midiTriggerSuggestions.slice(0, 5).map((suggestion) => suggestion.type)).toEqual([
            'voice',
            'adsr',
            'sampler',
            'noiseBurst',
            'midiNoteOutput',
        ]);

        const midiCCSuggestions = getCompatibleNodeSuggestions({
            nodeId: 'midi-cc-1',
            handleId: 'normalized',
            handleType: 'source',
        }, [midiCCNode]);

        expect(midiCCSuggestions[0]?.type).toBe('filter');
        expect(midiCCSuggestions.some((suggestion) => suggestion.type === 'gain')).toBe(true);
        expect(midiCCSuggestions.some((suggestion) => suggestion.type === 'panner')).toBe(true);
        expect(midiCCSuggestions.some((suggestion) => suggestion.type === 'lfo')).toBe(true);
        expect(midiCCSuggestions.some((suggestion) => suggestion.type === 'midiCCOutput')).toBe(true);

        expect(canConnect({
            source: 'midi-note-1',
            sourceHandle: 'trigger',
            target: 'midi-note-out-1',
            targetHandle: 'trigger',
        }, nodeById)).toBe(true);

        expect(canConnect({
            source: 'midi-cc-1',
            sourceHandle: 'normalized',
            target: 'midi-cc-out-1',
            targetHandle: 'value',
        }, nodeById)).toBe(true);
    });
});
