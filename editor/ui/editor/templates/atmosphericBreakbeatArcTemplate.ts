import type { Edge, Node } from '@xyflow/react';
import { migratePatchDocument, patchToGraphDocument, type PatchDocument } from '../../../../src/patch';
import type { AudioNodeData } from '../store';
import atmosphericBreakbeatArcPatchJson from './atmospheric-breakbeat-arc.patch.json?raw';

export interface EditorTemplateGraph {
    nodes: Node<AudioNodeData>[];
    edges: Edge[];
}

export const atmosphericBreakbeatArcPatch = migratePatchDocument(
    JSON.parse(atmosphericBreakbeatArcPatchJson) as PatchDocument
);

export function createAtmosphericBreakbeatArcTemplate(): EditorTemplateGraph {
    const graph = patchToGraphDocument(atmosphericBreakbeatArcPatch);
    return {
        nodes: graph.nodes as Node<AudioNodeData>[],
        edges: graph.edges as Edge[],
    };
}
