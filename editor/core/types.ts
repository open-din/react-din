import type { Edge, Node, XYPosition } from '@xyflow/react';
import type { MidiRuntimeSnapshot } from '../../src/midi';
import type { PatchDocument } from '../../src/patch';
import type { AudioNodeData, GraphDocument } from '../ui/editor/store';
import type { EditorNodeType } from '../ui/editor/nodeCatalog';

export interface EditorMidiStatus {
    status: MidiRuntimeSnapshot['status'];
    defaultInputId: string | null;
    defaultOutputId: string | null;
    inputCount: number;
    outputCount: number;
    clockRunning: boolean;
    clockBpmEstimate: number | null;
}

export interface EditorAudioStatus {
    activeGraphPlaying: boolean;
    playingGraphIds: string[];
}

export interface EditorSessionState {
    graphs: GraphDocument[];
    activeGraphId: string | null;
    selectedNodeId: string | null;
    isHydrated: boolean;
    midi: EditorMidiStatus;
    audio: EditorAudioStatus;
}

export interface EditorSessionHello {
    token: string;
    desiredSessionId?: string | null;
    appVersion: string;
    capabilities: {
        previewOperations: boolean;
        applyOperations: boolean;
        patchImportExport: boolean;
        codegen: boolean;
        assetLibrary: boolean;
        offlinePatch: boolean;
    };
    snapshot: EditorSessionState;
}

export interface EditorSessionSummary {
    sessionId: string;
    appVersion: string;
    connectedAt: number;
    lastSeenAt: number;
    activeGraphId: string | null;
    graphCount: number;
    readOnly: boolean;
    midi: EditorMidiStatus;
    audio: EditorAudioStatus;
}

export type EditorOperation =
    | {
        type: 'create_graph';
        graphId?: string;
        name?: string;
        activate?: boolean;
    }
    | {
        type: 'rename_graph';
        graphId?: string;
        name: string;
    }
    | {
        type: 'delete_graph';
        graphId?: string;
    }
    | {
        type: 'set_active_graph';
        graphId: string;
    }
    | {
        type: 'add_node';
        graphId?: string;
        nodeType: EditorNodeType;
        nodeId?: string;
        position?: XYPosition;
    }
    | {
        type: 'update_node_data';
        graphId?: string;
        nodeId: string;
        data: Partial<AudioNodeData>;
    }
    | {
        type: 'remove_node';
        graphId?: string;
        nodeId: string;
    }
    | {
        type: 'connect';
        graphId?: string;
        edgeId?: string;
        source: string;
        sourceHandle?: string | null;
        target: string;
        targetHandle?: string | null;
    }
    | {
        type: 'disconnect';
        graphId?: string;
        edgeId?: string;
        source?: string;
        sourceHandle?: string | null;
        target?: string;
        targetHandle?: string | null;
    }
    | {
        type: 'load_graph';
        graphId?: string;
        name?: string;
        nodes: Node<AudioNodeData>[];
        edges: Edge[];
    }
    | {
        type: 'set_playing';
        graphId?: string;
        playing: boolean;
    }
    | {
        type: 'import_patch_into_active_graph';
        graphId?: string;
        patch: PatchDocument;
    }
    | {
        type: 'bind_asset_to_node';
        graphId?: string;
        nodeId: string;
        role: 'sampler' | 'convolver';
        assetId?: string;
        assetPath?: string;
        assetName?: string;
        objectUrl?: string | null;
    };

export interface EditorOperationIssue {
    index: number;
    code:
        | 'GRAPH_NOT_FOUND'
        | 'NODE_NOT_FOUND'
        | 'EDGE_NOT_FOUND'
        | 'INVALID_OPERATION'
        | 'INVALID_CONNECTION'
        | 'INVALID_PATCH'
        | 'INVALID_ASSET_BINDING';
    message: string;
}

export interface EditorOperationOutcome {
    index: number;
    type: EditorOperation['type'];
    ok: boolean;
    graphId?: string;
    nodeId?: string;
    edgeId?: string;
    message: string;
}

export interface EditorOperationSummary {
    graphIds: string[];
    activeGraphId: string | null;
    graphsCreated: number;
    graphsDeleted: number;
    graphsRenamed: number;
    nodesCreated: number;
    nodesUpdated: number;
    nodesDeleted: number;
    edgesCreated: number;
    edgesDeleted: number;
    patchesImported: number;
    assetsBound: number;
    playbackChanges: number;
}

export interface EditorOperationResult {
    mode: 'preview' | 'apply';
    ok: boolean;
    state: EditorSessionState;
    outcomes: EditorOperationOutcome[];
    issues: EditorOperationIssue[];
    summary: EditorOperationSummary;
}

export interface OfflinePatchSummary {
    name: string;
    version: number;
    nodeCount: number;
    connectionCount: number;
    inputCount: number;
    eventCount: number;
    midiInputCount: number;
    midiOutputCount: number;
}

export interface OfflinePatchValidation {
    ok: true;
    patch: PatchDocument;
    normalizedText: string;
    summary: OfflinePatchSummary;
}
