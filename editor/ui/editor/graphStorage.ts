import { requireActiveProjectController } from '../../project';
import type { GraphDocument } from './store';

export async function loadGraphs(): Promise<GraphDocument[]> {
    return requireActiveProjectController().loadGraphs();
}

export async function saveGraph(graph: GraphDocument): Promise<void> {
    await requireActiveProjectController().saveGraph(graph);
}

export async function deleteGraph(graphId: string): Promise<void> {
    await requireActiveProjectController().deleteGraph(graphId);
}

export async function loadActiveGraphId(): Promise<string | null> {
    return requireActiveProjectController().loadActiveGraphId();
}

export async function saveActiveGraphId(graphId: string | null): Promise<void> {
    await requireActiveProjectController().saveActiveGraphId(graphId);
}
