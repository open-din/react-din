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

vi.mock('../../src/playground/graphStorage', () => ({
    deleteGraph: vi.fn().mockResolvedValue(undefined),
    loadActiveGraphId: vi.fn().mockResolvedValue(null),
    loadGraphs: vi.fn().mockResolvedValue([]),
    saveActiveGraphId: vi.fn().mockResolvedValue(undefined),
    saveGraph: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/playground/audioCache', () => ({
    deleteAudioFromCache: vi.fn().mockResolvedValue(undefined),
    getAudioObjectUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../src/playground/AudioEngine', () => ({
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

describe('Playground connection assist', () => {
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

    it('highlights compatible handles, opens the menu on invalid drop, and adds a connected node', async () => {
        const reactFlowModule = await import('@xyflow/react') as typeof import('@xyflow/react') & {
            __getLatestReactFlowProps: () => any;
        };
        const { useAudioGraphStore } = await import('../../src/playground/store');
        const { PlaygroundDemo } = await import('../../src/PlaygroundDemo');

        render(<PlaygroundDemo />);

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
});
