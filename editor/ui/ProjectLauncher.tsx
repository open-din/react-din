import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { validateOfflinePatchText } from '../core/offline';
import type { ProjectManifest } from '../project';
import type { PatchDocument } from '@din/react/patch';
import type { EditorTemplateDefinition } from './editor/templateLibrary';
import type { DensityMode, InterruptedWorkSummary, LauncherSection, StatusSeverity } from './phase3a.types';
import { LAUNCHER_COPY } from './copy';

export interface LauncherResumeItem extends InterruptedWorkSummary {
    projectName: string;
    accentColor: string;
    storageKind: ProjectManifest['storageKind'];
}

export interface LauncherImportRequest {
    patch: PatchDocument;
    fileName: string;
    targetProjectId?: string;
    projectName?: string;
}

interface ProjectLauncherProps {
    projects: ProjectManifest[];
    templates: EditorTemplateDefinition[];
    resumableWork: LauncherResumeItem[];
    hasLegacyWorkspace: boolean;
    supportsDedicatedWindows: boolean;
    supportsFileSystemAccess: boolean;
    busy: boolean;
    error?: string | null;
    onOpenProject: (projectId: string) => Promise<void> | void;
    onResumeInterruptedWork: (projectId: string) => Promise<void> | void;
    onCreateProject: (name: string) => Promise<void> | void;
    onCreateProjectFromTemplate: (templateId: string, projectName: string) => Promise<void> | void;
    onImportPatch: (request: LauncherImportRequest) => Promise<void> | void;
    onRecoverLegacyWorkspace: () => Promise<void> | void;
}

interface ImportDraft {
    fileName: string;
    patch: PatchDocument;
    summary: ReturnType<typeof validateOfflinePatchText>['summary'];
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

function formatSeverityTone(severity: StatusSeverity) {
    switch (severity) {
        case 'success':
            return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
        case 'warning':
            return 'border-amber-400/30 bg-amber-500/10 text-amber-50';
        case 'danger':
            return 'border-rose-400/30 bg-rose-500/10 text-rose-50';
        case 'info':
        default:
            return 'border-blue-400/30 bg-blue-500/10 text-blue-50';
    }
}

function stripFileExtension(fileName: string) {
    const index = fileName.lastIndexOf('.');
    return index > 0 ? fileName.slice(0, index) : fileName;
}

function getRowDensityClasses(density: DensityMode) {
    return density === 'comfortable'
        ? 'gap-4 px-4 py-4'
        : 'gap-3 px-3 py-3';
}

export function ProjectLauncher({
    projects,
    templates,
    resumableWork,
    hasLegacyWorkspace,
    supportsDedicatedWindows,
    supportsFileSystemAccess,
    busy,
    error,
    onOpenProject,
    onResumeInterruptedWork,
    onCreateProject,
    onCreateProjectFromTemplate,
    onImportPatch,
    onRecoverLegacyWorkspace,
}: ProjectLauncherProps) {
    const [activeSection, setActiveSection] = useState<LauncherSection>('recent');
    const [projectName, setProjectName] = useState('');
    const [search, setSearch] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projects[0]?.id ?? null);
    const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '');
    const [importMode, setImportMode] = useState<'existing' | 'new'>(projects.length > 0 ? 'existing' : 'new');
    const [importProjectName, setImportProjectName] = useState('');
    const [importTargetProjectId, setImportTargetProjectId] = useState(projects[0]?.id ?? '');
    const [importDraft, setImportDraft] = useState<ImportDraft | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [selectedResumeProjectId, setSelectedResumeProjectId] = useState(resumableWork[0]?.projectId ?? null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const deferredSearch = useDeferredValue(search);

    useEffect(() => {
        if (projects.length === 0) {
            setSelectedProjectId(null);
            setImportTargetProjectId('');
            setImportMode('new');
            return;
        }

        if (!selectedProjectId || projects.every((project) => project.id !== selectedProjectId)) {
            setSelectedProjectId(projects[0]?.id ?? null);
        }

        if (!importTargetProjectId || projects.every((project) => project.id !== importTargetProjectId)) {
            setImportTargetProjectId(projects[0]?.id ?? '');
        }
    }, [importTargetProjectId, projects, selectedProjectId]);

    useEffect(() => {
        if (templates.length > 0 && templates.every((template) => template.id !== selectedTemplateId)) {
            setSelectedTemplateId(templates[0]?.id ?? '');
        }
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        if (resumableWork.length === 0) {
            setSelectedResumeProjectId(null);
            return;
        }
        if (!selectedResumeProjectId || resumableWork.every((entry) => entry.projectId !== selectedResumeProjectId)) {
            setSelectedResumeProjectId(resumableWork[0]?.projectId ?? null);
        }
    }, [resumableWork, selectedResumeProjectId]);

    const density: DensityMode = 'compact';
    const filteredProjects = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        if (!query) return projects;
        return projects.filter((project) => {
            const haystack = `${project.name} ${project.storageKind}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [deferredSearch, projects]);

    const resumableByProjectId = useMemo(
        () => new Map(resumableWork.map((entry) => [entry.projectId, entry] as const)),
        [resumableWork],
    );

    const selectedProject = useMemo(() => {
        const fromExplicitSelection = projects.find((project) => project.id === selectedProjectId);
        if (fromExplicitSelection) return fromExplicitSelection;
        return filteredProjects[0] ?? projects[0] ?? null;
    }, [filteredProjects, projects, selectedProjectId]);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
        [selectedTemplateId, templates],
    );

    const selectedResume = useMemo(
        () => resumableWork.find((entry) => entry.projectId === selectedResumeProjectId) ?? resumableWork[0] ?? null,
        [resumableWork, selectedResumeProjectId],
    );
    const sectionTabs = useMemo(
        () => Object.entries(LAUNCHER_COPY.entrySurface.tabs) as [LauncherSection, string][],
        [],
    );

    const createProject = async () => {
        const nextName = projectName.trim() || LAUNCHER_COPY.defaults.untitledProjectName;
        await onCreateProject(nextName);
        setProjectName('');
    };

    const createFromTemplate = async () => {
        if (!selectedTemplate) return;
        const nextName = importProjectName.trim() || `${selectedTemplate.name} ${LAUNCHER_COPY.defaults.projectSuffix}`;
        await onCreateProjectFromTemplate(selectedTemplate.id, nextName);
        setImportProjectName('');
    };

    const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const validation = validateOfflinePatchText(await file.text());
            setImportDraft({
                fileName: file.name,
                patch: validation.patch,
                summary: validation.summary,
            });
            setImportError(null);
        } catch (nextError) {
            setImportDraft(null);
            setImportError(nextError instanceof Error ? nextError.message : LAUNCHER_COPY.errors.validatePatchFile);
        } finally {
            if (importInputRef.current) {
                importInputRef.current.value = '';
            }
        }
    };

    const handleImportSubmit = async () => {
        if (!importDraft) return;
        await onImportPatch({
            patch: importDraft.patch,
            fileName: importDraft.fileName,
            targetProjectId: importMode === 'existing' ? importTargetProjectId : undefined,
            projectName: importMode === 'new'
                ? (importProjectName.trim() || importDraft.summary.name || stripFileExtension(importDraft.fileName))
                : undefined,
        });
    };

    const summaryPanel = (() => {
        if (activeSection === 'templates' && selectedTemplate) {
            return (
                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                        {LAUNCHER_COPY.summary.template}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                        <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: selectedTemplate.accentColor }} />
                        <div>
                            <div className="text-[18px] font-semibold text-white">{selectedTemplate.name}</div>
                            <div className="mt-1 text-[13px] leading-6 text-[rgba(236,242,255,0.78)]">
                                {selectedTemplate.description}
                            </div>
                        </div>
                    </div>
                    <label className="mt-5 flex flex-col gap-2 text-[12px] font-medium text-[rgba(236,242,255,0.82)]">
                        {LAUNCHER_COPY.fields.projectName}
                        <input
                            type="text"
                            value={importProjectName}
                            onChange={(event) => setImportProjectName(event.target.value)}
                            placeholder={`${selectedTemplate.name} ${LAUNCHER_COPY.defaults.projectSuffix}`}
                            className="h-12 rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => void createFromTemplate()}
                        disabled={busy}
                        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,#68a5ff_0%,#8b7dff_100%)] px-4 text-[13px] font-semibold uppercase tracking-[0.24em] text-white transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
                    >
                        {LAUNCHER_COPY.templates.createFromTemplate}
                    </button>
                </div>
            );
        }

        if (activeSection === 'import') {
            return (
                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5" data-testid="launcher-summary-panel">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                        {LAUNCHER_COPY.summary.import}
                    </p>
                    {importDraft ? (
                        <>
                            <div className="mt-4 text-[18px] font-semibold text-white">{importDraft.summary.name}</div>
                            <div className="mt-1 text-[13px] leading-6 text-[rgba(236,242,255,0.78)]">
                                {importDraft.fileName}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.7)] px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">{LAUNCHER_COPY.summary.nodes}</p>
                                    <p className="mt-2 text-[22px] font-semibold text-white">{importDraft.summary.nodeCount}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.7)] px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">{LAUNCHER_COPY.summary.connections}</p>
                                    <p className="mt-2 text-[22px] font-semibold text-white">{importDraft.summary.connectionCount}</p>
                                </div>
                            </div>
                            {importMode === 'new' ? (
                                <label className="mt-5 flex flex-col gap-2 text-[12px] font-medium text-[rgba(236,242,255,0.82)]">
                                    {LAUNCHER_COPY.import.newProjectName}
                                    <input
                                        type="text"
                                        value={importProjectName}
                                        onChange={(event) => setImportProjectName(event.target.value)}
                                        placeholder={importDraft.summary.name || LAUNCHER_COPY.defaults.importedPatchProjectName}
                                        className="h-12 rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                                    />
                                </label>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => void handleImportSubmit()}
                                disabled={busy || (importMode === 'existing' && !importTargetProjectId)}
                                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,#ed6a5a_0%,#f6a623_100%)] px-4 text-[13px] font-semibold uppercase tracking-[0.24em] text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {LAUNCHER_COPY.import.importPatch}
                            </button>
                        </>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[rgba(8,13,25,0.55)] px-4 py-6 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                            {LAUNCHER_COPY.import.emptySummary}
                        </div>
                    )}
                </div>
            );
        }

        if (activeSection === 'recover') {
            return (
                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5" data-testid="launcher-summary-panel">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                        {LAUNCHER_COPY.summary.recovery}
                    </p>
                    {selectedResume ? (
                        <>
                            <div className="mt-4 flex items-center gap-3">
                                <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${formatSeverityTone(selectedResume.severity)}`}>
                                    {selectedResume.kind.replace('-', ' ')}
                                </span>
                                <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                                    {formatProjectDate(selectedResume.updatedAt)}
                                </span>
                            </div>
                            <div className="mt-4 text-[18px] font-semibold text-white">{selectedResume.title}</div>
                            <div className="mt-2 text-[13px] leading-6 text-[rgba(236,242,255,0.78)]">
                                {selectedResume.description}
                            </div>
                            <button
                                type="button"
                                onClick={() => void onResumeInterruptedWork(selectedResume.projectId)}
                                disabled={busy}
                                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,#68a5ff_0%,#8b7dff_100%)] px-4 text-[13px] font-semibold uppercase tracking-[0.24em] text-white transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
                            >
                                {selectedResume.actionLabel}
                            </button>
                        </>
                    ) : hasLegacyWorkspace ? (
                        <>
                            <div className="mt-4 text-[18px] font-semibold text-white">{LAUNCHER_COPY.summary.legacyWorkspaceDetected}</div>
                            <div className="mt-2 text-[13px] leading-6 text-[rgba(236,242,255,0.78)]">
                                {LAUNCHER_COPY.summary.legacyWorkspaceDetectedDescription}
                            </div>
                            <button
                                type="button"
                                onClick={() => void onRecoverLegacyWorkspace()}
                                disabled={busy}
                                className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-[rgba(104,165,255,0.35)] bg-[rgba(8,13,25,0.75)] px-4 text-[13px] font-semibold uppercase tracking-[0.22em] text-[rgba(213,230,255,0.92)] transition hover:border-[rgba(104,165,255,0.7)] hover:text-white disabled:cursor-wait disabled:opacity-70"
                            >
                                {LAUNCHER_COPY.recover.recoverLegacyWorkspace}
                            </button>
                        </>
                    ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[rgba(8,13,25,0.55)] px-4 py-6 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                            {LAUNCHER_COPY.summary.noRecoveryNeeded}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] p-5" data-testid="launcher-summary-panel">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                    {LAUNCHER_COPY.summary.nextActions}
                </p>
                {selectedProject ? (
                    <>
                        <div className="mt-4 flex items-center gap-3">
                            <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: selectedProject.accentColor }} />
                            <div>
                                <div className="text-[18px] font-semibold text-white">{selectedProject.name}</div>
                                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--text-subtle)]">
                                    {LAUNCHER_COPY.helpers.storageKind(selectedProject.storageKind)}
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.7)] px-3 py-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">{LAUNCHER_COPY.summary.graphs}</p>
                                <p className="mt-2 text-[22px] font-semibold text-white">{selectedProject.graphs.length}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.7)] px-3 py-3">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">{LAUNCHER_COPY.summary.assets}</p>
                                <p className="mt-2 text-[22px] font-semibold text-white">{selectedProject.assets.length}</p>
                            </div>
                        </div>
                        <div className="mt-4 text-[12px] text-[rgba(236,242,255,0.72)]">
                            {LAUNCHER_COPY.summary.lastOpened(formatProjectDate(selectedProject.lastOpenedAt))}
                        </div>
                        {resumableByProjectId.get(selectedProject.id) ? (
                            <div className={`mt-4 rounded-2xl border px-4 py-4 ${formatSeverityTone(resumableByProjectId.get(selectedProject.id)?.severity ?? 'info')}`}>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]">{LAUNCHER_COPY.summary.interruptedWork}</div>
                                <div className="mt-2 text-[13px] leading-6">
                                    {resumableByProjectId.get(selectedProject.id)?.description}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void onResumeInterruptedWork(selectedProject.id)}
                                    disabled={busy}
                                    className="mt-3 inline-flex h-10 items-center justify-center rounded-xl border border-current/30 px-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:bg-white/10 disabled:opacity-70"
                                >
                                    {resumableByProjectId.get(selectedProject.id)?.actionLabel}
                                </button>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-[rgba(8,13,25,0.55)] px-4 py-6 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                        {LAUNCHER_COPY.summary.emptySelectedProject}
                    </div>
                )}
                <div className="mt-6 border-t border-white/10 pt-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                        {LAUNCHER_COPY.summary.newProject}
                    </div>
                    <label className="mt-4 flex flex-col gap-2 text-[12px] font-medium text-[rgba(236,242,255,0.82)]">
                        {LAUNCHER_COPY.fields.projectName}
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
                            placeholder={LAUNCHER_COPY.defaults.newProjectPlaceholder}
                            aria-label={LAUNCHER_COPY.fields.projectName}
                            className="h-12 rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => void createProject()}
                        disabled={busy}
                        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,#ed6a5a_0%,#f6a623_100%)] px-4 text-[13px] font-semibold uppercase tracking-[0.24em] text-white transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
                    >
                        {LAUNCHER_COPY.actions.createProject}
                    </button>
                </div>
            </div>
        );
    })();

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(237,106,90,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(104,165,255,0.24),transparent_35%),linear-gradient(180deg,#080912_0%,#0e1320_45%,#121b28_100%)] px-6 py-8 text-[var(--text)]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
                <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,10,18,0.78)] shadow-[0_24px_120px_rgba(0,0,0,0.45)] backdrop-blur">
                    <div className="grid gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:px-8">
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-3">
                                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] text-xl">
                                    ◌
                                </span>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[var(--text-subtle)]">
                                        {LAUNCHER_COPY.hero.badge}
                                    </p>
                                    <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-white">
                                        {LAUNCHER_COPY.hero.title}
                                    </h1>
                                </div>
                            </div>
                            <p className="max-w-2xl text-[15px] leading-7 text-[rgba(236,242,255,0.82)]">
                                {LAUNCHER_COPY.hero.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {supportsDedicatedWindows ? LAUNCHER_COPY.hero.dedicatedProjectWindows : LAUNCHER_COPY.hero.singleWindowWorkspace}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {supportsFileSystemAccess ? LAUNCHER_COPY.hero.localFoldersEnabled : LAUNCHER_COPY.hero.indexedDbProjectStorage}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {LAUNCHER_COPY.hero.trackedProjects(projects.length)}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                                    {LAUNCHER_COPY.hero.resumableTasks(resumableWork.length)}
                                </span>
                            </div>
                        </div>
                        {summaryPanel}
                    </div>
                </section>

                <section className="rounded-[28px] border border-white/10 bg-[rgba(7,10,18,0.72)] p-6 shadow-[0_18px_80px_rgba(0,0,0,0.32)] backdrop-blur">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                                {LAUNCHER_COPY.entrySurface.badge}
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                                {LAUNCHER_COPY.entrySurface.title}
                            </h2>
                        </div>
                        <div
                            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[rgba(8,13,25,0.88)] p-1"
                            data-testid="launcher-section-tabs"
                        >
                            {sectionTabs.map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveSection(id)}
                                    className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition ${
                                        activeSection === id
                                            ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                            : 'text-[var(--text-subtle)] hover:text-[var(--text)]'
                                    }`}
                                    aria-pressed={activeSection === id}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-2xl border border-[rgba(255,93,143,0.28)] bg-[rgba(255,93,143,0.1)] px-4 py-3 text-[13px] text-[rgba(255,222,232,0.92)]">
                            {error}
                        </div>
                    )}

                    {activeSection === 'recent' ? (
                        <div className="mt-6 space-y-5" data-testid="launcher-section-recent">
                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                                        {LAUNCHER_COPY.recent.badge}
                                    </p>
                                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">
                                        {LAUNCHER_COPY.recent.title}
                                    </h3>
                                </div>
                                <div className="w-full max-w-sm">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder={LAUNCHER_COPY.recent.searchPlaceholder}
                                        aria-label={LAUNCHER_COPY.recent.searchLabel}
                                        className="h-11 w-full rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                                    />
                                </div>
                            </div>

                            {filteredProjects.length === 0 ? (
                                <div className="rounded-[24px] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] px-6 py-12 text-center">
                                    <p className="text-[15px] font-medium text-white">
                                        {projects.length === 0 ? LAUNCHER_COPY.recent.emptyNoProjects : LAUNCHER_COPY.recent.emptyNoMatches}
                                    </p>
                                    <p className="mt-2 text-[13px] text-[rgba(236,242,255,0.64)]">
                                        {LAUNCHER_COPY.recent.emptyDescription}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {filteredProjects.map((project) => {
                                        const resume = resumableByProjectId.get(project.id);
                                        return (
                                            <div
                                                key={project.id}
                                                className={`grid items-center rounded-[24px] border transition ${
                                                    project.id === selectedProject?.id
                                                        ? 'border-[var(--accent)] bg-[rgba(255,255,255,0.06)]'
                                                        : 'border-white/10 bg-[rgba(255,255,255,0.03)] hover:border-white/20'
                                                } md:grid-cols-[minmax(0,1fr)_auto] ${getRowDensityClasses(density)}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedProjectId(project.id)}
                                                    className="flex min-w-0 items-start gap-3 text-left"
                                                >
                                                    <span
                                                        className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                                                        style={{ backgroundColor: project.accentColor }}
                                                    />
                                                    <div className="min-w-0">
                                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                            <span className="truncate text-[17px] font-semibold tracking-[-0.02em] text-white">
                                                                {project.name}
                                                            </span>
                                                            {resume ? (
                                                                <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${formatSeverityTone(resume.severity)}`}>
                                                                    {resume.kind.replace('-', ' ')}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-subtle)]">
                                                            {LAUNCHER_COPY.helpers.storageKind(project.storageKind)}
                                                        </p>
                                                        <p className="mt-2 text-[12px] text-[rgba(236,242,255,0.68)]">
                                                            {LAUNCHER_COPY.recent.projectRowSummary(
                                                                project.graphs.length,
                                                                project.assets.length,
                                                                formatProjectDate(project.lastOpenedAt),
                                                            )}
                                                        </p>
                                                    </div>
                                                </button>
                                                <div className="flex flex-wrap items-center justify-end gap-2">
                                                    {resume ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => void onResumeInterruptedWork(project.id)}
                                                            disabled={busy}
                                                            className="rounded-xl border border-[rgba(104,165,255,0.35)] bg-[rgba(8,13,25,0.75)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[rgba(213,230,255,0.92)] transition hover:border-[rgba(104,165,255,0.7)] hover:text-white disabled:opacity-70"
                                                        >
                                                            {resume.actionLabel}
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => void onOpenProject(project.id)}
                                                        disabled={busy}
                                                        className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20 disabled:opacity-70"
                                                    >
                                                        {supportsDedicatedWindows ? LAUNCHER_COPY.recent.openWindow : LAUNCHER_COPY.recent.open}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {activeSection === 'templates' ? (
                        <div className="mt-6 grid gap-4 md:grid-cols-2" data-testid="launcher-section-templates">
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => setSelectedTemplateId(template.id)}
                                    className={`rounded-[24px] border p-5 text-left transition ${
                                        selectedTemplate?.id === template.id
                                            ? 'border-[var(--accent)] bg-[rgba(255,255,255,0.06)]'
                                            : 'border-white/10 bg-[rgba(255,255,255,0.03)] hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: template.accentColor }} />
                                        <div className="text-[17px] font-semibold tracking-[-0.02em] text-white">{template.name}</div>
                                    </div>
                                    <p className="mt-3 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                                        {template.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    ) : null}

                    {activeSection === 'import' ? (
                        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]" data-testid="launcher-section-import">
                            <div className="space-y-5">
                                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                                                {LAUNCHER_COPY.import.patchFile}
                                            </div>
                                            <div className="mt-2 text-[16px] font-semibold text-white">
                                                {LAUNCHER_COPY.import.validateBeforeImporting}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => importInputRef.current?.click()}
                                            className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20"
                                        >
                                            {LAUNCHER_COPY.import.selectPatch}
                                        </button>
                                    </div>
                                    <input
                                        ref={importInputRef}
                                        type="file"
                                        accept=".json,application/json"
                                        onChange={handleImportFileChange}
                                        aria-label={LAUNCHER_COPY.import.fileInputLabel}
                                        className="sr-only"
                                    />
                                    <p className="mt-3 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                                        {LAUNCHER_COPY.import.description}
                                    </p>
                                    {importError ? (
                                        <div className="mt-4 rounded-2xl border border-[rgba(255,93,143,0.28)] bg-[rgba(255,93,143,0.1)] px-4 py-3 text-[13px] text-[rgba(255,222,232,0.92)]">
                                            {importError}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                                        {LAUNCHER_COPY.import.destination}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setImportMode('existing')}
                                            disabled={projects.length === 0}
                                            className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                                importMode === 'existing'
                                                    ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                                    : 'border border-white/10 text-[var(--text-subtle)] hover:text-[var(--text)]'
                                            } disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                            {LAUNCHER_COPY.import.existingProject}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImportMode('new')}
                                            className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                                                importMode === 'new'
                                                    ? 'bg-[var(--accent-soft)] text-[var(--text)]'
                                                    : 'border border-white/10 text-[var(--text-subtle)] hover:text-[var(--text)]'
                                            }`}
                                        >
                                            {LAUNCHER_COPY.import.newProject}
                                        </button>
                                    </div>
                                    {importMode === 'existing' ? (
                                        <label className="mt-4 flex flex-col gap-2 text-[12px] font-medium text-[rgba(236,242,255,0.82)]">
                                            {LAUNCHER_COPY.import.targetProject}
                                            <select
                                                value={importTargetProjectId}
                                                onChange={(event) => setImportTargetProjectId(event.target.value)}
                                                className="h-12 rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                                            >
                                                {projects.map((project) => (
                                                    <option key={project.id} value={project.id}>
                                                        {project.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    ) : (
                                        <label className="mt-4 flex flex-col gap-2 text-[12px] font-medium text-[rgba(236,242,255,0.82)]">
                                            {LAUNCHER_COPY.import.newProjectName}
                                            <input
                                                type="text"
                                                value={importProjectName}
                                                onChange={(event) => setImportProjectName(event.target.value)}
                                                placeholder={LAUNCHER_COPY.defaults.importedPatchProjectName}
                                                className="h-12 rounded-2xl border border-white/10 bg-[rgba(8,13,25,0.88)] px-4 text-[14px] text-white outline-none transition placeholder:text-[rgba(236,242,255,0.28)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(104,165,255,0.2)]"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                            <div className="rounded-[24px] border border-dashed border-white/10 bg-[rgba(255,255,255,0.03)] p-5 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                                {LAUNCHER_COPY.import.importOutcome}
                            </div>
                        </div>
                    ) : null}

                    {activeSection === 'recover' ? (
                        <div className="mt-6 space-y-5" data-testid="launcher-section-recover">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                                        {LAUNCHER_COPY.recover.recover}
                                    </div>
                                    <div className="mt-2 text-[16px] font-semibold text-white">
                                        {LAUNCHER_COPY.recover.legacyWorkspaceHandoff}
                                    </div>
                                    <p className="mt-3 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                                        {LAUNCHER_COPY.recover.legacyWorkspaceDescription}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => void onRecoverLegacyWorkspace()}
                                        disabled={!hasLegacyWorkspace || busy}
                                        className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl border border-[rgba(104,165,255,0.35)] bg-[rgba(8,13,25,0.75)] px-4 text-[13px] font-semibold uppercase tracking-[0.22em] text-[rgba(213,230,255,0.92)] transition hover:border-[rgba(104,165,255,0.7)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {LAUNCHER_COPY.recover.recoverLegacyWorkspace}
                                    </button>
                                </div>
                                <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-5">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-subtle)]">
                                        {LAUNCHER_COPY.recover.interruptedWork}
                                    </div>
                                    {resumableWork.length === 0 ? (
                                        <div className="mt-3 text-[13px] leading-6 text-[rgba(236,242,255,0.72)]">
                                            {LAUNCHER_COPY.recover.noInterruptedWork}
                                        </div>
                                    ) : (
                                        <div className="mt-4 grid gap-3">
                                            {resumableWork.map((entry) => (
                                                <button
                                                    key={entry.projectId}
                                                    type="button"
                                                    onClick={() => setSelectedResumeProjectId(entry.projectId)}
                                                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                                                        selectedResume?.projectId === entry.projectId
                                                            ? 'border-[var(--accent)] bg-[rgba(255,255,255,0.06)]'
                                                            : 'border-white/10 bg-[rgba(255,255,255,0.02)] hover:border-white/20'
                                                    }`}
                                                    data-testid="launcher-resume-card"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-[14px] font-semibold text-white">{entry.projectName}</span>
                                                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${formatSeverityTone(entry.severity)}`}>
                                                            {entry.kind.replace('-', ' ')}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-[12px] text-[rgba(236,242,255,0.68)]">
                                                        {entry.title}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}

export default ProjectLauncher;
