import { useDeferredValue, useMemo, useState } from 'react';
import type { ProjectManifest } from '../project';

interface ProjectLauncherProps {
    projects: ProjectManifest[];
    hasLegacyWorkspace: boolean;
    supportsDedicatedWindows: boolean;
    supportsFileSystemAccess: boolean;
    busy: boolean;
    error?: string | null;
    onOpenProject: (projectId: string) => Promise<void> | void;
    onCreateProject: (name: string) => Promise<void> | void;
    onRecoverLegacyWorkspace: () => Promise<void> | void;
}

function formatProjectDate(value: number): string {
    try {
        return new Intl.DateTimeFormat(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(value);
    } catch {
        return new Date(value).toLocaleString();
    }
}

export function ProjectLauncher({
    projects,
    hasLegacyWorkspace,
    supportsDedicatedWindows,
    supportsFileSystemAccess,
    busy,
    error,
    onOpenProject,
    onCreateProject,
    onRecoverLegacyWorkspace,
}: ProjectLauncherProps) {
    const [projectName, setProjectName] = useState('');
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);

    const filteredProjects = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) return projects;
        return projects.filter((project) => project.name.toLowerCase().includes(query));
    }, [deferredSearch, projects]);

    const createProject = async () => {
        const nextName = projectName.trim() || 'Untitled Project';
        await onCreateProject(nextName);
        setProjectName('');
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(237,106,90,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(104,165,255,0.24),transparent_35%),linear-gradient(180deg,#080912_0%,#0e1320_45%,#121b28_100%)] px-6 py-8 text-[var(--text)]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,10,18,0.78)] shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur">
                    <div className="grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-8">
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] text-xl">
                                    ◌
                                </span>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[var(--text-subtle)]">
                                        DIN Projects
                                    </p>
                                    <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-white">
                                        One project, one sound world, one dedicated window.
                                    </h1>
                                </div>
                            </div>
                            <p className="max-w-2xl text-[15px] leading-7 text-[rgba(236,242,255,0.82)]">
                                Each project keeps its own graphs and its own audio library. The launcher stays focused on curation:
                                create, reopen, recover and jump back into the right workspace instantly.
                            </p>
                            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {supportsDedicatedWindows ? 'Dedicated project windows' : 'Single-window workspace'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {supportsFileSystemAccess ? 'Local folders enabled' : 'IndexedDB project storage'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {projects.length} tracked projects
                                </span>
                            </div>
                        </div>

                        <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                                New Project
                            </p>
                            <div className="mt-4 flex flex-col gap-3">
                                <label className="text-[12px] font-medium text-[rgba(236,242,255,0.78)]">
                                    Project name
                                </label>
                                <input
                                    type="text"
                                    value={projectName}
                                    onChange={(event) => setProjectName(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            void createProject();
                                        }
                                    }}
                                    placeholder="Atmospheric Breakbeat Lab"
                                    aria-label="Project name"
                                    className="h-12 rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                                />
                                <button
                                    type="button"
                                    onClick={() => void createProject()}
                                    disabled={busy}
                                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,#ed6a5a_0%,#f6a623_100%)] px-4 text-[13px] font-semibold uppercase tracking-[0.24em] text-white transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
                                >
                                    Create Project
                                </button>
                            </div>

                            {hasLegacyWorkspace && (
                                <div className="mt-5 rounded-2xl border border-[rgba(104,165,255,0.25)] bg-[rgba(104,165,255,0.08)] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgba(171,205,255,0.9)]">
                                        Legacy Workspace
                                    </p>
                                    <p className="mt-2 text-[13px] leading-6 text-[rgba(236,242,255,0.78)]">
                                        Previous global graphs and cached assets were found. Recover them once into a dedicated project without deleting the old data.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void onRecoverLegacyWorkspace()}
                                        disabled={busy}
                                        className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-[rgba(104,165,255,0.35)] bg-[rgba(8,13,25,0.75)] px-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[rgba(213,230,255,0.92)] transition hover:border-[rgba(104,165,255,0.7)] hover:text-white disabled:cursor-wait disabled:opacity-70"
                                    >
                                        Recover Legacy Workspace
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="mt-5 rounded-2xl border border-[rgba(255,93,143,0.28)] bg-[rgba(255,93,143,0.1)] px-4 py-3 text-[13px] text-[rgba(255,222,232,0.92)]">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-[rgba(7,10,18,0.72)] p-6 shadow-[0_18px_80px_rgba(0,0,0,0.32)] backdrop-blur">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                                Project Directory
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                                Existing projects
                            </h2>
                        </div>
                        <div className="w-full max-w-sm">
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search projects"
                                aria-label="Search projects"
                                className="h-11 w-full rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                            />
                        </div>
                    </div>

                    {filteredProjects.length === 0 ? (
                        <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] px-6 py-12 text-center">
                            <p className="text-[15px] font-medium text-white">
                                {projects.length === 0 ? 'No project yet.' : 'No project matches this search.'}
                            </p>
                            <p className="mt-2 text-[13px] text-[rgba(236,242,255,0.64)]">
                                Start a dedicated workspace and build graphs in an isolated project library.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredProjects.map((project) => (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => void onOpenProject(project.id)}
                                    className="group rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-left transition hover:border-white/20 hover:bg-[rgba(255,255,255,0.05)]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                                                style={{ backgroundColor: project.accentColor }}
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-white">
                                                    {project.name}
                                                </p>
                                                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-subtle)]">
                                                    {project.storageKind}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                                            {supportsDedicatedWindows ? 'Open Window' : 'Open'}
                                        </span>
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                        <div className="rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.7)] px-3 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">Graphs</p>
                                            <p className="mt-2 text-[22px] font-semibold text-white">{project.graphs.length}</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.7)] px-3 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">Assets</p>
                                            <p className="mt-2 text-[22px] font-semibold text-white">{project.assets.length}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-[12px] text-[rgba(236,242,255,0.7)]">
                                        Last opened {formatProjectDate(project.lastOpenedAt)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

export default ProjectLauncher;
