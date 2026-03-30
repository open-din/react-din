import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const projectModuleMock = vi.hoisted(() => {
    let repository: any = null;
    return {
        getProjectRepository: vi.fn(() => repository),
        setActiveProjectController: vi.fn(),
        __setRepository(nextRepository: any) {
            repository = nextRepository;
        },
    };
});

vi.mock('../../project', () => ({
    getProjectRepository: projectModuleMock.getProjectRepository,
    setActiveProjectController: projectModuleMock.setActiveProjectController,
}));

vi.mock('../../ui/EditorDemo', () => ({
    EditorDemo: ({ project }: { project?: { name?: string } }) => (
        <div data-testid="workspace-screen">{project?.name ?? 'workspace'}</div>
    ),
    default: ({ project }: { project?: { name?: string } }) => (
        <div data-testid="workspace-screen">{project?.name ?? 'workspace'}</div>
    ),
}));

vi.mock('../../bridge/AgentBridgeClient', () => ({
    AgentBridgeClient: () => <div data-testid="agent-bridge-client" />,
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('project launcher app shell', () => {
    it('opens a dedicated project window from the launcher in desktop mode', async () => {
        vi.resetModules();
        const project = {
            id: 'project-alpha',
            name: 'Alpha Lab',
            accentColor: '#68a5ff',
            createdAt: 1,
            updatedAt: 2,
            lastOpenedAt: 3,
            storageKind: 'electron-fs' as const,
            graphs: [],
            assets: [],
            path: '/tmp/project-alpha',
        };
        const repository = {
            supportsDedicatedWindows: true,
            supportsFileSystemAccess: true,
            windowKind: 'launcher' as const,
            bootstrapProjectId: null,
            listProjects: vi.fn().mockResolvedValue([project]),
            hasLegacyWorkspace: vi.fn().mockResolvedValue(false),
            createProject: vi.fn(),
            openProject: vi.fn(),
            openProjectWindow: vi.fn().mockResolvedValue({ projectId: project.id, focusedExisting: false }),
            revealProject: vi.fn(),
            recoverLegacyWorkspace: vi.fn(),
        };
        projectModuleMock.__setRepository(repository);

        const { default: App } = await import('../../ui/App');
        render(<App />);

        expect(await screen.findByText('Existing projects')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Alpha Lab'));

        await waitFor(() => {
            expect(repository.openProjectWindow).toHaveBeenCalledWith('project-alpha');
        });
        expect(repository.openProject).not.toHaveBeenCalled();
    });

    it('creates a project and enters the workspace in web mode', async () => {
        vi.resetModules();
        const project = {
            id: 'project-web',
            name: 'Browser Lab',
            accentColor: '#ed6a5a',
            createdAt: 1,
            updatedAt: 2,
            lastOpenedAt: 3,
            storageKind: 'browser-indexeddb' as const,
            graphs: [],
            assets: [],
        };
        const controller = {
            project,
        };
        const repository = {
            supportsDedicatedWindows: false,
            supportsFileSystemAccess: false,
            windowKind: 'launcher' as const,
            bootstrapProjectId: null,
            listProjects: vi.fn().mockResolvedValue([]),
            hasLegacyWorkspace: vi.fn().mockResolvedValue(true),
            createProject: vi.fn().mockResolvedValue(project),
            openProject: vi.fn().mockResolvedValue(controller),
            openProjectWindow: vi.fn(),
            revealProject: vi.fn(),
            recoverLegacyWorkspace: vi.fn().mockResolvedValue(project),
        };
        projectModuleMock.__setRepository(repository);

        const { default: App } = await import('../../ui/App');
        render(<App />);

        expect(await screen.findByText('Recover Legacy Workspace')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Project name'), {
            target: { value: 'Browser Lab' },
        });
        fireEvent.click(screen.getByText('Create Project'));

        await waitFor(() => {
            expect(repository.createProject).toHaveBeenCalledWith({ name: 'Browser Lab' });
            expect(repository.openProject).toHaveBeenCalledWith('project-web');
            expect(projectModuleMock.setActiveProjectController).toHaveBeenCalledWith(controller);
        });

        expect(await screen.findByTestId('workspace-screen')).toHaveTextContent('Browser Lab');
        expect(screen.getByTestId('agent-bridge-client')).toBeInTheDocument();
    });
});
