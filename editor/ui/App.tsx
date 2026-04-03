import { startTransition, useEffect, useState } from 'react';
import { patchToGraphDocument, type PatchDocument } from '@din/react/patch';
import { AgentBridgeClient } from '../bridge/AgentBridgeClient';
import {
    getProjectRepository,
    setActiveProjectController,
    type ProjectController,
    type ProjectManifest,
} from '../project';
import { createTemplateGraphDocument, EDITOR_TEMPLATES } from './editor/templateLibrary';
import { listProjectInterruptedWork, writeProjectResumeIntent } from './projectUiState';
import { Editor } from './Editor';
import { APP_COPY } from './copy';
import ProjectLauncher, { type LauncherImportRequest, type LauncherResumeItem } from './ProjectLauncher';

type AppScreen =
    | { kind: 'loading' }
    | { kind: 'launcher' }
    | { kind: 'workspace'; controller: ProjectController };

function App() {
    const [repository] = useState(() => getProjectRepository());
    const [screen, setScreen] = useState<AppScreen>({ kind: 'loading' });
    const [projects, setProjects] = useState<ProjectManifest[]>([]);
    const [resumableWork, setResumableWork] = useState<LauncherResumeItem[]>([]);
    const [hasLegacyWorkspace, setHasLegacyWorkspace] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshLauncherState = async () => {
        const [nextProjects, legacyWorkspacePresent] = await Promise.all([
            repository.listProjects(),
            repository.hasLegacyWorkspace(),
        ]);

        setProjects(nextProjects);
        setResumableWork(
            listProjectInterruptedWork(nextProjects)
                .map((summary) => {
                    const project = nextProjects.find((entry) => entry.id === summary.projectId);
                    if (!project) return null;
                    return {
                        ...summary,
                        projectName: project.name,
                        accentColor: project.accentColor,
                        storageKind: project.storageKind,
                    } satisfies LauncherResumeItem;
                })
                .filter((entry): entry is LauncherResumeItem => Boolean(entry))
        );
        setHasLegacyWorkspace(legacyWorkspacePresent);
    };

    const openProjectInCurrentWindow = async (projectId: string) => {
        setBusy(true);
        setError(null);
        try {
            const controller = await repository.openProject(projectId);
            setActiveProjectController(controller);
            startTransition(() => {
                setScreen({
                    kind: 'workspace',
                    controller,
                });
            });
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.openProject);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const bootstrap = async () => {
            setBusy(true);
            try {
                if (repository.windowKind === 'project' && repository.bootstrapProjectId) {
                    const controller = await repository.openProject(repository.bootstrapProjectId);
                    if (cancelled) return;
                    setActiveProjectController(controller);
                    setScreen({
                        kind: 'workspace',
                        controller,
                    });
                    return;
                }

                await refreshLauncherState();
                if (cancelled) return;
                setScreen({ kind: 'launcher' });
            } catch (nextError) {
                if (cancelled) return;
                setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.bootstrapLauncher);
                setScreen({ kind: 'launcher' });
            } finally {
                if (!cancelled) {
                    setBusy(false);
                }
            }
        };

        void bootstrap();

        return () => {
            cancelled = true;
            setActiveProjectController(null);
        };
    }, [repository]);

    const handleOpenProject = async (projectId: string) => {
        if (repository.supportsDedicatedWindows && repository.windowKind === 'launcher') {
            setBusy(true);
            setError(null);
            try {
                await repository.openProjectWindow(projectId);
                await refreshLauncherState();
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.openProjectWindow);
            } finally {
                setBusy(false);
            }
            return;
        }

        await openProjectInCurrentWindow(projectId);
    };

    const handleCreateProject = async (name: string) => {
        setBusy(true);
        setError(null);
        try {
            const project = await repository.createProject({ name });
            await refreshLauncherState();
            if (repository.supportsDedicatedWindows && repository.windowKind === 'launcher') {
                await repository.openProjectWindow(project.id);
                return;
            }

            await openProjectInCurrentWindow(project.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.createProject);
        } finally {
            setBusy(false);
        }
    };

    const saveGraphIntoProject = async (
        projectId: string,
        graph: {
            id: string;
            name: string;
            nodes: any[];
            edges: any[];
            createdAt: number;
            updatedAt: number;
            order: number;
        },
        replaceInitialGraph: boolean,
    ) => {
        const controller = await repository.openProject(projectId);
        const workspace = await controller.loadWorkspace();
        const initialGraphId = replaceInitialGraph ? workspace.graphs[0]?.id ?? null : null;
        const nextGraph = {
            ...graph,
            order: replaceInitialGraph ? 0 : workspace.graphs.length,
            updatedAt: Date.now(),
        };

        await controller.saveGraph(nextGraph);

        if (replaceInitialGraph && initialGraphId && initialGraphId !== nextGraph.id) {
            await controller.deleteGraph(initialGraphId);
        }

        await controller.saveActiveGraphId(nextGraph.id);
        return controller.project.id;
    };

    const openPreparedProject = async (projectId: string) => {
        await refreshLauncherState();
        if (repository.supportsDedicatedWindows && repository.windowKind === 'launcher') {
            await repository.openProjectWindow(projectId);
            return;
        }
        await openProjectInCurrentWindow(projectId);
    };

    const handleCreateProjectFromTemplate = async (templateId: string, name: string) => {
        setBusy(true);
        setError(null);
        try {
            const project = await repository.createProject({ name });
            const templateGraph = createTemplateGraphDocument(templateId, 0);
            await saveGraphIntoProject(project.id, templateGraph, true);
            await openPreparedProject(project.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.createProjectFromTemplate);
        } finally {
            setBusy(false);
        }
    };

    const handleImportPatch = async ({
        patch,
        fileName,
        targetProjectId,
        projectName,
    }: LauncherImportRequest) => {
        setBusy(true);
        setError(null);
        try {
            const now = Date.now();
            const project = targetProjectId
                ? null
                : await repository.createProject({
                    name: projectName?.trim() || stripImportedProjectName(fileName),
                });
            const graph = patchToGraphDocument(patch, {
                updatedAt: now,
                createdAt: now,
            });
            const projectId = targetProjectId ?? project?.id;
            if (!projectId) {
                throw new Error(APP_COPY.errors.missingPatchTarget);
            }

            await saveGraphIntoProject(projectId, graph, !targetProjectId);
            await openPreparedProject(projectId);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.importPatch);
        } finally {
            setBusy(false);
        }
    };

    const handleRecoverLegacyWorkspace = async () => {
        setBusy(true);
        setError(null);
        try {
            const recoveredProject = await repository.recoverLegacyWorkspace();
            await refreshLauncherState();
            if (!recoveredProject) return;

            if (repository.supportsDedicatedWindows && repository.windowKind === 'launcher') {
                await repository.openProjectWindow(recoveredProject.id);
                return;
            }

            await openProjectInCurrentWindow(recoveredProject.id);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : APP_COPY.errors.recoverLegacyWorkspace);
        } finally {
            setBusy(false);
        }
    };

    const handleResumeInterruptedWork = async (projectId: string) => {
        const resume = resumableWork.find((entry) => entry.projectId === projectId);
        if (resume) {
            writeProjectResumeIntent(projectId, {
                railMode: resume.railMode,
                graphId: resume.graphId ?? null,
                createdAt: Date.now(),
            });
        }
        await handleOpenProject(projectId);
    };

    if (screen.kind === 'loading') {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#080912] text-[var(--text)]">
                <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-6 py-4 text-[13px] uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                    {APP_COPY.loadingProjects}
                </div>
            </main>
        );
    }

    if (screen.kind === 'launcher') {
        return (
            <ProjectLauncher
                projects={projects}
                templates={EDITOR_TEMPLATES}
                resumableWork={resumableWork}
                hasLegacyWorkspace={hasLegacyWorkspace}
                supportsDedicatedWindows={repository.supportsDedicatedWindows}
                supportsFileSystemAccess={repository.supportsFileSystemAccess}
                busy={busy}
                error={error}
                onOpenProject={handleOpenProject}
                onResumeInterruptedWork={handleResumeInterruptedWork}
                onCreateProject={handleCreateProject}
                onCreateProjectFromTemplate={handleCreateProjectFromTemplate}
                onImportPatch={handleImportPatch}
                onRecoverLegacyWorkspace={handleRecoverLegacyWorkspace}
            />
        );
    }

    return (
        <>
            <AgentBridgeClient />
            <Editor
                project={{
                    id: screen.controller.project.id,
                    name: screen.controller.project.name,
                    accentColor: screen.controller.project.accentColor,
                    path: screen.controller.project.path,
                    onRevealProject: () => repository.revealProject(screen.controller.project.id),
                }}
            />
        </>
    );
}

function stripImportedProjectName(fileName: string) {
    const index = fileName.lastIndexOf('.');
    const base = index > 0 ? fileName.slice(0, index) : fileName;
    return `${base || APP_COPY.importedPatchBaseName} ${APP_COPY.importedPatchProjectSuffix}`;
}

export default App;
