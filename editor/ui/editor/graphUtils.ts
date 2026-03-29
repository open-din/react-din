import type { AudioNodeData, ConvolverNodeData, GraphDocument, SamplerNodeData } from './store';

const DEFAULT_GRAPH_NAME = 'Untitled Graph';
const DEFAULT_COMPONENT_NAME = 'AudioGraph';

export function normalizeGraphName(name?: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed || DEFAULT_GRAPH_NAME;
}

export function toPascalCase(name?: string): string {
    const normalized = (name ?? '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim();

    if (!normalized) return DEFAULT_COMPONENT_NAME;

    const pascal = normalized
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

    if (!pascal) return DEFAULT_COMPONENT_NAME;
    if (/^\d/.test(pascal)) return `Graph${pascal}`;

    return pascal;
}

export function sanitizeGraphForStorage(graph: GraphDocument): GraphDocument {
    const nodes = graph.nodes.map((node) => {
        let data = node.data;

        if (data.type === 'sampler') {
            const sampler = data as SamplerNodeData;
            data = {
                ...sampler,
                loaded: Boolean(sampler.sampleId),
                src: sampler.sampleId ? '' : sampler.src,
                assetPath: sampler.assetPath,
            } as SamplerNodeData;
        }

        if (data.type === 'convolver') {
            const convolver = data as ConvolverNodeData;
            data = {
                ...convolver,
                impulseSrc: convolver.impulseId ? '' : convolver.impulseSrc,
                assetPath: convolver.assetPath,
            } as ConvolverNodeData;
        }

        if (data.type === 'output') {
            data = {
                ...data,
                playing: false,
            } as AudioNodeData;
        }

        if (data.type === 'transport') {
            data = {
                ...data,
                playing: false,
            } as AudioNodeData;
        }

        return {
            ...node,
            data,
            selected: false,
        };
    });

    const edges = graph.edges.map((edge) => ({
        ...edge,
        selected: false,
    }));

    return {
        ...graph,
        name: normalizeGraphName(graph.name),
        nodes,
        edges,
    };
}
