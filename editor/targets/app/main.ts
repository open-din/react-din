import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { graphDocumentToPatch, patchToGraphDocument } from '@din/react/patch';

type ProjectStorageKind = 'electron-fs';
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
    storageKind: ProjectStorageKind;
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

const PROJECT_MANIFEST_FILE = 'din-project.json';
const GRAPH_DIR = 'graphs';
const SAMPLE_DIR = 'samples';
const IMPULSE_DIR = 'impulses';
const REGISTRY_FILE = 'din-project-registry.json';

interface StoredProjectManifestFile extends ProjectManifest {
    version: 1;
    activeGraphId: string | null;
}

let launcherWindow: BrowserWindow | null = null;
const projectWindows = new Map<string, BrowserWindow>();

function createInitialGraphDocument(graphId = createProjectId(), name = 'Graph 1', order = 0): ProjectGraphDocument {
    const now = Date.now();
    return {
        id: graphId,
        name,
        nodes: [
            {
                id: 'osc_1',
                type: 'oscNode',
                position: { x: 50, y: 150 },
                dragHandle: '.node-header',
                data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sine', label: 'Oscillator' },
            },
            {
                id: 'gain_1',
                type: 'gainNode',
                position: { x: 300, y: 150 },
                dragHandle: '.node-header',
                data: { type: 'gain', gain: 0.5, label: 'Gain' },
            },
            {
                id: 'output_1',
                type: 'outputNode',
                position: { x: 520, y: 150 },
                dragHandle: '.node-header',
                data: { type: 'output', playing: false, masterGain: 0.8, label: 'Output' },
            },
        ],
        edges: [
            { id: 'e1-2', source: 'osc_1', target: 'gain_1', sourceHandle: 'out', targetHandle: 'in' },
            { id: 'e2-3', source: 'gain_1', target: 'output_1', sourceHandle: 'out', targetHandle: 'in' },
        ],
        createdAt: now,
        updatedAt: now,
        order,
    };
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

function registryPath(): string {
    return join(app.getPath('userData'), REGISTRY_FILE);
}

function baseProjectsDirectory(): string {
    return join(app.getPath('documents'), 'DIN Projects');
}

async function ensureProjectDirectories(projectPath: string): Promise<void> {
    await mkdir(projectPath, { recursive: true });
    await mkdir(join(projectPath, GRAPH_DIR), { recursive: true });
    await mkdir(join(projectPath, SAMPLE_DIR), { recursive: true });
    await mkdir(join(projectPath, IMPULSE_DIR), { recursive: true });
}

async function readProjectRegistry(): Promise<ProjectManifest[]> {
    try {
        const text = await readFile(registryPath(), 'utf8');
        const records = JSON.parse(text) as ProjectManifest[];
        return records.sort((left, right) => right.lastOpenedAt - left.lastOpenedAt || right.updatedAt - left.updatedAt);
    } catch {
        return [];
    }
}

async function writeProjectRegistry(projects: ProjectManifest[]): Promise<void> {
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(registryPath(), `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
}

async function updateProjectRegistry(project: ProjectManifest): Promise<void> {
    const projects = await readProjectRegistry();
    const nextProjects = [
        ...projects.filter((entry) => entry.id !== project.id),
        project,
    ].sort((left, right) => right.lastOpenedAt - left.lastOpenedAt || right.updatedAt - left.updatedAt);
    await writeProjectRegistry(nextProjects);
}

async function getProjectRecord(projectId: string): Promise<ProjectManifest> {
    const project = (await readProjectRegistry()).find((entry) => entry.id === projectId);
    if (!project) {
        throw new Error(`Project "${projectId}" was not found.`);
    }
    return project;
}

function buildGraphSummary(snapshot: ProjectWorkspaceSnapshot, graphId: string) {
    const graph = snapshot.graphs.find((entry) => entry.id === graphId);
    if (!graph) {
        throw new Error(`Graph "${graphId}" was not found.`);
    }
    return {
        id: graph.id,
        name: graph.name,
        file: `${GRAPH_DIR}/${graph.id}.patch.json`,
        order: graph.order ?? 0,
        createdAt: graph.createdAt,
        updatedAt: graph.updatedAt,
    };
}

function syncProjectManifest(
    project: ProjectManifest,
    snapshot: ProjectWorkspaceSnapshot,
): ProjectManifest {
    const now = Date.now();
    return {
        ...project,
        name: normalizeProjectName(project.name),
        graphs: [...snapshot.graphs]
            .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
            .map((graph) => buildGraphSummary(snapshot, graph.id)),
        assets: [...snapshot.project.assets].sort((left, right) => right.updatedAt - left.updatedAt),
        updatedAt: now,
        lastOpenedAt: now,
    };
}

function createEmptyProjectManifest(options: CreateProjectOptions, projectPath: string): ProjectManifest {
    const now = Date.now();
    const id = createProjectId();
    return {
        id,
        name: normalizeProjectName(options.name),
        accentColor: options.accentColor?.trim() || chooseAccentColor(id),
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        storageKind: 'electron-fs',
        graphs: [],
        assets: [],
        path: projectPath,
    };
}

function createInitialProjectSnapshot(project: ProjectManifest): ProjectWorkspaceSnapshot {
    const graph = createInitialGraphDocument(undefined, 'Graph 1', 0);
    const projectSnapshot: ProjectWorkspaceSnapshot = {
        project: {
            ...project,
            graphs: [],
            assets: [],
        },
        graphs: [graph],
        activeGraphId: graph.id,
    };
    return {
        ...projectSnapshot,
        project: syncProjectManifest(project, projectSnapshot),
    };
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
    };
}

function hydrateGraphAssetReferences(
    graph: ProjectWorkspaceSnapshot['graphs'][number],
    assets: ProjectAssetRecord[],
) {
    const assetByPath = new Map(assets.map((asset) => [normalizeRelativePath(asset.relativePath), asset]));
    return {
        ...graph,
        nodes: graph.nodes.map((node) => {
            if (node.data.type === 'sampler') {
                const sampler = node.data as typeof node.data & {
                    assetPath?: string;
                    sampleId?: string;
                    fileName?: string;
                    loaded?: boolean;
                    src?: string;
                };
                const asset = assetByPath.get(normalizeRelativePath(sampler.assetPath ?? ''));
                if (!asset) return node;
                return {
                    ...node,
                    data: {
                        ...sampler,
                        assetPath: asset.relativePath,
                        sampleId: asset.id,
                        fileName: asset.fileName,
                        loaded: false,
                        src: '',
                    },
                };
            }

            if (node.data.type === 'convolver') {
                const convolver = node.data as typeof node.data & {
                    assetPath?: string;
                    impulseId?: string;
                    impulseFileName?: string;
                    impulseSrc?: string;
                };
                const asset = assetByPath.get(normalizeRelativePath(convolver.assetPath ?? ''));
                if (!asset) return node;
                return {
                    ...node,
                    data: {
                        ...convolver,
                        assetPath: asset.relativePath,
                        impulseId: asset.id,
                        impulseFileName: asset.fileName,
                        impulseSrc: '',
                    },
                };
            }

            return node;
        }),
    };
}

async function saveProjectToDisk(snapshot: ProjectWorkspaceSnapshot): Promise<ProjectManifest> {
    if (!snapshot.project.path) {
        throw new Error('Electron projects require a local path.');
    }

    await ensureProjectDirectories(snapshot.project.path);
    const graphsPath = join(snapshot.project.path, GRAPH_DIR);

    const currentFiles = new Set(snapshot.graphs.map((graph) => `${graph.id}.patch.json`));
    const existingFiles = await readdir(graphsPath).catch(() => []);
    for (const fileName of existingFiles) {
        if (currentFiles.has(fileName)) continue;
        await rm(join(graphsPath, fileName), { force: true }).catch(() => undefined);
    }

    for (const graph of snapshot.graphs) {
        const patch = graphDocumentToPatch(graph);
        await writeFile(join(graphsPath, `${graph.id}.patch.json`), `${JSON.stringify(patch, null, 2)}\n`, 'utf8');
    }

    const project = syncProjectManifest(snapshot.project, snapshot);
    await writeFile(
        join(snapshot.project.path, PROJECT_MANIFEST_FILE),
        `${JSON.stringify(toStoredProjectFile({ ...snapshot, project }), null, 2)}\n`,
        'utf8',
    );
    await updateProjectRegistry(project);
    return project;
}

async function loadProjectFromDisk(project: ProjectManifest): Promise<ProjectWorkspaceSnapshot> {
    if (!project.path) {
        throw new Error('Electron projects require a local path.');
    }

    const manifestText = await readFile(join(project.path, PROJECT_MANIFEST_FILE), 'utf8').catch(() => null);
    if (!manifestText) {
        const fallbackSnapshot = createInitialProjectSnapshot(project);
        const nextProject = await saveProjectToDisk(fallbackSnapshot);
        return {
            ...fallbackSnapshot,
            project: nextProject,
        };
    }

    const stored = JSON.parse(manifestText) as StoredProjectManifestFile;
    const manifest = fromStoredProjectFile(stored);
    const graphs = await Promise.all(
        manifest.graphs.map(async (summary) => {
            const graphText = await readFile(join(project.path!, summary.file), 'utf8').catch(() => null);
            if (!graphText) return null;
            try {
                const patch = JSON.parse(graphText);
                return patchToGraphDocument(patch, {
                    graphId: summary.id,
                    createdAt: summary.createdAt,
                    updatedAt: summary.updatedAt,
                    order: summary.order,
                });
            } catch {
                return null;
            }
        }),
    );

    const hydratedGraphs = graphs.filter(Boolean).map((graph) => hydrateGraphAssetReferences(graph!, manifest.assets));
    const nextGraphs = hydratedGraphs.length > 0 ? hydratedGraphs : [createInitialGraphDocument(undefined, 'Graph 1', 0)];
    const nextProject = syncProjectManifest({
        ...manifest,
        path: project.path,
    }, {
        project: manifest,
        graphs: nextGraphs,
        activeGraphId: stored.activeGraphId ?? nextGraphs[0]?.id ?? null,
    });
    await updateProjectRegistry(nextProject);

    return {
        project: nextProject,
        graphs: nextGraphs,
        activeGraphId: stored.activeGraphId ?? nextGraphs[0]?.id ?? null,
    };
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
    const used = new Set(
        assets
            .filter((asset) => asset.id !== existing?.id)
            .map((asset) => normalizeRelativePath(asset.relativePath)),
    );

    let counter = 2;
    let candidate = normalizeRelativePath(`${folder}/${stem}${extension}`);
    while (used.has(candidate)) {
        candidate = normalizeRelativePath(`${folder}/${stem}-${counter}${extension}`);
        counter += 1;
    }
    return candidate;
}

async function createProjectDirectory(name: string): Promise<string> {
    const baseDir = baseProjectsDirectory();
    await mkdir(baseDir, { recursive: true });

    const slugBase = slugifySegment(name, 'din-project');
    let suffix = 0;
    while (true) {
        const segment = suffix === 0 ? slugBase : `${slugBase}-${suffix + 1}`;
        const projectPath = join(baseDir, segment);
        try {
            await mkdir(projectPath);
            return projectPath;
        } catch (error) {
            suffix += 1;
            if (suffix > 1000) {
                throw error;
            }
        }
    }
}

function createWindowUrl(projectId?: string): string {
    const devUrl = process.env.DIN_EDITOR_APP_DEV_URL?.trim();
    if (!app.isPackaged && devUrl) {
        const url = new URL(devUrl);
        if (projectId) {
            url.searchParams.set('projectId', projectId);
        }
        return url.toString();
    }

    const fileUrl = pathToFileURL(resolve(__dirname, '../renderer/index.html'));
    if (projectId) {
        fileUrl.searchParams.set('projectId', projectId);
    }
    return fileUrl.toString();
}

function createBrowserWindow(projectId?: string): BrowserWindow {
    const preloadPath = join(__dirname, 'preload.js');
    const window = new BrowserWindow({
        width: 1540,
        height: 980,
        minWidth: 1120,
        minHeight: 720,
        backgroundColor: '#080912',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    void window.loadURL(createWindowUrl(projectId));
    return window;
}

function createLauncherWindow(): BrowserWindow {
    if (launcherWindow && !launcherWindow.isDestroyed()) {
        launcherWindow.show();
        launcherWindow.focus();
        return launcherWindow;
    }

    launcherWindow = createBrowserWindow();
    launcherWindow.on('closed', () => {
        launcherWindow = null;
    });
    return launcherWindow;
}

function createProjectWindow(projectId: string): ProjectOpenResult {
    const existing = projectWindows.get(projectId);
    if (existing && !existing.isDestroyed()) {
        existing.show();
        existing.focus();
        return {
            projectId,
            focusedExisting: true,
        };
    }

    const window = createBrowserWindow(projectId);
    projectWindows.set(projectId, window);
    window.on('closed', () => {
        projectWindows.delete(projectId);
    });

    return {
        projectId,
        focusedExisting: false,
    };
}

ipcMain.handle('din-projects:list', async () => {
    return await readProjectRegistry();
});

ipcMain.handle('din-projects:create', async (_event, options: CreateProjectOptions) => {
    const projectPath = await createProjectDirectory(options.name);
    const project = createEmptyProjectManifest(options, projectPath);
    const snapshot = createInitialProjectSnapshot(project);
    const nextProject = await saveProjectToDisk(snapshot);
    return nextProject;
});

ipcMain.handle('din-projects:load', async (_event, projectId: string) => {
    const project = await getProjectRecord(projectId);
    return await loadProjectFromDisk(project);
});

ipcMain.handle('din-projects:save', async (_event, projectId: string, snapshot: ProjectWorkspaceSnapshot) => {
    const project = await getProjectRecord(projectId);
    return await saveProjectToDisk({
        ...snapshot,
        project: {
            ...snapshot.project,
            id: project.id,
            path: project.path,
            storageKind: 'electron-fs',
        },
    });
});

ipcMain.handle('din-projects:asset-write', async (
    _event,
    projectId: string,
    payload: {
        assetId?: string;
        fileName: string;
        mimeType: string;
        kind: ProjectAssetKind;
        bytes: number[];
    },
) => {
    const project = await getProjectRecord(projectId);
    const snapshot = await loadProjectFromDisk(project);
    if (!project.path) {
        throw new Error('Project path is missing.');
    }

    const existing = payload.assetId
        ? snapshot.project.assets.find((asset) => asset.id === payload.assetId)
        : undefined;
    const fileName = sanitizeFileName(payload.fileName);
    const asset: ProjectAssetRecord = {
        id: existing?.id ?? payload.assetId ?? createAssetId(),
        name: fileName,
        fileName,
        kind: payload.kind,
        relativePath: buildUniqueRelativePath(fileName, payload.kind, snapshot.project.assets, existing),
        mimeType: payload.mimeType || existing?.mimeType || 'application/octet-stream',
        size: payload.bytes.length,
        durationSec: existing?.durationSec,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
    };

    const assetPath = join(project.path, asset.relativePath);
    await mkdir(dirname(assetPath), { recursive: true });
    await writeFile(assetPath, Buffer.from(payload.bytes));
    return asset;
});

ipcMain.handle('din-projects:asset-read', async (_event, projectId: string, assetId: string) => {
    const project = await getProjectRecord(projectId);
    if (!project.path) return null;
    const snapshot = await loadProjectFromDisk(project);
    const asset = snapshot.project.assets.find((entry) => entry.id === assetId);
    if (!asset) return null;
    const bytes = await readFile(join(project.path, asset.relativePath)).catch(() => null);
    if (!bytes) return null;
    return {
        asset,
        bytes: Array.from(bytes),
    };
});

ipcMain.handle('din-projects:asset-delete', async (_event, projectId: string, assetId: string) => {
    const project = await getProjectRecord(projectId);
    if (!project.path) return;
    const snapshot = await loadProjectFromDisk(project);
    const asset = snapshot.project.assets.find((entry) => entry.id === assetId);
    if (!asset) return;
    await rm(join(project.path, asset.relativePath), { force: true }).catch(() => undefined);
});

ipcMain.handle('din-projects:open-window', async (_event, projectId: string) => {
    return createProjectWindow(projectId);
});

ipcMain.handle('din-projects:reveal', async (_event, projectId: string) => {
    const project = await getProjectRecord(projectId);
    if (project.path) {
        await shell.openPath(project.path);
    }
});

app.whenReady().then(() => {
    createLauncherWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createLauncherWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
