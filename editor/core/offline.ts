import { generateCode } from '../ui/editor/CodeGenerator';
import {
    graphDocumentToPatch,
    migratePatchDocument,
    patchToGraphDocument,
    type PatchDocument,
} from '../../src/patch';
import type { OfflinePatchSummary, OfflinePatchValidation } from './types';

export function summarizePatch(patch: PatchDocument): OfflinePatchSummary {
    return {
        name: patch.name,
        version: patch.version,
        nodeCount: patch.nodes.length,
        connectionCount: patch.connections.length,
        inputCount: patch.interface.inputs.length,
        eventCount: patch.interface.events.length,
        midiInputCount: patch.interface.midiInputs.length,
        midiOutputCount: patch.interface.midiOutputs.length,
    };
}

export function normalizeOfflinePatch(patch: PatchDocument): OfflinePatchValidation {
    const migrated = migratePatchDocument(patch);
    const normalizedPatch = graphDocumentToPatch(patchToGraphDocument(migrated));
    const normalizedText = `${JSON.stringify(normalizedPatch, null, 2)}\n`;

    return {
        ok: true,
        patch: normalizedPatch,
        normalizedText,
        summary: summarizePatch(normalizedPatch),
    };
}

export function validateOfflinePatchText(text: string): OfflinePatchValidation {
    const parsed = JSON.parse(text) as PatchDocument;
    return normalizeOfflinePatch(parsed);
}

export function generateCodeFromOfflinePatch(
    patch: PatchDocument,
    graphName?: string,
    includeProvider = false,
): string {
    const graph = patchToGraphDocument(patch);
    return generateCode(graph.nodes, graph.edges, includeProvider, graphName ?? graph.name);
}
