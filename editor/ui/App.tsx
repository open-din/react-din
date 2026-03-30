import { startTransition, useEffect, useState } from 'react';
import { AgentBridgeClient } from '../bridge/AgentBridgeClient';
import {
    getProjectRepository,
    setActiveProjectController,
    type ProjectController,
    type ProjectManifest,
} from '../project';
import { EditorDemo } from './EditorDemo';
import ProjectLauncher from './ProjectLauncher';

type AppScreen =
    | { kind: 'loading' }
    | { kind: 'launcher' }
    | { kind: 'workspace'; controller: ProjectController };

function App() {
    const [repository] = useState(() => getProjectRepository());
    const [screen, setScreen] = useState<AppScreen>({ kind: 'loading' });
    const [projects, setProjects] = useState<ProjectManifest[]>([]);
    const [hasLegacyWorkspace, setHasLegacyWorkspace] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refreshLauncherState = async () => {
        const [nextProjects, legacyWorkspacePresent] = await Promise.all([
            repository.listProjects(),
            repository.hasLegacyWorkspace(),
        ]);

        setProjects(nextProjects);
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
            setError(nextError instanceof Error ? nextError.message : 'Failed to open the project.');
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
                setError(nextError instanceof Error ? nextError.message : 'Failed to bootstrap the project launcher.');
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
                setError(nextError instanceof Error ? nextError.message : 'Failed to open the project window.');
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
            setError(nextError instanceof Error ? nextError.message : 'Failed to create the project.');
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
            setError(nextError instanceof Error ? nextError.message : 'Failed to recover the legacy workspace.');
        } finally {
            setBusy(false);
        }
    };

    if (screen.kind === 'loading') {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#080912] text-[var(--text)]">
                <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] px-6 py-4 text-[13px] uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                    Loading projects
                </div>
            </main>
        );
    }

    if (screen.kind === 'launcher') {
        return (
            <ProjectLauncher
                projects={projects}
                hasLegacyWorkspace={hasLegacyWorkspace}
                supportsDedicatedWindows={repository.supportsDedicatedWindows}
                supportsFileSystemAccess={repository.supportsFileSystemAccess}
                busy={busy}
                error={error}
                onOpenProject={handleOpenProject}
                onCreateProject={handleCreateProject}
                onRecoverLegacyWorkspace={handleRecoverLegacyWorkspace}
            />
        );
    }

    return (
        <>
            <AgentBridgeClient />
            <EditorDemo
                project={{
                    id: screen.controller.project.id,
                    name: screen.controller.project.name,
                    accentColor: screen.controller.project.accentColor,
                    onRevealProject: () => repository.revealProject(screen.controller.project.id),
                }}
            />
        </>
    );
}

export default App;
