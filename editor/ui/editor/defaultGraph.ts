import type { Edge, Node } from '@xyflow/react';
import { createDefaultOutputData } from './graphBuilders';
import type { AudioNodeData, GraphDocument } from './types';

export function createEditorGraphId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `graph_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createInitialGraphDocument(graphId = createEditorGraphId(), name = 'Graph 1', order = 0): GraphDocument {
    const now = Date.now();
    const initialNodes: Node<AudioNodeData>[] = [
        {
            id: 'osc_1',
            type: 'oscNode',
            position: { x: 50, y: 150 },
            dragHandle: '.node-header',
            data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' } as AudioNodeData,
        },
        {
            id: 'gain_1',
            type: 'gainNode',
            position: { x: 300, y: 150 },
            dragHandle: '.node-header',
            data: { type: 'gain', gain: 0.5, label: 'Gain' } as AudioNodeData,
        },
        {
            id: 'output_1',
            type: 'outputNode',
            position: { x: 520, y: 150 },
            dragHandle: '.node-header',
            data: createDefaultOutputData() as AudioNodeData,
        },
    ];

    const initialEdges: Edge[] = [
        { id: 'e1-2', source: 'osc_1', target: 'gain_1', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2-3', source: 'gain_1', target: 'output_1', sourceHandle: 'out', targetHandle: 'in' },
    ];

    return {
        id: graphId,
        name,
        nodes: typeof structuredClone === 'function' ? structuredClone(initialNodes) : JSON.parse(JSON.stringify(initialNodes)),
        edges: typeof structuredClone === 'function' ? structuredClone(initialEdges) : JSON.parse(JSON.stringify(initialEdges)),
        createdAt: now,
        updatedAt: now,
        order,
    };
}
