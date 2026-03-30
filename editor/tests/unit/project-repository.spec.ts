import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialGraphDocument } from '../../ui/editor/defaultGraph';
import type {
    ElectronProjectBridgeApi,
    ProjectAssetKind,
    ProjectAssetRecord,
    ProjectManifest,
    ProjectWorkspaceSnapshot,
} from '../../project';

const clone = <T>(value: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

function buildGraphSummaries(graphs: ProjectWorkspaceSnapshot['graphs']): ProjectManifest['graphs'] {
    return graphs.map((graph) => ({
        id: graph.id,
        name: graph.name,
        file: `graphs/${graph.id}.patch.json`,
        order: graph.order ?? 0,
        createdAt: graph.createdAt,
        updatedAt: graph.updatedAt,
    }));
}

function syncSnapshotProject(snapshot: ProjectWorkspaceSnapshot): ProjectWorkspaceSnapshot {
    const now = Date.now();
    return {
        ...snapshot,
        project: {
            ...snapshot.project,
            graphs: buildGraphSummaries(snapshot.graphs),
            assets: [...snapshot.project.assets].sort((left, right) => right.updatedAt - left.updatedAt),
            updatedAt: now,
            lastOpenedAt: now,
        },
    };
}

function sanitizeFileName(name: string): string {
    const trimmed = name.trim().toLowerCase();
    const segments = trimmed.split('.');
    if (segments.length === 1) {
        return trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'audio-file';
    }

    const extension = segments.pop()?.replace(/[^a-z0-9]/g, '') || 'bin';
    const stem = segments.join('.').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'audio-file';
    return `${stem}.${extension}`;
}

function buildUniqueRelativePath(
    fileName: string,
    kind: ProjectAssetKind,
    assets: ProjectAssetRecord[],
    assetId?: string,
): string {
    const folder = kind === 'impulse' ? 'impulses' : 'samples';
    const sanitized = sanitizeFileName(fileName);
    const extensionIndex = sanitized.lastIndexOf('.');
    const stem = extensionIndex >= 0 ? sanitized.slice(0, extensionIndex) : sanitized;
    const extension = extensionIndex >= 0 ? sanitized.slice(extensionIndex) : '';
    const usedPaths = new Set(
        assets
            .filter((asset) => asset.id !== assetId)
            .map((asset) => asset.relativePath),
    );

    let candidate = `${folder}/${stem}${extension}`;
    let index = 2;
    while (usedPaths.has(candidate)) {
        candidate = `${folder}/${stem}-${index}${extension}`;
        index += 1;
    }
    return candidate;
}

function createMemoryElectronBridge(): ElectronProjectBridgeApi {
    const snapshots = new Map<string, ProjectWorkspaceSnapshot>();
    const assetBytes = new Map<string, number[]>();
    const projectWindowOpenCount = new Map<string, number>();
    let projectCounter = 0;
    let assetCounter = 0;

    const nextProjectId = () => {
        projectCounter += 1;
        return `project-${projectCounter}`;
    };

    const nextAssetId = () => {
        assetCounter += 1;
        return `asset-${assetCounter}`;
    };

    return {
        runtime: 'electron',
        platform: 'darwin',
        getBootstrapState: () => ({ windowKind: 'launcher', projectId: null }),
        async listProjects() {
            return [...snapshots.values()].map((snapshot) => clone(snapshot.project));
        },
        async createProject(options) {
            const projectId = nextProjectId();
            const now = Date.now();
            const firstGraph = createInitialGraphDocument(`${projectId}-graph-1`, 'Graph 1', 0);
            const snapshot = syncSnapshotProject({
                project: {
                    id: projectId,
                    name: options.name,
                    accentColor: options.accentColor ?? '#68a5ff',
                    createdAt: now,
                    updatedAt: now,
                    lastOpenedAt: now,
                    storageKind: 'electron-fs',
                    graphs: [],
                    assets: [],
                    path: `/tmp/${projectId}`,
                },
                graphs: [firstGraph],
                activeGraphId: firstGraph.id,
            });
            snapshots.set(projectId, clone(snapshot));
            return clone(snapshot.project);
        },
        async loadProject(projectId) {
            const snapshot = snapshots.get(projectId);
            if (!snapshot) {
                throw new Error(`Missing project ${projectId}`);
            }
            return clone(snapshot);
        },
        async saveProject(projectId, snapshot) {
            const nextSnapshot = syncSnapshotProject(clone(snapshot));
            snapshots.set(projectId, nextSnapshot);
            return clone(nextSnapshot.project);
        },
        async writeProjectAsset(projectId, payload) {
            const snapshot = snapshots.get(projectId);
            if (!snapshot) {
                throw new Error(`Missing project ${projectId}`);
            }

            const assetId = payload.assetId ?? nextAssetId();
            const existing = snapshot.project.assets.find((asset) => asset.id === assetId);
            const fileName = sanitizeFileName(payload.fileName);
            const relativePath = buildUniqueRelativePath(fileName, payload.kind, snapshot.project.assets, assetId);
            const now = Date.now();
            const asset: ProjectAssetRecord = {
                id: assetId,
                name: fileName,
                fileName,
                kind: payload.kind,
                relativePath,
                mimeType: payload.mimeType,
                size: payload.bytes.length,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
            };

            assetBytes.set(`${projectId}:${assetId}`, [...payload.bytes]);
            return clone(asset);
        },
        async readProjectAsset(projectId, assetId) {
            const snapshot = snapshots.get(projectId);
            const asset = snapshot?.project.assets.find((entry) => entry.id === assetId);
            const bytes = assetBytes.get(`${projectId}:${assetId}`);
            if (!asset || !bytes) {
                return null;
            }
            return {
                asset: clone(asset),
                bytes: [...bytes],
            };
        },
        async deleteProjectAsset(projectId, assetId) {
            assetBytes.delete(`${projectId}:${assetId}`);
        },
        async openProjectWindow(projectId) {
            const count = projectWindowOpenCount.get(projectId) ?? 0;
            projectWindowOpenCount.set(projectId, count + 1);
            return {
                projectId,
                focusedExisting: count > 0,
            };
        },
        async revealProject() {
            return undefined;
        },
    };
}

afterEach(async () => {
    delete window.dinEditorApp;
    vi.restoreAllMocks();
    vi.resetModules();
    const projectModule = await import('../../project');
    projectModule.resetProjectRepositoryForTests();
});

describe('project repository', () => {
    it('keeps graphs and assets isolated per project', async () => {
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => 'blob:project-asset'),
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: vi.fn(),
        });
        Object.defineProperty(window, 'dinEditorApp', {
            configurable: true,
            writable: true,
            value: createMemoryElectronBridge(),
        });

        const projectModule = await import('../../project');
        const repository = projectModule.getProjectRepository();
        const alpha = await repository.createProject({ name: 'Alpha' });
        const beta = await repository.createProject({ name: 'Beta' });

        const alphaController = await repository.openProject(alpha.id);
        const betaController = await repository.openProject(beta.id);

        const alphaGraph = createInitialGraphDocument('alpha-graph-2', 'Bass Graph', 1);
        await alphaController.saveGraph(alphaGraph);
        await alphaController.saveActiveGraphId(alphaGraph.id);

        const alphaFirstAsset = await alphaController.addAssetFromBlob(
            new Blob(['alpha-kick'], { type: 'audio/wav' }),
            'Kick.wav',
            { kind: 'sample' },
        );
        const alphaSecondAsset = await alphaController.addAssetFromBlob(
            new Blob(['alpha-kick-2'], { type: 'audio/wav' }),
            'Kick.wav',
            { kind: 'sample' },
        );
        const betaAsset = await betaController.addAssetFromBlob(
            new Blob(['beta-kick'], { type: 'audio/wav' }),
            'Kick.wav',
            { kind: 'sample' },
        );

        expect(alphaFirstAsset.relativePath).toBe('samples/kick.wav');
        expect(alphaSecondAsset.relativePath).toBe('samples/kick-2.wav');
        expect(betaAsset.relativePath).toBe('samples/kick.wav');

        const alphaObjectUrl = await alphaController.getAssetObjectUrl(alphaSecondAsset.id);
        expect(alphaObjectUrl).toBe('blob:project-asset');

        const alphaGraphs = await alphaController.loadGraphs();
        const betaGraphs = await betaController.loadGraphs();
        expect(alphaGraphs.map((graph) => graph.name)).toEqual(['Graph 1', 'Bass Graph']);
        expect(betaGraphs.map((graph) => graph.name)).toEqual(['Graph 1']);
        expect(await alphaController.loadActiveGraphId()).toBe(alphaGraph.id);
        expect(await betaController.loadActiveGraphId()).not.toBe(alphaGraph.id);

        await alphaController.deleteAsset(alphaFirstAsset.id);

        expect((await alphaController.listAssets()).map((asset) => asset.relativePath)).toEqual(['samples/kick-2.wav']);
        expect((await betaController.listAssets()).map((asset) => asset.relativePath)).toEqual(['samples/kick.wav']);
    });

    it('reports focus on repeated dedicated window opens for the same project', async () => {
        Object.defineProperty(window, 'dinEditorApp', {
            configurable: true,
            writable: true,
            value: createMemoryElectronBridge(),
        });

        const projectModule = await import('../../project');
        const repository = projectModule.getProjectRepository();
        const project = await repository.createProject({ name: 'Windowed Project' });

        await expect(repository.openProjectWindow(project.id)).resolves.toEqual({
            projectId: project.id,
            focusedExisting: false,
        });
        await expect(repository.openProjectWindow(project.id)).resolves.toEqual({
            projectId: project.id,
            focusedExisting: true,
        });
    });
});
