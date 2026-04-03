import { graphDocumentToPatch, patchToGraphDocument } from '@din/react/patch';
import { createInitialGraphDocument } from '../ui/editor/defaultGraph';
import { sanitizeGraphForStorage } from '../ui/editor/graphUtils';
import type { AudioNodeData, ConvolverNodeData, GraphDocument, SamplerNodeData } from '../ui/editor/store';
import type {
    AddProjectAssetOptions,
    AudioLibraryAsset,
    CreateProjectOptions,
    ElectronProjectBridgeApi,
    ProjectAssetKind,
    ProjectAssetRecord,
    ProjectController,
    ProjectManifest,
    ProjectOpenResult,
    ProjectRepository,
    ProjectStorageKind,
    ProjectWindowKind,
    ProjectWorkspaceSnapshot,
} from './types';

const PROJECTS_DB_NAME = 'din-editor-projects';
const PROJECTS_DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const WORKSPACES_STORE = 'workspaces';
const ASSET_BLOBS_STORE = 'assetBlobs';
const HANDLES_STORE = 'handles';
const META_STORE = 'meta';
const LEGACY_RECOVERY_KEY = 'legacy-recovery-complete';

const LEGACY_GRAPH_DB_NAME = 'din-editor';
const LEGACY_GRAPH_STORE = 'graphs';
const LEGACY_GRAPH_META_STORE = 'meta';
const LEGACY_ACTIVE_GRAPH_KEY = 'activeGraphId';

const LEGACY_AUDIO_DB_NAME = 'din-editor-audio-library';
const LEGACY_AUDIO_STORE = 'audioAssets';
const LEGACY_AUDIO_CACHE = 'din-editor-audio';
const LEGACY_AUDIO_CACHE_PREFIX = '/__editor_audio__/';

const PROJECT_MANIFEST_FILE = 'din-project.json';
const GRAPH_DIR = 'graphs';
const SAMPLE_DIR = 'samples';
const IMPULSE_DIR = 'impulses';

interface StoredWorkspaceRecord {
    projectId: string;
    activeGraphId: string | null;
    graphs: GraphDocument[];
}

interface StoredAssetBlobRecord {
    key: string;
    blob: Blob;
}

interface StoredHandleRecord {
    id: string;
    handle: FileSystemDirectoryHandle;
}

interface MetaRecord<TValue = unknown> {
    key: string;
    value: TValue;
}

interface StoredProjectManifestFile extends ProjectManifest {
    version: 1;
    activeGraphId: string | null;
}

interface LegacyAudioAssetRecord {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    durationSec?: number;
    createdAt: number;
    updatedAt: number;
}

interface LegacyWorkspaceTestFixture {
    graphs: GraphDocument[];
    activeGraphId: string | null;
    assets: Array<LegacyAudioAssetRecord & { bytes?: number[] }>;
}

type BrowserFsWindow = Window & {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    __DIN_EDITOR_TEST_LEGACY_WORKSPACE__?: LegacyWorkspaceTestFixture;
};

const deepClone = <T>(value: T): T => {
    if (typeof structuredClone === 'function') {
        return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
};

function isElectronBridge(value: unknown): value is ElectronProjectBridgeApi {
    return Boolean(value && typeof value === 'object' && (value as ElectronProjectBridgeApi).runtime === 'electron');
}

function getElectronBridge(): ElectronProjectBridgeApi | null {
    if (typeof window === 'undefined') return null;
    return isElectronBridge(window.dinEditorApp) ? window.dinEditorApp : null;
}

function getLegacyWorkspaceTestFixture(): LegacyWorkspaceTestFixture | null {
    if (typeof window === 'undefined') return null;
    const nextWindow = window as BrowserFsWindow;
    return nextWindow.__DIN_EDITOR_TEST_LEGACY_WORKSPACE__ ?? null;
}

function getWindowKindFromUrl(): ProjectWindowKind {
    if (typeof window === 'undefined') return 'launcher';
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId') ? 'project' : 'launcher';
}

function getBootstrapProjectIdFromUrl(): string | null {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('projectId');
}

function supportsFileSystemAccess(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (window as BrowserFsWindow).showDirectoryPicker === 'function';
}

function createProjectId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `project_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createAssetId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `asset_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeProjectName(name: string): string {
    const trimmed = name.trim();
    return trimmed || 'Untitled Project';
}

function slugifySegment(value: string, fallback: string): string {
    const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
}

function sanitizeFileName(name: string): string {
    const trimmed = name.trim();
    if (!trimmed) return 'audio-file';

    const segments = trimmed.split('.');
    if (segments.length === 1) {
        return slugifySegment(trimmed, 'audio-file');
    }

    const extension = segments.pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
    const stem = slugifySegment(segments.join('.'), 'audio-file');
    return `${stem}.${extension}`;
}

function normalizeRelativePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\/+/, '').trim();
}

function chooseAccentColor(seed: string): string {
    const palette = [
        '#ed6a5a',
        '#68a5ff',
        '#22b573',
        '#f6a623',
        '#ff5d8f',
        '#00a3a3',
        '#8b7dff',
        '#ff7a18',
    ];
    const hash = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return palette[hash % palette.length] ?? palette[0];
}

function buildGraphSummary(graph: GraphDocument): ProjectManifest['graphs'][number] {
    return {
        id: graph.id,
        name: graph.name,
        file: `${GRAPH_DIR}/${graph.id}.patch.json`,
        order: graph.order ?? 0,
        createdAt: graph.createdAt,
        updatedAt: graph.updatedAt,
    };
}

function sortProjects(projects: ProjectManifest[]): ProjectManifest[] {
    return [...projects].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt || right.updatedAt - left.updatedAt);
}

function pickAssetFolder(kind: ProjectAssetKind, existing?: ProjectAssetRecord): string {
    if (existing) {
        const normalized = normalizeRelativePath(existing.relativePath);
        const index = normalized.lastIndexOf('/');
        if (index >= 0) return normalized.slice(0, index);
    }
    return kind === 'impulse' ? IMPULSE_DIR : SAMPLE_DIR;
}

function buildUniqueRelativePath(
    fileName: string,
    kind: ProjectAssetKind,
    assets: ProjectAssetRecord[],
    existing?: ProjectAssetRecord,
): string {
    const folder = pickAssetFolder(kind, existing);
    const sanitized = sanitizeFileName(existing?.fileName || fileName);
    const extensionIndex = sanitized.lastIndexOf('.');
    const stem = extensionIndex >= 0 ? sanitized.slice(0, extensionIndex) : sanitized;
    const extension = extensionIndex >= 0 ? sanitized.slice(extensionIndex) : '';
    const currentPath = existing ? normalizeRelativePath(existing.relativePath) : null;
    const used = new Set(
        assets
            .filter((asset) => asset.id !== existing?.id)
            .map((asset) => normalizeRelativePath(asset.relativePath)),
    );

    let nextStem = stem;
    let counter = 2;
    let candidate = normalizeRelativePath(`${folder}/${nextStem}${extension}`);

    while (used.has(candidate) && candidate !== currentPath) {
        nextStem = `${stem}-${counter}`;
        counter += 1;
        candidate = normalizeRelativePath(`${folder}/${nextStem}${extension}`);
    }

    return candidate;
}

function syncProjectManifest(
    project: ProjectManifest,
    graphs: GraphDocument[],
    assets: ProjectAssetRecord[],
): ProjectManifest {
    const now = Date.now();
    return {
        ...project,
        name: normalizeProjectName(project.name),
        graphs: [...graphs]
            .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
            .map((graph) => buildGraphSummary(sanitizeGraphForStorage(graph))),
        assets: [...assets].sort((left, right) => right.updatedAt - left.updatedAt),
        updatedAt: now,
        lastOpenedAt: now,
    };
}

function createEmptyProjectManifest(
    options: CreateProjectOptions,
    storageKind: ProjectStorageKind,
    extra?: Pick<ProjectManifest, 'path' | 'handleId'>,
): ProjectManifest {
    const now = Date.now();
    const id = createProjectId();
    return {
        id,
        name: normalizeProjectName(options.name),
        accentColor: options.accentColor?.trim() || chooseAccentColor(id),
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        storageKind,
        graphs: [],
        assets: [],
        path: extra?.path,
        handleId: extra?.handleId,
    };
}

function createInitialProjectSnapshot(project: ProjectManifest): ProjectWorkspaceSnapshot {
    const initialGraph = createInitialGraphDocument(undefined, 'Graph 1', 0);
    const nextProject = syncProjectManifest(project, [initialGraph], []);
    return {
        project: nextProject,
        graphs: [initialGraph],
        activeGraphId: initialGraph.id,
    };
}

function getAssetBlobKey(projectId: string, assetId: string): string {
    return `${projectId}::${assetId}`;
}

function normalizeAssetPathCandidate(assetPath?: string): string {
    return normalizeRelativePath(assetPath ?? '');
}

function hydrateGraphAssetReferences(
    graph: GraphDocument,
    assets: ProjectAssetRecord[],
): GraphDocument {
    const assetByPath = new Map(assets.map((asset) => [normalizeRelativePath(asset.relativePath), asset]));

    return {
        ...graph,
        nodes: graph.nodes.map((node) => {
            if (node.data.type === 'sampler') {
                const sampler = node.data as SamplerNodeData;
                const matchedAsset = assetByPath.get(normalizeAssetPathCandidate(sampler.assetPath));
                if (!matchedAsset) return node;
                return {
                    ...node,
                    data: {
                        ...sampler,
                        assetPath: matchedAsset.relativePath,
                        sampleId: matchedAsset.id,
                        fileName: matchedAsset.fileName,
                        loaded: false,
                        src: '',
                    } as AudioNodeData,
                };
            }

            if (node.data.type === 'convolver') {
                const convolver = node.data as ConvolverNodeData;
                const matchedAsset = assetByPath.get(normalizeAssetPathCandidate(convolver.assetPath));
                if (!matchedAsset) return node;
                return {
                    ...node,
                    data: {
                        ...convolver,
                        assetPath: matchedAsset.relativePath,
                        impulseId: matchedAsset.id,
                        impulseFileName: matchedAsset.fileName,
                        impulseSrc: '',
                    } as AudioNodeData,
                };
            }

            return node;
        }),
    };
}

function hydrateWorkspaceGraphs(graphs: GraphDocument[], assets: ProjectAssetRecord[]): GraphDocument[] {
    return graphs.map((graph) => hydrateGraphAssetReferences(graph, assets));
}

function toStoredProjectFile(snapshot: ProjectWorkspaceSnapshot): StoredProjectManifestFile {
    return {
        ...snapshot.project,
        version: 1,
        activeGraphId: snapshot.activeGraphId,
    };
}

function fromStoredProjectFile(file: StoredProjectManifestFile): ProjectManifest {
    return {
        id: file.id,
        name: file.name,
        accentColor: file.accentColor,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        lastOpenedAt: file.lastOpenedAt,
        storageKind: file.storageKind,
        graphs: file.graphs ?? [],
        assets: file.assets ?? [],
        path: file.path,
        handleId: file.handleId,
    };
}

function detectAssetKind(record: Pick<ProjectAssetRecord, 'kind' | 'relativePath'>): ProjectAssetKind {
    if (record.kind === 'impulse' || record.kind === 'sample') return record.kind;
    const relativePath = normalizeRelativePath(record.relativePath);
    return relativePath.startsWith(`${IMPULSE_DIR}/`) ? 'impulse' : 'sample';
}

async function detectAudioDuration(blob: Blob): Promise<number | undefined> {
    if (
        typeof window === 'undefined'
        || typeof URL === 'undefined'
        || typeof URL.createObjectURL !== 'function'
        || typeof Audio === 'undefined'
    ) {
        return undefined;
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
        return await new Promise<number | undefined>((resolve) => {
            const audio = new Audio();
            let settled = false;

            const finalize = (value?: number) => {
                if (settled) return;
                settled = true;
                audio.src = '';
                resolve(value);
            };

            const timeoutId = window.setTimeout(() => finalize(undefined), 250);
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => {
                window.clearTimeout(timeoutId);
                finalize(Number.isFinite(audio.duration) ? audio.duration : undefined);
            };
            audio.onerror = () => {
                window.clearTimeout(timeoutId);
                finalize(undefined);
            };
            audio.src = objectUrl;
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function toBlob(bytes: number[], mimeType: string): Blob {
    return new Blob([Uint8Array.from(bytes)], { type: mimeType || 'application/octet-stream' });
}

async function toByteArray(blob: Blob): Promise<number[]> {
    const buffer = await blob.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
}

function isFsProject(project: ProjectManifest): boolean {
    return project.storageKind === 'browser-fs-handle';
}

function openProjectsDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(PROJECTS_DB_NAME, PROJECTS_DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
                db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
                db.createObjectStore(WORKSPACES_STORE, { keyPath: 'projectId' });
            }
            if (!db.objectStoreNames.contains(ASSET_BLOBS_STORE)) {
                db.createObjectStore(ASSET_BLOBS_STORE, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(HANDLES_STORE)) {
                db.createObjectStore(HANDLES_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: 'key' });
            }
        };
    });
}

async function readDbRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await openProjectsDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result as T | undefined);
        request.onerror = () => reject(request.error);
    });
}

async function readDbRecords<T>(storeName: string): Promise<T[]> {
    const db = await openProjectsDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => resolve((request.result as T[] | undefined) ?? []);
        request.onerror = () => reject(request.error);
    });
}

async function writeDbRecord(storeName: string, value: unknown): Promise<void> {
    const db = await openProjectsDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteDbRecord(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await openProjectsDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function readProjectRecord(projectId: string): Promise<ProjectManifest | undefined> {
    return readDbRecord<ProjectManifest>(PROJECTS_STORE, projectId);
}

async function writeProjectRecord(project: ProjectManifest): Promise<void> {
    await writeDbRecord(PROJECTS_STORE, project);
}

async function readWorkspaceRecord(projectId: string): Promise<StoredWorkspaceRecord | undefined> {
    return readDbRecord<StoredWorkspaceRecord>(WORKSPACES_STORE, projectId);
}

async function writeWorkspaceRecord(record: StoredWorkspaceRecord): Promise<void> {
    await writeDbRecord(WORKSPACES_STORE, record);
}

async function writeHandleRecord(record: StoredHandleRecord): Promise<void> {
    await writeDbRecord(HANDLES_STORE, record);
}

async function readHandleRecord(handleId: string): Promise<StoredHandleRecord | undefined> {
    return readDbRecord<StoredHandleRecord>(HANDLES_STORE, handleId);
}

async function writeMetaValue<TValue>(key: string, value: TValue): Promise<void> {
    await writeDbRecord(META_STORE, { key, value } satisfies MetaRecord<TValue>);
}

async function readMetaValue<TValue>(key: string): Promise<TValue | undefined> {
    const record = await readDbRecord<MetaRecord<TValue>>(META_STORE, key);
    return record?.value;
}

async function loadLegacyGraphs(): Promise<{ graphs: GraphDocument[]; activeGraphId: string | null }> {
    const fixture = getLegacyWorkspaceTestFixture();
    if (fixture) {
        return {
            graphs: deepClone(fixture.graphs),
            activeGraphId: fixture.activeGraphId,
        };
    }

    if (typeof indexedDB === 'undefined') {
        return { graphs: [], activeGraphId: null };
    }

    const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
        const request = indexedDB.open(LEGACY_GRAPH_DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => resolve(request.result);
    }).catch(() => null);

    if (!db || !db.objectStoreNames.contains(LEGACY_GRAPH_STORE)) {
        return { graphs: [], activeGraphId: null };
    }

    const graphs = await new Promise<GraphDocument[]>((resolve, reject) => {
        const tx = db.transaction(LEGACY_GRAPH_STORE, 'readonly');
        const request = tx.objectStore(LEGACY_GRAPH_STORE).getAll();
        request.onsuccess = () => resolve((request.result as GraphDocument[] | undefined) ?? []);
        request.onerror = () => reject(request.error);
    }).catch(() => []);

    let activeGraphId: string | null = null;
    if (db.objectStoreNames.contains(LEGACY_GRAPH_META_STORE)) {
        activeGraphId = await new Promise<string | null>((resolve, reject) => {
            const tx = db.transaction(LEGACY_GRAPH_META_STORE, 'readonly');
            const request = tx.objectStore(LEGACY_GRAPH_META_STORE).get(LEGACY_ACTIVE_GRAPH_KEY);
            request.onsuccess = () => {
                const record = request.result as MetaRecord<string> | undefined;
                resolve(record?.value ?? null);
            };
            request.onerror = () => reject(request.error);
        }).catch(() => null);
    }

    return { graphs, activeGraphId };
}

async function loadLegacyAudioAssets(): Promise<LegacyAudioAssetRecord[]> {
    const fixture = getLegacyWorkspaceTestFixture();
    if (fixture) {
        return fixture.assets.map(({ bytes: _bytes, ...asset }) => deepClone(asset));
    }

    if (typeof indexedDB === 'undefined') {
        return [];
    }

    const db = await new Promise<IDBDatabase | null>((resolve, reject) => {
        const request = indexedDB.open(LEGACY_AUDIO_DB_NAME);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => resolve(request.result);
    }).catch(() => null);

    if (!db || !db.objectStoreNames.contains(LEGACY_AUDIO_STORE)) {
        return [];
    }

    return new Promise<LegacyAudioAssetRecord[]>((resolve, reject) => {
        const tx = db.transaction(LEGACY_AUDIO_STORE, 'readonly');
        const request = tx.objectStore(LEGACY_AUDIO_STORE).getAll();
        request.onsuccess = () => resolve((request.result as LegacyAudioAssetRecord[] | undefined) ?? []);
        request.onerror = () => reject(request.error);
    }).catch(() => []);
}

function getLegacyAudioCacheKey(assetId: string): string {
    const origin = typeof location !== 'undefined' ? location.origin : 'https://din-editor.local';
    return `${origin}${LEGACY_AUDIO_CACHE_PREFIX}${assetId}`;
}

async function loadLegacyAudioBlob(assetId: string): Promise<Blob | null> {
    const fixture = getLegacyWorkspaceTestFixture();
    if (fixture) {
        const asset = fixture.assets.find((entry) => entry.id === assetId);
        if (!asset?.bytes) return null;
        return toBlob(asset.bytes, asset.mimeType);
    }

    if (typeof caches === 'undefined') return null;
    try {
        const cache = await caches.open(LEGACY_AUDIO_CACHE);
        const response = await cache.match(getLegacyAudioCacheKey(assetId));
        if (!response) return null;
        return await response.blob();
    } catch {
        return null;
    }
}

async function ensureLegacyWorkspaceExists(): Promise<boolean> {
    const recovered = await readMetaValue<boolean>(LEGACY_RECOVERY_KEY);
    if (recovered) return false;

    const [legacyGraphs, legacyAssets] = await Promise.all([
        loadLegacyGraphs(),
        loadLegacyAudioAssets(),
    ]);

    return legacyGraphs.graphs.length > 0 || legacyAssets.length > 0;
}

async function requestHandlePermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const query = await handle.queryPermission?.({ mode: 'readwrite' }).catch(() => 'prompt');
    if (query === 'granted') return true;
    const next = await handle.requestPermission?.({ mode: 'readwrite' }).catch(() => 'denied');
    return next === 'granted';
}

async function getDirectoryPickerHandle(): Promise<FileSystemDirectoryHandle> {
    const picker = (window as BrowserFsWindow).showDirectoryPicker;
    if (!picker) {
        throw new Error('This browser does not support the File System Access API.');
    }

    const handle = await picker({ mode: 'readwrite' });
    const allowed = await requestHandlePermission(handle);
    if (!allowed) {
        throw new Error('Project directory access was denied.');
    }
    return handle;
}

async function writeJsonFile(handle: FileSystemDirectoryHandle, name: string, value: unknown): Promise<void> {
    const fileHandle = await handle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(`${JSON.stringify(value, null, 2)}\n`);
    await writable.close();
}

async function readJsonFile<T>(handle: FileSystemDirectoryHandle, name: string): Promise<T | null> {
    try {
        const fileHandle = await handle.getFileHandle(name);
        const file = await fileHandle.getFile();
        return JSON.parse(await file.text()) as T;
    } catch {
        return null;
    }
}

async function ensureDir(handle: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
    return handle.getDirectoryHandle(name, { create: true });
}

async function resolveFileHandle(
    root: FileSystemDirectoryHandle,
    relativePath: string,
    create = false,
): Promise<FileSystemFileHandle> {
    const segments = normalizeRelativePath(relativePath).split('/').filter(Boolean);
    if (segments.length === 0) {
        throw new Error('Invalid file path.');
    }

    let directory = root;
    for (const segment of segments.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(segment, { create });
    }
    return directory.getFileHandle(segments[segments.length - 1]!, { create });
}

async function deleteRelativePath(root: FileSystemDirectoryHandle, relativePath: string): Promise<void> {
    const segments = normalizeRelativePath(relativePath).split('/').filter(Boolean);
    if (segments.length === 0) return;

    let directory = root;
    for (const segment of segments.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(segment);
    }
    const remover = (directory as FileSystemDirectoryHandle & { removeEntry?: (name: string, options?: { recursive?: boolean }) => Promise<void> }).removeEntry;
    if (typeof remover === 'function') {
        await remover.call(directory, segments[segments.length - 1]!);
    }
}

async function writeBlobFile(root: FileSystemDirectoryHandle, relativePath: string, blob: Blob): Promise<void> {
    const fileHandle = await resolveFileHandle(root, relativePath, true);
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
}

async function readBlobFile(root: FileSystemDirectoryHandle, relativePath: string): Promise<Blob | null> {
    try {
        const fileHandle = await resolveFileHandle(root, relativePath);
        const file = await fileHandle.getFile();
        return file;
    } catch {
        return null;
    }
}

async function saveWorkspaceToFileSystem(handle: FileSystemDirectoryHandle, snapshot: ProjectWorkspaceSnapshot): Promise<void> {
    await ensureDir(handle, GRAPH_DIR);
    await ensureDir(handle, SAMPLE_DIR);
    await ensureDir(handle, IMPULSE_DIR);

    const graphDirectory = await handle.getDirectoryHandle(GRAPH_DIR, { create: true });
    const currentGraphFiles = new Set(snapshot.project.graphs.map((graph) => normalizeRelativePath(graph.file).split('/').pop() ?? ''));
    for await (const entry of graphDirectory.values()) {
        if (entry.kind !== 'file') continue;
        if (currentGraphFiles.has(entry.name)) continue;
        const remover = (graphDirectory as FileSystemDirectoryHandle & { removeEntry?: (name: string, options?: { recursive?: boolean }) => Promise<void> }).removeEntry;
        if (typeof remover === 'function') {
            await remover.call(graphDirectory, entry.name).catch(() => undefined);
        }
    }

    for (const graph of snapshot.graphs) {
        const fileName = `${graph.id}.patch.json`;
        const patch = graphDocumentToPatch(sanitizeGraphForStorage(graph));
        await writeJsonFile(graphDirectory, fileName, patch);
    }

    await writeJsonFile(handle, PROJECT_MANIFEST_FILE, toStoredProjectFile(snapshot));
}

async function loadWorkspaceFromFileSystem(project: ProjectManifest, handle: FileSystemDirectoryHandle): Promise<ProjectWorkspaceSnapshot> {
    const stored = await readJsonFile<StoredProjectManifestFile>(handle, PROJECT_MANIFEST_FILE);
    if (!stored) {
        const initialSnapshot = createInitialProjectSnapshot(project);
        await saveWorkspaceToFileSystem(handle, initialSnapshot);
        return initialSnapshot;
    }

    const manifest = fromStoredProjectFile(stored);
    const graphs: GraphDocument[] = [];

    for (const summary of manifest.graphs) {
        const fileHandle = await resolveFileHandle(handle, summary.file).catch(() => null);
        if (!fileHandle) continue;
        const text = await fileHandle.getFile().then((file) => file.text()).catch(() => null);
        if (!text) continue;
        try {
            const patch = JSON.parse(text);
            graphs.push(patchToGraphDocument(patch, {
                graphId: summary.id,
                createdAt: summary.createdAt,
                updatedAt: summary.updatedAt,
                order: summary.order,
            }));
        } catch {
            continue;
        }
    }

    const fallbackGraphs = graphs.length > 0 ? graphs : [createInitialGraphDocument(undefined, 'Graph 1', 0)];
    const hydratedGraphs = hydrateWorkspaceGraphs(fallbackGraphs, manifest.assets);
    const nextProject = syncProjectManifest({
        ...manifest,
        handleId: project.handleId,
    }, hydratedGraphs, manifest.assets);

    return {
        project: nextProject,
        graphs: hydratedGraphs,
        activeGraphId: stored.activeGraphId ?? hydratedGraphs[0]?.id ?? null,
    };
}

function remapGraphAssetsForRecovery(
    graph: GraphDocument,
    assetMap: Map<string, ProjectAssetRecord>,
): GraphDocument {
    return {
        ...graph,
        nodes: graph.nodes.map((node) => {
            if (node.data.type === 'sampler') {
                const sampler = node.data as SamplerNodeData;
                if (!sampler.sampleId) return node;
                const asset = assetMap.get(sampler.sampleId);
                if (!asset) return node;
                return {
                    ...node,
                    data: {
                        ...sampler,
                        assetPath: asset.relativePath,
                        sampleId: asset.id,
                        fileName: asset.fileName,
                        src: '',
                        loaded: false,
                    } as AudioNodeData,
                };
            }

            if (node.data.type === 'convolver') {
                const convolver = node.data as ConvolverNodeData;
                if (!convolver.impulseId) return node;
                const asset = assetMap.get(convolver.impulseId);
                if (!asset) return node;
                return {
                    ...node,
                    data: {
                        ...convolver,
                        assetPath: asset.relativePath,
                        impulseId: asset.id,
                        impulseFileName: asset.fileName,
                        impulseSrc: '',
                    } as AudioNodeData,
                };
            }

            return node;
        }),
    };
}

function createProjectController(args: {
    project: ProjectManifest;
    loadWorkspace: (project: ProjectManifest) => Promise<ProjectWorkspaceSnapshot>;
    saveWorkspace: (snapshot: ProjectWorkspaceSnapshot) => Promise<ProjectManifest>;
    writeAssetBlob: (project: ProjectManifest, asset: ProjectAssetRecord, blob: Blob) => Promise<ProjectAssetRecord>;
    readAssetBlob: (project: ProjectManifest, asset: ProjectAssetRecord) => Promise<Blob | null>;
    deleteAssetBlob: (project: ProjectManifest, asset: ProjectAssetRecord) => Promise<void>;
    revealProject: (projectId: string) => Promise<void>;
}): ProjectController {
    let currentProject = deepClone(args.project);
    let workspacePromise: Promise<ProjectWorkspaceSnapshot> | null = null;
    const objectUrlCache = new Map<string, string>();
    const assetSubscribers = new Set<() => void>();

    const notifyAssets = () => {
        assetSubscribers.forEach((callback) => callback());
    };

    const ensureWorkspace = async () => {
        if (!workspacePromise) {
            workspacePromise = args.loadWorkspace(currentProject).then((workspace) => {
                currentProject = workspace.project;
                return workspace;
            });
        }
        return workspacePromise;
    };

    const persistWorkspace = async (workspace: ProjectWorkspaceSnapshot) => {
        const normalizedGraphs = workspace.graphs.map((graph) => sanitizeGraphForStorage(graph));
        const nextProject = syncProjectManifest(currentProject, normalizedGraphs, workspace.project.assets);
        const nextSnapshot: ProjectWorkspaceSnapshot = {
            project: nextProject,
            graphs: hydrateWorkspaceGraphs(normalizedGraphs, nextProject.assets),
            activeGraphId: workspace.activeGraphId,
        };
        currentProject = await args.saveWorkspace(nextSnapshot);
        workspacePromise = Promise.resolve({
            ...nextSnapshot,
            project: currentProject,
        });
        return await workspacePromise;
    };

    return {
        get project() {
            return currentProject;
        },
        async loadWorkspace() {
            return ensureWorkspace();
        },
        async loadGraphs() {
            const workspace = await ensureWorkspace();
            return workspace.graphs;
        },
        async saveGraph(graph) {
            const workspace = await ensureWorkspace();
            const nextGraph = sanitizeGraphForStorage({
                ...graph,
                updatedAt: Date.now(),
            });
            const existingIndex = workspace.graphs.findIndex((entry) => entry.id === nextGraph.id);
            const nextGraphs = existingIndex >= 0
                ? workspace.graphs.map((entry, index) => (index === existingIndex ? nextGraph : entry))
                : [...workspace.graphs, nextGraph];

            await persistWorkspace({
                ...workspace,
                graphs: nextGraphs,
            });
        },
        async deleteGraph(graphId) {
            const workspace = await ensureWorkspace();
            const remainingGraphs = workspace.graphs.filter((graph) => graph.id !== graphId);
            const nextGraphs = remainingGraphs.length > 0
                ? remainingGraphs
                : [createInitialGraphDocument(undefined, 'Graph 1', 0)];
            const nextActiveGraphId = workspace.activeGraphId === graphId
                ? nextGraphs[0]?.id ?? null
                : workspace.activeGraphId;

            await persistWorkspace({
                ...workspace,
                graphs: nextGraphs,
                activeGraphId: nextActiveGraphId,
            });
        },
        async loadActiveGraphId() {
            const workspace = await ensureWorkspace();
            return workspace.activeGraphId;
        },
        async saveActiveGraphId(graphId) {
            const workspace = await ensureWorkspace();
            await persistWorkspace({
                ...workspace,
                activeGraphId: graphId,
            });
        },
        async listAssets() {
            const workspace = await ensureWorkspace();
            return workspace.project.assets;
        },
        async addAssetFromBlob(blob, name, options) {
            const workspace = await ensureWorkspace();
            const existing = options?.preserveAssetId
                ? workspace.project.assets.find((asset) => asset.id === options.preserveAssetId)
                : undefined;
            const assetId = existing?.id ?? options?.preserveAssetId ?? createAssetId();
            const kind = options?.kind ?? existing?.kind ?? 'audio';
            const fileName = sanitizeFileName(options?.fileName ?? name);
            const relativePath = buildUniqueRelativePath(fileName, kind, workspace.project.assets, existing);
            const now = Date.now();
            const durationSec = await detectAudioDuration(blob);
            const draftAsset: ProjectAssetRecord = {
                id: assetId,
                name: fileName,
                fileName,
                kind,
                relativePath,
                mimeType: blob.type || existing?.mimeType || 'application/octet-stream',
                size: blob.size,
                durationSec: durationSec ?? existing?.durationSec,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
            };

            const storedAsset = await args.writeAssetBlob(currentProject, draftAsset, blob);
            const nextAssets = [
                ...workspace.project.assets.filter((asset) => asset.id !== storedAsset.id),
                storedAsset,
            ];

            const nextWorkspace = await persistWorkspace({
                ...workspace,
                project: {
                    ...workspace.project,
                    assets: nextAssets,
                },
            });

            notifyAssets();
            return nextWorkspace.project.assets.find((asset) => asset.id === storedAsset.id) ?? storedAsset;
        },
        async saveAssetById(assetId, blob, name, options) {
            return this.addAssetFromBlob(blob, name ?? assetId, {
                ...options,
                preserveAssetId: assetId,
            });
        },
        async getAssetObjectUrl(assetId) {
            if (objectUrlCache.has(assetId)) {
                return objectUrlCache.get(assetId) ?? null;
            }

            const workspace = await ensureWorkspace();
            const asset = workspace.project.assets.find((entry) => entry.id === assetId);
            if (!asset) return null;

            const blob = await args.readAssetBlob(currentProject, asset);
            if (!blob) return null;
            const objectUrl = URL.createObjectURL(blob);
            objectUrlCache.set(assetId, objectUrl);
            return objectUrl;
        },
        releaseAssetObjectUrl(assetId) {
            const existing = objectUrlCache.get(assetId);
            if (!existing) return;
            URL.revokeObjectURL(existing);
            objectUrlCache.delete(assetId);
        },
        async deleteAsset(assetId) {
            const workspace = await ensureWorkspace();
            const asset = workspace.project.assets.find((entry) => entry.id === assetId);
            if (!asset) return;
            this.releaseAssetObjectUrl(assetId);
            await args.deleteAssetBlob(currentProject, asset);
            await persistWorkspace({
                ...workspace,
                project: {
                    ...workspace.project,
                    assets: workspace.project.assets.filter((entry) => entry.id !== assetId),
                },
            });
            notifyAssets();
        },
        subscribeAssets(callback) {
            assetSubscribers.add(callback);
            return () => {
                assetSubscribers.delete(callback);
            };
        },
        async reveal() {
            await args.revealProject(currentProject.id);
        },
    };
}

class BrowserProjectRepository implements ProjectRepository {
    readonly supportsDedicatedWindows = false;
    readonly supportsFileSystemAccess = supportsFileSystemAccess();
    readonly windowKind: ProjectWindowKind = getWindowKindFromUrl();
    readonly bootstrapProjectId: string | null = getBootstrapProjectIdFromUrl();

    async listProjects(): Promise<ProjectManifest[]> {
        const projects = await readDbRecords<ProjectManifest>(PROJECTS_STORE);
        return sortProjects(projects);
    }

    async createProject(options: CreateProjectOptions): Promise<ProjectManifest> {
        const preferredStorageKind = options.preferredStorageKind
            ?? (this.supportsFileSystemAccess ? 'browser-fs-handle' : 'browser-indexeddb');

        if (preferredStorageKind === 'browser-fs-handle') {
            const handle = await getDirectoryPickerHandle();
            const handleId = `handle_${createProjectId()}`;
            const baseProject = createEmptyProjectManifest(options, 'browser-fs-handle', { handleId });
            const snapshot = createInitialProjectSnapshot(baseProject);
            await saveWorkspaceToFileSystem(handle, snapshot);
            await writeHandleRecord({ id: handleId, handle });
            await writeProjectRecord(snapshot.project);
            return snapshot.project;
        }

        const baseProject = createEmptyProjectManifest(options, 'browser-indexeddb');
        const snapshot = createInitialProjectSnapshot(baseProject);
        await writeProjectRecord(snapshot.project);
        await writeWorkspaceRecord({
            projectId: snapshot.project.id,
            activeGraphId: snapshot.activeGraphId,
            graphs: snapshot.graphs.map((graph) => sanitizeGraphForStorage(graph)),
        });
        return snapshot.project;
    }

    async openProject(projectId: string): Promise<ProjectController> {
        const project = await readProjectRecord(projectId);
        if (!project) {
            throw new Error(`Project "${projectId}" was not found.`);
        }

        const loadWorkspace = async (projectRecord: ProjectManifest) => {
            if (isFsProject(projectRecord)) {
                const handleRecord = projectRecord.handleId ? await readHandleRecord(projectRecord.handleId) : undefined;
                if (!handleRecord) {
                    throw new Error('Project directory handle is no longer available.');
                }
                return loadWorkspaceFromFileSystem(projectRecord, handleRecord.handle);
            }

            const workspaceRecord = await readWorkspaceRecord(projectRecord.id);
            const fallbackSnapshot = createInitialProjectSnapshot(projectRecord);
            if (!workspaceRecord) {
                await writeWorkspaceRecord({
                    projectId: fallbackSnapshot.project.id,
                    activeGraphId: fallbackSnapshot.activeGraphId,
                    graphs: fallbackSnapshot.graphs.map((graph) => sanitizeGraphForStorage(graph)),
                });
                await writeProjectRecord(fallbackSnapshot.project);
                return fallbackSnapshot;
            }

            const nextProject = syncProjectManifest(projectRecord, workspaceRecord.graphs, projectRecord.assets);
            await writeProjectRecord(nextProject);
            return {
                project: nextProject,
                graphs: hydrateWorkspaceGraphs(workspaceRecord.graphs, nextProject.assets),
                activeGraphId: workspaceRecord.activeGraphId ?? workspaceRecord.graphs[0]?.id ?? null,
            };
        };

        const saveWorkspace = async (snapshot: ProjectWorkspaceSnapshot) => {
            if (isFsProject(snapshot.project)) {
                const handleRecord = snapshot.project.handleId ? await readHandleRecord(snapshot.project.handleId) : undefined;
                if (!handleRecord) {
                    throw new Error('Project directory handle is no longer available.');
                }
                await saveWorkspaceToFileSystem(handleRecord.handle, snapshot);
                await writeProjectRecord(snapshot.project);
                return snapshot.project;
            }

            await writeProjectRecord(snapshot.project);
            await writeWorkspaceRecord({
                projectId: snapshot.project.id,
                activeGraphId: snapshot.activeGraphId,
                graphs: snapshot.graphs.map((graph) => sanitizeGraphForStorage(graph)),
            });
            return snapshot.project;
        };

        const writeAssetBlob = async (projectRecord: ProjectManifest, asset: ProjectAssetRecord, blob: Blob) => {
            if (isFsProject(projectRecord)) {
                const handleRecord = projectRecord.handleId ? await readHandleRecord(projectRecord.handleId) : undefined;
                if (!handleRecord) {
                    throw new Error('Project directory handle is no longer available.');
                }
                await writeBlobFile(handleRecord.handle, asset.relativePath, blob);
                return asset;
            }

            await writeDbRecord(ASSET_BLOBS_STORE, {
                key: getAssetBlobKey(projectRecord.id, asset.id),
                blob,
            } satisfies StoredAssetBlobRecord);
            return asset;
        };

        const readAssetBlob = async (projectRecord: ProjectManifest, asset: ProjectAssetRecord) => {
            if (isFsProject(projectRecord)) {
                const handleRecord = projectRecord.handleId ? await readHandleRecord(projectRecord.handleId) : undefined;
                if (!handleRecord) return null;
                return readBlobFile(handleRecord.handle, asset.relativePath);
            }

            const record = await readDbRecord<StoredAssetBlobRecord>(ASSET_BLOBS_STORE, getAssetBlobKey(projectRecord.id, asset.id));
            return record?.blob ?? null;
        };

        const deleteAssetBlob = async (projectRecord: ProjectManifest, asset: ProjectAssetRecord) => {
            if (isFsProject(projectRecord)) {
                const handleRecord = projectRecord.handleId ? await readHandleRecord(projectRecord.handleId) : undefined;
                if (!handleRecord) return;
                await deleteRelativePath(handleRecord.handle, asset.relativePath).catch(() => undefined);
                return;
            }

            await deleteDbRecord(ASSET_BLOBS_STORE, getAssetBlobKey(projectRecord.id, asset.id));
        };

        return createProjectController({
            project,
            loadWorkspace,
            saveWorkspace,
            writeAssetBlob,
            readAssetBlob,
            deleteAssetBlob,
            revealProject: async () => undefined,
        });
    }

    async openProjectWindow(projectId: string): Promise<ProjectOpenResult> {
        return {
            projectId,
            focusedExisting: false,
        };
    }

    async revealProject(_projectId: string): Promise<void> {
        return undefined;
    }

    async hasLegacyWorkspace(): Promise<boolean> {
        return ensureLegacyWorkspaceExists();
    }

    async recoverLegacyWorkspace(): Promise<ProjectManifest | null> {
        if (!await ensureLegacyWorkspaceExists()) {
            return null;
        }

        const [legacyWorkspace, legacyAssets] = await Promise.all([
            loadLegacyGraphs(),
            loadLegacyAudioAssets(),
        ]);

        const project = await this.createProject({
            name: 'Recovered Project',
            preferredStorageKind: 'browser-indexeddb',
        });
        const controller = await this.openProject(project.id);
        const initialWorkspace = await controller.loadWorkspace();
        const initialGraphId = initialWorkspace.graphs[0]?.id ?? null;
        const assetMap = new Map<string, ProjectAssetRecord>();

        for (const asset of legacyAssets) {
            const blob = await loadLegacyAudioBlob(asset.id);
            if (!blob) continue;
            const nextAsset = await controller.addAssetFromBlob(blob, asset.name, {
                kind: detectAssetKind({
                    kind: 'audio',
                    relativePath: asset.name.toLowerCase().includes('impulse') ? `${IMPULSE_DIR}/${asset.name}` : `${SAMPLE_DIR}/${asset.name}`,
                }),
                preserveAssetId: asset.id,
                fileName: asset.name,
            });
            assetMap.set(asset.id, nextAsset);
        }

        for (const graph of legacyWorkspace.graphs) {
            const remappedGraph = remapGraphAssetsForRecovery(graph, assetMap);
            await controller.saveGraph(remappedGraph);
        }

        if (initialGraphId && legacyWorkspace.graphs.every((graph) => graph.id !== initialGraphId)) {
            await controller.deleteGraph(initialGraphId);
        }

        await controller.saveActiveGraphId(
            legacyWorkspace.activeGraphId
            ?? legacyWorkspace.graphs[0]?.id
            ?? null,
        );

        await writeMetaValue(LEGACY_RECOVERY_KEY, true);
        return controller.project;
    }
}

class ElectronProjectRepository implements ProjectRepository {
    readonly supportsDedicatedWindows = true;
    readonly supportsFileSystemAccess = true;
    readonly windowKind: ProjectWindowKind;
    readonly bootstrapProjectId: string | null;
    private readonly bridge: ElectronProjectBridgeApi;

    constructor(bridge: ElectronProjectBridgeApi) {
        this.bridge = bridge;
        const bootstrap = bridge.getBootstrapState();
        this.windowKind = bootstrap.windowKind;
        this.bootstrapProjectId = bootstrap.projectId;
    }

    listProjects(): Promise<ProjectManifest[]> {
        return this.bridge.listProjects();
    }

    createProject(options: CreateProjectOptions): Promise<ProjectManifest> {
        return this.bridge.createProject(options);
    }

    async openProject(projectId: string): Promise<ProjectController> {
        const projects = await this.listProjects();
        const project = projects.find((entry) => entry.id === projectId);
        if (!project) {
            throw new Error(`Project "${projectId}" was not found.`);
        }

        return createProjectController({
            project,
            loadWorkspace: async (projectRecord) => {
                return this.bridge.loadProject(projectRecord.id);
            },
            saveWorkspace: async (snapshot) => {
                return this.bridge.saveProject(snapshot.project.id, snapshot);
            },
            writeAssetBlob: async (projectRecord, asset, blob) => {
                const stored = await this.bridge.writeProjectAsset(projectRecord.id, {
                    assetId: asset.id,
                    fileName: asset.fileName,
                    mimeType: asset.mimeType,
                    kind: asset.kind,
                    bytes: await toByteArray(blob),
                });
                return {
                    ...stored,
                    relativePath: normalizeRelativePath(stored.relativePath),
                };
            },
            readAssetBlob: async (projectRecord, asset) => {
                const response = await this.bridge.readProjectAsset(projectRecord.id, asset.id);
                if (!response) return null;
                return toBlob(response.bytes, response.asset.mimeType);
            },
            deleteAssetBlob: async (projectRecord, asset) => {
                await this.bridge.deleteProjectAsset(projectRecord.id, asset.id);
            },
            revealProject: async (projectId) => {
                await this.bridge.revealProject(projectId);
            },
        });
    }

    openProjectWindow(projectId: string): Promise<ProjectOpenResult> {
        return this.bridge.openProjectWindow(projectId);
    }

    revealProject(projectId: string): Promise<void> {
        return this.bridge.revealProject(projectId);
    }

    hasLegacyWorkspace(): Promise<boolean> {
        return ensureLegacyWorkspaceExists();
    }

    async recoverLegacyWorkspace(): Promise<ProjectManifest | null> {
        if (!await ensureLegacyWorkspaceExists()) {
            return null;
        }

        const [legacyWorkspace, legacyAssets] = await Promise.all([
            loadLegacyGraphs(),
            loadLegacyAudioAssets(),
        ]);

        const project = await this.createProject({ name: 'Recovered Project' });
        const controller = await this.openProject(project.id);
        const initialWorkspace = await controller.loadWorkspace();
        const initialGraphId = initialWorkspace.graphs[0]?.id ?? null;
        const assetMap = new Map<string, ProjectAssetRecord>();

        for (const asset of legacyAssets) {
            const blob = await loadLegacyAudioBlob(asset.id);
            if (!blob) continue;
            const nextAsset = await controller.addAssetFromBlob(blob, asset.name, {
                kind: detectAssetKind({
                    kind: 'audio',
                    relativePath: asset.name.toLowerCase().includes('impulse') ? `${IMPULSE_DIR}/${asset.name}` : `${SAMPLE_DIR}/${asset.name}`,
                }),
                preserveAssetId: asset.id,
                fileName: asset.name,
            });
            assetMap.set(asset.id, nextAsset);
        }

        for (const graph of legacyWorkspace.graphs) {
            await controller.saveGraph(remapGraphAssetsForRecovery(graph, assetMap));
        }

        if (initialGraphId && legacyWorkspace.graphs.every((graph) => graph.id !== initialGraphId)) {
            await controller.deleteGraph(initialGraphId);
        }

        await controller.saveActiveGraphId(
            legacyWorkspace.activeGraphId
            ?? legacyWorkspace.graphs[0]?.id
            ?? null,
        );
        await writeMetaValue(LEGACY_RECOVERY_KEY, true);
        return controller.project;
    }
}

let repositorySingleton: ProjectRepository | null = null;
let activeProjectController: ProjectController | null = null;

export function getProjectRepository(): ProjectRepository {
    if (repositorySingleton) {
        return repositorySingleton;
    }

    const bridge = getElectronBridge();
    repositorySingleton = bridge
        ? new ElectronProjectRepository(bridge)
        : new BrowserProjectRepository();
    return repositorySingleton;
}

export function getActiveProjectController(): ProjectController | null {
    return activeProjectController;
}

export function requireActiveProjectController(): ProjectController {
    if (!activeProjectController) {
        throw new Error('No active DIN project is loaded.');
    }
    return activeProjectController;
}

export function setActiveProjectController(controller: ProjectController | null): void {
    activeProjectController = controller;
}

export function resetProjectRepositoryForTests(): void {
    activeProjectController = null;
    repositorySingleton = null;
}
