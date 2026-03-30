import type { GraphDocument } from '../ui/editor/store';

export type ProjectStorageKind = 'electron-fs' | 'browser-fs-handle' | 'browser-indexeddb';
export type ProjectWindowKind = 'launcher' | 'project';
export type ProjectAssetKind = 'sample' | 'impulse' | 'audio';

export interface ProjectGraphSummary {
    id: string;
    name: string;
    file: string;
    order: number;
    createdAt: number;
    updatedAt: number;
}

export interface ProjectAssetRecord {
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

export type AudioLibraryAsset = ProjectAssetRecord;

export interface ProjectManifest {
    id: string;
    name: string;
    accentColor: string;
    createdAt: number;
    updatedAt: number;
    lastOpenedAt: number;
    storageKind: ProjectStorageKind;
    graphs: ProjectGraphSummary[];
    assets: ProjectAssetRecord[];
    path?: string;
    handleId?: string;
}

export interface ProjectWorkspaceSnapshot {
    project: ProjectManifest;
    graphs: GraphDocument[];
    activeGraphId: string | null;
}

export interface CreateProjectOptions {
    name: string;
    accentColor?: string;
    preferredStorageKind?: ProjectStorageKind;
}

export interface AddProjectAssetOptions {
    kind?: ProjectAssetKind;
    fileName?: string;
    preserveAssetId?: string;
}

export interface ProjectOpenResult {
    projectId: string;
    focusedExisting: boolean;
}

export interface ProjectController {
    readonly project: ProjectManifest;
    loadWorkspace(): Promise<ProjectWorkspaceSnapshot>;
    loadGraphs(): Promise<GraphDocument[]>;
    saveGraph(graph: GraphDocument): Promise<void>;
    deleteGraph(graphId: string): Promise<void>;
    loadActiveGraphId(): Promise<string | null>;
    saveActiveGraphId(graphId: string | null): Promise<void>;
    listAssets(): Promise<AudioLibraryAsset[]>;
    addAssetFromBlob(blob: Blob, name: string, options?: AddProjectAssetOptions): Promise<AudioLibraryAsset>;
    saveAssetById(assetId: string, blob: Blob, name?: string, options?: Omit<AddProjectAssetOptions, 'preserveAssetId'>): Promise<AudioLibraryAsset>;
    getAssetObjectUrl(assetId: string): Promise<string | null>;
    releaseAssetObjectUrl(assetId: string): void;
    deleteAsset(assetId: string): Promise<void>;
    subscribeAssets(callback: () => void): () => void;
    reveal(): Promise<void>;
}

export interface ProjectRepository {
    readonly supportsDedicatedWindows: boolean;
    readonly supportsFileSystemAccess: boolean;
    readonly windowKind: ProjectWindowKind;
    readonly bootstrapProjectId: string | null;
    listProjects(): Promise<ProjectManifest[]>;
    createProject(options: CreateProjectOptions): Promise<ProjectManifest>;
    openProject(projectId: string): Promise<ProjectController>;
    openProjectWindow(projectId: string): Promise<ProjectOpenResult>;
    revealProject(projectId: string): Promise<void>;
    hasLegacyWorkspace(): Promise<boolean>;
    recoverLegacyWorkspace(): Promise<ProjectManifest | null>;
}

export interface ElectronProjectBootstrapState {
    windowKind: ProjectWindowKind;
    projectId: string | null;
}

export interface ElectronProjectBridgeApi {
    runtime: 'electron';
    platform: string;
    getBootstrapState: () => ElectronProjectBootstrapState;
    listProjects: () => Promise<ProjectManifest[]>;
    createProject: (options: CreateProjectOptions) => Promise<ProjectManifest>;
    loadProject: (projectId: string) => Promise<ProjectWorkspaceSnapshot>;
    saveProject: (projectId: string, snapshot: ProjectWorkspaceSnapshot) => Promise<ProjectManifest>;
    writeProjectAsset: (
        projectId: string,
        payload: {
            assetId?: string;
            fileName: string;
            mimeType: string;
            kind: ProjectAssetKind;
            bytes: number[];
        },
    ) => Promise<ProjectAssetRecord>;
    readProjectAsset: (projectId: string, assetId: string) => Promise<{ asset: ProjectAssetRecord; bytes: number[] } | null>;
    deleteProjectAsset: (projectId: string, assetId: string) => Promise<void>;
    openProjectWindow: (projectId: string) => Promise<ProjectOpenResult>;
    revealProject: (projectId: string) => Promise<void>;
}

declare global {
    interface Window {
        dinEditorApp?: ElectronProjectBridgeApi;
    }
}
