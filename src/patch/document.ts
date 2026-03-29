import {
    PATCH_DOCUMENT_VERSION,
    PATCH_INPUT_HANDLE_PREFIX,
    dinCoreGetTransportConnections,
    dinCoreGraphDocumentToPatch,
    dinCoreIsAudioConnectionLike,
    dinCoreMigratePatchDocument,
    dinCorePatchToGraphDocument,
    dinCoreResolvePatchAssetPath,
    type GraphConnectionLike,
    type GraphDocumentLike,
    type GraphNodeLike,
    type PatchToGraphOptions,
} from '@din/vanilla/core';
import type { PatchConnection, PatchDocument, PatchNode } from './types';

export type {
    GraphConnectionLike,
    GraphDocumentLike,
    GraphNodeLike,
    PatchToGraphOptions,
};

export { PATCH_DOCUMENT_VERSION, PATCH_INPUT_HANDLE_PREFIX };

export function isAudioConnectionLike(
    connection: Pick<PatchConnection, 'source' | 'sourceHandle' | 'target' | 'targetHandle'>,
    nodeById: Map<string, PatchNode>
): boolean {
    return dinCoreIsAudioConnectionLike(connection, nodeById);
}

export function getTransportConnections(
    connections: readonly PatchConnection[],
    nodeById: Map<string, PatchNode>
): Set<string> {
    return dinCoreGetTransportConnections(connections, nodeById);
}

export function resolvePatchAssetPath(assetPath: string | undefined, assetRoot?: string): string | undefined {
    return dinCoreResolvePatchAssetPath(assetPath, assetRoot);
}

export function graphDocumentToPatch(graph: GraphDocumentLike): PatchDocument {
    return dinCoreGraphDocumentToPatch(graph);
}

export function migratePatchDocument(patch: PatchDocument): PatchDocument {
    return dinCoreMigratePatchDocument(patch);
}

export function patchToGraphDocument(patch: PatchDocument, options: PatchToGraphOptions = {}) {
    return dinCorePatchToGraphDocument(patch, options);
}
