import type { PatchDocument } from '@din/react/patch';
import type {
    EditorOperation,
    EditorOperationResult,
    EditorSessionHello,
    EditorSessionState,
} from '../core';

export interface BridgeDiscoveryInfo {
    bridgeInfoUrl: string;
    bridgeCaUrl: string | null;
    bridgeUrl: string;
    bridgeToken: string;
    readOnly: boolean;
    serverVersion: string;
    certificateFingerprint256: string | null;
}

export interface BridgeErrorPayload {
    code: string;
    message: string;
    details?: unknown;
}

export interface BridgeEnvelope<TPayload = unknown> {
    requestId: string | null;
    type:
        | 'session.hello'
        | 'session.snapshot'
        | 'graph.preview_operations'
        | 'graph.apply_operations'
        | 'patch.import'
        | 'patch.export'
        | 'codegen.generate'
        | 'assets.list'
        | 'assets.ingest_file'
        | 'session.error';
    sessionId: string | null;
    payload?: TPayload;
    ok?: boolean;
    error?: BridgeErrorPayload;
}

export interface BridgeHelloAck {
    sessionId: string;
    readOnly: boolean;
    serverVersion: string;
}

export interface BridgePreviewOperationsRequest {
    operations: EditorOperation[];
}

export interface BridgeApplyOperationsRequest {
    operations: EditorOperation[];
}

export interface BridgePatchImportRequest {
    patch: PatchDocument;
    graphId?: string;
}

export interface BridgePatchExportRequest {
    graphId?: string;
}

export interface BridgeCodegenRequest {
    graphId?: string;
    includeProvider?: boolean;
}

export interface BridgeAssetIngestRequest {
    fileName: string;
    mimeType?: string;
    bytesBase64: string;
}

export interface BridgeAssetIngestResponse {
    assetId: string;
    name: string;
    mimeType: string;
    size: number;
    durationSec?: number;
    objectUrl: string | null;
}

export interface BridgePatchExportResponse {
    patch: PatchDocument;
    text: string;
}

export interface BridgeCodegenResponse {
    code: string;
    graphName: string;
}

export interface BridgeAssetListItem {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    durationSec?: number;
    createdAt: number;
    updatedAt: number;
}

export type BridgeSessionHelloEnvelope = BridgeEnvelope<EditorSessionHello>;
export type BridgeSessionSnapshotEnvelope = BridgeEnvelope<EditorSessionState>;
export type BridgeOperationsEnvelope = BridgeEnvelope<EditorOperationResult>;
