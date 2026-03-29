import type { MidiRuntimeSnapshot } from '../../src/midi';
import type { AudioNodeData, GraphDocument } from '../ui/editor/store';
import type {
    EditorAudioStatus,
    EditorMidiStatus,
    EditorSessionState,
} from './types';

function graphIsPlaying(graph: GraphDocument): boolean {
    return graph.nodes.some((node) => {
        if (node.data.type !== 'output' && node.data.type !== 'transport') return false;
        return Boolean((node.data as AudioNodeData & { playing?: boolean }).playing);
    });
}

export function buildEditorMidiStatus(snapshot: MidiRuntimeSnapshot): EditorMidiStatus {
    return {
        status: snapshot.status,
        defaultInputId: snapshot.defaultInputId,
        defaultOutputId: snapshot.defaultOutputId,
        inputCount: snapshot.inputs.length,
        outputCount: snapshot.outputs.length,
        clockRunning: snapshot.clock.running,
        clockBpmEstimate: snapshot.clock.bpmEstimate,
    };
}

export function buildEditorAudioStatus(
    graphs: GraphDocument[],
    activeGraphId: string | null,
): EditorAudioStatus {
    const playingGraphIds = graphs.filter(graphIsPlaying).map((graph) => graph.id);

    return {
        activeGraphPlaying: activeGraphId ? playingGraphIds.includes(activeGraphId) : false,
        playingGraphIds,
    };
}

export function buildEditorSessionState(args: {
    graphs: GraphDocument[];
    activeGraphId: string | null;
    selectedNodeId?: string | null;
    isHydrated?: boolean;
    midiSnapshot: MidiRuntimeSnapshot;
}): EditorSessionState {
    return {
        graphs: args.graphs,
        activeGraphId: args.activeGraphId,
        selectedNodeId: args.selectedNodeId ?? null,
        isHydrated: args.isHydrated ?? true,
        midi: buildEditorMidiStatus(args.midiSnapshot),
        audio: buildEditorAudioStatus(args.graphs, args.activeGraphId),
    };
}

export function createEmptyEditorSessionState(
    midiSnapshot: MidiRuntimeSnapshot,
): EditorSessionState {
    return buildEditorSessionState({
        graphs: [],
        activeGraphId: null,
        selectedNodeId: null,
        isHydrated: false,
        midiSnapshot,
    });
}

export function getActiveGraph(
    state: EditorSessionState,
): GraphDocument | null {
    if (!state.activeGraphId) return null;
    return state.graphs.find((graph) => graph.id === state.activeGraphId) ?? null;
}
