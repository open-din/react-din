import { contextBridge, ipcRenderer } from 'electron';

type ProjectAssetKind = 'sample' | 'impulse' | 'audio';

interface ProjectGraphSummary {
    id: string;
    name: string;
    file: string;
    order: number;
    createdAt: number;
    updatedAt: number;
}

interface ProjectAssetRecord {
    id: string;
    name: string;
    fileName: string;
    kind: ProjectAssetKind;
    relativePath: string;
    mimeType: string;
    size: number;
    durationSec?: number;
    createdAt: number;
    updatedAt: number;
}

interface ProjectManifest {
    id: string;
    name: string;
    accentColor: string;
    createdAt: number;
    updatedAt: number;
    lastOpenedAt: number;
    storageKind: 'electron-fs';
    graphs: ProjectGraphSummary[];
    assets: ProjectAssetRecord[];
    path?: string;
}

interface ProjectGraphDocument {
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
    createdAt: number;
    updatedAt: number;
    order: number;
}

interface ProjectWorkspaceSnapshot {
    project: ProjectManifest;
    graphs: ProjectGraphDocument[];
    activeGraphId: string | null;
}

interface CreateProjectOptions {
    name: string;
    accentColor?: string;
}

interface ProjectOpenResult {
    projectId: string;
    focusedExisting: boolean;
}

interface ElectronProjectBootstrapState {
    windowKind: 'launcher' | 'project';
    projectId: string | null;
}

const bootstrapState = (): ElectronProjectBootstrapState => {
    const params = new URLSearchParams(globalThis.location?.search ?? '');
    return {
        windowKind: params.get('projectId') ? 'project' : 'launcher',
        projectId: params.get('projectId'),
    };
};

contextBridge.exposeInMainWorld('dinEditorApp', {
    platform: process.platform,
    runtime: 'electron',
    getBootstrapState: bootstrapState,
    listProjects: () => ipcRenderer.invoke('din-projects:list') as Promise<ProjectManifest[]>,
    createProject: (options: CreateProjectOptions) => ipcRenderer.invoke('din-projects:create', options) as Promise<ProjectManifest>,
    loadProject: (projectId: string) => ipcRenderer.invoke('din-projects:load', projectId) as Promise<ProjectWorkspaceSnapshot>,
    saveProject: (projectId: string, snapshot: ProjectWorkspaceSnapshot) =>
        ipcRenderer.invoke('din-projects:save', projectId, snapshot) as Promise<ProjectManifest>,
    writeProjectAsset: (
        projectId: string,
        payload: {
            assetId?: string;
            fileName: string;
            mimeType: string;
            kind: ProjectAssetKind;
            bytes: number[];
        },
    ) => ipcRenderer.invoke('din-projects:asset-write', projectId, payload),
    readProjectAsset: (projectId: string, assetId: string) =>
        ipcRenderer.invoke('din-projects:asset-read', projectId, assetId) as Promise<{ asset: unknown; bytes: number[] } | null>,
    deleteProjectAsset: (projectId: string, assetId: string) =>
        ipcRenderer.invoke('din-projects:asset-delete', projectId, assetId) as Promise<void>,
    openProjectWindow: (projectId: string) =>
        ipcRenderer.invoke('din-projects:open-window', projectId) as Promise<ProjectOpenResult>,
    revealProject: (projectId: string) =>
        ipcRenderer.invoke('din-projects:reveal', projectId) as Promise<void>,
});
