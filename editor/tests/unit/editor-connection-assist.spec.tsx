import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reactFlowState = vi.hoisted(() => ({
    latestProps: null as any,
}));

vi.mock('@xyflow/react', async () => {
    const React = await import('react');
    const NodeIdContext = React.createContext<string | null>(null);

    return {
        ReactFlow: ({ nodes, nodeTypes, children, onInit, ...props }: any) => {
            reactFlowState.latestProps = props;

            React.useEffect(() => {
                onInit?.({
                    screenToFlowPosition: (position: { x: number; y: number }) => position,
                });
            }, [onInit]);

            return (
                <div className="react-flow" data-testid="react-flow">
                    {nodes.map((node: any) => {
                        const NodeComponent = nodeTypes[node.type];
                        return (
                            <div key={node.id} className="react-flow__node" data-nodeid={node.id}>
                                <NodeIdContext.Provider value={node.id}>
                                    <NodeComponent
                                        id={node.id}
                                        data={node.data}
                                        selected={Boolean(node.selected)}
                                        dragging={false}
                                        zIndex={0}
                                        selectable
                                        draggable
                                        isConnectable
                                        positionAbsoluteX={node.position?.x ?? 0}
                                        positionAbsoluteY={node.position?.y ?? 0}
                                        xPos={node.position?.x ?? 0}
                                        yPos={node.position?.y ?? 0}
                                    />
                                </NodeIdContext.Provider>
                            </div>
                        );
                    })}
                    {children}
                </div>
            );
        },
        Background: () => null,
        Controls: () => null,
        MiniMap: () => null,
        BackgroundVariant: { Dots: 'dots' },
        Handle: ({ id, className }: { id?: string; className?: string }) => {
            const nodeId = React.useContext(NodeIdContext);
            return (
                <div
                    className={`react-flow__handle ${className ?? ''}`}
                    data-nodeid={nodeId ?? ''}
                    data-handleid={id ?? ''}
                    data-testid={`handle-${nodeId ?? 'unknown'}-${id ?? 'default'}`}
                />
            );
        },
        Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
        applyNodeChanges: (_changes: unknown, nodes: unknown) => nodes,
        applyEdgeChanges: (_changes: unknown, edges: unknown) => edges,
        addEdge: (edge: any, edges: any[]) => [...edges, { id: edge.id ?? `edge-${edges.length + 1}`, ...edge }],
        useHandleConnections: () => [],
        useNodesData: () => null,
        __getLatestReactFlowProps: () => reactFlowState.latestProps,
    };
});

vi.mock('../../ui/editor/graphStorage', () => ({
    deleteGraph: vi.fn().mockResolvedValue(undefined),
    loadActiveGraphId: vi.fn().mockResolvedValue(null),
    loadGraphs: vi.fn().mockResolvedValue([]),
    saveActiveGraphId: vi.fn().mockResolvedValue(undefined),
    saveGraph: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../ui/editor/audioLibrary', () => ({
    addAssetFromBlob: vi.fn().mockResolvedValue({
        id: 'asset-blob',
        name: 'imported.wav',
        mimeType: 'audio/wav',
        size: 100,
        createdAt: 1,
        updatedAt: 1,
    }),
    addAssetFromFile: vi.fn().mockResolvedValue({
        id: 'asset-file',
        name: 'uploaded.wav',
        mimeType: 'audio/wav',
        size: 100,
        createdAt: 1,
        updatedAt: 1,
    }),
    deleteAsset: vi.fn().mockResolvedValue(undefined),
    getAssetObjectUrl: vi.fn().mockResolvedValue(null),
    listAssets: vi.fn().mockResolvedValue([]),
    subscribeAssets: vi.fn(() => () => {}),
}));

vi.mock('../../ui/editor/AudioEngine', () => ({
    audioEngine: {
        loadSamplerBuffer: vi.fn(),
        onSamplerEnd: () => () => {},
        playSampler: vi.fn(),
        refreshConnections: vi.fn(),
        refreshDataValues: vi.fn(),
        stop: vi.fn(),
        stopSampler: vi.fn(),
        subscribeStep: vi.fn(() => () => {}),
        updateNode: vi.fn(),
        updateSamplerParam: vi.fn(),
    },
}));

describe('Editor connection assist', () => {
    let boundingRectSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.resetModules();
        reactFlowState.latestProps = null;
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            value: {
                getItem: vi.fn(() => null),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn(),
            },
        });
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockReturnValue({
                matches: false,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }),
        });
        boundingRectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
            x: 0,
            y: 0,
            left: 0,
            top: 0,
            right: 1280,
            bottom: 720,
            width: 1280,
            height: 720,
            toJSON: () => ({}),
        } as DOMRect);
    });

    afterEach(() => {
        boundingRectSpy.mockRestore();
    });

    const setNavigatorPlatform = (platform: string) => {
        Object.defineProperty(window.navigator, 'platform', {
            configurable: true,
            value: platform,
        });
    };

    it('highlights compatible handles, opens the menu on invalid drop, and adds a connected node', async () => {
        const reactFlowModule = await import('@xyflow/react') as typeof import('@xyflow/react') & {
            __getLatestReactFlowProps: () => any;
        };
        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const { EditorDemo } = await import('../../ui/EditorDemo');

        render(<EditorDemo />);

        await waitFor(() => {
            expect(reactFlowModule.__getLatestReactFlowProps()).toBeTruthy();
        });

        act(() => {
            reactFlowModule.__getLatestReactFlowProps().onConnectStart(
                new MouseEvent('mousedown', { clientX: 120, clientY: 160 }),
                { nodeId: 'osc_1', handleId: 'out', handleType: 'source' }
            );
        });

        await waitFor(() => {
            expect(screen.getByTestId('handle-gain_1-in')).toHaveClass('connection-assist-handle');
        });

        act(() => {
            reactFlowModule.__getLatestReactFlowProps().onConnectEnd(
                new MouseEvent('mouseup', { clientX: 460, clientY: 280 }),
                { isValid: false, toHandle: null }
            );
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Search nodes')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('option', { name: /Filter -> In/i }));

        await waitFor(() => {
            const state = useAudioGraphStore.getState();
            const filterNode = state.nodes.find((node) => node.data.type === 'filter');
            expect(filterNode).toBeTruthy();
            expect(state.edges.some((edge) => edge.source === 'osc_1' && edge.target === filterNode?.id && edge.targetHandle === 'in')).toBe(true);
        });

        expect(screen.queryByLabelText('Search nodes')).not.toBeInTheDocument();
        expect(document.querySelector('.connection-assist-handle')).toBeNull();
    });

    it('keeps the audio library panel collapsed by default and expands it on demand', async () => {
        const audioLibrary = await import('../../ui/editor/audioLibrary');
        vi.mocked(audioLibrary.listAssets).mockResolvedValue([]);

        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        expect(screen.queryByLabelText('Search library files')).not.toBeInTheDocument();

        fireEvent.click(screen.getByTitle('Expand audio library'));

        await waitFor(() => {
            expect(screen.getByLabelText('Search library files')).toBeInTheDocument();
        });
        expect(screen.getByText('No audio files found.')).toBeInTheDocument();
    });

    it('deletes an audio-library asset and clears sampler references across graphs', async () => {
        const audioLibrary = await import('../../ui/editor/audioLibrary');
        vi.mocked(audioLibrary.listAssets).mockResolvedValue([
            {
                id: 'asset-kick',
                name: 'kick.wav',
                mimeType: 'audio/wav',
                size: 100,
                createdAt: 1,
                updatedAt: 1,
            },
        ]);

        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        act(() => {
            useAudioGraphStore.getState().loadGraph(
                [
                    {
                        id: 'sampler-1',
                        type: 'samplerNode',
                        position: { x: 0, y: 0 },
                        data: {
                            type: 'sampler',
                            src: 'blob:asset-kick',
                            sampleId: 'asset-kick',
                            fileName: 'kick.wav',
                            loop: false,
                            playbackRate: 1,
                            detune: 0,
                            loaded: true,
                            label: 'Sampler',
                        },
                    } as any,
                    {
                        id: 'output-1',
                        type: 'outputNode',
                        position: { x: 0, y: 0 },
                        data: { type: 'output', playing: false, masterGain: 0.5, label: 'Output' },
                    } as any,
                ],
                []
            );
        });

        fireEvent.click(screen.getByTitle('Expand audio library'));
        await waitFor(() => {
            expect(screen.getAllByText('kick.wav').length).toBeGreaterThan(0);
        });

        vi.spyOn(window, 'confirm').mockReturnValue(true);
        fireEvent.click(screen.getByTitle('Delete file from library'));

        await waitFor(() => {
            expect(audioLibrary.deleteAsset).toHaveBeenCalledWith('asset-kick');
        });

        const samplerNode = useAudioGraphStore.getState().nodes.find((node) => node.id === 'sampler-1');
        expect((samplerNode?.data as any).sampleId).toBe('');
        expect((samplerNode?.data as any).src).toBe('');
    });

    it('supports drag-and-drop upload for audio files in the library panel', async () => {
        const audioLibrary = await import('../../ui/editor/audioLibrary');
        vi.mocked(audioLibrary.listAssets).mockResolvedValue([]);
        vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');

        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        fireEvent.click(screen.getByTitle('Expand audio library'));
        const dropzone = screen.getByText('Drag and drop audio files here').closest('.ui-library-dropzone') as HTMLElement;
        expect(dropzone).toBeTruthy();

        const file = new File(['audio-data'], 'kick.mp3', { type: 'audio/mpeg' });
        fireEvent.dragOver(dropzone, { dataTransfer: { files: [file], dropEffect: 'copy' } });
        fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

        await waitFor(() => {
            expect(audioLibrary.addAssetFromFile).toHaveBeenCalledWith(file);
        });
    });

    it('rejects non-audio drag-and-drop uploads in the library panel', async () => {
        const audioLibrary = await import('../../ui/editor/audioLibrary');
        vi.mocked(audioLibrary.listAssets).mockResolvedValue([]);
        vi.mocked(audioLibrary.addAssetFromFile).mockClear();

        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        fireEvent.click(screen.getByTitle('Expand audio library'));
        const dropzone = screen.getByText('Drag and drop audio files here').closest('.ui-library-dropzone') as HTMLElement;
        expect(dropzone).toBeTruthy();

        const file = new File(['not-audio'], 'notes.txt', { type: 'text/plain' });
        fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/Only audio files are accepted\./i)).toBeInTheDocument();
        });
        expect(audioLibrary.addAssetFromFile).not.toHaveBeenCalled();
    });

    it('handles ctrl+z and ctrl+y shortcuts on non-mac platforms', async () => {
        setNavigatorPlatform('Linux x86_64');

        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        act(() => {
            useAudioGraphStore.getState().addNode('mix');
        });

        const nodeCountAfterAdd = useAudioGraphStore.getState().nodes.length;
        act(() => {
            fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        });
        expect(useAudioGraphStore.getState().nodes).toHaveLength(nodeCountAfterAdd - 1);

        act(() => {
            fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
        });
        expect(useAudioGraphStore.getState().nodes).toHaveLength(nodeCountAfterAdd);
    });

    it('handles command+z and command+y shortcuts on macOS', async () => {
        setNavigatorPlatform('MacIntel');

        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        act(() => {
            useAudioGraphStore.getState().addNode('mix');
        });

        const nodeCountAfterAdd = useAudioGraphStore.getState().nodes.length;
        act(() => {
            fireEvent.keyDown(window, { key: 'z', metaKey: true });
        });
        expect(useAudioGraphStore.getState().nodes).toHaveLength(nodeCountAfterAdd - 1);

        act(() => {
            fireEvent.keyDown(window, { key: 'y', metaKey: true });
        });
        expect(useAudioGraphStore.getState().nodes).toHaveLength(nodeCountAfterAdd);
    });

    it('ignores undo shortcuts while focus is inside an editable field', async () => {
        setNavigatorPlatform('Linux x86_64');

        const { useAudioGraphStore } = await import('../../ui/editor/store');
        const { EditorDemo } = await import('../../ui/EditorDemo');
        render(<EditorDemo />);

        act(() => {
            useAudioGraphStore.getState().addNode('mix');
        });

        const nodeCountAfterAdd = useAudioGraphStore.getState().nodes.length;
        const graphNameInput = screen.getByPlaceholderText('Graph name');
        act(() => {
            graphNameInput.focus();
            fireEvent.keyDown(graphNameInput, { key: 'z', ctrlKey: true });
        });

        expect(useAudioGraphStore.getState().nodes).toHaveLength(nodeCountAfterAdd);
        expect(useAudioGraphStore.getState().canUndo).toBe(true);
    });
});
