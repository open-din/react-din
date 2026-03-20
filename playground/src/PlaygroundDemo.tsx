import { useState, useCallback, useEffect, useRef, type FC } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    type NodeTypes,
    type Node,
    type OnNodesChange,
    type OnConnectStartParams,
    type FinalConnectionState,
    type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './playground/playground.css';
import Inspector from './playground/Inspector';
import ConnectionAssistMenu from './playground/ConnectionAssistMenu';

import { useAudioGraphStore, type AudioNodeData, type SamplerNodeData } from './playground/store';
import {
    OscNode,
    GainNode,
    FilterNode,
    OutputNode,
    NoiseNode,
    DelayNode,
    ReverbNode,
    StereoPannerNode,
    MixerNode,
    InputNode,
    NoteNode,
    TransportNode,
    StepSequencerNode,
    PianoRollNode,
    LFONode,
    ADSRNode,
    VoiceNode,
    SamplerNode,
    MathNode,
    CompareNode,
    MixNode,
    ClampNode,
    SwitchNode,
} from './playground/nodes';
import { deleteGraph as deleteStoredGraph, loadActiveGraphId, loadGraphs, saveActiveGraphId, saveGraph } from './playground/graphStorage';
import { deleteAudioFromCache, getAudioObjectUrl } from './playground/audioCache';
import { sanitizeGraphForStorage, toPascalCase } from './playground/graphUtils';
import { audioEngine } from './playground/AudioEngine';
import {
    canConnect,
    getCompatibleExistingHandleMatches,
    getCompatibleNodeSuggestions,
    type ConnectionAssistStart,
    type NodeSuggestion,
} from './playground/nodeHelpers';
import { DEFAULT_NODE_SIZE } from './playground/graphBuilders';
import { groupCatalogByCategory, type PlaygroundNodeType } from './playground/nodeCatalog';

const nodeTypes: NodeTypes = {
    oscNode: OscNode as NodeTypes[string],
    gainNode: GainNode as NodeTypes[string],
    filterNode: FilterNode as NodeTypes[string],
    outputNode: OutputNode as NodeTypes[string],
    noiseNode: NoiseNode as NodeTypes[string],
    delayNode: DelayNode as NodeTypes[string],
    reverbNode: ReverbNode as NodeTypes[string],
    pannerNode: StereoPannerNode as NodeTypes[string],
    mixerNode: MixerNode as NodeTypes[string],
    inputNode: InputNode as NodeTypes[string],
    noteNode: NoteNode as NodeTypes[string],
    transportNode: TransportNode as NodeTypes[string],
    stepSequencerNode: StepSequencerNode as NodeTypes[string],
    pianoRollNode: PianoRollNode as NodeTypes[string],
    lfoNode: LFONode as NodeTypes[string],
    adsrNode: ADSRNode as NodeTypes[string],
    voiceNode: VoiceNode as NodeTypes[string],
    samplerNode: SamplerNode as NodeTypes[string],
    mathNode: MathNode as NodeTypes[string],
    compareNode: CompareNode as NodeTypes[string],
    mixNode: MixNode as NodeTypes[string],
    clampNode: ClampNode as NodeTypes[string],
    switchNode: SwitchNode as NodeTypes[string],
};

const nodeCategories = groupCatalogByCategory();
const ASSIST_MENU_WIDTH = 320;
const ASSIST_MENU_HEIGHT = 420;
const ASSIST_MENU_MARGIN = 16;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getClientPosition = (event: MouseEvent | TouchEvent): XYPosition | null => {
    if ('clientX' in event) {
        return { x: event.clientX, y: event.clientY };
    }

    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
};

const getInitialTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem('playground-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const NodePalette: FC = () => {
    const addNode = useAudioGraphStore((s) => s.addNode);

    const handleDragStart = useCallback((e: React.DragEvent, nodeType: PlaygroundNodeType) => {
        e.dataTransfer.setData('application/reactflow', nodeType);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    return (
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
            {nodeCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                        {category.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {category.nodes.map((node) => (
                            <div
                                key={node.type}
                                className="group flex cursor-grab items-center gap-2 rounded-md border border-transparent bg-[var(--panel-muted)] px-2 py-2 text-[11px] font-medium text-[var(--text)] transition hover:border-[var(--panel-border)] hover:bg-[var(--panel-bg)] active:cursor-grabbing"
                                style={{ borderLeftWidth: 3, borderLeftColor: node.color }}
                                draggable
                                onDragStart={(e) => handleDragStart(e, node.type)}
                                onClick={() => addNode(node.type)}
                            >
                                <span className="text-sm">{node.icon}</span>
                                <span className="truncate">{node.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export const PlaygroundDemo: FC = () => {
    const nodes = useAudioGraphStore((s) => s.nodes);
    const edges = useAudioGraphStore((s) => s.edges);
    const graphs = useAudioGraphStore((s) => s.graphs);
    const activeGraphId = useAudioGraphStore((s) => s.activeGraphId);
    const onNodesChange = useAudioGraphStore((s) => s.onNodesChange);
    const onEdgesChange = useAudioGraphStore((s) => s.onEdgesChange);
    const onConnect = useAudioGraphStore((s) => s.onConnect);
    const addNode = useAudioGraphStore((s) => s.addNode);
    const addNodeAndConnect = useAudioGraphStore((s) => s.addNodeAndConnect);
    const setGraphs = useAudioGraphStore((s) => s.setGraphs);
    const setActiveGraph = useAudioGraphStore((s) => s.setActiveGraph);
    const createGraph = useAudioGraphStore((s) => s.createGraph);
    const renameGraph = useAudioGraphStore((s) => s.renameGraph);
    const removeGraph = useAudioGraphStore((s) => s.removeGraph);
    const setSelectedNode = useAudioGraphStore((s) => s.setSelectedNode);
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const isHydrated = useAudioGraphStore((s) => s.isHydrated);
    const setHydrated = useAudioGraphStore((s) => s.setHydrated);

    const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme());
    const isDark = theme === 'dark';

    const activeGraph = graphs.find((graph) => graph.id === activeGraphId) ?? graphs[0];
    const activeGraphName = activeGraph?.name ?? 'Untitled Graph';
    const componentName = toPascalCase(activeGraphName);

    const [nameDraft, setNameDraft] = useState(activeGraphName);
    const saveTimerRef = useRef<number | null>(null);
    const flowRef = useRef<{
        screenToFlowPosition: (clientPosition: XYPosition, options?: { snapToGrid: boolean }) => XYPosition;
    } | null>(null);
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const ignorePaneClickUntilRef = useRef(0);
    const activeConnectionStartRef = useRef<ConnectionAssistStart | null>(null);
    const [compatibleHandleKeys, setCompatibleHandleKeys] = useState<string[]>([]);
    const [assistSuggestions, setAssistSuggestions] = useState<NodeSuggestion[]>([]);
    const [assistMenuOpen, setAssistMenuOpen] = useState(false);
    const [assistMenuQuery, setAssistMenuQuery] = useState('');
    const [assistMenuPosition, setAssistMenuPosition] = useState<XYPosition>({ x: ASSIST_MENU_MARGIN, y: ASSIST_MENU_MARGIN });
    const [assistDropClientPosition, setAssistDropClientPosition] = useState<XYPosition | null>(null);

    const filteredAssistSuggestions = assistSuggestions.filter((suggestion) =>
        suggestion.title.toLowerCase().includes(assistMenuQuery.trim().toLowerCase())
    );

    useEffect(() => {
        setNameDraft(activeGraphName);
    }, [activeGraphName, activeGraphId]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', isDark);
        window.localStorage.setItem('playground-theme', theme);
    }, [isDark, theme]);

    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            try {
                const [storedGraphs, storedActiveId] = await Promise.all([
                    loadGraphs(),
                    loadActiveGraphId(),
                ]);

                if (cancelled) return;

                if (storedGraphs.length > 0) {
                    setGraphs(storedGraphs, storedActiveId ?? null);
                } else {
                    const state = useAudioGraphStore.getState();
                    const fallbackGraph = state.graphs[0];
                    if (fallbackGraph) {
                        await saveGraph(sanitizeGraphForStorage({
                            ...fallbackGraph,
                            updatedAt: Date.now(),
                        }));
                        await saveActiveGraphId(state.activeGraphId ?? null);
                    }
                }
            } catch (error) {
                console.warn('[Playground] Failed to hydrate graphs', error);
            } finally {
                if (!cancelled) {
                    setHydrated(true);
                }
            }
        };

        hydrate();

        return () => {
            cancelled = true;
        };
    }, [setGraphs, setHydrated]);

    useEffect(() => {
        if (!isHydrated || !activeGraph || !activeGraphId) return;

        if (saveTimerRef.current) {
            window.clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = window.setTimeout(() => {
            const updatedGraph = {
                ...activeGraph,
                nodes,
                edges,
                updatedAt: Date.now(),
            };

            saveGraph(sanitizeGraphForStorage(updatedGraph)).catch((error) => {
                console.warn('[Playground] Failed to save graph', error);
            });

            saveActiveGraphId(activeGraphId).catch((error) => {
                console.warn('[Playground] Failed to save active graph id', error);
            });
        }, 300);

        return () => {
            if (saveTimerRef.current) {
                window.clearTimeout(saveTimerRef.current);
            }
        };
    }, [nodes, edges, activeGraph, activeGraphId, activeGraphName, isHydrated]);

    useEffect(() => {
        if (!isHydrated) return;

        nodes.forEach((node) => {
            if (node.data.type !== 'sampler') return;
            const sampler = node.data as SamplerNodeData;
            if (!sampler.sampleId || sampler.src) return;

            getAudioObjectUrl(sampler.sampleId)
                .then((url) => {
                    if (!url) return;
                    updateNodeData(node.id, { src: url, loaded: true });
                    audioEngine.loadSamplerBuffer(node.id, url);
                })
                .catch(() => {
                    // Ignore cache errors for now
                });
        });
    }, [nodes, isHydrated, updateNodeData]);

    const clearDragAssist = useCallback(() => {
        activeConnectionStartRef.current = null;
        setCompatibleHandleKeys([]);
    }, []);

    const resetConnectionAssist = useCallback(() => {
        clearDragAssist();
        setAssistSuggestions([]);
        setAssistMenuOpen(false);
        setAssistMenuQuery('');
        setAssistDropClientPosition(null);
    }, [clearDragAssist]);

    useEffect(() => {
        const root = canvasRef.current;
        if (!root) return;

        const handleNodes = root.querySelectorAll<HTMLElement>('.react-flow__node');
        const handles = root.querySelectorAll<HTMLElement>('.react-flow__handle');

        handleNodes.forEach((element) => element.classList.remove('connection-assist-node'));
        handles.forEach((element) => element.classList.remove('connection-assist-handle'));

        compatibleHandleKeys.forEach((key) => {
            const separatorIndex = key.indexOf(':');
            if (separatorIndex < 0) return;

            const nodeId = key.slice(0, separatorIndex);
            const handleId = key.slice(separatorIndex + 1);
            if (!nodeId || !handleId) return;

            const handle = root.querySelector<HTMLElement>(
                `.react-flow__handle[data-nodeid="${nodeId}"][data-handleid="${handleId}"]`
            );
            if (!handle) return;

            handle.classList.add('connection-assist-handle');
            handle.closest<HTMLElement>('.react-flow__node')?.classList.add('connection-assist-node');
        });

        return () => {
            handleNodes.forEach((element) => element.classList.remove('connection-assist-node'));
            handles.forEach((element) => element.classList.remove('connection-assist-handle'));
        };
    }, [compatibleHandleKeys, nodes]);

    const openAssistMenu = useCallback((clientPosition: XYPosition) => {
        const bounds = canvasRef.current?.getBoundingClientRect();
        if (!bounds) return;

        setAssistMenuPosition({
            x: clamp(clientPosition.x - bounds.left + 12, ASSIST_MENU_MARGIN, Math.max(ASSIST_MENU_MARGIN, bounds.width - ASSIST_MENU_WIDTH - ASSIST_MENU_MARGIN)),
            y: clamp(clientPosition.y - bounds.top + 12, ASSIST_MENU_MARGIN, Math.max(ASSIST_MENU_MARGIN, bounds.height - ASSIST_MENU_HEIGHT - ASSIST_MENU_MARGIN)),
        });
        setAssistDropClientPosition(clientPosition);
        setAssistMenuQuery('');
        setAssistMenuOpen(true);
    }, []);

    const handleConnectStart = useCallback((_: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
        if (!params.nodeId || !params.handleId || !params.handleType) {
            resetConnectionAssist();
            return;
        }

        const start: ConnectionAssistStart = {
            nodeId: params.nodeId,
            handleId: params.handleId,
            handleType: params.handleType,
        };

        clearDragAssist();
        setAssistSuggestions([]);
        setAssistMenuOpen(false);
        setAssistMenuQuery('');
        setAssistDropClientPosition(null);
        activeConnectionStartRef.current = start;
        setCompatibleHandleKeys(getCompatibleExistingHandleMatches(start, nodes).map((match) => match.key));
        setAssistSuggestions(getCompatibleNodeSuggestions(start, nodes));
    }, [clearDragAssist, nodes, resetConnectionAssist]);

    const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
        const dropPosition = getClientPosition(event);
        const shouldOpenMenu = Boolean(
            activeConnectionStartRef.current
            && dropPosition
            && (!connectionState.isValid || !connectionState.toHandle)
        );

        clearDragAssist();

        if (shouldOpenMenu && dropPosition) {
            ignorePaneClickUntilRef.current = Date.now() + 200;
            openAssistMenu(dropPosition);
            return;
        }

        resetConnectionAssist();
    }, [clearDragAssist, openAssistMenu, resetConnectionAssist]);

    const handleAssistSuggestionSelect = useCallback((suggestion: NodeSuggestion) => {
        if (!assistDropClientPosition || !flowRef.current || !canvasRef.current) {
            resetConnectionAssist();
            return;
        }

        const bounds = canvasRef.current.getBoundingClientRect();
        const clampedTopLeft = {
            x: clamp(
                assistDropClientPosition.x - (DEFAULT_NODE_SIZE.width / 2),
                bounds.left + ASSIST_MENU_MARGIN,
                Math.max(bounds.left + ASSIST_MENU_MARGIN, bounds.right - DEFAULT_NODE_SIZE.width - ASSIST_MENU_MARGIN)
            ),
            y: clamp(
                assistDropClientPosition.y - (DEFAULT_NODE_SIZE.height / 2),
                bounds.top + ASSIST_MENU_MARGIN,
                Math.max(bounds.top + ASSIST_MENU_MARGIN, bounds.bottom - DEFAULT_NODE_SIZE.height - ASSIST_MENU_MARGIN)
            ),
        };

        const position = flowRef.current.screenToFlowPosition(clampedTopLeft, { snapToGrid: true });
        const nodeId = addNodeAndConnect(suggestion.type, suggestion.connection, position);
        if (nodeId) {
            setSelectedNode(nodeId);
        }
        resetConnectionAssist();
    }, [addNodeAndConnect, assistDropClientPosition, resetConnectionAssist, setSelectedNode]);

    const commitGraphName = useCallback(() => {
        if (!activeGraphId) return;
        const trimmed = nameDraft.trim();
        const nextName = trimmed || 'Untitled Graph';
        if (nextName !== activeGraphName) {
            renameGraph(activeGraphId, nextName);
        } else if (nameDraft !== nextName) {
            setNameDraft(nextName);
        }
    }, [activeGraphId, nameDraft, activeGraphName, renameGraph]);

    const handleDeleteGraph = useCallback((graphId: string | null) => {
        if (!graphId) return;

        const graph = graphs.find((item) => item.id === graphId);
        if (!graph) return;

        const confirmMessage = graphs.length === 1
            ? `Delete "${graph.name}"? A new blank graph will be created.`
            : `Delete "${graph.name}"? This cannot be undone.`;

        if (!window.confirm(confirmMessage)) return;

        const removedGraph = removeGraph(graphId);
        if (!removedGraph) return;

        deleteStoredGraph(graphId).catch((error) => {
            console.warn('[Playground] Failed to delete graph', error);
        });

        const sampleIds = removedGraph.nodes
            .filter((node) => node.data.type === 'sampler')
            .map((node) => (node.data as SamplerNodeData).sampleId)
            .filter((sampleId): sampleId is string => Boolean(sampleId));

        if (sampleIds.length > 0) {
            Promise.all(sampleIds.map((sampleId) => deleteAudioFromCache(sampleId))).catch((error) => {
                console.warn('[Playground] Failed to delete cached audio', error);
            });
        }

        const nextActiveId = useAudioGraphStore.getState().activeGraphId ?? null;
        saveActiveGraphId(nextActiveId).catch((error) => {
            console.warn('[Playground] Failed to save active graph id', error);
        });
    }, [graphs, removeGraph]);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow') as PlaygroundNodeType;
            if (!type) return;

            const reactFlowBounds = (event.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect();
            if (!reactFlowBounds) return;

            const position = {
                x: event.clientX - reactFlowBounds.left - 80,
                y: event.clientY - reactFlowBounds.top - 50,
            };

            addNode(type, position);
        },
        [addNode]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        resetConnectionAssist();
        setSelectedNode(node.id);
    }, [resetConnectionAssist, setSelectedNode]);

    const onPaneClick = useCallback(() => {
        if (Date.now() < ignorePaneClickUntilRef.current) {
            return;
        }
        resetConnectionAssist();
        setSelectedNode(null);
    }, [resetConnectionAssist, setSelectedNode]);

    const isValidConnection = useCallback((connection: Parameters<typeof canConnect>[0]) => {
        return canConnect(connection, new Map(nodes.map((node) => [node.id, node])));
    }, [nodes]);

    const tabBase =
        'rounded-full border px-3 py-1 text-[11px] font-medium transition';
    const templateButtonBase =
        'flex w-full items-center gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-2 text-left text-[11px] font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--panel-bg)]';

    return (
        <div className="grid h-screen w-full grid-cols-[240px_minmax(0,1fr)_320px] bg-[var(--app-bg)] text-[var(--text)]">
            <aside className="flex h-full flex-col border-r border-[var(--panel-border)] bg-[var(--panel-bg)]">
                <NodePalette />

                <div className="border-t border-[var(--panel-border)] px-4 py-4">
                    <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                        Templates
                    </h4>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                const nodes: Node<AudioNodeData>[] = [
                                    { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 50, y: 50 }, data: { type: 'transport', bpm: 120, playing: false, label: 'Transport' } as any },
                                    { id: 'sequencer', type: 'stepSequencerNode', dragHandle: '.node-header', position: { x: 50, y: 200 }, data: { type: 'stepSequencer', steps: 16, pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], activeSteps: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false], label: 'Step Sequencer' } as any },
                                    { id: 'voice', type: 'voiceNode', dragHandle: '.node-header', position: { x: 300, y: 200 }, data: { type: 'voice', portamento: 0, label: 'Voice' } as any },
                                    { id: 'osc', type: 'oscNode', dragHandle: '.node-header', position: { x: 550, y: 150 }, data: { type: 'osc', frequency: 0, waveform: 'sawtooth', detune: 0, label: 'Oscillator' } as any },
                                    { id: 'adsr', type: 'adsrNode', dragHandle: '.node-header', position: { x: 550, y: 300 }, data: { type: 'adsr', attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5, label: 'ADSR' } as any },
                                    { id: 'gain', type: 'gainNode', dragHandle: '.node-header', position: { x: 800, y: 200 }, data: { type: 'gain', gain: 0, label: 'VCA' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1000, y: 200 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any }
                                ];
                                const edges = [
                                    { id: 'e_t_s', source: 'transport', target: 'sequencer', style: { stroke: '#4488ff', strokeDasharray: '5,5' }, animated: true },
                                    { id: 'e_s_v', source: 'sequencer', target: 'voice', targetHandle: 'trigger', style: { stroke: '#ff4466' }, animated: true },
                                    { id: 'e_v_osc', source: 'voice', sourceHandle: 'note', target: 'osc', targetHandle: 'frequency', style: { stroke: '#ff8844' }, animated: true },
                                    { id: 'e_v_adsr', source: 'voice', sourceHandle: 'gate', target: 'adsr', style: { stroke: '#44cc44' }, animated: true },
                                    { id: 'e_osc_gain', source: 'osc', target: 'gain', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false },
                                    { id: 'e_adsr_gain', source: 'adsr', target: 'gain', targetHandle: 'gain', style: { stroke: '#4488ff' }, animated: true },
                                    { id: 'e_gain_out', source: 'gain', target: 'output', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false }
                                ];

                                useAudioGraphStore.getState().loadGraph(nodes, edges);
                            }}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">🎹</span>
                            <span>Voice Synth</span>
                        </button>

                        <button
                            onClick={() => {
                                const nodes: Node<AudioNodeData>[] = [
                                    { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 50, y: 50 }, data: { type: 'transport', bpm: 120, playing: false, label: 'Transport' } as any },
                                    { id: 'sequencer', type: 'stepSequencerNode', dragHandle: '.node-header', position: { x: 50, y: 200 }, data: { type: 'stepSequencer', steps: 16, pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], activeSteps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], label: 'Kick Seq' } as any },
                                    { id: 'noise', type: 'noiseNode', dragHandle: '.node-header', position: { x: 300, y: 200 }, data: { type: 'noise', noiseType: 'white', label: 'Noise' } as any },
                                    { id: 'adsr', type: 'adsrNode', dragHandle: '.node-header', position: { x: 500, y: 200 }, data: { type: 'adsr', attack: 0.001, decay: 0.1, sustain: 0, release: 0.1, label: 'Env' } as any },
                                    { id: 'gain', type: 'gainNode', dragHandle: '.node-header', position: { x: 700, y: 200 }, data: { type: 'gain', gain: 0, label: 'VCA' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 900, y: 200 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any }
                                ];
                                const edges = [
                                    { id: 'e_t_s', source: 'transport', target: 'sequencer', style: { stroke: '#4488ff', strokeDasharray: '5,5' }, animated: true },
                                    { id: 'e_s_adsr', source: 'sequencer', target: 'adsr', style: { stroke: '#ff4466' }, animated: true },
                                    { id: 'e_n_g', source: 'noise', target: 'gain', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false },
                                    { id: 'e_a_g', source: 'adsr', target: 'gain', targetHandle: 'gain', style: { stroke: '#4488ff' }, animated: true },
                                    { id: 'e_g_o', source: 'gain', target: 'output', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false }
                                ];
                                useAudioGraphStore.getState().loadGraph(nodes, edges);
                            }}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">🥁</span>
                            <span>Drum Synth</span>
                        </button>

                        <button
                            onClick={() => {
                                const notes = [
                                    { pitch: 60, step: 0, duration: 1, velocity: 0.8 },  // C4
                                    { pitch: 64, step: 2, duration: 1, velocity: 0.8 },  // E4
                                    { pitch: 67, step: 4, duration: 1, velocity: 0.8 },  // G4
                                    { pitch: 72, step: 6, duration: 2, velocity: 1.0 },  // C5
                                    { pitch: 60, step: 8, duration: 1, velocity: 0.6 },  // C4
                                    { pitch: 62, step: 10, duration: 1, velocity: 0.7 }, // D4
                                    { pitch: 64, step: 12, duration: 1, velocity: 0.8 }, // E4
                                    { pitch: 67, step: 14, duration: 1, velocity: 0.9 }, // G4
                                ];
                                const nodes: Node<AudioNodeData>[] = [
                                    { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 50, y: 50 }, data: { type: 'transport', bpm: 100, playing: false, label: 'Transport' } as any },
                                    { id: 'pianoroll', type: 'pianoRollNode', dragHandle: '.node-header', position: { x: 50, y: 180 }, data: { type: 'pianoRoll', steps: 16, octaves: 2, baseNote: 48, notes, label: 'Piano Roll' } as any },
                                    { id: 'voice', type: 'voiceNode', dragHandle: '.node-header', position: { x: 500, y: 200 }, data: { type: 'voice', portamento: 0.02, label: 'Voice' } as any },
                                    { id: 'osc', type: 'oscNode', dragHandle: '.node-header', position: { x: 700, y: 150 }, data: { type: 'osc', frequency: 0, waveform: 'sine', detune: 0, label: 'Oscillator' } as any },
                                    { id: 'adsr', type: 'adsrNode', dragHandle: '.node-header', position: { x: 700, y: 300 }, data: { type: 'adsr', attack: 0.05, decay: 0.2, sustain: 0.5, release: 0.3, label: 'ADSR' } as any },
                                    { id: 'gain', type: 'gainNode', dragHandle: '.node-header', position: { x: 900, y: 200 }, data: { type: 'gain', gain: 0, label: 'VCA' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1100, y: 200 }, data: { type: 'output', masterGain: 0.4, playing: false, label: 'Output' } as any }
                                ];
                                const edges = [
                                    { id: 'e_t_pr', source: 'transport', target: 'pianoroll', style: { stroke: '#4488ff', strokeDasharray: '5,5' }, animated: true },
                                    { id: 'e_pr_v', source: 'pianoroll', target: 'voice', targetHandle: 'trigger', style: { stroke: '#ff4466' }, animated: true },
                                    { id: 'e_v_osc', source: 'voice', sourceHandle: 'note', target: 'osc', targetHandle: 'frequency', style: { stroke: '#ff8844' }, animated: true },
                                    { id: 'e_v_adsr', source: 'voice', sourceHandle: 'gate', target: 'adsr', style: { stroke: '#44cc44' }, animated: true },
                                    { id: 'e_osc_gain', source: 'osc', target: 'gain', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false },
                                    { id: 'e_adsr_gain', source: 'adsr', target: 'gain', targetHandle: 'gain', style: { stroke: '#4488ff' }, animated: true },
                                    { id: 'e_gain_out', source: 'gain', target: 'output', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false }
                                ];
                                useAudioGraphStore.getState().loadGraph(nodes, edges);
                            }}
                            className={`${templateButtonBase} border-[var(--accent)] text-[var(--accent)] hover:text-[var(--text)]`}
                        >
                            <span className="text-sm">🎼</span>
                            <span>Piano Roll Synth</span>
                        </button>

                        <button
                            onClick={() => {
                                const nodes: Node<AudioNodeData>[] = [
                                    { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 50, y: 50 }, data: { type: 'transport', bpm: 140, playing: false, label: 'Transport' } as any },
                                    { id: 'sequencer', type: 'stepSequencerNode', dragHandle: '.node-header', position: { x: 50, y: 180 }, data: { type: 'stepSequencer', steps: 16, pattern: [1, 0.6, 0.8, 0.5, 1, 0.4, 0.9, 0.6, 1, 0.5, 0.7, 0.4, 1, 0.6, 0.8, 0.9], activeSteps: [true, true, true, false, true, true, true, false, true, false, true, true, true, true, false, true], label: 'Acid Seq' } as any },
                                    { id: 'voice', type: 'voiceNode', dragHandle: '.node-header', position: { x: 350, y: 180 }, data: { type: 'voice', portamento: 0.03, label: 'Voice' } as any },
                                    { id: 'osc', type: 'oscNode', dragHandle: '.node-header', position: { x: 550, y: 100 }, data: { type: 'osc', frequency: 0, waveform: 'sawtooth', detune: 0, label: 'VCO' } as any },
                                    { id: 'filter', type: 'filterNode', dragHandle: '.node-header', position: { x: 800, y: 150 }, data: { type: 'filter', frequency: 600, q: 15, filterType: 'lowpass', label: 'VCF' } as any },
                                    { id: 'lfo', type: 'lfoNode', dragHandle: '.node-header', position: { x: 550, y: 350 }, data: { type: 'lfo', rate: 0.5, depth: 400, waveform: 'sine', label: 'LFO' } as any },
                                    { id: 'adsr', type: 'adsrNode', dragHandle: '.node-header', position: { x: 550, y: 220 }, data: { type: 'adsr', attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1, label: 'Filter Env' } as any },
                                    { id: 'vca', type: 'gainNode', dragHandle: '.node-header', position: { x: 1000, y: 150 }, data: { type: 'gain', gain: 0.7, label: 'VCA' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1200, y: 150 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any }
                                ];
                                const edges = [
                                    { id: 'e_t_s', source: 'transport', target: 'sequencer', style: { stroke: '#4488ff', strokeDasharray: '5,5' }, animated: true },
                                    { id: 'e_s_v', source: 'sequencer', target: 'voice', targetHandle: 'trigger', style: { stroke: '#ff4466' }, animated: true },
                                    { id: 'e_v_osc', source: 'voice', sourceHandle: 'note', target: 'osc', targetHandle: 'frequency', style: { stroke: '#ff8844' }, animated: true },
                                    { id: 'e_v_adsr', source: 'voice', sourceHandle: 'gate', target: 'adsr', style: { stroke: '#44cc44' }, animated: true },
                                    { id: 'e_osc_filt', source: 'osc', target: 'filter', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false },
                                    { id: 'e_adsr_filt', source: 'adsr', target: 'filter', targetHandle: 'frequency', style: { stroke: '#aa44ff' }, animated: true },
                                    { id: 'e_lfo_filt', source: 'lfo', sourceHandle: 'out', target: 'filter', targetHandle: 'frequency', style: { stroke: '#ff44aa' }, animated: true },
                                    { id: 'e_filt_vca', source: 'filter', target: 'vca', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false },
                                    { id: 'e_vca_out', source: 'vca', target: 'output', sourceHandle: 'out', targetHandle: 'in', style: { stroke: '#44cc44', strokeWidth: 3 }, animated: false }
                                ];
                                useAudioGraphStore.getState().loadGraph(nodes, edges);
                            }}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">🧪</span>
                            <span>Acid Synth</span>
                        </button>
                    </div>
                </div>
            </aside>

            <section className="flex h-full flex-col bg-[var(--canvas-bg)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-2">
                    <div className="flex items-center gap-2 overflow-x-auto pr-2">
                        {graphs.map((graph) => (
                            <button
                                key={graph.id}
                                className={`${tabBase} ${graph.id === activeGraphId
                                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                                    : 'border-transparent bg-[var(--panel-muted)] text-[var(--text-muted)] hover:border-[var(--panel-border)] hover:text-[var(--text)]'
                                }`}
                                onClick={() => setActiveGraph(graph.id)}
                                title={graph.name}
                            >
                                {graph.name}
                            </button>
                        ))}
                        <button
                            className={`${tabBase} border-dashed border-[var(--panel-border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]`}
                            onClick={() => createGraph()}
                            title="New graph"
                        >
                            +
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-subtle)]">
                            Graph
                        </label>
                        <input
                            type="text"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={commitGraphName}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    commitGraphName();
                                    e.currentTarget.blur();
                                }
                            }}
                            placeholder="Graph name"
                            className="h-8 w-40 rounded-md border border-[var(--panel-border)] bg-[var(--panel-muted)] px-2 text-[11px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                        />
                        <span className="font-mono text-[10px] text-[var(--text-subtle)]">
                            {componentName}
                        </span>
                        <button
                            type="button"
                            className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--danger)] transition hover:border-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            onClick={() => handleDeleteGraph(activeGraphId)}
                            title="Delete graph"
                            disabled={!activeGraphId}
                        >
                            🗑 Delete
                        </button>
                        <button
                            type="button"
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className="flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)] transition hover:border-[var(--accent)]"
                            aria-pressed={isDark}
                            title="Toggle theme"
                        >
                            <span className="text-xs">{isDark ? '🌙' : '☀️'}</span>
                            <span className="relative inline-flex h-4 w-8 items-center rounded-full bg-[var(--panel-border)]">
                                <span
                                    className={`h-3 w-3 rounded-full bg-[var(--panel-bg)] shadow-sm transition-transform ${isDark ? 'translate-x-4' : 'translate-x-1'}`}
                                />
                            </span>
                            <span className="hidden sm:inline">{isDark ? 'Dark' : 'Light'}</span>
                        </button>
                    </div>
                </div>

                <div
                    ref={canvasRef}
                    className="relative flex-1"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    <ConnectionAssistMenu
                        isOpen={assistMenuOpen}
                        position={assistMenuPosition}
                        query={assistMenuQuery}
                        suggestions={filteredAssistSuggestions}
                        onClose={resetConnectionAssist}
                        onQueryChange={setAssistMenuQuery}
                        onSelect={handleAssistSuggestionSelect}
                    />
                    <ReactFlow
                        className="h-full"
                        nodes={nodes as unknown as Node[]}
                        edges={edges}
                        onNodesChange={onNodesChange as unknown as OnNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onConnectStart={handleConnectStart}
                        onConnectEnd={handleConnectEnd}
                        onInit={(instance) => {
                            flowRef.current = instance;
                        }}
                        isValidConnection={isValidConnection}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        snapToGrid
                        snapGrid={[15, 15]}
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: true,
                        }}
                    >
                        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--canvas-grid)" />
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => {
                                switch (node.type) {
                                    case 'oscNode': return '#ff8844';
                                    case 'gainNode': return '#44cc44';
                                    case 'filterNode': return '#aa44ff';
                                    case 'outputNode': return '#ff4466';
                                    case 'noiseNode': return '#666666';
                                    case 'delayNode': return '#4488ff';
                                    case 'reverbNode': return '#8844ff';
                                    case 'pannerNode': return '#44cccc';
                                    case 'mixerNode': return '#ffaa44';
                                    default: return '#888';
                                }
                            }}
                            maskColor="var(--minimap-mask)"
                        />
                    </ReactFlow>
                </div>
            </section>

            <aside className="flex h-full flex-col border-l border-[var(--panel-border)] bg-[var(--panel-bg)]">
                <Inspector />
            </aside>
        </div>
    );
};

export default PlaygroundDemo;
