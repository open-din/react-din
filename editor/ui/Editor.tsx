import { useState, useCallback, useEffect, useMemo, useRef, type FC, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    useOnSelectionChange,
    type NodeTypes,
    type Node,
    type Edge,
    type OnConnectStartParams,
    type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './editor/editor.css';
import Inspector from './editor/Inspector';
import { CodeGenerator } from './editor/CodeGenerator';
import ConnectionAssistMenu from './editor/ConnectionAssistMenu';
import { MidiProvider } from '@din/react/midi';

import { useAudioGraphStore } from './editor/store';
import type { AudioNodeData } from './editor/types';
import {
    OscNode, GainNode, FilterNode, OutputNode, NoiseNode, DelayNode, ReverbNode,
    CompressorNode, PhaserNode, FlangerNode, TremoloNode, EQ3Node, DistortionNode,
    ChorusNode, NoiseBurstNode, WaveShaperNode, ConvolverNode, AnalyzerNode,
    StereoPannerNode, Panner3DNode, MixerNode, AuxSendNode, AuxReturnNode,
    MatrixMixerNode, InputNode, UiTokensNode, ConstantSourceNode, MediaStreamNode,
    EventTriggerNode, NoteNode, TransportNode, StepSequencerNode, PianoRollNode,
    LFONode, ADSRNode, VoiceNode, SamplerNode, MidiNoteNode, MidiCCNode,
    MidiNoteOutputNode, MidiCCOutputNode, MidiSyncNode, MathNode, CompareNode,
    MixNode, ClampNode, SwitchNode,
} from './editor/nodes';
import { loadActiveGraphId, loadGraphs, saveActiveGraphId, saveGraph } from './editor/graphStorage';
import { addAssetFromFile, getAssetObjectUrl, subscribeAssets, listAssets } from './editor/audioLibrary';
import { audioEngine } from './editor/AudioEngine';
import {
    getCompatibleNodeSuggestions,
    type NodeSuggestion,
} from './editor/nodeHelpers';
import { McpStatusBadge } from '../bridge/McpStatusBadge';
import { createAtmosphericBreakbeatArcTemplate } from './editor/templates/atmosphericBreakbeatArcTemplate';
import { ActivityRail } from './shell/ActivityRail';
import { BottomDrawer } from './shell/BottomDrawer';
import { CatalogExplorerPanel } from './shell/CatalogExplorerPanel';
import { CommandPalette } from './shell/CommandPalette';
import { EditorTopbar } from './shell/EditorTopbar';
import { EditorShell } from './shell/EditorShell';
import { FooterStatus } from './shell/FooterStatus';
import { GraphDefaultsPanel } from './shell/GraphDefaultsPanel';
import { InspectorPane } from './shell/InspectorPane';
import { SourceControlPanel } from './shell/SourceControlPanel';
import { useEditorLayout } from './shell/useEditorLayout';
import { SHELL_LAYOUT } from './shell/shellTokens';
import { getMiniMapNodeColor } from './editor/nodeColorMap';
import { consumeProjectResumeIntent, readProjectReviewState, writeProjectInterruptedWork, writeProjectReviewState } from './projectUiState';
import type { ChangedFileSummary, InterruptedWorkSummary, ResumeIntent, ReviewState, SourceControlPhase } from './phase3a.types';
import { Play, Pause, Circle, Wand2 } from 'lucide-react';

// Extracted Utilities
import { computeAutoLayoutPositions } from './editor/layoutUtils';
import { 
    createMedievalStrategyLongformTemplate 
} from './editor/templates/feedbackTemplates';

// Extracted Components
import { NodePalette } from './editor/components/NodePalette';
import { ExplorerPanel } from './editor/components/ExplorerPanel';
import { DiagnosticsDrawerContent, LibraryDrawerContent, RuntimeDrawerContent, type AudioPreviewState, type LibraryItem, type MissingLibraryReference } from './editor/components/Drawers';

const nodeTypes: NodeTypes = {
    oscNode: OscNode as NodeTypes[string],
    gainNode: GainNode as NodeTypes[string],
    filterNode: FilterNode as NodeTypes[string],
    outputNode: OutputNode as NodeTypes[string],
    noiseNode: NoiseNode as NodeTypes[string],
    delayNode: DelayNode as NodeTypes[string],
    reverbNode: ReverbNode as NodeTypes[string],
    compressorNode: CompressorNode as NodeTypes[string],
    phaserNode: PhaserNode as NodeTypes[string],
    flangerNode: FlangerNode as NodeTypes[string],
    tremoloNode: TremoloNode as NodeTypes[string],
    eq3Node: EQ3Node as NodeTypes[string],
    distortionNode: DistortionNode as NodeTypes[string],
    chorusNode: ChorusNode as NodeTypes[string],
    noiseBurstNode: NoiseBurstNode as NodeTypes[string],
    waveShaperNode: WaveShaperNode as NodeTypes[string],
    convolverNode: ConvolverNode as NodeTypes[string],
    analyzerNode: AnalyzerNode as NodeTypes[string],
    pannerNode: StereoPannerNode as NodeTypes[string],
    panner3dNode: Panner3DNode as NodeTypes[string],
    mixerNode: MixerNode as NodeTypes[string],
    auxSendNode: AuxSendNode as NodeTypes[string],
    auxReturnNode: AuxReturnNode as NodeTypes[string],
    matrixMixerNode: MatrixMixerNode as NodeTypes[string],
    inputNode: InputNode as NodeTypes[string],
    uiTokensNode: UiTokensNode as NodeTypes[string],
    constantSourceNode: ConstantSourceNode as NodeTypes[string],
    mediaStreamNode: MediaStreamNode as NodeTypes[string],
    eventTriggerNode: EventTriggerNode as NodeTypes[string],
    noteNode: NoteNode as NodeTypes[string],
    transportNode: TransportNode as NodeTypes[string],
    stepSequencerNode: StepSequencerNode as NodeTypes[string],
    pianoRollNode: PianoRollNode as NodeTypes[string],
    lfoNode: LFONode as NodeTypes[string],
    adsrNode: ADSRNode as NodeTypes[string],
    voiceNode: VoiceNode as NodeTypes[string],
    samplerNode: SamplerNode as NodeTypes[string],
    midiNoteNode: MidiNoteNode as NodeTypes[string],
    midiCCNode: MidiCCNode as NodeTypes[string],
    midiNoteOutputNode: MidiNoteOutputNode as NodeTypes[string],
    midiCCOutputNode: MidiCCOutputNode as NodeTypes[string],
    midiSyncNode: MidiSyncNode as NodeTypes[string],
    mathNode: MathNode as NodeTypes[string],
    compareNode: CompareNode as NodeTypes[string],
    mixNode: MixNode as NodeTypes[string],
    clampNode: ClampNode as NodeTypes[string],
    switchNode: SwitchNode as NodeTypes[string],
};

const AUDIO_EDGE_STYLE = {
    stroke: '#6366f1',
    strokeWidth: 2,
};

export interface ProjectMeta {
    id: string;
    name: string;
    accentColor: string;
    path?: string;
    onRevealProject?: () => void | Promise<void>;
}

export interface EditorProps {
    project?: ProjectMeta;
}

const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const editable = target.closest('input, textarea, select, [contenteditable="true"]');
    return Boolean(editable) || target.isContentEditable;
};

const getClientPosition = (event: MouseEvent | TouchEvent): XYPosition | null => {
    if ('clientX' in event) {
        return { x: event.clientX, y: event.clientY };
    }

    const touch = event.touches[0] ?? event.changedTouches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
};

function createDefaultReviewState(graphName?: string): ReviewState {
    const nextGraphName = graphName || 'active graph';
    return {
        phase: 'idle',
        summary: `Generate a review packet for ${nextGraphName} before preparing the commit handoff.`,
        changedFiles: [],
        commitMessage: `Refine ${nextGraphName}`,
        updatedAt: Date.now(),
    };
}

function buildChangedFiles(
    activeGraph: { id: string; name: string } | undefined,
    hasProjectPath: boolean,
    libraryItemCount: number,
    missingAssetCount: number,
): ChangedFileSummary[] {
    const changedFiles: ChangedFileSummary[] = [];

    if (activeGraph) {
        changedFiles.push({
            path: `graphs/${activeGraph.id}.patch.json`,
            status: 'modified',
            detail: `${activeGraph.name} remains the active authoring graph.`,
        });
    }

    changedFiles.push({
        path: hasProjectPath ? 'workspace/review-state.json' : 'project/review-state.json',
        status: 'modified',
        detail: 'Review preparation and handoff metadata.',
    });

    if (libraryItemCount > 0) {
        changedFiles.push({
            path: 'samples/library.manifest.json',
            status: 'modified',
            detail: `${libraryItemCount} tracked asset${libraryItemCount === 1 ? '' : 's'} available to the workspace.`,
        });
    }

    if (missingAssetCount > 0) {
        changedFiles.push({
            path: 'samples/missing-assets.todo',
            status: 'modified',
            detail: `${missingAssetCount} asset repair task${missingAssetCount === 1 ? '' : 's'} still needs resolution.`,
        });
    }

    return changedFiles;
}

function getTopbarPhaseChip(phase: SourceControlPhase) {
    switch (phase) {
        case 'generating':
            return { id: 'review-progress', label: 'Generating Review', tone: 'info' as const };
        case 'ready':
            return { id: 'review-ready', label: 'Review Ready', tone: 'warning' as const };
        case 'committing':
            return { id: 'review-commit', label: 'Committing', tone: 'warning' as const };
        case 'success':
            return { id: 'review-success', label: 'Commit Saved', tone: 'success' as const };
        case 'idle':
        default:
            return null;
    }
}

const EditorContent: FC<EditorProps> = ({ project }) => {
    const nodes = useAudioGraphStore((s) => s.nodes);
    const edges = useAudioGraphStore((s) => s.edges);
    const graphs = useAudioGraphStore((s) => s.graphs);
    const activeGraphId = useAudioGraphStore((s) => s.activeGraphId);
    const selectedNodeId = useAudioGraphStore((s) => s.selectedNodeId);
    
    // Store Actions
    const onNodesChange = useAudioGraphStore((s) => s.onNodesChange);
    const onEdgesChange = useAudioGraphStore((s) => s.onEdgesChange);
    const onConnect = useAudioGraphStore((s) => s.onConnect);
    const addNode = useAudioGraphStore((s) => s.addNode);
    const addNodeAndConnect = useAudioGraphStore((s) => s.addNodeAndConnect);
    const loadGraph = useAudioGraphStore((s) => s.loadGraph);
    const setGraphs = useAudioGraphStore((s) => s.setGraphs);
    const setActiveGraph = useAudioGraphStore((s) => s.setActiveGraph);
    const setSelectedNode = useAudioGraphStore((s) => s.setSelectedNode);
    const setPlaying = useAudioGraphStore((s) => s.setPlaying);
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const renameGraph = useAudioGraphStore((s) => s.renameGraph);
    const createGraph = useAudioGraphStore((s) => s.createGraph);
    const undo = useAudioGraphStore((s) => s.undo);
    const redo = useAudioGraphStore((s) => s.redo);
    
    // Local UI State
    const [paletteFilter, setPaletteFilter] = useState('');
    const [libraryFilter, setLibraryFilter] = useState('');
    const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
    const [audioPreview, setAudioPreview] = useState<AudioPreviewState>({ activeId: null, playing: false });
    const [nameDraft, setNameDraft] = useState('');
    const [reviewState, setReviewState] = useState<ReviewState>(() => createDefaultReviewState());
    const [resumeIntent, setResumeIntent] = useState<ResumeIntent | null>(null);
    const [reviewHydrated, setReviewHydrated] = useState(false);
    const [initialDataReady, setInitialDataReady] = useState(false);
    const reviewTimerRef = useRef<number | null>(null);
    const canvasDropzoneRef = useRef<HTMLElement | null>(null);
    
    const {
        isDark,
        setTheme,
        leftPanelView,
        leftPanelCollapsed,
        rightPanelCollapsed,
        bottomDrawerOpen,
        bottomDrawerTab,
        bottomDrawerHeight,
        inspectorTab,
        commandPaletteOpen,
        setCommandPaletteOpen,
        toggleLeftPanel,
        toggleRightPanel,
        toggleBottomDrawer,
        openLeftPanelView,
        openBottomDrawerTab,
        openInspectorTab,
        updateBottomDrawerHeight,
        leftPanelWidth,
        rightPanelWidth,
        updateLeftPanelWidth,
        updateRightPanelWidth,
    } = useEditorLayout();

    const connectionAssist = useAudioGraphStore((s) => s.connectionAssist);
    const assistPosition = useAudioGraphStore((s) => s.assistPosition);
    const assistQuery = useAudioGraphStore((s) => s.assistQuery);
    
    const setConnectionAssist = useAudioGraphStore((s) => s.setConnectionAssist);
    const setAssistPosition = useAudioGraphStore((s) => s.setAssistPosition);
    const setAssistQuery = useAudioGraphStore((s) => s.setAssistQuery);

    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

    const activeGraph = graphs.find(g => g.id === activeGraphId);
    const selectedNode = useMemo(
        () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) ?? null : null),
        [nodes, selectedNodeId]
    );
    const outputNode = useMemo(
        () => nodes.find((node) => node.data.type === 'output') ?? null,
        [nodes]
    );
    const transportNode = useMemo(
        () => nodes.find((node) => node.data.type === 'transport') ?? null,
        [nodes]
    );
    const activeGraphName = activeGraph?.name;
    useEffect(() => {
        if (activeGraphName !== undefined) {
            setNameDraft(activeGraphName);
        }
    }, [activeGraphName]);

    useEffect(() => {
        if (!project?.id) return;
        setReviewHydrated(false);
        setReviewState(readProjectReviewState(project.id) ?? createDefaultReviewState(activeGraph?.name));
        setResumeIntent(consumeProjectResumeIntent(project.id));
        setReviewHydrated(true);
    }, [project?.id]);

    // Track selection for inspector
    useOnSelectionChange({
        onChange: ({ nodes: selectedNodes }) => {
            const nextNode = selectedNodes[0] as Node<AudioNodeData> | undefined;
            setSelectedNode(nextNode?.id ?? null);
        },
    });

    // Helpers that wrap store logic
    const clearGraph = useCallback(() => {
        loadGraph([], []);
    }, [loadGraph]);

    const syncAudioEngine = useCallback(() => {
        audioEngine.stop();
        audioEngine.refreshConnections(nodes, edges);
    }, [nodes, edges]);

    const initializeFromGraphData = useCallback((graphData: { nodes: Node<AudioNodeData>[], edges: Edge[] }) => {
        loadGraph(graphData.nodes, graphData.edges);
        syncAudioEngine();
    }, [loadGraph, syncAudioEngine]);

    const loadTemplate = useCallback((template: { nodes: any[], edges: any[] }) => {
        initializeFromGraphData({ nodes: template.nodes as Node<AudioNodeData>[], edges: template.edges });
    }, [initializeFromGraphData]);

    // Initial load
    useEffect(() => {
        let cancelled = false;

        const loadInitialData = async () => {
            const storedGraphs = await loadGraphs();
            setGraphs(storedGraphs);

            const activeId = await loadActiveGraphId();
            if (activeId && storedGraphs.some(g => g.id === activeId)) {
                const graph = storedGraphs.find(g => g.id === activeId);
                if (graph) {
                    setActiveGraph(activeId);
                    initializeFromGraphData({ nodes: graph.nodes, edges: graph.edges });
                }
            }
        };

        const refreshAssets = async () => {
            const assets = await listAssets();
            setLibraryItems(assets.map((a: any) => ({
                id: a.id,
                name: a.name,
                sizeBytes: a.sizeBytes || 0,
                type: a.type || 'audio/unknown',
                addedAt: a.addedAt || Date.now(),
                durationSec: a.durationSec || 0
            })));
        };

        void Promise.all([loadInitialData(), refreshAssets()]).finally(() => {
            if (!cancelled) {
                setInitialDataReady(true);
            }
        });
        const unsubscribeAssets = subscribeAssets(refreshAssets);

        return () => {
            cancelled = true;
            unsubscribeAssets();
        };
    }, []);

    // Save active graph
    const handleSaveActiveGraph = useCallback(async (nameOverride?: string) => {
        if (!activeGraphId) return;
        const graph = graphs.find(g => g.id === activeGraphId);
        if (!graph) return;

        const updatedGraph = {
            ...graph,
            name: nameOverride ?? graph.name,
            nodes,
            edges,
            updatedAt: Date.now(),
        };
        await saveGraph(updatedGraph);
    }, [activeGraphId, nodes, edges, graphs]);

    // Handle graph loading
    const handleLoadGraph = useCallback(async (graphId: string) => {
        const graph = graphs.find(g => g.id === graphId);
        if (!graph) return;

        setActiveGraph(graphId);
        await saveActiveGraphId(graphId);
        initializeFromGraphData({ nodes: graph.nodes, edges: graph.edges });
    }, [graphs, setActiveGraph, initializeFromGraphData]);

    const handleCreateGraph = useCallback(async () => {
        await handleSaveActiveGraph();
        const graph = createGraph();
        await saveGraph(graph);
        await saveActiveGraphId(graph.id);
    }, [createGraph, handleSaveActiveGraph]);

    const commitGraphName = useCallback((nextName: string) => {
        if (!activeGraphId) return;
        renameGraph(activeGraphId, nextName);
        void handleSaveActiveGraph(nextName);
    }, [activeGraphId, renameGraph, handleSaveActiveGraph]);

    const handleNameBlur = useCallback(() => {
        commitGraphName(nameDraft);
    }, [commitGraphName, nameDraft]);

    const handleNameKeyDown = useCallback((e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitGraphName(e.currentTarget.value);
            e.currentTarget.blur();
        }
    }, [commitGraphName]);

    const handleAutoArrange = useCallback(() => {
        const positions = computeAutoLayoutPositions(nodes, edges);
        const repositionedNodes = nodes.map(n => ({
            ...n,
            position: positions.get(n.id) || n.position
        })) as Node<AudioNodeData>[];
        loadGraph(repositionedNodes, edges);
    }, [nodes, edges, loadGraph]);

    const handleTransportBpmChange = useCallback((value: number) => {
        if (!transportNode || !Number.isFinite(value)) return;
        const nextBpm = Math.min(300, Math.max(20, Math.round(value)));
        updateNodeData(transportNode.id, { bpm: nextBpm });
    }, [transportNode, updateNodeData]);

    const missingLibraryReferences = useMemo<MissingLibraryReference[]>(() => {
        const knownAssetIds = new Set(libraryItems.map((item) => item.id));
        const missingEntries: MissingLibraryReference[] = [];

        nodes.forEach((node) => {
            if (node.data.type === 'sampler') {
                const sampleId = typeof node.data.sampleId === 'string' ? node.data.sampleId : '';
                if (sampleId && !knownAssetIds.has(sampleId)) {
                    missingEntries.push({
                        assetId: sampleId,
                        kind: 'sample',
                        nodeId: node.id,
                        nodeLabel: node.data.label || 'Sampler',
                        assetPath: typeof node.data.assetPath === 'string' ? node.data.assetPath : sampleId,
                    });
                }
            }

            if (node.data.type === 'convolver') {
                const impulseId = typeof node.data.impulseId === 'string' ? node.data.impulseId : '';
                if (impulseId && !knownAssetIds.has(impulseId)) {
                    missingEntries.push({
                        assetId: impulseId,
                        kind: 'impulse',
                        nodeId: node.id,
                        nodeLabel: node.data.label || 'Convolver',
                        assetPath: typeof node.data.assetPath === 'string' ? node.data.assetPath : impulseId,
                    });
                }
            }
        });

        return missingEntries;
    }, [libraryItems, nodes]);

    const computedChangedFiles = useMemo(
        () => buildChangedFiles(activeGraph, Boolean(project?.path), libraryItems.length, missingLibraryReferences.length),
        [activeGraph, libraryItems.length, missingLibraryReferences.length, project?.path]
    );

    const effectiveReviewFiles = reviewState.changedFiles.length > 0 ? reviewState.changedFiles : computedChangedFiles;

    useEffect(() => {
        if (!project?.id || !reviewHydrated) return;
        writeProjectReviewState(project.id, reviewState);
    }, [project?.id, reviewHydrated, reviewState]);

    useEffect(() => {
        if (!project?.id || !reviewHydrated) return;

        let interruptedWork: InterruptedWorkSummary | null = null;

        if (reviewState.phase === 'generating') {
            interruptedWork = {
                projectId: project.id,
                kind: 'generation',
                title: 'Review packet generation in progress',
                description: 'The workspace is preparing the next review summary and changed-file handoff.',
                actionLabel: 'Resume Review',
                severity: 'info',
                updatedAt: reviewState.updatedAt,
                railMode: 'review',
                phase: reviewState.phase,
                graphId: activeGraphId,
            };
        } else if (reviewState.phase === 'ready' || reviewState.phase === 'committing') {
            interruptedWork = {
                projectId: project.id,
                kind: 'review',
                title: reviewState.phase === 'ready' ? 'Review is ready to commit' : 'Commit handoff is still running',
                description: reviewState.summary,
                actionLabel: 'Resume Review',
                severity: reviewState.phase === 'ready' ? 'warning' : 'info',
                updatedAt: reviewState.updatedAt,
                railMode: 'review',
                phase: reviewState.phase,
                graphId: activeGraphId,
            };
        } else if (missingLibraryReferences.length > 0) {
            interruptedWork = {
                projectId: project.id,
                kind: 'asset-repair',
                title: 'Missing assets need repair',
                description: `${missingLibraryReferences.length} sample or impulse reference${missingLibraryReferences.length === 1 ? '' : 's'} still points to a missing file.`,
                actionLabel: 'Open Library',
                severity: 'warning',
                updatedAt: Date.now(),
                railMode: 'library',
                graphId: activeGraphId,
            };
        }

        writeProjectInterruptedWork(project.id, interruptedWork);
    }, [activeGraphId, missingLibraryReferences.length, project?.id, reviewHydrated, reviewState]);

    useEffect(() => {
        if (!resumeIntent) return;

        if (resumeIntent.railMode === 'runtime') {
            openBottomDrawerTab('runtime');
        } else if (resumeIntent.railMode === 'review' || resumeIntent.railMode === 'explorer' || resumeIntent.railMode === 'catalog' || resumeIntent.railMode === 'library') {
            openLeftPanelView(resumeIntent.railMode);
        }

        setResumeIntent(null);
    }, [openBottomDrawerTab, openLeftPanelView, resumeIntent]);

    useEffect(() => {
        return () => {
            if (reviewTimerRef.current != null) {
                window.clearTimeout(reviewTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const nextWindow = window as typeof window & {
            __DIN_TEST_BRIDGE_STATE__?: unknown;
            __DIN_TEST_EDITOR_STORE__?: {
                undo: () => void;
                redo: () => void;
                save: () => void;
                snapshot: () => {
                    activeGraphId: string | null;
                    activeGraphName: string | null;
                    canUndo: boolean;
                    canRedo: boolean;
                    undoDepth: number;
                    redoDepth: number;
                };
            };
        };

        if (!nextWindow.__DIN_TEST_BRIDGE_STATE__) return;

        nextWindow.__DIN_TEST_EDITOR_STORE__ = {
            undo: () => undo(),
            redo: () => redo(),
            save: () => {
                void handleSaveActiveGraph();
            },
            snapshot: () => {
                const state = useAudioGraphStore.getState();
                const activeGraph = state.graphs.find((graph) => graph.id === state.activeGraphId);
                return {
                    activeGraphId: state.activeGraphId,
                    activeGraphName: activeGraph?.name ?? null,
                    canUndo: state.canUndo,
                    canRedo: state.canRedo,
                    undoDepth: activeGraph ? (state.historyByGraph[activeGraph.id]?.undoStack.length ?? 0) : 0,
                    redoDepth: activeGraph ? (state.historyByGraph[activeGraph.id]?.redoStack.length ?? 0) : 0,
                };
            },
        };

        return () => {
            delete nextWindow.__DIN_TEST_EDITOR_STORE__;
        };
    }, [handleSaveActiveGraph, redo, undo]);

    const handleGenerateReview = useCallback(() => {
        if (reviewTimerRef.current != null) {
            window.clearTimeout(reviewTimerRef.current);
        }

        setReviewState((current) => ({
            ...current,
            phase: 'generating',
            summary: `Preparing a review summary for ${activeGraph?.name ?? 'the active graph'} and ${computedChangedFiles.length} changed files.`,
            updatedAt: Date.now(),
        }));

        reviewTimerRef.current = window.setTimeout(() => {
            setReviewState((current) => ({
                ...current,
                phase: 'ready',
                changedFiles: computedChangedFiles,
                summary: `Review ready for ${activeGraph?.name ?? 'the active graph'}. Changed files and commit framing are ready for handoff.`,
                commitMessage: current.commitMessage.trim() || `Refine ${activeGraph?.name ?? 'workspace'}`,
                updatedAt: Date.now(),
            }));
        }, 650);
    }, [activeGraph?.name, computedChangedFiles]);

    const handleCommitReview = useCallback(() => {
        if (reviewTimerRef.current != null) {
            window.clearTimeout(reviewTimerRef.current);
        }

        setReviewState((current) => ({
            ...current,
            phase: 'committing',
            updatedAt: Date.now(),
        }));

        reviewTimerRef.current = window.setTimeout(() => {
            setReviewState((current) => ({
                ...current,
                phase: 'success',
                summary: `Commit handoff recorded for ${activeGraph?.name ?? 'the active graph'}. Continue iterating or switch back to graph authoring.`,
                lastCompletedAt: Date.now(),
                updatedAt: Date.now(),
            }));
        }, 650);
    }, [activeGraph?.name]);

    const handleResetReview = useCallback(() => {
        if (reviewTimerRef.current != null) {
            window.clearTimeout(reviewTimerRef.current);
        }
        setReviewState(createDefaultReviewState(activeGraph?.name));
    }, [activeGraph?.name]);

    const handleRepairLibraryAsset = useCallback(async (item: MissingLibraryReference, file: File) => {
        const repairedAsset = await addAssetFromFile(file, {
            kind: item.kind,
            preserveAssetId: item.assetId,
            fileName: file.name,
        });
        const objectUrl = await getAssetObjectUrl(repairedAsset.id);

        if (item.kind === 'sample') {
            updateNodeData(item.nodeId, {
                sampleId: repairedAsset.id,
                assetPath: repairedAsset.relativePath,
                fileName: repairedAsset.fileName,
                src: objectUrl ?? '',
                loaded: Boolean(objectUrl),
            });
            if (objectUrl) {
                await audioEngine.loadSamplerBuffer(item.nodeId, objectUrl);
            }
            return;
        }

        updateNodeData(item.nodeId, {
            impulseId: repairedAsset.id,
            assetPath: repairedAsset.relativePath,
            impulseFileName: repairedAsset.fileName,
            impulseSrc: objectUrl ?? '',
        });
        audioEngine.updateNode(item.nodeId, {
            impulseId: repairedAsset.id,
            assetPath: repairedAsset.relativePath,
            impulseFileName: repairedAsset.fileName,
            impulseSrc: objectUrl ?? '',
        });
    }, [updateNodeData]);

    // Command palette actions
    const commandActions = useMemo(() => [
        { id: 'undo', title: 'Undo', shortcut: '⌘Z', onSelect: undo, section: 'Edit' },
        { id: 'redo', title: 'Redo', shortcut: '⌘⇧Z', onSelect: redo, section: 'Edit' },
        { id: 'save', title: 'Save Graph', shortcut: '⌘S', onSelect: handleSaveActiveGraph, section: 'File' },
        { id: 'clear', title: 'Clear Canvas', onSelect: clearGraph, section: 'Edit' },
        { id: 'arrange', title: 'Auto Arrange', shortcut: '⌘L', onSelect: handleAutoArrange, section: 'Layout' },
        { id: 'copy-patch', title: 'Copy Patch JSON', section: 'File', onSelect: () => {} },
        { id: 'download-patch', title: 'Download Patch JSON', section: 'File', onSelect: () => {} },
        { id: 'import-patch', title: 'Import Patch JSON', section: 'File', onSelect: () => {} },
        { id: 'template-breakbeat', title: 'Load Template: Breakbeat Arc', onSelect: () => loadTemplate(createAtmosphericBreakbeatArcTemplate()), section: 'Templates' },
        { id: 'template-medieval', title: 'Load Template: Medieval Strategy', onSelect: () => loadTemplate(createMedievalStrategyLongformTemplate()), section: 'Templates' },
    ], [undo, redo, handleSaveActiveGraph, clearGraph, handleAutoArrange, loadTemplate]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditableTarget(e.target)) return;
            
            const isMod = e.metaKey || e.ctrlKey;

            if (isMod && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(prev => !prev);
            }

            if (isMod && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSaveActiveGraph();
            }

            if (isMod && e.key.toLowerCase() === 'l') {
                e.preventDefault();
                handleAutoArrange();
            }

            if (isMod && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }

            if (isMod && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSaveActiveGraph, handleAutoArrange, setCommandPaletteOpen]);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) return;

            const position = reactFlowInstance?.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            }) || { x: 0, y: 0 };

            addNode(type as any, position);
        },
        [reactFlowInstance, addNode]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleAddNodeFromPalette = useCallback((type: string) => {
        const rect = canvasDropzoneRef.current?.getBoundingClientRect();
        const fallbackPosition = { x: 220 + (nodes.length * 18), y: 160 + (nodes.length * 12) };
        const position = rect && reactFlowInstance
            ? reactFlowInstance.screenToFlowPosition({
                x: rect.left + (rect.width / 2),
                y: rect.top + (rect.height / 2),
            })
            : fallbackPosition;

        addNode(type as any, position);
    }, [addNode, nodes.length, reactFlowInstance]);

    const onConnectStart = useCallback((event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
        const clientPos = getClientPosition(event);
        if (!clientPos) return;

        setAssistPosition(clientPos);
        setConnectionAssist({
            nodeId: params.nodeId || '',
            handleId: params.handleId || '',
            handleType: params.handleType || 'source',
        });
    }, []);

    const onConnectEnd = useCallback((event: any) => {
        const clientPos = getClientPosition(event);
        if (clientPos) {
            setAssistPosition(clientPos);
        }
    }, [setAssistPosition]);

    const assistSuggestions = useMemo(() => {
        if (!connectionAssist) return [];
        const all = getCompatibleNodeSuggestions(connectionAssist, nodes);
        if (!assistQuery) return all.slice(0, 8);
        return all.filter(s => 
            s.title.toLowerCase().includes(assistQuery.toLowerCase()) || 
            s.type.toLowerCase().includes(assistQuery.toLowerCase())
        ).slice(0, 8);
    }, [connectionAssist, nodes, assistQuery]);

    const handleSelectSuggestion = useCallback((suggestion: NodeSuggestion) => {
        if (!connectionAssist || !assistPosition) return;
        
        const flowPos = reactFlowInstance?.screenToFlowPosition(assistPosition) || { x: 0, y: 0 };
        addNodeAndConnect(suggestion.type, suggestion.connection, flowPos);
        
        setConnectionAssist(null);
        setAssistPosition(null);
        setAssistQuery('');
    }, [connectionAssist, assistPosition, reactFlowInstance, addNodeAndConnect]);
    const leftDrawerTitle = leftPanelView === 'explorer'
        ? 'Graph Explorer'
        : leftPanelView === 'catalog'
            ? 'Catalog'
            : leftPanelView === 'review'
                ? 'Source Control'
                : 'Audio Library';
    const reviewChip = getTopbarPhaseChip(reviewState.phase);
    const topbarChips = [
        ...(reviewChip ? [{
            ...reviewChip,
            onSelect: () => openLeftPanelView('review'),
        }] : []),
        ...(missingLibraryReferences.length > 0 && reviewState.phase === 'idle'
            ? [{
                id: 'library-repair',
                label: `${missingLibraryReferences.length} Asset Repair`,
                tone: 'warning' as const,
                onSelect: () => openLeftPanelView('library'),
            }]
            : []),
    ];
    const gitStatusLabel = reviewState.phase === 'success'
        ? 'git: local review complete'
        : reviewState.phase === 'ready'
            ? 'git: review ready'
            : project?.path
                ? 'git: linked workspace'
                : 'git: unavailable';
    const audioStatusLabel = outputNode?.data.type === 'output' && outputNode.data.playing
        ? 'Audio Live'
        : outputNode
            ? 'Audio Ready'
            : 'Audio Idle';
    const viewportPlayLabel = outputNode?.data.type === 'output' && outputNode.data.playing ? 'Pause graph output' : 'Play graph output';

    return (
        <MidiProvider>
            <div
                className={`flex h-screen w-screen flex-col overflow-hidden select-none ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}
                data-testid="editor-root"
                data-editor-ready={initialDataReady ? 'true' : 'false'}
            >
                <header className="flex-none">
                    <EditorTopbar
                        project={project ? {
                            name: project.name,
                            accentColor: project.accentColor,
                            onRevealProject: project.onRevealProject,
                        } : undefined}
                        isDark={isDark}
                        leftPanelCollapsed={leftPanelCollapsed}
                        bottomDrawerOpen={bottomDrawerOpen}
                        inspectorCollapsed={rightPanelCollapsed}
                        statusChips={topbarChips}
                        onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
                        onToggleLeftPanel={toggleLeftPanel}
                        onToggleBottomDrawer={toggleBottomDrawer}
                        onToggleInspector={toggleRightPanel}
                        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                    />
                </header>

                <main className="relative flex-1 min-h-0 overflow-hidden">
                    <EditorShell
                        rail={(
                            <ActivityRail
                                items={[
                                    { id: 'explorer', label: 'Explorer', shortLabel: 'EXP', active: leftPanelView === 'explorer', onSelect: () => openLeftPanelView('explorer') },
                                    { id: 'catalog', label: 'Catalog', shortLabel: 'CAT', active: leftPanelView === 'catalog', onSelect: () => openLeftPanelView('catalog') },
                                    { id: 'library', label: 'Library', shortLabel: 'LIB', active: leftPanelView === 'library', onSelect: () => openLeftPanelView('library') },
                                    {
                                        id: 'review',
                                        label: 'Review',
                                        shortLabel: 'REV',
                                        active: leftPanelView === 'review',
                                        onSelect: () => openLeftPanelView('review'),
                                        badge: effectiveReviewFiles.length > 0 ? (
                                            <span className="border border-current/20 px-1.5 py-0.5 text-[8px] font-semibold">
                                                {effectiveReviewFiles.length}
                                            </span>
                                        ) : undefined,
                                    },
                                ]}
                            />
                        )}
                        leftPanel={(
                            <CatalogExplorerPanel
                                collapsed={leftPanelCollapsed}
                                title={leftDrawerTitle}
                                onToggleCollapse={toggleLeftPanel}
                            >
                                {leftPanelView === 'explorer' ? (
                                    <ExplorerPanel
                                        onCreateGraph={handleCreateGraph}
                                        onLoadGraph={handleLoadGraph}
                                        onLoadTemplate={(id) => {
                                            if (id === 'atmospheric-breakbeat-arc') {
                                                loadTemplate(createAtmosphericBreakbeatArcTemplate());
                                            }
                                            if (id === 'medieval-strategy-longform') {
                                                loadTemplate(createMedievalStrategyLongformTemplate());
                                            }
                                        }}
                                    />
                                ) : leftPanelView === 'catalog' ? (
                                    <NodePalette
                                        filter={paletteFilter}
                                        onFilterChange={setPaletteFilter}
                                        onAddNode={handleAddNodeFromPalette}
                                    />
                                ) : leftPanelView === 'review' ? (
                                    <SourceControlPanel
                                        phase={reviewState.phase}
                                        changedFiles={effectiveReviewFiles}
                                        summary={reviewState.summary}
                                        commitMessage={reviewState.commitMessage}
                                        onCommitMessageChange={(value) => setReviewState((current) => ({
                                            ...current,
                                            commitMessage: value,
                                            updatedAt: Date.now(),
                                        }))}
                                        onGenerate={handleGenerateReview}
                                        onCommit={handleCommitReview}
                                        onReset={handleResetReview}
                                        onReturnToExplorer={() => openLeftPanelView('explorer')}
                                    />
                                ) : (
                                    <LibraryDrawerContent
                                        items={libraryItems}
                                        filter={libraryFilter}
                                        onFilterChange={setLibraryFilter}
                                        preview={audioPreview}
                                        onPreviewChange={setAudioPreview}
                                        onItemsChange={setLibraryItems}
                                        repairItems={missingLibraryReferences}
                                        onRepairAsset={handleRepairLibraryAsset}
                                    />
                                )}
                            </CatalogExplorerPanel>
                        )}
                        canvas={(
                            <section
                                className="ui-panel ui-canvas-stage flex h-full w-full min-h-0 flex-col"
                                data-testid="canvas-panel"
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                            >
                                <div className="flex items-end justify-between border-b border-[var(--panel-border)] bg-[var(--panel-muted)]/30 pr-3" data-testid="graph-tabs">
                                    <div className="flex min-w-0 flex-1 items-end overflow-x-auto">
                                        {graphs.map((graph) => (
                                            <button
                                                key={graph.id}
                                                type="button"
                                                onClick={() => void handleLoadGraph(graph.id)}
                                                className={`group relative inline-flex min-w-[140px] max-w-[200px] items-center justify-between border-r border-[var(--panel-border)] px-3 py-2 text-[11px] font-semibold transition-colors ${
                                                    graph.id === activeGraphId
                                                        ? 'bg-[var(--canvas-bg)] text-[var(--text)]'
                                                        : 'bg-transparent text-[var(--text-subtle)] hover:bg-[var(--panel-bg)] hover:text-[var(--text)]'
                                                }`}
                                            >
                                                {graph.id === activeGraphId && (
                                                    <span className="absolute left-0 right-0 top-0 h-[2px] bg-[var(--accent)]" />
                                                )}
                                                {/* Blend the bottom of the active tab into the canvas */}
                                                {graph.id === activeGraphId && (
                                                    <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[var(--canvas-bg)]" />
                                                )}
                                                <span className="truncate pr-4">{graph.name || graph.id || 'Untitled'}</span>
                                                <div 
                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-colors ${
                                                        graph.id === activeGraphId ? 'opacity-100 hover:bg-[var(--panel-muted)]' : 'opacity-0 group-hover:opacity-100 hover:bg-[var(--panel-muted)]'
                                                    }`}
                                                >
                                                    <span aria-hidden="true" className="text-[10px]">✕</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <main
                                    className="relative min-h-0 flex-1"
                                    data-testid="canvas-dropzone"
                                    ref={(element) => {
                                        canvasDropzoneRef.current = element;
                                    }}
                                >
                                    <ReactFlow
                                        nodes={nodes}
                                        edges={edges}
                                        onNodesChange={onNodesChange}
                                        onEdgesChange={onEdgesChange}
                                        onConnect={(params) => {
                                            onConnect(params);
                                            setConnectionAssist(null);
                                            setAssistPosition(null);
                                        }}
                                        onConnectStart={onConnectStart}
                                        onConnectEnd={onConnectEnd}
                                        onInit={setReactFlowInstance}
                                        nodeTypes={nodeTypes}
                                        defaultEdgeOptions={{
                                            style: AUDIO_EDGE_STYLE,
                                            animated: false,
                                            deletable: true,
                                        }}
                                        fitView
                                        minZoom={0.1}
                                        maxZoom={4}
                                        snapToGrid
                                        snapGrid={[10, 10]}
                                        colorMode={isDark ? 'dark' : 'light'}
                                    >
                                        <Background variant={BackgroundVariant.Dots} gap={20} color={isDark ? '#27272a' : '#e4e4e7'} />
                                        <Controls className={`${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-800'} fill-current`} />
                                        <MiniMap
                                            nodeColor={(node) => getMiniMapNodeColor(node.data.type as any)}
                                            className={isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}
                                            maskColor={isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'}
                                            pannable
                                            zoomable
                                        />

                                        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3">
                                            <div className="pointer-events-auto flex items-center gap-1 border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setPlaying(!(outputNode?.data.type === 'output' && outputNode.data.playing))}
                                                    className={`flex h-8 w-8 items-center justify-center transition ${
                                                        outputNode?.data.type === 'output' && outputNode.data.playing
                                                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)]/80'
                                                            : 'bg-[var(--panel-muted)] text-[var(--text)] hover:bg-[var(--panel-muted)]/80 hover:text-[var(--accent)]'
                                                    }`}
                                                    aria-label={viewportPlayLabel}
                                                    title={outputNode?.data.type === 'output' && outputNode.data.playing ? 'Pause' : 'Play'}
                                                >
                                                    {outputNode?.data.type === 'output' && outputNode.data.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="flex h-8 w-8 items-center justify-center bg-[var(--panel-muted)] text-[var(--danger)] transition hover:bg-[var(--danger-soft)] cursor-not-allowed opacity-60"
                                                    aria-label="Record graph output"
                                                    title="Recording coming soon"
                                                >
                                                    <Circle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Top right floating controls */}
                                        <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-3 z-10">
                                            <button
                                                type="button"
                                                onClick={handleAutoArrange}
                                                className="pointer-events-auto flex h-8 w-8 items-center justify-center border border-[var(--panel-border)] bg-[var(--panel-bg)]/80 backdrop-blur-sm text-[var(--text-subtle)] transition hover:bg-[var(--panel-muted)] hover:text-[var(--text)]"
                                                title="Arrange"
                                            >
                                                <Wand2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <ConnectionAssistMenu
                                            isOpen={Boolean(connectionAssist && assistPosition)}
                                            position={assistPosition || { x: 0, y: 0 }}
                                            query={assistQuery}
                                            suggestions={assistSuggestions}
                                            onQueryChange={setAssistQuery}
                                            onSelect={handleSelectSuggestion}
                                            onClose={() => {
                                                setConnectionAssist(null);
                                                setAssistPosition(null);
                                                setAssistQuery('');
                                            }}
                                        />
                                    </ReactFlow>
                                </main>
                            </section>
                        )}
                        bottomDrawer={(
                            <BottomDrawer
                                open={bottomDrawerOpen}
                                activeTab={bottomDrawerTab}
                                height={bottomDrawerHeight}
                                onToggle={toggleBottomDrawer}
                                onTabChange={openBottomDrawerTab}
                                onHeightChange={updateBottomDrawerHeight}
                                runtimeContent={<RuntimeDrawerContent />}
                                diagnosticsContent={<DiagnosticsDrawerContent />}
                            />
                        )}
                        rightPanel={(
                            <InspectorPane
                                collapsed={rightPanelCollapsed}
                                tab={inspectorTab}
                                onToggleCollapse={toggleRightPanel}
                                onTabChange={openInspectorTab}
                                hasSelection={Boolean(selectedNode)}
                                selectedNodeLabel={selectedNode?.data.label || null}
                                inspectContent={<Inspector />}
                                emptyInspectContent={(
                                    <GraphDefaultsPanel
                                        projectName={project?.name}
                                        activeGraphId={activeGraphId}
                                        nameDraft={nameDraft}
                                        onNameDraftChange={(event) => setNameDraft(event.target.value)}
                                        onNameKeyDown={handleNameKeyDown}
                                        onNameBlur={handleNameBlur}
                                        transportBpm={transportNode?.data.type === 'transport' ? transportNode.data.bpm : null}
                                        onTransportBpmChange={handleTransportBpmChange}
                                        onRevealProject={project?.onRevealProject}
                                    />
                                )}
                                codeContent={<CodeGenerator />}
                            />
                        )}
                        leftPanelCollapsed={leftPanelCollapsed}
                        rightPanelCollapsed={rightPanelCollapsed}
                        leftPanelWidth={leftPanelWidth}
                        rightPanelWidth={rightPanelWidth}
                        onLeftPanelWidthChange={updateLeftPanelWidth}
                        onRightPanelWidthChange={updateRightPanelWidth}
                    />
                </main>

                <footer className="flex-none">
                    <FooterStatus
                        gitLabel={gitStatusLabel}
                        audioLabel={audioStatusLabel}
                        mcpBadge={<McpStatusBadge />}
                    />
                </footer>

                <CommandPalette
                    open={commandPaletteOpen}
                    onClose={() => setCommandPaletteOpen(false)}
                    actions={commandActions}
                />
            </div>
        </MidiProvider>
    );
};

export const Editor: FC<EditorProps> = (props) => (
    <ReactFlowProvider>
        <EditorContent {...props} />
    </ReactFlowProvider>
);

export default Editor;
