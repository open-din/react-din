import { describe, expect, it } from 'vitest';

import type { Node } from '@xyflow/react';

import type { AudioNodeData } from '../../src/playground/store';
import {
    getCompatibleExistingHandleMatches,
    getCompatibleNodeSuggestions,
    normalizeConnectionFromStart,
} from '../../src/playground/nodeHelpers';

const createNode = (node: Node<AudioNodeData>) => node;

describe('playground connection assist helpers', () => {
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
});
