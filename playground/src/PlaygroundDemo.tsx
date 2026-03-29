import { useState, useCallback, useEffect, useMemo, useRef, type ChangeEvent, type FC } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    type NodeTypes,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnConnectStartParams,
    type FinalConnectionState,
    type XYPosition,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './playground/playground.css';
import Inspector from './playground/Inspector';
import ConnectionAssistMenu from './playground/ConnectionAssistMenu';
import { MidiProvider, useMidi } from '@din/react/midi';
import { graphDocumentToPatch, migratePatchDocument, patchToGraphDocument, type PatchDocument } from '@din/vanilla/core';

import { useAudioGraphStore, type AudioNodeData, type ConvolverNodeData, type GraphDocument, type SamplerNodeData } from './playground/store';
import {
    OscNode,
    GainNode,
    FilterNode,
    OutputNode,
    NoiseNode,
    DelayNode,
    ReverbNode,
    CompressorNode,
    PhaserNode,
    FlangerNode,
    TremoloNode,
    EQ3Node,
    DistortionNode,
    ChorusNode,
    NoiseBurstNode,
    WaveShaperNode,
    ConvolverNode,
    AnalyzerNode,
    StereoPannerNode,
    Panner3DNode,
    MixerNode,
    AuxSendNode,
    AuxReturnNode,
    MatrixMixerNode,
    InputNode,
    UiTokensNode,
    ConstantSourceNode,
    MediaStreamNode,
    EventTriggerNode,
    NoteNode,
    TransportNode,
    StepSequencerNode,
    PianoRollNode,
    LFONode,
    ADSRNode,
    VoiceNode,
    SamplerNode,
    MidiNoteNode,
    MidiCCNode,
    MidiNoteOutputNode,
    MidiCCOutputNode,
    MidiSyncNode,
    MathNode,
    CompareNode,
    MixNode,
    ClampNode,
    SwitchNode,
} from './playground/nodes';
import { deleteGraph as deleteStoredGraph, loadActiveGraphId, loadGraphs, saveActiveGraphId, saveGraph } from './playground/graphStorage';
import {
    addAssetFromBlob,
    addAssetFromFile,
    deleteAsset,
    getAssetObjectUrl,
    listAssets,
    subscribeAssets,
    type AudioLibraryAsset,
} from './playground/audioLibrary';
import { sanitizeGraphForStorage, toPascalCase } from './playground/graphUtils';
import { audioEngine } from './playground/AudioEngine';
import {
    canConnect,
    getInputParamHandleId,
    getCompatibleExistingHandleMatches,
    getCompatibleNodeSuggestions,
    type ConnectionAssistStart,
    type NodeSuggestion,
} from './playground/nodeHelpers';
import { DEFAULT_NODE_SIZE } from './playground/graphBuilders';
import { groupCatalogByCategory, type PlaygroundNodeType } from './playground/nodeCatalog';
import { playgroundMidiRuntime } from './playground/midiRuntime';
import { createUiTokenParams } from './playground/uiTokens';

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

const MidiStatusStrip: FC = () => {
    const midi = useMidi();
    const defaultInputName = midi.defaultInput?.name ?? 'None';
    const defaultOutputName = midi.defaultOutput?.name ?? 'None';

    return (
        <div className="mb-3 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-2 text-[10px]">
            <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">MIDI</span>
                <button
                    type="button"
                    onClick={() => void midi.requestAccess()}
                    className="rounded border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                    Connect MIDI
                </button>
            </div>
            <div className="flex items-center justify-between gap-2 text-[var(--text-subtle)]">
                <span>Status: {midi.status}</span>
                <span>{midi.clock.running ? 'Clock locked' : 'Clock idle'}</span>
            </div>
            <div className="mt-1 text-[var(--text-muted)]">In: {defaultInputName}</div>
            <div className="text-[var(--text-muted)]">Out: {defaultOutputName}</div>
        </div>
    );
};

const nodeCategories = groupCatalogByCategory();
const ASSIST_MENU_WIDTH = 320;
const ASSIST_MENU_HEIGHT = 420;
const ASSIST_MENU_MARGIN = 16;

const AUDIO_EDGE_STYLE = { stroke: '#44cc44', strokeWidth: 3 };
const CONTROL_EDGE_STYLE = { stroke: '#4488ff', strokeWidth: 2, strokeDasharray: '5,5' };
const TRIGGER_EDGE_STYLE = { stroke: '#ff4466', strokeWidth: 2, strokeDasharray: '6,4' };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const AUTO_LAYOUT_PADDING_X = 48;
const AUTO_LAYOUT_PADDING_Y = 56;
const AUTO_LAYOUT_COLUMN_GAP = 90;
const AUTO_LAYOUT_ROW_GAP = 26;
const AUTO_LAYOUT_BRANCH_GAP = 54;
const AUTO_LAYOUT_COMPONENT_GAP_X = 120;
const AUTO_LAYOUT_COMPONENT_GAP_Y = 96;

const compareByCurrentPosition = (nodeById: Map<string, Node<AudioNodeData>>, leftId: string, rightId: string) => {
    const left = nodeById.get(leftId);
    const right = nodeById.get(rightId);
    if (!left || !right) return 0;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.position.y - right.position.y;
};

function computeAutoLayoutPositions(nodes: Node<AudioNodeData>[], edges: Edge[]): Map<string, XYPosition> {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const positions = new Map<string, XYPosition>();
    if (nodes.length === 0) return positions;

    const getNodeWidth = (nodeId: string) => {
        const node = nodeById.get(nodeId);
        if (!node) return DEFAULT_NODE_SIZE.width;
        const measured = (node as Node<AudioNodeData> & { measured?: { width?: number; height?: number } }).measured;
        return measured?.width ?? DEFAULT_NODE_SIZE.width;
    };

    const getNodeHeight = (nodeId: string) => {
        const node = nodeById.get(nodeId);
        if (!node) return DEFAULT_NODE_SIZE.height;
        const measured = (node as Node<AudioNodeData> & { measured?: { width?: number; height?: number } }).measured;
        return measured?.height ?? DEFAULT_NODE_SIZE.height;
    };

    const allOutgoing = new Map<string, Set<string>>();
    const allIncoming = new Map<string, Set<string>>();
    const undirected = new Map<string, Set<string>>();
    nodes.forEach((node) => {
        allOutgoing.set(node.id, new Set());
        allIncoming.set(node.id, new Set());
        undirected.set(node.id, new Set());
    });

    edges.forEach((edge) => {
        if (!nodeById.has(edge.source) || !nodeById.has(edge.target) || edge.source === edge.target) return;
        allOutgoing.get(edge.source)?.add(edge.target);
        allIncoming.get(edge.target)?.add(edge.source);
        undirected.get(edge.source)?.add(edge.target);
        undirected.get(edge.target)?.add(edge.source);
    });

    const sortedNodeIds = nodes.map((node) => node.id).sort((leftId, rightId) => compareByCurrentPosition(nodeById, leftId, rightId));
    const weakVisited = new Set<string>();
    const components: string[][] = [];

    sortedNodeIds.forEach((startId) => {
        if (weakVisited.has(startId)) return;
        const queue = [startId];
        weakVisited.add(startId);
        const component: string[] = [];
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId) break;
            component.push(currentId);
            (undirected.get(currentId) ?? new Set<string>()).forEach((nextId) => {
                if (weakVisited.has(nextId)) return;
                weakVisited.add(nextId);
                queue.push(nextId);
            });
        }
        component.sort((leftId, rightId) => compareByCurrentPosition(nodeById, leftId, rightId));
        components.push(component);
    });

    type ComponentLayout = {
        ids: string[];
        localPositions: Map<string, XYPosition>;
        width: number;
        height: number;
        anchorX: number;
        anchorY: number;
    };

    const componentLayouts: ComponentLayout[] = components.map((componentIds) => {
        const idSet = new Set(componentIds);
        const outgoing = new Map<string, Set<string>>();
        const incoming = new Map<string, Set<string>>();
        componentIds.forEach((id) => {
            outgoing.set(id, new Set());
            incoming.set(id, new Set());
        });

        componentIds.forEach((id) => {
            (allOutgoing.get(id) ?? new Set<string>()).forEach((targetId) => {
                if (!idSet.has(targetId)) return;
                outgoing.get(id)?.add(targetId);
                incoming.get(targetId)?.add(id);
            });
        });

        const discoveryIndex = new Map<string, number>();
        const lowLink = new Map<string, number>();
        const stack: string[] = [];
        const onStack = new Set<string>();
        const sccByNode = new Map<string, number>();
        const sccMembers: string[][] = [];
        let nextIndex = 0;

        const strongConnect = (nodeId: string) => {
            discoveryIndex.set(nodeId, nextIndex);
            lowLink.set(nodeId, nextIndex);
            nextIndex += 1;
            stack.push(nodeId);
            onStack.add(nodeId);

            (outgoing.get(nodeId) ?? new Set<string>()).forEach((targetId) => {
                if (!discoveryIndex.has(targetId)) {
                    strongConnect(targetId);
                    lowLink.set(nodeId, Math.min(lowLink.get(nodeId) ?? 0, lowLink.get(targetId) ?? 0));
                } else if (onStack.has(targetId)) {
                    lowLink.set(nodeId, Math.min(lowLink.get(nodeId) ?? 0, discoveryIndex.get(targetId) ?? 0));
                }
            });

            if ((lowLink.get(nodeId) ?? -1) !== (discoveryIndex.get(nodeId) ?? -2)) return;

            const sccId = sccMembers.length;
            const members: string[] = [];
            while (stack.length > 0) {
                const member = stack.pop();
                if (!member) break;
                onStack.delete(member);
                members.push(member);
                sccByNode.set(member, sccId);
                if (member === nodeId) break;
            }
            members.sort((leftId, rightId) => compareByCurrentPosition(nodeById, leftId, rightId));
            sccMembers.push(members);
        };

        componentIds.forEach((id) => {
            if (!discoveryIndex.has(id)) strongConnect(id);
        });

        const sccOutgoing = new Map<number, Set<number>>();
        const sccIndegree = new Map<number, number>();
        const sccLevel = new Map<number, number>();
        for (let sccId = 0; sccId < sccMembers.length; sccId += 1) {
            sccOutgoing.set(sccId, new Set());
            sccIndegree.set(sccId, 0);
            sccLevel.set(sccId, 0);
        }

        outgoing.forEach((targets, sourceId) => {
            const sourceScc = sccByNode.get(sourceId);
            if (typeof sourceScc !== 'number') return;
            targets.forEach((targetId) => {
                const targetScc = sccByNode.get(targetId);
                if (typeof targetScc !== 'number' || targetScc === sourceScc) return;
                const nextTargets = sccOutgoing.get(sourceScc);
                if (!nextTargets || nextTargets.has(targetScc)) return;
                nextTargets.add(targetScc);
                sccIndegree.set(targetScc, (sccIndegree.get(targetScc) ?? 0) + 1);
            });
        });

        const getSccAnchor = (sccId: number) =>
            Math.min(...(sccMembers[sccId] ?? []).map((id) => nodeById.get(id)?.position.x ?? Number.MAX_SAFE_INTEGER));

        const sccQueue = Array.from({ length: sccMembers.length }, (_, index) => index)
            .filter((sccId) => (sccIndegree.get(sccId) ?? 0) === 0)
            .sort((left, right) => getSccAnchor(left) - getSccAnchor(right));
        const sccVisited = new Set<number>();

        while (sccQueue.length > 0) {
            const currentScc = sccQueue.shift();
            if (typeof currentScc !== 'number') break;
            sccVisited.add(currentScc);
            const currentLevel = sccLevel.get(currentScc) ?? 0;
            (sccOutgoing.get(currentScc) ?? new Set<number>()).forEach((targetScc) => {
                sccLevel.set(targetScc, Math.max(sccLevel.get(targetScc) ?? 0, currentLevel + 1));
                const nextIndegree = (sccIndegree.get(targetScc) ?? 1) - 1;
                sccIndegree.set(targetScc, nextIndegree);
                if (nextIndegree === 0) sccQueue.push(targetScc);
            });
            sccQueue.sort((left, right) => getSccAnchor(left) - getSccAnchor(right));
        }

        const maxVisitedLevel = Array.from(sccLevel.values()).reduce((max, value) => Math.max(max, value), 0);
        const unresolvedScc = Array.from({ length: sccMembers.length }, (_, index) => index)
            .filter((sccId) => !sccVisited.has(sccId))
            .sort((left, right) => getSccAnchor(left) - getSccAnchor(right));
        unresolvedScc.forEach((sccId, index) => {
            sccLevel.set(sccId, maxVisitedLevel + 1 + index);
        });

        const levelByNode = new Map<string, number>();
        componentIds.forEach((id) => {
            const sccId = sccByNode.get(id);
            levelByNode.set(id, typeof sccId === 'number' ? (sccLevel.get(sccId) ?? 0) : 0);
        });

        const minLevel = componentIds.reduce((min, id) => Math.min(min, levelByNode.get(id) ?? 0), Number.MAX_SAFE_INTEGER);
        const roots = componentIds
            .filter((id) => (incoming.get(id)?.size ?? 0) === 0)
            .sort((leftId, rightId) => compareByCurrentPosition(nodeById, leftId, rightId));
        const branchRoots = (roots.length > 0 ? roots : componentIds.filter((id) => (levelByNode.get(id) ?? 0) === minLevel))
            .sort((leftId, rightId) => compareByCurrentPosition(nodeById, leftId, rightId));
        const fallbackRoot = branchRoots[0] ?? componentIds[0];
        const branchByNode = new Map<string, string>();
        branchRoots.forEach((rootId) => branchByNode.set(rootId, rootId));
        const branchIndex = new Map<string, number>();
        branchRoots.forEach((id, index) => branchIndex.set(id, index));

        const levelsAscending = Array.from(new Set(componentIds.map((id) => levelByNode.get(id) ?? 0))).sort((a, b) => a - b);
        levelsAscending.forEach((levelValue) => {
            const idsAtLevel = componentIds
                .filter((id) => (levelByNode.get(id) ?? 0) === levelValue)
                .sort((leftId, rightId) => compareByCurrentPosition(nodeById, leftId, rightId));

            idsAtLevel.forEach((id) => {
                if (branchByNode.has(id)) return;
                const candidates = Array.from(incoming.get(id) ?? new Set<string>())
                    .filter((sourceId) => branchByNode.has(sourceId))
                    .sort((leftId, rightId) => {
                        const leftLevel = levelByNode.get(leftId) ?? 0;
                        const rightLevel = levelByNode.get(rightId) ?? 0;
                        if (leftLevel !== rightLevel) return rightLevel - leftLevel;
                        const leftNode = nodeById.get(leftId);
                        const rightNode = nodeById.get(rightId);
                        const currentNode = nodeById.get(id);
                        const leftDist = Math.abs((leftNode?.position.y ?? 0) - (currentNode?.position.y ?? 0));
                        const rightDist = Math.abs((rightNode?.position.y ?? 0) - (currentNode?.position.y ?? 0));
                        return leftDist - rightDist;
                    });

                if (candidates.length > 0) {
                    const branch = branchByNode.get(candidates[0]) ?? fallbackRoot;
                    branchByNode.set(id, branch);
                    return;
                }

                const node = nodeById.get(id);
                const nearestRoot = branchRoots
                    .slice()
                    .sort((leftId, rightId) => {
                        const leftNode = nodeById.get(leftId);
                        const rightNode = nodeById.get(rightId);
                        const leftDist = Math.abs((leftNode?.position.y ?? 0) - (node?.position.y ?? 0));
                        const rightDist = Math.abs((rightNode?.position.y ?? 0) - (node?.position.y ?? 0));
                        return leftDist - rightDist;
                    })[0] ?? fallbackRoot;
                branchByNode.set(id, nearestRoot);
            });
        });

        componentIds.forEach((id) => {
            if (!branchByNode.has(id)) {
                branchByNode.set(id, fallbackRoot);
            }
        });

        const columns = new Map<number, string[]>();
        componentIds.forEach((id) => {
            const levelValue = levelByNode.get(id) ?? 0;
            const list = columns.get(levelValue) ?? [];
            list.push(id);
            columns.set(levelValue, list);
        });
        const sortedColumns = Array.from(columns.keys()).sort((a, b) => a - b);
        const columnNodeIds = sortedColumns.map((levelValue) =>
            (columns.get(levelValue) ?? [])
                .slice()
                .sort((leftId, rightId) => {
                    const leftBranch = branchByNode.get(leftId) ?? fallbackRoot;
                    const rightBranch = branchByNode.get(rightId) ?? fallbackRoot;
                    const leftBranchIndex = branchIndex.get(leftBranch) ?? Number.MAX_SAFE_INTEGER;
                    const rightBranchIndex = branchIndex.get(rightBranch) ?? Number.MAX_SAFE_INTEGER;
                    if (leftBranchIndex !== rightBranchIndex) return leftBranchIndex - rightBranchIndex;
                    return compareByCurrentPosition(nodeById, leftId, rightId);
                })
        );

        const buildIndexMap = (ids: string[]) => {
            const map = new Map<string, number>();
            ids.forEach((id, index) => map.set(id, index));
            return map;
        };

        const getBarycenter = (neighbors: Set<string> | undefined, neighborIndex: Map<string, number>, expectedNeighborLevel: number) => {
            if (!neighbors || neighbors.size === 0) return Number.NaN;
            let sum = 0;
            let count = 0;
            neighbors.forEach((id) => {
                if ((levelByNode.get(id) ?? -1) !== expectedNeighborLevel) return;
                const index = neighborIndex.get(id);
                if (typeof index !== 'number') return;
                sum += index;
                count += 1;
            });
            if (count === 0) return Number.NaN;
            return sum / count;
        };

        for (let pass = 0; pass < 6; pass += 1) {
            for (let columnIndex = 1; columnIndex < columnNodeIds.length; columnIndex += 1) {
                const previousIndex = buildIndexMap(columnNodeIds[columnIndex - 1]);
                const previousLevel = sortedColumns[columnIndex - 1];
                columnNodeIds[columnIndex].sort((leftId, rightId) => {
                    const leftScore = getBarycenter(incoming.get(leftId), previousIndex, previousLevel);
                    const rightScore = getBarycenter(incoming.get(rightId), previousIndex, previousLevel);
                    const leftValid = Number.isFinite(leftScore);
                    const rightValid = Number.isFinite(rightScore);
                    if (leftValid && rightValid && leftScore !== rightScore) return leftScore - rightScore;
                    if (leftValid !== rightValid) return leftValid ? -1 : 1;
                    const leftBranch = branchByNode.get(leftId) ?? fallbackRoot;
                    const rightBranch = branchByNode.get(rightId) ?? fallbackRoot;
                    const leftBranchIndex = branchIndex.get(leftBranch) ?? Number.MAX_SAFE_INTEGER;
                    const rightBranchIndex = branchIndex.get(rightBranch) ?? Number.MAX_SAFE_INTEGER;
                    if (leftBranchIndex !== rightBranchIndex) return leftBranchIndex - rightBranchIndex;
                    return compareByCurrentPosition(nodeById, leftId, rightId);
                });
            }

            for (let columnIndex = columnNodeIds.length - 2; columnIndex >= 0; columnIndex -= 1) {
                const nextIndex = buildIndexMap(columnNodeIds[columnIndex + 1]);
                const nextLevel = sortedColumns[columnIndex + 1];
                columnNodeIds[columnIndex].sort((leftId, rightId) => {
                    const leftScore = getBarycenter(outgoing.get(leftId), nextIndex, nextLevel);
                    const rightScore = getBarycenter(outgoing.get(rightId), nextIndex, nextLevel);
                    const leftValid = Number.isFinite(leftScore);
                    const rightValid = Number.isFinite(rightScore);
                    if (leftValid && rightValid && leftScore !== rightScore) return leftScore - rightScore;
                    if (leftValid !== rightValid) return leftValid ? -1 : 1;
                    const leftBranch = branchByNode.get(leftId) ?? fallbackRoot;
                    const rightBranch = branchByNode.get(rightId) ?? fallbackRoot;
                    const leftBranchIndex = branchIndex.get(leftBranch) ?? Number.MAX_SAFE_INTEGER;
                    const rightBranchIndex = branchIndex.get(rightBranch) ?? Number.MAX_SAFE_INTEGER;
                    if (leftBranchIndex !== rightBranchIndex) return leftBranchIndex - rightBranchIndex;
                    return compareByCurrentPosition(nodeById, leftId, rightId);
                });
            }
        }

        const localPositions = new Map<string, XYPosition>();
        let currentX = 0;
        let maxHeight = 0;

        sortedColumns.forEach((_, columnIndex) => {
            const ids = columnNodeIds[columnIndex] ?? [];
            const columnWidth = Math.max(DEFAULT_NODE_SIZE.width, ...ids.map((id) => getNodeWidth(id)));
            let currentY = 0;
            let previousBranch: string | null = null;
            ids.forEach((id) => {
                const branch = branchByNode.get(id) ?? fallbackRoot;
                const height = getNodeHeight(id);
                if (previousBranch !== null) {
                    currentY += previousBranch === branch ? AUTO_LAYOUT_ROW_GAP : AUTO_LAYOUT_BRANCH_GAP;
                }
                localPositions.set(id, { x: currentX, y: currentY });
                currentY += height;
                previousBranch = branch;
            });
            maxHeight = Math.max(maxHeight, currentY);
            currentX += columnWidth + AUTO_LAYOUT_COLUMN_GAP;
        });

        const width = Math.max(DEFAULT_NODE_SIZE.width, currentX > 0 ? currentX - AUTO_LAYOUT_COLUMN_GAP : DEFAULT_NODE_SIZE.width);
        const height = Math.max(DEFAULT_NODE_SIZE.height, maxHeight);
        const anchorX = Math.min(...componentIds.map((id) => nodeById.get(id)?.position.x ?? Number.MAX_SAFE_INTEGER));
        const anchorY = Math.min(...componentIds.map((id) => nodeById.get(id)?.position.y ?? Number.MAX_SAFE_INTEGER));

        return {
            ids: componentIds,
            localPositions,
            width,
            height,
            anchorX,
            anchorY,
        };
    });

    componentLayouts.sort((left, right) => {
        if (left.anchorX !== right.anchorX) return left.anchorX - right.anchorX;
        return left.anchorY - right.anchorY;
    });

    const placed = componentLayouts.map((layout) => ({
        layout,
        x: layout.anchorX,
        y: layout.anchorY,
    }));

    const intersectsWithGap = (left: { x: number; y: number; layout: { width: number; height: number } }, right: { x: number; y: number; layout: { width: number; height: number } }) => {
        return (
            left.x < right.x + right.layout.width + AUTO_LAYOUT_COMPONENT_GAP_X
            && left.x + left.layout.width + AUTO_LAYOUT_COMPONENT_GAP_X > right.x
            && left.y < right.y + right.layout.height + AUTO_LAYOUT_COMPONENT_GAP_Y
            && left.y + left.layout.height + AUTO_LAYOUT_COMPONENT_GAP_Y > right.y
        );
    };

    for (let pass = 0; pass < 16; pass += 1) {
        let moved = false;
        for (let i = 0; i < placed.length; i += 1) {
            for (let j = i + 1; j < placed.length; j += 1) {
                const first = placed[i];
                const second = placed[j];
                if (!intersectsWithGap(first, second)) continue;

                const overlapX = Math.min(
                    first.x + first.layout.width + AUTO_LAYOUT_COMPONENT_GAP_X - second.x,
                    second.x + second.layout.width + AUTO_LAYOUT_COMPONENT_GAP_X - first.x
                );
                const overlapY = Math.min(
                    first.y + first.layout.height + AUTO_LAYOUT_COMPONENT_GAP_Y - second.y,
                    second.y + second.layout.height + AUTO_LAYOUT_COMPONENT_GAP_Y - first.y
                );
                const preferHorizontal = Math.abs(second.layout.anchorX - first.layout.anchorX) >= Math.abs(second.layout.anchorY - first.layout.anchorY);

                if (preferHorizontal && overlapX > 0) {
                    if (second.layout.anchorX >= first.layout.anchorX) {
                        second.x += overlapX;
                    } else {
                        first.x += overlapX;
                    }
                    moved = true;
                } else if (overlapY > 0) {
                    if (second.layout.anchorY >= first.layout.anchorY) {
                        second.y += overlapY;
                    } else {
                        first.y += overlapY;
                    }
                    moved = true;
                }
            }
        }
        if (!moved) break;
    }

    const minPlacedX = placed.reduce((min, item) => Math.min(min, item.x), Number.POSITIVE_INFINITY);
    const minPlacedY = placed.reduce((min, item) => Math.min(min, item.y), Number.POSITIVE_INFINITY);
    const offsetX = AUTO_LAYOUT_PADDING_X - minPlacedX;
    const offsetY = AUTO_LAYOUT_PADDING_Y - minPlacedY;

    placed.forEach((item) => {
        item.layout.ids.forEach((id) => {
            const local = item.layout.localPositions.get(id);
            if (!local) return;
            positions.set(id, {
                x: item.x + local.x + offsetX,
                y: item.y + local.y + offsetY,
            });
        });
    });

    return positions;
}

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (durationSec?: number): string => {
    if (!Number.isFinite(durationSec) || !durationSec || durationSec <= 0) {
        return '--:--';
    }
    const totalSeconds = Math.max(0, Math.round(durationSec));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const SAFE_AUDIO_EXTENSIONS = new Set([
    'mp3',
    'wav',
    'wave',
    'm4a',
    'aac',
    'flac',
    'ogg',
    'oga',
    'opus',
    'webm',
    'mp4',
]);

const EXTENSION_TO_MIME_CANDIDATES: Record<string, string[]> = {
    mp3: ['audio/mpeg'],
    wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
    wave: ['audio/wav', 'audio/x-wav', 'audio/wave'],
    m4a: ['audio/mp4', 'audio/x-m4a', 'audio/aac'],
    aac: ['audio/aac', 'audio/mp4'],
    flac: ['audio/flac', 'audio/x-flac'],
    ogg: ['audio/ogg'],
    oga: ['audio/ogg'],
    opus: ['audio/ogg; codecs=opus', 'audio/opus'],
    webm: ['audio/webm'],
    mp4: ['audio/mp4'],
};

const MAINSTREAM_CROSS_BROWSER_HINT = 'Use MP3, WAV, or M4A/AAC for best cross-browser compatibility.';

const getFileExtension = (name: string): string => {
    const trimmed = name.trim();
    const lastDot = trimmed.lastIndexOf('.');
    if (lastDot < 0 || lastDot === trimmed.length - 1) return '';
    return trimmed.slice(lastDot + 1).toLowerCase();
};

const isLikelyAudioFile = (file: File): boolean => {
    if (file.type.startsWith('audio/')) return true;
    return SAFE_AUDIO_EXTENSIONS.has(getFileExtension(file.name));
};

const canCurrentBrowserPlayFile = (file: File): boolean => {
    if (typeof document === 'undefined') return true;
    const audio = document.createElement('audio');
    if (typeof audio.canPlayType !== 'function') return true;

    const mimeCandidates = new Set<string>();
    if (file.type) {
        mimeCandidates.add(file.type);
    }

    const extension = getFileExtension(file.name);
    (EXTENSION_TO_MIME_CANDIDATES[extension] ?? []).forEach((value) => mimeCandidates.add(value));

    if (mimeCandidates.size === 0) return false;
    for (const mime of mimeCandidates) {
        const support = audio.canPlayType(mime).toLowerCase();
        if (support === 'probably' || support === 'maybe') {
            return true;
        }
    }
    return false;
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
    try {
        const response = await fetch(dataUrl);
        if (!response.ok) return null;
        return response.blob();
    } catch {
        return null;
    }
}

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

const getViewportWidth = () => (typeof window === 'undefined' ? 1440 : window.innerWidth);
const getDefaultPaletteCollapsed = (viewportWidth: number) => viewportWidth < 1220;
const getDefaultInspectorCollapsed = (viewportWidth: number) => viewportWidth < 1040;

interface FeedbackTemplateGraph {
    nodes: Node<AudioNodeData>[];
    edges: Edge[];
}

function createUiTokensNodeData() {
    return {
        type: 'uiTokens' as const,
        params: createUiTokenParams(),
        label: 'UI Tokens',
    };
}

function createHoverFeedbackTemplate(): FeedbackTemplateGraph {
    return {
        nodes: [
            { id: 'input-hover', type: 'uiTokensNode', dragHandle: '.node-header', position: { x: 40, y: 80 }, data: createUiTokensNodeData() as any },
            { id: 'evt-hover', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 280, y: 80 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 40, velocity: 0.45, duration: 0.06, note: 72, trackId: 'hover', label: 'Hover Trigger' } as any },
            { id: 'noise-hover', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 520, y: 40 }, data: { type: 'noiseBurst', noiseType: 'white', duration: 0.03, gain: 0.55, attack: 0.001, release: 0.02, label: 'Hover Noise' } as any },
            { id: 'filter-hover', type: 'filterNode', dragHandle: '.node-header', position: { x: 760, y: 40 }, data: { type: 'filter', filterType: 'highpass', frequency: 1800, detune: 0, q: 0.9, gain: 0, label: 'HP Filter' } as any },
            { id: 'chorus-hover', type: 'chorusNode', dragHandle: '.node-header', position: { x: 990, y: 40 }, data: { type: 'chorus', rate: 1.2, depth: 2.4, feedback: 0.12, delay: 14, mix: 0.22, stereo: true, label: 'Light Chorus' } as any },
            { id: 'gain-hover', type: 'gainNode', dragHandle: '.node-header', position: { x: 1220, y: 40 }, data: { type: 'gain', gain: 0.5, label: 'Hover Gain' } as any },
            { id: 'analyzer-hover', type: 'analyzerNode', dragHandle: '.node-header', position: { x: 1450, y: 40 }, data: { type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.75, updateRate: 60, autoUpdate: true, label: 'Monitor' } as any },
            { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1680, y: 120 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any },
        ],
        edges: [
            { id: 'hover-token', source: 'input-hover', sourceHandle: getInputParamHandleId('hoverToken'), target: 'evt-hover', targetHandle: 'token', animated: true, style: CONTROL_EDGE_STYLE },
            { id: 'hover-trigger', source: 'evt-hover', sourceHandle: 'trigger', target: 'noise-hover', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'hover-a1', source: 'noise-hover', sourceHandle: 'out', target: 'filter-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'hover-a2', source: 'filter-hover', sourceHandle: 'out', target: 'chorus-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'hover-a3', source: 'chorus-hover', sourceHandle: 'out', target: 'gain-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'hover-a4', source: 'gain-hover', sourceHandle: 'out', target: 'analyzer-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'hover-a5', source: 'analyzer-hover', sourceHandle: 'out', target: 'output', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
        ],
    };
}

function createSuccessFeedbackTemplate(): FeedbackTemplateGraph {
    return {
        nodes: [
            { id: 'input-success', type: 'uiTokensNode', dragHandle: '.node-header', position: { x: 40, y: 80 }, data: createUiTokensNodeData() as any },
            { id: 'evt-success', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 280, y: 80 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 120, velocity: 0.9, duration: 0.35, note: 76, trackId: 'success', label: 'Success Trigger' } as any },
            { id: 'sampler-success', type: 'samplerNode', dragHandle: '.node-header', position: { x: 530, y: 40 }, data: { type: 'sampler', src: '/samples/ui_success.wav', loop: false, playbackRate: 1, detune: 0, loaded: true, label: 'Success Sample' } as any },
            { id: 'convolver-success', type: 'convolverNode', dragHandle: '.node-header', position: { x: 760, y: 40 }, data: { type: 'convolver', impulseSrc: '/impulses/plate.wav', normalize: true, label: 'Plate IR' } as any },
            { id: 'chorus-success', type: 'chorusNode', dragHandle: '.node-header', position: { x: 990, y: 40 }, data: { type: 'chorus', rate: 0.9, depth: 1.6, feedback: 0.08, delay: 18, mix: 0.16, stereo: true, label: 'Subtle Chorus' } as any },
            { id: 'panner-success', type: 'panner3dNode', dragHandle: '.node-header', position: { x: 1220, y: 40 }, data: { type: 'panner3d', positionX: 0, positionY: 0, positionZ: -1, refDistance: 1, maxDistance: 10000, rolloffFactor: 1, panningModel: 'HRTF', distanceModel: 'inverse', label: 'Panner 3D' } as any },
            { id: 'gain-success', type: 'gainNode', dragHandle: '.node-header', position: { x: 1450, y: 40 }, data: { type: 'gain', gain: 0.65, label: 'Success Gain' } as any },
            { id: 'analyzer-success', type: 'analyzerNode', dragHandle: '.node-header', position: { x: 1680, y: 40 }, data: { type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.8, updateRate: 60, autoUpdate: true, label: 'Monitor' } as any },
            { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1910, y: 120 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any },
        ],
        edges: [
            { id: 'success-token', source: 'input-success', sourceHandle: getInputParamHandleId('successToken'), target: 'evt-success', targetHandle: 'token', animated: true, style: CONTROL_EDGE_STYLE },
            { id: 'success-trigger', source: 'evt-success', sourceHandle: 'trigger', target: 'sampler-success', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'success-a1', source: 'sampler-success', sourceHandle: 'out', target: 'convolver-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'success-a2', source: 'convolver-success', sourceHandle: 'out', target: 'chorus-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'success-a3', source: 'chorus-success', sourceHandle: 'out', target: 'panner-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'success-a4', source: 'panner-success', sourceHandle: 'out', target: 'gain-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'success-a5', source: 'gain-success', sourceHandle: 'out', target: 'analyzer-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'success-a6', source: 'analyzer-success', sourceHandle: 'out', target: 'output', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
        ],
    };
}

function createErrorFeedbackTemplate(): FeedbackTemplateGraph {
    return {
        nodes: [
            { id: 'input-error', type: 'uiTokensNode', dragHandle: '.node-header', position: { x: 40, y: 80 }, data: createUiTokensNodeData() as any },
            { id: 'evt-error', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 280, y: 80 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 120, velocity: 0.95, duration: 0.25, note: 45, trackId: 'error', label: 'Error Trigger' } as any },
            { id: 'noise-error', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 530, y: 10 }, data: { type: 'noiseBurst', noiseType: 'brown', duration: 0.09, gain: 0.7, attack: 0.002, release: 0.08, label: 'Error Noise' } as any },
            { id: 'sampler-error', type: 'samplerNode', dragHandle: '.node-header', position: { x: 530, y: 150 }, data: { type: 'sampler', src: '/samples/ui_error.wav', loop: false, playbackRate: 1, detune: 0, loaded: true, label: 'Error Sample' } as any },
            { id: 'dist-error', type: 'distortionNode', dragHandle: '.node-header', position: { x: 780, y: 80 }, data: { type: 'distortion', distortionType: 'soft', drive: 0.35, level: 0.65, mix: 0.52, tone: 2400, label: 'Soft Distortion' } as any },
            { id: 'ws-error', type: 'waveShaperNode', dragHandle: '.node-header', position: { x: 1020, y: 80 }, data: { type: 'waveShaper', amount: 0.45, preset: 'saturate', oversample: '2x', label: 'WaveShaper' } as any },
            { id: 'filter-error', type: 'filterNode', dragHandle: '.node-header', position: { x: 1260, y: 80 }, data: { type: 'filter', filterType: 'lowpass', frequency: 1200, detune: 0, q: 1.2, gain: 0, label: 'LP Filter' } as any },
            { id: 'gain-error', type: 'gainNode', dragHandle: '.node-header', position: { x: 1490, y: 80 }, data: { type: 'gain', gain: 0.6, label: 'Error Gain' } as any },
            { id: 'analyzer-error', type: 'analyzerNode', dragHandle: '.node-header', position: { x: 1720, y: 80 }, data: { type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.78, updateRate: 60, autoUpdate: true, label: 'Monitor' } as any },
            { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1950, y: 140 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any },
        ],
        edges: [
            { id: 'error-token', source: 'input-error', sourceHandle: getInputParamHandleId('errorToken'), target: 'evt-error', targetHandle: 'token', animated: true, style: CONTROL_EDGE_STYLE },
            { id: 'error-trigger-noise', source: 'evt-error', sourceHandle: 'trigger', target: 'noise-error', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'error-trigger-sampler', source: 'evt-error', sourceHandle: 'trigger', target: 'sampler-error', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'error-a1', source: 'noise-error', sourceHandle: 'out', target: 'dist-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'error-a2', source: 'sampler-error', sourceHandle: 'out', target: 'dist-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'error-a3', source: 'dist-error', sourceHandle: 'out', target: 'ws-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'error-a4', source: 'ws-error', sourceHandle: 'out', target: 'filter-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'error-a5', source: 'filter-error', sourceHandle: 'out', target: 'gain-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'error-a6', source: 'gain-error', sourceHandle: 'out', target: 'analyzer-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'error-a7', source: 'analyzer-error', sourceHandle: 'out', target: 'output', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
        ],
    };
}

function createUiFeedbackPackTemplate(): FeedbackTemplateGraph {
    return {
        nodes: [
            { id: 'input-ui', type: 'uiTokensNode', dragHandle: '.node-header', position: { x: 40, y: 220 }, data: createUiTokensNodeData() as any },
            { id: 'evt-hover', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 280, y: 60 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 40, velocity: 0.45, duration: 0.06, note: 72, trackId: 'hover', label: 'Hover Trigger' } as any },
            { id: 'evt-success', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 280, y: 220 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 120, velocity: 0.9, duration: 0.35, note: 76, trackId: 'success', label: 'Success Trigger' } as any },
            { id: 'evt-error', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 280, y: 380 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 120, velocity: 0.95, duration: 0.25, note: 45, trackId: 'error', label: 'Error Trigger' } as any },
            { id: 'noise-hover', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 540, y: 20 }, data: { type: 'noiseBurst', noiseType: 'white', duration: 0.03, gain: 0.55, attack: 0.001, release: 0.02, label: 'Hover Noise' } as any },
            { id: 'filter-hover', type: 'filterNode', dragHandle: '.node-header', position: { x: 770, y: 20 }, data: { type: 'filter', filterType: 'highpass', frequency: 1800, detune: 0, q: 0.9, gain: 0, label: 'HP Filter' } as any },
            { id: 'chorus-hover', type: 'chorusNode', dragHandle: '.node-header', position: { x: 1000, y: 20 }, data: { type: 'chorus', rate: 1.2, depth: 2.4, feedback: 0.12, delay: 14, mix: 0.22, stereo: true, label: 'Light Chorus' } as any },
            { id: 'gain-hover', type: 'gainNode', dragHandle: '.node-header', position: { x: 1230, y: 20 }, data: { type: 'gain', gain: 0.5, label: 'Hover Gain' } as any },
            { id: 'sampler-success', type: 'samplerNode', dragHandle: '.node-header', position: { x: 540, y: 190 }, data: { type: 'sampler', src: '/samples/ui_success.wav', loop: false, playbackRate: 1, detune: 0, loaded: true, label: 'Success Sample' } as any },
            { id: 'convolver-success', type: 'convolverNode', dragHandle: '.node-header', position: { x: 770, y: 190 }, data: { type: 'convolver', impulseSrc: '/impulses/plate.wav', normalize: true, label: 'Plate IR' } as any },
            { id: 'chorus-success', type: 'chorusNode', dragHandle: '.node-header', position: { x: 1000, y: 190 }, data: { type: 'chorus', rate: 0.9, depth: 1.6, feedback: 0.08, delay: 18, mix: 0.16, stereo: true, label: 'Subtle Chorus' } as any },
            { id: 'panner-success', type: 'panner3dNode', dragHandle: '.node-header', position: { x: 1230, y: 190 }, data: { type: 'panner3d', positionX: 0, positionY: 0, positionZ: -1, refDistance: 1, maxDistance: 10000, rolloffFactor: 1, panningModel: 'HRTF', distanceModel: 'inverse', label: 'Panner 3D' } as any },
            { id: 'gain-success', type: 'gainNode', dragHandle: '.node-header', position: { x: 1460, y: 190 }, data: { type: 'gain', gain: 0.65, label: 'Success Gain' } as any },
            { id: 'noise-error', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 540, y: 360 }, data: { type: 'noiseBurst', noiseType: 'brown', duration: 0.09, gain: 0.7, attack: 0.002, release: 0.08, label: 'Error Noise' } as any },
            { id: 'sampler-error', type: 'samplerNode', dragHandle: '.node-header', position: { x: 540, y: 500 }, data: { type: 'sampler', src: '/samples/ui_error.wav', loop: false, playbackRate: 1, detune: 0, loaded: true, label: 'Error Sample' } as any },
            { id: 'dist-error', type: 'distortionNode', dragHandle: '.node-header', position: { x: 770, y: 430 }, data: { type: 'distortion', distortionType: 'soft', drive: 0.35, level: 0.65, mix: 0.52, tone: 2400, label: 'Soft Distortion' } as any },
            { id: 'ws-error', type: 'waveShaperNode', dragHandle: '.node-header', position: { x: 1000, y: 430 }, data: { type: 'waveShaper', amount: 0.45, preset: 'saturate', oversample: '2x', label: 'WaveShaper' } as any },
            { id: 'filter-error', type: 'filterNode', dragHandle: '.node-header', position: { x: 1230, y: 430 }, data: { type: 'filter', filterType: 'lowpass', frequency: 1200, detune: 0, q: 1.2, gain: 0, label: 'LP Filter' } as any },
            { id: 'gain-error', type: 'gainNode', dragHandle: '.node-header', position: { x: 1460, y: 430 }, data: { type: 'gain', gain: 0.6, label: 'Error Gain' } as any },
            { id: 'monitor', type: 'analyzerNode', dragHandle: '.node-header', position: { x: 1680, y: 250 }, data: { type: 'analyzer', fftSize: 1024, smoothingTimeConstant: 0.78, updateRate: 60, autoUpdate: true, label: 'Monitor' } as any },
            { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1910, y: 250 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any },
        ],
        edges: [
            { id: 'token-hover', source: 'input-ui', sourceHandle: getInputParamHandleId('hoverToken'), target: 'evt-hover', targetHandle: 'token', animated: true, style: CONTROL_EDGE_STYLE },
            { id: 'token-success', source: 'input-ui', sourceHandle: getInputParamHandleId('successToken'), target: 'evt-success', targetHandle: 'token', animated: true, style: CONTROL_EDGE_STYLE },
            { id: 'token-error', source: 'input-ui', sourceHandle: getInputParamHandleId('errorToken'), target: 'evt-error', targetHandle: 'token', animated: true, style: CONTROL_EDGE_STYLE },
            { id: 'tr-hover', source: 'evt-hover', sourceHandle: 'trigger', target: 'noise-hover', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'tr-success', source: 'evt-success', sourceHandle: 'trigger', target: 'sampler-success', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'tr-error-1', source: 'evt-error', sourceHandle: 'trigger', target: 'noise-error', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'tr-error-2', source: 'evt-error', sourceHandle: 'trigger', target: 'sampler-error', targetHandle: 'trigger', animated: true, style: TRIGGER_EDGE_STYLE },
            { id: 'a-h1', source: 'noise-hover', sourceHandle: 'out', target: 'filter-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-h2', source: 'filter-hover', sourceHandle: 'out', target: 'chorus-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-h3', source: 'chorus-hover', sourceHandle: 'out', target: 'gain-hover', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-h4', source: 'gain-hover', sourceHandle: 'out', target: 'monitor', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-s1', source: 'sampler-success', sourceHandle: 'out', target: 'convolver-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-s2', source: 'convolver-success', sourceHandle: 'out', target: 'chorus-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-s3', source: 'chorus-success', sourceHandle: 'out', target: 'panner-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-s4', source: 'panner-success', sourceHandle: 'out', target: 'gain-success', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-s5', source: 'gain-success', sourceHandle: 'out', target: 'monitor', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-e1', source: 'noise-error', sourceHandle: 'out', target: 'dist-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-e2', source: 'sampler-error', sourceHandle: 'out', target: 'dist-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-e3', source: 'dist-error', sourceHandle: 'out', target: 'ws-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-e4', source: 'ws-error', sourceHandle: 'out', target: 'filter-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-e5', source: 'filter-error', sourceHandle: 'out', target: 'gain-error', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-e6', source: 'gain-error', sourceHandle: 'out', target: 'monitor', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
            { id: 'a-out', source: 'monitor', sourceHandle: 'out', target: 'output', targetHandle: 'in', animated: false, style: AUDIO_EDGE_STYLE },
        ],
    };
}

function createMedievalStrategyLongformTemplate(): FeedbackTemplateGraph {
    const calmNotes = [
        { pitch: 50, step: 0, duration: 10, velocity: 0.56 },   // D3
        { pitch: 57, step: 10, duration: 8, velocity: 0.53 },   // A3
        { pitch: 53, step: 18, duration: 10, velocity: 0.5 },   // F3
        { pitch: 55, step: 28, duration: 8, velocity: 0.48 },   // G3
        { pitch: 62, step: 36, duration: 10, velocity: 0.52 },  // D4
        { pitch: 60, step: 46, duration: 8, velocity: 0.47 },   // C4
        { pitch: 57, step: 54, duration: 10, velocity: 0.5 },   // A3
    ];

    const activeNotes = [
        { pitch: 62, step: 0, duration: 2, velocity: 0.72 },    // D4
        { pitch: 64, step: 2, duration: 2, velocity: 0.74 },    // E4
        { pitch: 65, step: 4, duration: 2, velocity: 0.7 },     // F4
        { pitch: 69, step: 6, duration: 2, velocity: 0.76 },    // A4
        { pitch: 67, step: 8, duration: 2, velocity: 0.71 },    // G4
        { pitch: 65, step: 10, duration: 2, velocity: 0.69 },   // F4
        { pitch: 64, step: 12, duration: 2, velocity: 0.7 },    // E4
        { pitch: 62, step: 14, duration: 2, velocity: 0.72 },   // D4
        { pitch: 74, step: 16, duration: 2, velocity: 0.78 },   // D5
        { pitch: 72, step: 18, duration: 2, velocity: 0.74 },   // C5
        { pitch: 69, step: 20, duration: 2, velocity: 0.76 },   // A4
        { pitch: 67, step: 22, duration: 2, velocity: 0.71 },   // G4
        { pitch: 65, step: 24, duration: 2, velocity: 0.7 },    // F4
        { pitch: 64, step: 26, duration: 2, velocity: 0.72 },   // E4
        { pitch: 62, step: 28, duration: 2, velocity: 0.7 },    // D4
        { pitch: 60, step: 30, duration: 2, velocity: 0.68 },   // C4
    ];

    const drumPattern = [
        1, 0, 0.72, 0, 0.86, 0, 0.64, 0,
        0.95, 0, 0.58, 0, 0.82, 0, 0.7, 0,
        1, 0, 0.66, 0, 0.88, 0, 0.62, 0,
        0.93, 0, 0.56, 0, 0.8, 0, 0.68, 0,
    ];

    return {
        nodes: [
            { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 40, y: 60 }, data: { type: 'transport', bpm: 86, stepsPerBeat: 4, swing: 0.08, barsPerPhrase: 4, playing: true, label: 'Transport' } as any },

            { id: 'pianoroll-calm', type: 'pianoRollNode', dragHandle: '.node-header', position: { x: 40, y: 220 }, data: { type: 'pianoRoll', steps: 64, octaves: 2, baseNote: 48, notes: calmNotes, label: 'Calm Theme Roll' } as any },
            { id: 'voice-calm', type: 'voiceNode', dragHandle: '.node-header', position: { x: 320, y: 220 }, data: { type: 'voice', portamento: 0.06, label: 'Calm Voice' } as any },
            { id: 'osc-calm-a', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 120 }, data: { type: 'osc', frequency: 0, waveform: 'triangle', detune: -6, label: 'Calm Osc A' } as any },
            { id: 'osc-calm-b', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 270 }, data: { type: 'osc', frequency: 0, waveform: 'sine', detune: 5, label: 'Calm Osc B' } as any },
            { id: 'adsr-calm', type: 'adsrNode', dragHandle: '.node-header', position: { x: 560, y: 430 }, data: { type: 'adsr', attack: 0.28, decay: 0.9, sustain: 0.72, release: 1.8, label: 'Calm ADSR' } as any },
            { id: 'gain-calm-a', type: 'gainNode', dragHandle: '.node-header', position: { x: 820, y: 130 }, data: { type: 'gain', gain: 0, label: 'Calm VCA A' } as any },
            { id: 'gain-calm-b', type: 'gainNode', dragHandle: '.node-header', position: { x: 820, y: 290 }, data: { type: 'gain', gain: 0, label: 'Calm VCA B' } as any },
            { id: 'filter-calm', type: 'filterNode', dragHandle: '.node-header', position: { x: 1060, y: 220 }, data: { type: 'filter', filterType: 'lowpass', frequency: 1300, detune: 0, q: 0.8, gain: 0, label: 'Calm Filter' } as any },
            { id: 'reverb-calm', type: 'reverbNode', dragHandle: '.node-header', position: { x: 1290, y: 220 }, data: { type: 'reverb', decay: 6.8, mix: 0.42, label: 'Hall Reverb Calm' } as any },
            { id: 'gain-calm-main', type: 'gainNode', dragHandle: '.node-header', position: { x: 1520, y: 220 }, data: { type: 'gain', gain: 0.22, label: 'Calm Layer Gain' } as any },

            { id: 'pianoroll-active', type: 'pianoRollNode', dragHandle: '.node-header', position: { x: 40, y: 560 }, data: { type: 'pianoRoll', steps: 32, octaves: 2, baseNote: 60, notes: activeNotes, label: 'Active Theme Roll' } as any },
            { id: 'voice-active', type: 'voiceNode', dragHandle: '.node-header', position: { x: 320, y: 560 }, data: { type: 'voice', portamento: 0.015, label: 'Active Voice' } as any },
            { id: 'osc-active', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 520 }, data: { type: 'osc', frequency: 0, waveform: 'sawtooth', detune: 0, label: 'Active Osc' } as any },
            { id: 'adsr-active', type: 'adsrNode', dragHandle: '.node-header', position: { x: 560, y: 690 }, data: { type: 'adsr', attack: 0.01, decay: 0.16, sustain: 0.2, release: 0.12, label: 'Active ADSR' } as any },
            { id: 'filter-active', type: 'filterNode', dragHandle: '.node-header', position: { x: 820, y: 520 }, data: { type: 'filter', filterType: 'lowpass', frequency: 1900, detune: 0, q: 4.2, gain: 0, label: 'Active Filter' } as any },
            { id: 'gain-active-vca', type: 'gainNode', dragHandle: '.node-header', position: { x: 1060, y: 520 }, data: { type: 'gain', gain: 0, label: 'Active VCA' } as any },
            { id: 'gain-active-main', type: 'gainNode', dragHandle: '.node-header', position: { x: 1290, y: 520 }, data: { type: 'gain', gain: 0.12, label: 'Active Layer Gain' } as any },
            { id: 'delay-active', type: 'delayNode', dragHandle: '.node-header', position: { x: 1520, y: 520 }, data: { type: 'delay', delayTime: 0.27, feedback: 0.34, label: 'Active Delay' } as any },

            { id: 'sequencer-drum', type: 'stepSequencerNode', dragHandle: '.node-header', position: { x: 40, y: 910 }, data: { type: 'stepSequencer', steps: 32, pattern: drumPattern, activeSteps: drumPattern.map((value) => value > 0), label: 'Battle Pulse Seq' } as any },
            { id: 'noise-drum', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 320, y: 910 }, data: { type: 'noiseBurst', noiseType: 'brown', duration: 0.07, gain: 0.5, attack: 0.001, release: 0.05, label: 'Drum Burst' } as any },
            { id: 'filter-drum', type: 'filterNode', dragHandle: '.node-header', position: { x: 560, y: 910 }, data: { type: 'filter', filterType: 'bandpass', frequency: 700, detune: 0, q: 5, gain: 0, label: 'Drum Filter' } as any },
            { id: 'gain-drum', type: 'gainNode', dragHandle: '.node-header', position: { x: 820, y: 910 }, data: { type: 'gain', gain: 0.06, label: 'Drum Layer Gain' } as any },

            { id: 'lfo-phase', type: 'lfoNode', dragHandle: '.node-header', position: { x: 1060, y: 770 }, data: { type: 'lfo', rate: 0.007, depth: 0.48, waveform: 'sine', label: 'Phase LFO' } as any },
            { id: 'math-phase-shift', type: 'mathNode', dragHandle: '.node-header', position: { x: 1290, y: 770 }, data: { type: 'math', operation: 'add', a: 0, b: 0.5, c: 0, label: 'Shift to 0..1' } as any },
            { id: 'mix-calm-level', type: 'mixNode', dragHandle: '.node-header', position: { x: 1520, y: 680 }, data: { type: 'mix', a: 0.34, b: 0.08, t: 0.5, clamp: true, label: 'Calm Level Mix' } as any },
            { id: 'mix-active-level', type: 'mixNode', dragHandle: '.node-header', position: { x: 1520, y: 770 }, data: { type: 'mix', a: 0.05, b: 0.28, t: 0.5, clamp: true, label: 'Active Level Mix' } as any },
            { id: 'mix-drum-level', type: 'mixNode', dragHandle: '.node-header', position: { x: 1520, y: 860 }, data: { type: 'mix', a: 0.02, b: 0.2, t: 0.5, clamp: true, label: 'Drum Level Mix' } as any },

            { id: 'mixer-main', type: 'mixerNode', dragHandle: '.node-header', position: { x: 1760, y: 520 }, data: { type: 'mixer', inputs: 3, label: 'Phase Mixer' } as any },
            { id: 'reverb-main', type: 'reverbNode', dragHandle: '.node-header', position: { x: 1990, y: 520 }, data: { type: 'reverb', decay: 4.6, mix: 0.28, label: 'Master Hall' } as any },
            { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 2220, y: 520 }, data: { type: 'output', masterGain: 0.44, playing: false, label: 'Output' } as any },
        ],
        edges: [
            { id: 'med-t-calm', source: 'transport', sourceHandle: 'out', target: 'pianoroll-calm', targetHandle: 'transport', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-t-active', source: 'transport', sourceHandle: 'out', target: 'pianoroll-active', targetHandle: 'transport', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-t-drum', source: 'transport', sourceHandle: 'out', target: 'sequencer-drum', targetHandle: 'transport', style: CONTROL_EDGE_STYLE, animated: true },

            { id: 'med-calm-trg', source: 'pianoroll-calm', sourceHandle: 'trigger', target: 'voice-calm', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
            { id: 'med-calm-note-a', source: 'voice-calm', sourceHandle: 'note', target: 'osc-calm-a', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-calm-note-b', source: 'voice-calm', sourceHandle: 'note', target: 'osc-calm-b', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-calm-gate', source: 'voice-calm', sourceHandle: 'gate', target: 'adsr-calm', targetHandle: 'gate', style: TRIGGER_EDGE_STYLE, animated: true },
            { id: 'med-calm-audio-a', source: 'osc-calm-a', sourceHandle: 'out', target: 'gain-calm-a', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-calm-audio-b', source: 'osc-calm-b', sourceHandle: 'out', target: 'gain-calm-b', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-calm-env-a', source: 'adsr-calm', sourceHandle: 'envelope', target: 'gain-calm-a', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-calm-env-b', source: 'adsr-calm', sourceHandle: 'envelope', target: 'gain-calm-b', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-calm-audio-1', source: 'gain-calm-a', sourceHandle: 'out', target: 'filter-calm', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-calm-audio-2', source: 'gain-calm-b', sourceHandle: 'out', target: 'filter-calm', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-calm-audio-3', source: 'filter-calm', sourceHandle: 'out', target: 'reverb-calm', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-calm-audio-4', source: 'reverb-calm', sourceHandle: 'out', target: 'gain-calm-main', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },

            { id: 'med-active-trg', source: 'pianoroll-active', sourceHandle: 'trigger', target: 'voice-active', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
            { id: 'med-active-note', source: 'voice-active', sourceHandle: 'note', target: 'osc-active', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-active-gate', source: 'voice-active', sourceHandle: 'gate', target: 'adsr-active', targetHandle: 'gate', style: TRIGGER_EDGE_STYLE, animated: true },
            { id: 'med-active-audio-1', source: 'osc-active', sourceHandle: 'out', target: 'filter-active', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-active-audio-2', source: 'filter-active', sourceHandle: 'out', target: 'gain-active-vca', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-active-audio-3', source: 'gain-active-vca', sourceHandle: 'out', target: 'gain-active-main', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-active-audio-4', source: 'gain-active-main', sourceHandle: 'out', target: 'delay-active', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-active-env-gain', source: 'adsr-active', sourceHandle: 'envelope', target: 'gain-active-vca', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-active-env-filter', source: 'adsr-active', sourceHandle: 'envelope', target: 'filter-active', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },

            { id: 'med-drum-trg', source: 'sequencer-drum', sourceHandle: 'trigger', target: 'noise-drum', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
            { id: 'med-drum-audio-1', source: 'noise-drum', sourceHandle: 'out', target: 'filter-drum', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-drum-audio-2', source: 'filter-drum', sourceHandle: 'out', target: 'gain-drum', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },

            { id: 'med-phase-lfo', source: 'lfo-phase', sourceHandle: 'out', target: 'math-phase-shift', targetHandle: 'a', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-phase-calm', source: 'math-phase-shift', sourceHandle: 'out', target: 'mix-calm-level', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-phase-active', source: 'math-phase-shift', sourceHandle: 'out', target: 'mix-active-level', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-phase-drum', source: 'math-phase-shift', sourceHandle: 'out', target: 'mix-drum-level', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-calm-level', source: 'mix-calm-level', sourceHandle: 'out', target: 'gain-calm-main', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-active-level', source: 'mix-active-level', sourceHandle: 'out', target: 'gain-active-main', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
            { id: 'med-drum-level', source: 'mix-drum-level', sourceHandle: 'out', target: 'gain-drum', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },

            { id: 'med-main-calm', source: 'gain-calm-main', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in1', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-main-active', source: 'delay-active', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in2', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-main-drum', source: 'gain-drum', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in3', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-main-reverb', source: 'mixer-main', sourceHandle: 'out', target: 'reverb-main', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
            { id: 'med-main-output', source: 'reverb-main', sourceHandle: 'out', target: 'output', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
        ],
    };
}

const NodePalette: FC<{ compact?: boolean }> = ({ compact = false }) => {
    const addNode = useAudioGraphStore((s) => s.addNode);

    const handleDragStart = useCallback((e: React.DragEvent, nodeType: PlaygroundNodeType) => {
        e.dataTransfer.setData('application/reactflow', nodeType);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    if (compact) {
        return (
            <div className="ui-palette-compact grid grid-cols-2 gap-3 overflow-y-auto px-2 py-3">
                {nodeCategories.flatMap((category) => category.nodes).map((node) => (
                    <button
                        key={node.type}
                        type="button"
                        onClick={() => addNode(node.type)}
                        title={node.label}
                        className="ui-palette-compact-item flex h-14 items-center justify-center rounded-xl border border-transparent bg-[var(--panel-muted)] text-[24px] text-[var(--text)] transition hover:border-[var(--panel-border)] hover:bg-[var(--panel-bg)]"
                        style={{ borderLeftColor: node.color }}
                        aria-label={`Add ${node.label}`}
                    >
                        {node.icon}
                    </button>
                ))}
            </div>
        );
    }

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

const PlaygroundDemoContent: FC = () => {
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
    const [viewportWidth, setViewportWidth] = useState(() => getViewportWidth());
    const [isPaletteCollapsed, setPaletteCollapsed] = useState(() => getDefaultPaletteCollapsed(getViewportWidth()));
    const [isInspectorCollapsed, setInspectorCollapsed] = useState(() => getDefaultInspectorCollapsed(getViewportWidth()));
    const hasManualPanelLayoutRef = useRef(false);

    const activeGraph = graphs.find((graph) => graph.id === activeGraphId) ?? graphs[0];
    const activeGraphName = activeGraph?.name ?? 'Untitled Graph';
    const componentName = toPascalCase(activeGraphName);

    const [nameDraft, setNameDraft] = useState(activeGraphName);
    const saveTimerRef = useRef<number | null>(null);
    const flowRef = useRef<{
        screenToFlowPosition: (clientPosition: XYPosition, options?: { snapToGrid: boolean }) => XYPosition;
        fitView?: (options?: { padding?: number; duration?: number }) => void;
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
    const [isLibraryPanelCollapsed, setLibraryPanelCollapsed] = useState(true);
    const [libraryAssets, setLibraryAssets] = useState<AudioLibraryAsset[]>([]);
    const [librarySearch, setLibrarySearch] = useState('');
    const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
    const [libraryPanelError, setLibraryPanelError] = useState<string | null>(null);
    const [isLibraryDragOver, setLibraryDragOver] = useState(false);
    const libraryUploadRef = useRef<HTMLInputElement | null>(null);
    const patchImportRef = useRef<HTMLInputElement | null>(null);
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);
    const filteredAssistSuggestions = assistSuggestions.filter((suggestion) =>
        suggestion.title.toLowerCase().includes(assistMenuQuery.trim().toLowerCase())
    );

    const filteredLibraryAssets = useMemo(() => {
        const query = librarySearch.trim().toLowerCase();
        if (!query) return libraryAssets;
        return libraryAssets.filter((asset) => asset.name.toLowerCase().includes(query));
    }, [libraryAssets, librarySearch]);

    const graphDiagnostics = (() => {
        const nodeById = new Map(nodes.map((node) => [node.id, node]));
        const missingNodeEdges = edges.filter((edge) => !nodeById.has(edge.source) || !nodeById.has(edge.target));
        const invalidEdges = edges.filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target) && !canConnect(edge, nodeById));
        const outputCount = nodes.filter((node) => node.data.type === 'output').length;
        const transportCount = nodes.filter((node) => node.data.type === 'transport').length;
        const messages: string[] = [];

        if (missingNodeEdges.length > 0) {
            messages.push(`${missingNodeEdges.length} connection(s) reference missing node(s).`);
        }
        if (invalidEdges.length > 0) {
            messages.push(`${invalidEdges.length} connection(s) violate handle compatibility.`);
        }
        if (outputCount === 0) {
            messages.push('No Output node found.');
        }
        if (outputCount > 1) {
            messages.push(`Multiple Output nodes found (${outputCount}).`);
        }
        if (transportCount > 1) {
            messages.push(`Multiple Transport nodes found (${transportCount}).`);
        }

        return messages;
    })();

    useEffect(() => {
        setNameDraft(activeGraphName);
    }, [activeGraphName, activeGraphId]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', isDark);
        root.classList.toggle('light', !isDark);
        window.localStorage.setItem('playground-theme', theme);
    }, [isDark, theme]);

    useEffect(() => {
        const onResize = () => {
            const nextWidth = getViewportWidth();
            setViewportWidth(nextWidth);

            if (!hasManualPanelLayoutRef.current) {
                setPaletteCollapsed(getDefaultPaletteCollapsed(nextWidth));
                setInspectorCollapsed(getDefaultInspectorCollapsed(nextWidth));
            } else if (nextWidth < 900) {
                // Keep the canvas usable on narrow viewports.
                setInspectorCollapsed(true);
            }
        };

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        const refreshLibraryAssets = () => {
            listAssets()
                .then((assets) => setLibraryAssets(assets))
                .catch(() => setLibraryAssets([]));
        };

        refreshLibraryAssets();
        return subscribeAssets(refreshLibraryAssets);
    }, []);

    useEffect(() => {
        return () => {
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
            }
        };
    }, []);

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
        let cancelled = false;

        const hydrateAudioAssets = async () => {
            for (const node of nodes) {
                if (cancelled) return;

                if (node.data.type === 'sampler') {
                    const sampler = node.data as SamplerNodeData;
                    if (!sampler.sampleId || sampler.src) continue;

                    const url = await getAssetObjectUrl(sampler.sampleId).catch(() => null);
                    if (!url || cancelled) continue;

                    updateNodeData(node.id, { src: url, loaded: true });
                    audioEngine.loadSamplerBuffer(node.id, url);
                    continue;
                }

                if (node.data.type !== 'convolver') continue;
                const convolver = node.data as ConvolverNodeData;

                if (convolver.impulseId && !convolver.impulseSrc) {
                    const url = await getAssetObjectUrl(convolver.impulseId).catch(() => null);
                    if (!url || cancelled) continue;
                    updateNodeData(node.id, { impulseSrc: url });
                    continue;
                }

                if (!convolver.impulseId && typeof convolver.impulseSrc === 'string' && convolver.impulseSrc.startsWith('data:')) {
                    const blob = await dataUrlToBlob(convolver.impulseSrc);
                    if (!blob || cancelled) continue;

                    const fileName = convolver.impulseFileName || 'impulse.wav';
                    const asset = await addAssetFromBlob(blob, fileName).catch(() => null);
                    if (!asset || cancelled) continue;

                    const objectUrl = await getAssetObjectUrl(asset.id).catch(() => null);
                    if (!objectUrl || cancelled) continue;

                    updateNodeData(node.id, {
                        impulseId: asset.id,
                        impulseSrc: objectUrl,
                        impulseFileName: asset.name,
                    });
                }
            }
        };

        void hydrateAudioAssets();
        return () => {
            cancelled = true;
        };
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

    const loadFeedbackTemplate = useCallback((template: FeedbackTemplateGraph) => {
        useAudioGraphStore.getState().loadGraph(template.nodes, template.edges);
    }, []);

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

    const buildActivePatch = useCallback(() => {
        if (!activeGraph) return null;
        return graphDocumentToPatch({
            id: activeGraph.id,
            name: activeGraphName,
            nodes,
            edges,
            createdAt: activeGraph.createdAt,
            updatedAt: activeGraph.updatedAt,
            order: activeGraph.order,
        });
    }, [activeGraph, activeGraphName, edges, nodes]);

    const handleCopyPatch = useCallback(async () => {
        const patch = buildActivePatch();
        if (!patch) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(patch, null, 2));
        } catch (error) {
            console.warn('[Playground] Failed to copy patch', error);
        }
    }, [buildActivePatch]);

    const handleDownloadPatch = useCallback(() => {
        const patch = buildActivePatch();
        if (!patch) return;

        const payload = JSON.stringify(patch, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${componentName || 'patch'}.patch.json`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, [buildActivePatch, componentName]);

    const handleImportPatch = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const payload = await file.text();
            const parsed = JSON.parse(payload) as PatchDocument;
            const patch = migratePatchDocument(parsed);
            const nextOrder = graphs.reduce((max, graph) => Math.max(max, graph.order ?? 0), -1) + 1;
            const importedGraph = patchToGraphDocument(patch, { order: nextOrder }) as unknown as GraphDocument;
            setGraphs([...graphs, importedGraph], importedGraph.id);
            setNameDraft(importedGraph.name);
        } catch (error) {
            console.warn('[Playground] Failed to import patch', error);
            window.alert('Invalid patch file.');
        } finally {
            event.target.value = '';
        }
    }, [graphs, setGraphs]);

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

        const nextActiveId = useAudioGraphStore.getState().activeGraphId ?? null;
        saveActiveGraphId(nextActiveId).catch((error) => {
            console.warn('[Playground] Failed to save active graph id', error);
        });
    }, [graphs, removeGraph]);

    const stopPreviewAudio = useCallback(() => {
        if (!previewAudioRef.current) return;
        previewAudioRef.current.pause();
        previewAudioRef.current.currentTime = 0;
        previewAudioRef.current = null;
        setPreviewAssetId(null);
    }, []);

    const clearAssetReferences = useCallback((assetId: string) => {
        const state = useAudioGraphStore.getState();
        const activeId = state.activeGraphId ?? null;
        const updatedGraphs = state.graphs.map((graph) => ({
            ...graph,
            nodes: graph.nodes.map((node) => {
                if (node.data.type === 'sampler') {
                    const sampler = node.data as SamplerNodeData;
                    if (sampler.sampleId === assetId) {
                        return {
                            ...node,
                            data: {
                                ...sampler,
                                sampleId: '',
                                src: '',
                                fileName: '',
                                loaded: false,
                            } as AudioNodeData,
                        };
                    }
                    return node;
                }

                if (node.data.type === 'convolver') {
                    const convolver = node.data as ConvolverNodeData;
                    if (convolver.impulseId === assetId) {
                        return {
                            ...node,
                            data: {
                                ...convolver,
                                impulseId: '',
                                impulseSrc: '',
                                impulseFileName: '',
                            } as AudioNodeData,
                        };
                    }
                }

                return node;
            }),
            updatedAt: Date.now(),
        }));

        setGraphs(updatedGraphs, activeId);
    }, [setGraphs]);

    const getAssetUsageCount = useCallback((assetId: string): number => {
        let usageCount = 0;
        graphs.forEach((graph) => {
            graph.nodes.forEach((node) => {
                if (node.data.type === 'sampler' && (node.data as SamplerNodeData).sampleId === assetId) {
                    usageCount += 1;
                }
                if (node.data.type === 'convolver' && (node.data as ConvolverNodeData).impulseId === assetId) {
                    usageCount += 1;
                }
            });
        });
        return usageCount;
    }, [graphs]);

    const uploadLibraryFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;

        const invalidTypeFiles = files.filter((file) => !isLikelyAudioFile(file));
        if (invalidTypeFiles.length > 0) {
            setLibraryPanelError(`Only audio files are accepted. ${MAINSTREAM_CROSS_BROWSER_HINT}`);
            return;
        }

        const unsupportedFiles = files.filter((file) => !canCurrentBrowserPlayFile(file));
        if (unsupportedFiles.length > 0) {
            setLibraryPanelError(`This browser cannot decode one or more dropped formats. ${MAINSTREAM_CROSS_BROWSER_HINT}`);
            return;
        }

        setLibraryPanelError(null);
        Promise.all(files.map((file) => addAssetFromFile(file)))
            .catch(() => {
                setLibraryPanelError('Failed to upload one or more files.');
            })
            .finally(() => {
                if (libraryUploadRef.current) {
                    libraryUploadRef.current.value = '';
                }
            });
    }, []);

    const handleLibraryUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        uploadLibraryFiles(files);
    }, [uploadLibraryFiles]);

    const handleLibraryDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setLibraryDragOver(true);
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleLibraryDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setLibraryDragOver(false);
    }, []);

    const handleLibraryDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setLibraryDragOver(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        uploadLibraryFiles(files);
    }, [uploadLibraryFiles]);

    const handleLibraryDelete = useCallback((asset: AudioLibraryAsset) => {
        const usageCount = getAssetUsageCount(asset.id);
        const message = usageCount > 0
            ? `Delete "${asset.name}"? It is still used by ${usageCount} node(s).`
            : `Delete "${asset.name}" from the audio library?`;

        if (!window.confirm(message)) return;
        if (previewAssetId === asset.id) {
            stopPreviewAudio();
        }

        deleteAsset(asset.id)
            .then(() => {
                clearAssetReferences(asset.id);
            })
            .catch(() => {
                setLibraryPanelError('Failed to delete library file.');
            });
    }, [clearAssetReferences, getAssetUsageCount, previewAssetId, stopPreviewAudio]);

    const handlePreviewToggle = useCallback((assetId: string) => {
        if (previewAssetId === assetId) {
            stopPreviewAudio();
            return;
        }

        setLibraryPanelError(null);
        getAssetObjectUrl(assetId)
            .then((url) => {
                if (!url) {
                    setLibraryPanelError('Failed to preview file.');
                    return;
                }

                if (previewAudioRef.current) {
                    previewAudioRef.current.pause();
                    previewAudioRef.current.currentTime = 0;
                }

                const audio = new Audio(url);
                previewAudioRef.current = audio;
                setPreviewAssetId(assetId);

                audio.onended = () => {
                    if (previewAudioRef.current === audio) {
                        previewAudioRef.current = null;
                        setPreviewAssetId(null);
                    }
                };

                audio.play().catch(() => {
                    if (previewAudioRef.current === audio) {
                        previewAudioRef.current = null;
                        setPreviewAssetId(null);
                    }
                    setLibraryPanelError('Failed to start preview playback.');
                });
            })
            .catch(() => {
                setLibraryPanelError('Failed to preview file.');
            });
    }, [previewAssetId, stopPreviewAudio]);

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

    const handleAutoArrangeNodes = useCallback(() => {
        if (nodes.length <= 1) return;
        const nextPositions = computeAutoLayoutPositions(nodes, edges);
        const positionChanges = nodes.map((node) => ({
            id: node.id,
            type: 'position' as const,
            position: nextPositions.get(node.id) ?? node.position,
            dragging: false,
        }));

        onNodesChange(positionChanges as any);
        window.setTimeout(() => {
            flowRef.current?.fitView?.({ padding: 0.16, duration: 260 });
        }, 0);
    }, [edges, nodes, onNodesChange]);

    const isValidConnection = useCallback((connection: Parameters<typeof canConnect>[0]) => {
        return canConnect(connection, new Map(nodes.map((node) => [node.id, node])));
    }, [nodes]);

    const tabBase =
        'rounded-full border px-4 py-1.5 text-[12px] font-semibold transition';
    const templateButtonBase =
        'flex w-full items-center gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-2 text-left text-[11px] font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--panel-bg)]';
    const leftPanelWidth = isPaletteCollapsed ? 78 : viewportWidth < 1360 ? 228 : 268;
    const rightPanelWidth = isInspectorCollapsed ? 78 : viewportWidth < 1360 ? 304 : 344;

    const togglePalette = useCallback(() => {
        hasManualPanelLayoutRef.current = true;
        setPaletteCollapsed((previous) => !previous);
    }, []);

    const toggleInspector = useCallback(() => {
        hasManualPanelLayoutRef.current = true;
        setInspectorCollapsed((previous) => !previous);
    }, []);

    const toggleLibraryPanel = useCallback(() => {
        setLibraryPanelCollapsed((previous) => {
            const next = !previous;
            if (next) {
                stopPreviewAudio();
            }
            return next;
        });
    }, [stopPreviewAudio]);

    return (
        <div
            className="ui-shell grid h-screen w-full text-[var(--text)]"
            style={{ gridTemplateColumns: `${leftPanelWidth}px minmax(0, 1fr) ${rightPanelWidth}px` }}
        >
            <aside className="ui-panel ui-panel-left flex h-full min-h-0 flex-col border-r border-[var(--panel-border)]">
                <div className="ui-panel-header border-b border-[var(--panel-border)] px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--text-subtle)]">
                        Nodes
                    </span>
                    <button
                        type="button"
                        onClick={togglePalette}
                        className="ui-collapse-button rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--text-subtle)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                        aria-pressed={!isPaletteCollapsed}
                        title={isPaletteCollapsed ? 'Expand palette' : 'Collapse palette'}
                    >
                        {isPaletteCollapsed ? '>' : '<'}
                    </button>
                </div>

                {!isPaletteCollapsed && (
                    <div className="px-3 pt-3">
                        <MidiStatusStrip />
                    </div>
                )}

                <NodePalette compact={isPaletteCollapsed} />

                {!isPaletteCollapsed && (
                <div className="border-t border-[var(--panel-border)] px-4 py-4">
                    <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-subtle)]">
                        Templates
                    </h4>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                const midiNodes: Node<AudioNodeData>[] = [
                                    { id: 'midi-note', type: 'midiNoteNode', dragHandle: '.node-header', position: { x: 40, y: 180 }, data: { type: 'midiNote', inputId: 'default', channel: 'all', noteMode: 'all', note: 60, noteMin: 48, noteMax: 72, mappingEnabled: false, mappings: [], activeMappingId: null, label: 'Midi In' } as any },
                                    { id: 'voice', type: 'voiceNode', dragHandle: '.node-header', position: { x: 300, y: 180 }, data: { type: 'voice', portamento: 0.02, label: 'Voice' } as any },
                                    { id: 'osc', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 120 }, data: { type: 'osc', frequency: 440, detune: 0, waveform: 'sawtooth', label: 'Oscillator' } as any },
                                    { id: 'adsr', type: 'adsrNode', dragHandle: '.node-header', position: { x: 560, y: 320 }, data: { type: 'adsr', attack: 0.01, decay: 0.12, sustain: 0.7, release: 0.18, label: 'ADSR' } as any },
                                    { id: 'gain', type: 'gainNode', dragHandle: '.node-header', position: { x: 820, y: 180 }, data: { type: 'gain', gain: 0, label: 'Gain' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 1060, y: 180 }, data: { type: 'output', masterGain: 0.45, playing: false, label: 'Output' } as any },
                                ];
                                const midiEdges: Edge[] = [
                                    { id: 'm1', source: 'midi-note', target: 'voice', sourceHandle: 'trigger', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'm2', source: 'voice', target: 'osc', sourceHandle: 'note', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'm3', source: 'voice', target: 'adsr', sourceHandle: 'gate', targetHandle: 'gate', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'm4', source: 'osc', target: 'gain', sourceHandle: 'out', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'm5', source: 'adsr', target: 'gain', sourceHandle: 'envelope', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'm6', source: 'gain', target: 'output', sourceHandle: 'out', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                ];
                                useAudioGraphStore.getState().loadGraph(midiNodes, midiEdges);
                            }}
                            className={`${templateButtonBase} border-[var(--accent)] text-[var(--accent)] hover:text-[var(--text)]`}
                        >
                            <span className="text-sm">🎹</span>
                            <span>Keyboard Synth</span>
                        </button>
                        <button
                            onClick={() => {
                                const midiNodes: Node<AudioNodeData>[] = [
                                    { id: 'midi-cc', type: 'midiCCNode', dragHandle: '.node-header', position: { x: 40, y: 180 }, data: { type: 'midiCC', inputId: 'default', channel: 'all', cc: 1, label: 'Knob / CC In' } as any },
                                    { id: 'osc', type: 'oscNode', dragHandle: '.node-header', position: { x: 320, y: 160 }, data: { type: 'osc', frequency: 220, detune: 0, waveform: 'sawtooth', label: 'Oscillator' } as any },
                                    { id: 'filter', type: 'filterNode', dragHandle: '.node-header', position: { x: 580, y: 160 }, data: { type: 'filter', filterType: 'lowpass', frequency: 1200, detune: 0, q: 2, gain: 0, label: 'Filter' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 840, y: 160 }, data: { type: 'output', masterGain: 0.45, playing: false, label: 'Output' } as any },
                                ];
                                const midiEdges: Edge[] = [
                                    { id: 'cc1', source: 'osc', target: 'filter', sourceHandle: 'out', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'cc2', source: 'filter', target: 'output', sourceHandle: 'out', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'cc3', source: 'midi-cc', target: 'filter', sourceHandle: 'normalized', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                ];
                                useAudioGraphStore.getState().loadGraph(midiNodes, midiEdges);
                            }}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">🎛️</span>
                            <span>CC Filter Control</span>
                        </button>
                        <button
                            onClick={() => {
                                const midiNodes: Node<AudioNodeData>[] = [
                                    { id: 'midi-sync', type: 'midiSyncNode', dragHandle: '.node-header', position: { x: 40, y: 120 }, data: { type: 'midiSync', mode: 'midi-master', inputId: null, outputId: null, sendStartStop: true, sendClock: true, label: 'Sync' } as any },
                                    { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 320, y: 120 }, data: { type: 'transport', bpm: 120, playing: true, beatsPerBar: 4, beatUnit: 4, stepsPerBeat: 4, barsPerPhrase: 4, swing: 0, label: 'Transport' } as any },
                                ];
                                useAudioGraphStore.getState().loadGraph(midiNodes, []);
                            }}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">⏱️</span>
                            <span>External Clock Sync</span>
                        </button>
                        <button
                            onClick={() => loadFeedbackTemplate(createUiFeedbackPackTemplate())}
                            className={`${templateButtonBase} border-[var(--accent)] text-[var(--accent)] hover:text-[var(--text)]`}
                        >
                            <span className="text-sm">🎯</span>
                            <span>UI Feedback Pack</span>
                        </button>
                        <button
                            onClick={() => loadFeedbackTemplate(createHoverFeedbackTemplate())}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">🖱️</span>
                            <span>Hover Feedback</span>
                        </button>
                        <button
                            onClick={() => loadFeedbackTemplate(createSuccessFeedbackTemplate())}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">✅</span>
                            <span>Success Feedback</span>
                        </button>
                        <button
                            onClick={() => loadFeedbackTemplate(createErrorFeedbackTemplate())}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">⛔</span>
                            <span>Error Feedback</span>
                        </button>

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
                                const notes = [
                                    { pitch: 60, step: 0, duration: 6, velocity: 0.58 },  // C4
                                    { pitch: 67, step: 5, duration: 5, velocity: 0.54 },  // G4
                                    { pitch: 64, step: 11, duration: 6, velocity: 0.5 },  // E4
                                    { pitch: 71, step: 18, duration: 5, velocity: 0.47 }, // B4
                                    { pitch: 69, step: 24, duration: 7, velocity: 0.52 }, // A4
                                ];
                                const birdNotes = [
                                    { pitch: 84, step: 2, duration: 1, velocity: 0.4 },   // C6
                                    { pitch: 88, step: 6, duration: 1, velocity: 0.35 },  // E6
                                    { pitch: 86, step: 9, duration: 1, velocity: 0.32 },  // D6
                                    { pitch: 91, step: 13, duration: 1, velocity: 0.37 }, // G6
                                    { pitch: 89, step: 17, duration: 1, velocity: 0.34 }, // F6
                                    { pitch: 93, step: 21, duration: 1, velocity: 0.39 }, // A6
                                    { pitch: 86, step: 25, duration: 2, velocity: 0.31 }, // D6
                                    { pitch: 90, step: 29, duration: 1, velocity: 0.36 }, // F#6
                                ];
                                const pumpPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
                                const laughPattern = [1, 0, 0.45, 0, 0.72, 0, 0.3, 0, 0.84, 0.2, 0, 0.55, 0, 0.34, 0, 0];
                                const nodes: Node<AudioNodeData>[] = [
                                    { id: 'transport', type: 'transportNode', dragHandle: '.node-header', position: { x: 40, y: 60 }, data: { type: 'transport', bpm: 84, playing: true, label: 'Transport' } as any },
                                    { id: 'pianoroll', type: 'pianoRollNode', dragHandle: '.node-header', position: { x: 40, y: 220 }, data: { type: 'pianoRoll', steps: 32, octaves: 3, baseNote: 48, notes, label: 'Piano Roll' } as any },
                                    { id: 'voice', type: 'voiceNode', dragHandle: '.node-header', position: { x: 320, y: 220 }, data: { type: 'voice', portamento: 0.08, label: 'Voice' } as any },
                                    { id: 'osc-pad-a', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 130 }, data: { type: 'osc', frequency: 0, waveform: 'sine', detune: -7, label: 'Osc Pad A' } as any },
                                    { id: 'osc-pad-b', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 300 }, data: { type: 'osc', frequency: 0, waveform: 'triangle', detune: 6, label: 'Osc Pad B' } as any },
                                    { id: 'adsr-pad', type: 'adsrNode', dragHandle: '.node-header', position: { x: 560, y: 460 }, data: { type: 'adsr', attack: 0.42, decay: 2.2, sustain: 0.68, release: 3.2, label: 'ADSR Pad' } as any },
                                    { id: 'gain-a', type: 'gainNode', dragHandle: '.node-header', position: { x: 830, y: 150 }, data: { type: 'gain', gain: 0, label: 'Gain A' } as any },
                                    { id: 'gain-b', type: 'gainNode', dragHandle: '.node-header', position: { x: 830, y: 320 }, data: { type: 'gain', gain: 0, label: 'Gain B' } as any },
                                    { id: 'pianoroll-birds', type: 'pianoRollNode', dragHandle: '.node-header', position: { x: 40, y: 460 }, data: { type: 'pianoRoll', steps: 32, octaves: 2, baseNote: 72, notes: birdNotes, label: 'Bird Piano Roll' } as any },
                                    { id: 'voice-birds', type: 'voiceNode', dragHandle: '.node-header', position: { x: 320, y: 460 }, data: { type: 'voice', portamento: 0.01, label: 'Bird Voice' } as any },
                                    { id: 'osc-birds', type: 'oscNode', dragHandle: '.node-header', position: { x: 560, y: 610 }, data: { type: 'osc', frequency: 0, waveform: 'sine', detune: 0, label: 'Bird Osc' } as any },
                                    { id: 'adsr-birds', type: 'adsrNode', dragHandle: '.node-header', position: { x: 560, y: 760 }, data: { type: 'adsr', attack: 0.01, decay: 0.12, sustain: 0.08, release: 0.18, label: 'Bird Envelope' } as any },
                                    { id: 'gain-birds', type: 'gainNode', dragHandle: '.node-header', position: { x: 830, y: 650 }, data: { type: 'gain', gain: 0, label: 'Bird Gain' } as any },
                                    { id: 'filter-birds', type: 'filterNode', dragHandle: '.node-header', position: { x: 1070, y: 620 }, data: { type: 'filter', filterType: 'highpass', frequency: 2200, detune: 0, q: 0.75, gain: 0, label: 'Bird Filter' } as any },
                                    { id: 'panner-birds', type: 'pannerNode', dragHandle: '.node-header', position: { x: 1300, y: 620 }, data: { type: 'panner', pan: -0.15, label: 'Bird Pan' } as any },
                                    { id: 'lfo-bird-vibrato', type: 'lfoNode', dragHandle: '.node-header', position: { x: 560, y: 900 }, data: { type: 'lfo', rate: 5.6, depth: 18, waveform: 'sine', label: 'Bird Vibrato LFO' } as any },
                                    { id: 'lfo-pan-birds', type: 'lfoNode', dragHandle: '.node-header', position: { x: 1300, y: 780 }, data: { type: 'lfo', rate: 0.09, depth: 0.35, waveform: 'sine', label: 'Bird Pan LFO' } as any },
                                    { id: 'laugh-seq', type: 'stepSequencerNode', dragHandle: '.node-header', position: { x: 40, y: 1020 }, data: { type: 'stepSequencer', steps: 16, pattern: laughPattern, activeSteps: laughPattern.map((value) => value > 0), label: 'Laugh Sequencer' } as any },
                                    { id: 'noise-laugh', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 320, y: 1020 }, data: { type: 'noiseBurst', noiseType: 'pink', duration: 0.1, gain: 0.22, attack: 0.002, release: 0.12, label: 'Laugh Burst' } as any },
                                    { id: 'filter-laugh', type: 'filterNode', dragHandle: '.node-header', position: { x: 560, y: 1030 }, data: { type: 'filter', filterType: 'bandpass', frequency: 1400, detune: 0, q: 6, gain: 0, label: 'Laugh Filter' } as any },
                                    { id: 'chorus-laugh', type: 'chorusNode', dragHandle: '.node-header', position: { x: 830, y: 1030 }, data: { type: 'chorus', rate: 1.8, depth: 1.4, feedback: 0.07, delay: 11, mix: 0.28, stereo: true, label: 'Laugh Chorus' } as any },
                                    { id: 'gain-laugh', type: 'gainNode', dragHandle: '.node-header', position: { x: 1070, y: 1030 }, data: { type: 'gain', gain: 0.22, label: 'Laugh Gain' } as any },
                                    { id: 'panner-laugh', type: 'pannerNode', dragHandle: '.node-header', position: { x: 1300, y: 1030 }, data: { type: 'panner', pan: 0.18, label: 'Laugh Pan' } as any },
                                    { id: 'lfo-laugh-formant', type: 'lfoNode', dragHandle: '.node-header', position: { x: 560, y: 1180 }, data: { type: 'lfo', rate: 3.2, depth: 420, waveform: 'triangle', label: 'Laugh Formant LFO' } as any },
                                    { id: 'lfo-pan-laugh', type: 'lfoNode', dragHandle: '.node-header', position: { x: 1300, y: 1180 }, data: { type: 'lfo', rate: 0.07, depth: 0.28, waveform: 'sawtooth', label: 'Laugh Pan LFO' } as any },
                                    { id: 'input-ui', type: 'uiTokensNode', dragHandle: '.node-header', position: { x: 40, y: 540 }, data: createUiTokensNodeData() as any },
                                    { id: 'evt-hover', type: 'eventTriggerNode', dragHandle: '.node-header', position: { x: 320, y: 540 }, data: { type: 'eventTrigger', token: 0, mode: 'change', cooldownMs: 120, velocity: 0.52, duration: 0.16, note: 91, trackId: 'hover', label: 'Event Trigger' } as any },
                                    { id: 'noise-accent', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 560, y: 520 }, data: { type: 'noiseBurst', noiseType: 'white', duration: 0.08, gain: 0.2, attack: 0.001, release: 0.06, label: 'Air Accent Burst' } as any },
                                    { id: 'filter-accent', type: 'filterNode', dragHandle: '.node-header', position: { x: 830, y: 500 }, data: { type: 'filter', filterType: 'highpass', frequency: 2600, detune: 0, q: 0.8, gain: 0, label: 'Accent Filter' } as any },
                                    { id: 'gain-accent', type: 'gainNode', dragHandle: '.node-header', position: { x: 1070, y: 500 }, data: { type: 'gain', gain: 0.14, label: 'Accent Gain' } as any },
                                    { id: 'pump-seq', type: 'stepSequencerNode', dragHandle: '.node-header', position: { x: 40, y: 720 }, data: { type: 'stepSequencer', steps: 16, pattern: pumpPattern, activeSteps: pumpPattern.map((value) => value > 0), label: 'Step Sequencer Pump' } as any },
                                    { id: 'noise-pump', type: 'noiseBurstNode', dragHandle: '.node-header', position: { x: 320, y: 740 }, data: { type: 'noiseBurst', noiseType: 'white', duration: 0.05, gain: 0.62, attack: 0.001, release: 0.022, label: 'Noise Burst Pump' } as any },
                                    { id: 'matrix', type: 'matrixMixerNode', dragHandle: '.node-header', position: { x: 1570, y: 520 }, data: { type: 'matrixMixer', inputs: 5, outputs: 4, matrix: [[0.58, 0.24, 0.08, 0.04], [0.54, 0.28, 0.08, 0.06], [0.08, 0.36, 0.14, 0.24], [0.04, 0.18, 0.32, 0.22], [0.02, 0.08, 0.14, 0.28]], label: 'Matrix Mixer' } as any },
                                    { id: 'lfo-phase-a', type: 'lfoNode', dragHandle: '.node-header', position: { x: 1570, y: 140 }, data: { type: 'lfo', rate: 0.012, depth: 0.5, waveform: 'sine', label: 'Phase LFO A' } as any },
                                    { id: 'lfo-phase-b', type: 'lfoNode', dragHandle: '.node-header', position: { x: 1570, y: 280 }, data: { type: 'lfo', rate: 0.018, depth: 0.5, waveform: 'triangle', label: 'Phase LFO B' } as any },
                                    { id: 'math-shift-a', type: 'mathNode', dragHandle: '.node-header', position: { x: 1810, y: 120 }, data: { type: 'math', operation: 'add', a: 0, b: 0.5, c: 0, label: 'Shift A' } as any },
                                    { id: 'math-shift-b', type: 'mathNode', dragHandle: '.node-header', position: { x: 1810, y: 260 }, data: { type: 'math', operation: 'add', a: 0, b: 0.5, c: 0, label: 'Shift B' } as any },
                                    { id: 'clamp-phase-a', type: 'clampNode', dragHandle: '.node-header', position: { x: 2050, y: 120 }, data: { type: 'clamp', mode: 'minmax', value: 0.5, min: 0, max: 1, label: 'Clamp Phase A' } as any },
                                    { id: 'clamp-phase-b', type: 'clampNode', dragHandle: '.node-header', position: { x: 2050, y: 260 }, data: { type: 'clamp', mode: 'minmax', value: 0.5, min: 0, max: 1, label: 'Clamp Phase B' } as any },
                                    { id: 'math-phase-invert', type: 'mathNode', dragHandle: '.node-header', position: { x: 2290, y: 260 }, data: { type: 'math', operation: 'subtract', a: 1, b: 0.5, c: 0, label: 'Invert B' } as any },
                                    { id: 'clamp-phase-invert', type: 'clampNode', dragHandle: '.node-header', position: { x: 2530, y: 260 }, data: { type: 'clamp', mode: 'minmax', value: 0.5, min: 0, max: 1, label: 'Clamp Invert B' } as any },
                                    { id: 'mix-pad-body', type: 'mixNode', dragHandle: '.node-header', position: { x: 2290, y: 70 }, data: { type: 'mix', a: 0.66, b: 0.28, t: 0.5, clamp: true, label: 'Pad Body Mix' } as any },
                                    { id: 'mix-pad-air', type: 'mixNode', dragHandle: '.node-header', position: { x: 2290, y: 150 }, data: { type: 'mix', a: 0.18, b: 0.42, t: 0.5, clamp: true, label: 'Pad Air Mix' } as any },
                                    { id: 'mix-birds', type: 'mixNode', dragHandle: '.node-header', position: { x: 2290, y: 340 }, data: { type: 'mix', a: 0.06, b: 0.24, t: 0.5, clamp: true, label: 'Bird Mix' } as any },
                                    { id: 'mix-laugh', type: 'mixNode', dragHandle: '.node-header', position: { x: 2530, y: 340 }, data: { type: 'mix', a: 0.02, b: 0.18, t: 0.5, clamp: true, label: 'Laugh Mix' } as any },
                                    { id: 'mix-accent', type: 'mixNode', dragHandle: '.node-header', position: { x: 2530, y: 70 }, data: { type: 'mix', a: 0.04, b: 0.16, t: 0.5, clamp: true, label: 'Accent Mix' } as any },
                                    { id: 'lfo-pad-filter', type: 'lfoNode', dragHandle: '.node-header', position: { x: 1810, y: 520 }, data: { type: 'lfo', rate: 0.043, depth: 240, waveform: 'sine', label: 'Pad Filter LFO' } as any },
                                    { id: 'pad-filter', type: 'filterNode', dragHandle: '.node-header', position: { x: 2050, y: 520 }, data: { type: 'filter', filterType: 'lowpass', frequency: 1100, detune: 0, q: 0.82, gain: 0, label: 'Pad Filter' } as any },
                                    { id: 'compressor', type: 'compressorNode', dragHandle: '.node-header', position: { x: 2290, y: 520 }, data: { type: 'compressor', threshold: -18, knee: 20, ratio: 2.4, attack: 0.02, release: 0.3, sidechainStrength: 0.3, label: 'Compressor' } as any },
                                    { id: 'reverb-main', type: 'reverbNode', dragHandle: '.node-header', position: { x: 2050, y: 700 }, data: { type: 'reverb', decay: 5.2, mix: 0.5, label: 'Main Reverb' } as any },
                                    { id: 'delay-haze', type: 'delayNode', dragHandle: '.node-header', position: { x: 2050, y: 890 }, data: { type: 'delay', delayTime: 0.38, feedback: 0.33, label: 'Haze Delay' } as any },
                                    { id: 'haze-filter', type: 'filterNode', dragHandle: '.node-header', position: { x: 2290, y: 890 }, data: { type: 'filter', filterType: 'lowpass', frequency: 2400, detune: 0, q: 0.7, gain: 0, label: 'Haze Filter' } as any },
                                    { id: 'gain-spark', type: 'gainNode', dragHandle: '.node-header', position: { x: 2050, y: 1070 }, data: { type: 'gain', gain: 0.2, label: 'Spark Gain' } as any },
                                    { id: 'reverb-spark', type: 'reverbNode', dragHandle: '.node-header', position: { x: 2290, y: 1070 }, data: { type: 'reverb', decay: 1.8, mix: 0.35, label: 'Spark Reverb' } as any },
                                    { id: 'mixer-main', type: 'mixerNode', dragHandle: '.node-header', position: { x: 2530, y: 760 }, data: { type: 'mixer', inputs: 4, label: 'Final Mixer' } as any },
                                    { id: 'output', type: 'outputNode', dragHandle: '.node-header', position: { x: 2770, y: 760 }, data: { type: 'output', masterGain: 0.5, playing: false, label: 'Output' } as any },
                                ];
                                const edges = [
                                    { id: 'e-t-pr', source: 'transport', target: 'pianoroll', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-pr-v', source: 'pianoroll', target: 'voice', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-v-osc-a', source: 'voice', sourceHandle: 'note', target: 'osc-pad-a', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-v-osc-b', source: 'voice', sourceHandle: 'note', target: 'osc-pad-b', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-v-adsr', source: 'voice', sourceHandle: 'gate', target: 'adsr-pad', targetHandle: 'gate', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-osc-a-gain-a', source: 'osc-pad-a', sourceHandle: 'out', target: 'gain-a', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-osc-b-gain-b', source: 'osc-pad-b', sourceHandle: 'out', target: 'gain-b', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-adsr-gain-a', source: 'adsr-pad', sourceHandle: 'envelope', target: 'gain-a', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-adsr-gain-b', source: 'adsr-pad', sourceHandle: 'envelope', target: 'gain-b', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-gain-a-matrix', source: 'gain-a', sourceHandle: 'out', target: 'matrix', targetHandle: 'in1', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-gain-b-matrix', source: 'gain-b', sourceHandle: 'out', target: 'matrix', targetHandle: 'in2', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-t-birds', source: 'transport', target: 'pianoroll-birds', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-v', source: 'pianoroll-birds', sourceHandle: 'trigger', target: 'voice-birds', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-note', source: 'voice-birds', sourceHandle: 'note', target: 'osc-birds', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-gate', source: 'voice-birds', sourceHandle: 'gate', target: 'adsr-birds', targetHandle: 'gate', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-vibrato', source: 'lfo-bird-vibrato', sourceHandle: 'out', target: 'osc-birds', targetHandle: 'detune', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-audio', source: 'osc-birds', sourceHandle: 'out', target: 'gain-birds', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-birds-env', source: 'adsr-birds', sourceHandle: 'envelope', target: 'gain-birds', targetHandle: 'gain', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-filter', source: 'gain-birds', sourceHandle: 'out', target: 'filter-birds', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-birds-pan', source: 'filter-birds', sourceHandle: 'out', target: 'panner-birds', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-birds-pan-lfo', source: 'lfo-pan-birds', sourceHandle: 'out', target: 'panner-birds', targetHandle: 'pan', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-birds-matrix', source: 'panner-birds', sourceHandle: 'out', target: 'matrix', targetHandle: 'in3', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-t-laugh', source: 'transport', target: 'laugh-seq', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-laugh-trigger', source: 'laugh-seq', sourceHandle: 'trigger', target: 'noise-laugh', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-laugh-filter', source: 'noise-laugh', sourceHandle: 'out', target: 'filter-laugh', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-laugh-formant', source: 'lfo-laugh-formant', sourceHandle: 'out', target: 'filter-laugh', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-laugh-chorus', source: 'filter-laugh', sourceHandle: 'out', target: 'chorus-laugh', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-laugh-gain', source: 'chorus-laugh', sourceHandle: 'out', target: 'gain-laugh', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-laugh-pan', source: 'gain-laugh', sourceHandle: 'out', target: 'panner-laugh', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-laugh-pan-lfo', source: 'lfo-pan-laugh', sourceHandle: 'out', target: 'panner-laugh', targetHandle: 'pan', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-laugh-matrix', source: 'panner-laugh', sourceHandle: 'out', target: 'matrix', targetHandle: 'in4', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-ui-hover-token', source: 'input-ui', sourceHandle: getInputParamHandleId('hoverToken'), target: 'evt-hover', targetHandle: 'token', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-evt-accent', source: 'evt-hover', sourceHandle: 'trigger', target: 'noise-accent', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-accent-filter', source: 'noise-accent', sourceHandle: 'out', target: 'filter-accent', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-accent-gain', source: 'filter-accent', sourceHandle: 'out', target: 'gain-accent', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-accent-matrix', source: 'gain-accent', sourceHandle: 'out', target: 'matrix', targetHandle: 'in5', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-t-pump', source: 'transport', target: 'pump-seq', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-pump-trigger', source: 'pump-seq', sourceHandle: 'trigger', target: 'noise-pump', targetHandle: 'trigger', style: TRIGGER_EDGE_STYLE, animated: true },
                                    { id: 'e-sidechain', source: 'noise-pump', sourceHandle: 'out', target: 'compressor', targetHandle: 'sidechainIn', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-phase-a-shift', source: 'lfo-phase-a', sourceHandle: 'out', target: 'math-shift-a', targetHandle: 'a', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-b-shift', source: 'lfo-phase-b', sourceHandle: 'out', target: 'math-shift-b', targetHandle: 'a', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-shift-a-clamp', source: 'math-shift-a', sourceHandle: 'out', target: 'clamp-phase-a', targetHandle: 'value', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-shift-b-clamp', source: 'math-shift-b', sourceHandle: 'out', target: 'clamp-phase-b', targetHandle: 'value', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-b-invert', source: 'clamp-phase-b', sourceHandle: 'out', target: 'math-phase-invert', targetHandle: 'b', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-invert-clamp', source: 'math-phase-invert', sourceHandle: 'out', target: 'clamp-phase-invert', targetHandle: 'value', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-a-pad-body', source: 'clamp-phase-a', sourceHandle: 'out', target: 'mix-pad-body', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-b-pad-air', source: 'clamp-phase-b', sourceHandle: 'out', target: 'mix-pad-air', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-b-birds', source: 'clamp-phase-b', sourceHandle: 'out', target: 'mix-birds', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-invert-laugh', source: 'clamp-phase-invert', sourceHandle: 'out', target: 'mix-laugh', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-a-accent', source: 'clamp-phase-a', sourceHandle: 'out', target: 'mix-accent', targetHandle: 't', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-00', source: 'mix-pad-body', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:0:0', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-11', source: 'mix-pad-body', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:1:1', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-01', source: 'mix-pad-air', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:0:1', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-10', source: 'mix-pad-air', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:1:0', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-21', source: 'mix-birds', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:2:1', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-23', source: 'mix-birds', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:2:3', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-32', source: 'mix-laugh', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:3:2', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-31', source: 'mix-laugh', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:3:1', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-43', source: 'mix-accent', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:4:3', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-cell-41', source: 'mix-accent', sourceHandle: 'out', target: 'matrix', targetHandle: 'cell:4:1', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-phase-to-sidechain-strength', source: 'clamp-phase-invert', sourceHandle: 'out', target: 'compressor', targetHandle: 'sidechainStrength', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-matrix-filter', source: 'matrix', sourceHandle: 'out1', target: 'pad-filter', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-lfo-filter', source: 'lfo-pad-filter', sourceHandle: 'out', target: 'pad-filter', targetHandle: 'frequency', style: CONTROL_EDGE_STYLE, animated: true },
                                    { id: 'e-filter-comp', source: 'pad-filter', sourceHandle: 'out', target: 'compressor', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-matrix-reverb', source: 'matrix', sourceHandle: 'out2', target: 'reverb-main', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-matrix-haze', source: 'matrix', sourceHandle: 'out3', target: 'delay-haze', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-delay-haze-filter', source: 'delay-haze', sourceHandle: 'out', target: 'haze-filter', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-matrix-spark', source: 'matrix', sourceHandle: 'out4', target: 'gain-spark', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-spark-reverb', source: 'gain-spark', sourceHandle: 'out', target: 'reverb-spark', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-comp-mix', source: 'compressor', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in1', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-reverb-mix', source: 'reverb-main', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in2', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-haze-mix', source: 'haze-filter', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in3', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-spark-mix', source: 'reverb-spark', sourceHandle: 'out', target: 'mixer-main', targetHandle: 'in4', style: AUDIO_EDGE_STYLE, animated: false },
                                    { id: 'e-mix-output', source: 'mixer-main', sourceHandle: 'out', target: 'output', targetHandle: 'in', style: AUDIO_EDGE_STYLE, animated: false },
                                ];
                                useAudioGraphStore.getState().loadGraph(nodes, edges);
                            }}
                            className={templateButtonBase}
                        >
                            <span className="text-sm">🌫️</span>
                            <span>Atmospheric Sidechain</span>
                        </button>

                        <button
                            onClick={() => loadFeedbackTemplate(createMedievalStrategyLongformTemplate())}
                            className={`${templateButtonBase} border-[var(--accent)] text-[var(--accent)] hover:text-[var(--text)]`}
                        >
                            <span className="text-sm">🏰</span>
                            <span>Medieval Strategy Longform</span>
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
                )}
            </aside>

            <section className="ui-stage flex h-full min-w-0 flex-col">
                <div className="ui-topbar flex flex-wrap items-center justify-between gap-3 border-b border-[var(--panel-border)] px-4 py-2">
                    <input
                        ref={patchImportRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportPatch}
                        style={{ display: 'none' }}
                    />
                    <div className="ui-graph-tabs flex items-center gap-2 overflow-x-auto pr-2">
                        {graphs.map((graph) => (
                            <button
                                key={graph.id}
                                className={`${tabBase} ${graph.id === activeGraphId
                                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[inset_0_0_0_1px_rgba(104,165,255,0.35)]'
                                    : 'border-transparent bg-[var(--panel-muted)] text-[var(--text-muted)] hover:border-[var(--panel-border)] hover:text-[var(--text)]'
                                }`}
                                onClick={() => setActiveGraph(graph.id)}
                                title={graph.name}
                            >
                                {graph.name}
                            </button>
                        ))}
                        <button
                            className="h-8 w-8 rounded-full border border-dashed border-[var(--panel-border)] text-[15px] leading-none text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                            onClick={() => createGraph()}
                            title="New graph"
                        >
                            +
                        </button>
                    </div>
                    <div className="ui-topbar-actions flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={togglePalette}
                            className="ui-collapse-button rounded-xl border border-[var(--panel-border)] px-3 py-1 text-[11px] font-semibold text-[var(--text-subtle)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                            title={isPaletteCollapsed ? 'Show palette' : 'Hide palette'}
                            aria-label={isPaletteCollapsed ? 'Expand palette' : 'Collapse palette'}
                        >
                            {isPaletteCollapsed ? '>' : '<'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleInspector}
                            className="ui-collapse-button rounded-xl border border-[var(--panel-border)] px-3 py-1 text-[11px] font-semibold text-[var(--text-subtle)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                            title={isInspectorCollapsed ? 'Show inspector' : 'Hide inspector'}
                            aria-label={isInspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
                        >
                            {isInspectorCollapsed ? '<' : '>'}
                        </button>
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
                            className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={() => void handleCopyPatch()}
                            title="Copy patch JSON"
                        >
                            Copy Patch
                        </button>
                        <button
                            type="button"
                            className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={handleDownloadPatch}
                            title="Download patch JSON"
                        >
                            Download Patch
                        </button>
                        <button
                            type="button"
                            className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            onClick={() => patchImportRef.current?.click()}
                            title="Import patch JSON"
                        >
                            Import Patch
                        </button>
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

                <div className="border-b border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-2">
                    {graphDiagnostics.length === 0 ? (
                        <p className="text-[10px] text-[var(--text-subtle)]">Graph diagnostics: no invalid connections detected.</p>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--danger)]">Graph diagnostics</span>
                            {graphDiagnostics.map((message) => (
                                <span
                                    key={message}
                                    className="rounded border border-[var(--danger)]/35 bg-[var(--danger-soft)] px-2 py-1 text-[10px] text-[var(--danger)]"
                                >
                                    {message}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ui-canvas-stage flex-1 p-3 pt-2">
                    <div
                        ref={canvasRef}
                        className="relative h-full overflow-hidden rounded-[14px] border border-[var(--panel-border)] bg-[var(--canvas-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                    >
                        <button
                            type="button"
                            onClick={handleAutoArrangeNodes}
                            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[16px] text-[var(--text)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            title="Magic clean layout"
                            aria-label="Magic clean layout"
                        >
                            🪄
                        </button>
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
                                        case 'compressorNode': return '#5fcd70';
                                        case 'phaserNode': return '#7a9cff';
                                        case 'flangerNode': return '#7a9cff';
                                        case 'tremoloNode': return '#7a9cff';
                                        case 'eq3Node': return '#7a9cff';
                                        case 'distortionNode': return '#ff7f50';
                                        case 'chorusNode': return '#44ccff';
                                        case 'noiseBurstNode': return '#666666';
                                        case 'waveShaperNode': return '#ff7f50';
                                        case 'convolverNode': return '#8844ff';
                                        case 'analyzerNode': return '#7bd1ff';
                                        case 'pannerNode': return '#44cccc';
                                        case 'panner3dNode': return '#44cccc';
                                        case 'mixerNode': return '#ffaa44';
                                        case 'auxSendNode': return '#ffaa44';
                                        case 'auxReturnNode': return '#ffaa44';
                                        case 'matrixMixerNode': return '#ffaa44';
                                        case 'uiTokensNode': return '#68a5ff';
                                        case 'constantSourceNode': return '#7bd1ff';
                                        case 'mediaStreamNode': return '#7bd1ff';
                                        case 'eventTriggerNode': return '#ffd166';
                                        default: return '#888';
                                    }
                                }}
                                maskColor="var(--minimap-mask)"
                            />
                        </ReactFlow>
                    </div>
                </div>

                <div className="ui-library-panel border-t border-[var(--panel-border)] bg-[var(--panel-muted)]/65">
                    <div className="flex items-center justify-between gap-3 px-4 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-subtle)]">
                                Audio Library
                            </span>
                            <span className="rounded border border-[var(--panel-border)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                                {libraryAssets.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={toggleLibraryPanel}
                            className="ui-collapse-button rounded-xl border border-[var(--panel-border)] px-3 py-1 text-[11px] font-semibold text-[var(--text-subtle)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                            aria-pressed={!isLibraryPanelCollapsed}
                            title={isLibraryPanelCollapsed ? 'Expand audio library' : 'Collapse audio library'}
                        >
                            {isLibraryPanelCollapsed ? '^' : 'v'}
                        </button>
                    </div>

                    {!isLibraryPanelCollapsed && (
                        <div className="px-4 pb-3">
                            <input
                                ref={libraryUploadRef}
                                type="file"
                                accept="audio/*"
                                multiple
                                onChange={handleLibraryUpload}
                                style={{ display: 'none' }}
                            />
                            <div
                                className={`ui-library-dropzone mb-2 rounded-md border border-dashed px-3 py-3 transition ${isLibraryDragOver ? 'is-drag-over' : ''}`}
                                onDragOver={handleLibraryDragOver}
                                onDragLeave={handleLibraryDragLeave}
                                onDrop={handleLibraryDrop}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-[11px] text-[var(--text-subtle)]">
                                        Drag and drop audio files here
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => libraryUploadRef.current?.click()}
                                        className="rounded border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                                    >
                                        Browse Files
                                    </button>
                                </div>
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        value={librarySearch}
                                        onChange={(event) => setLibrarySearch(event.target.value)}
                                        placeholder="Search library files"
                                        aria-label="Search library files"
                                        className="h-8 w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 text-[11px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-soft)]"
                                    />
                                </div>
                            </div>

                            {libraryPanelError && (
                                <div className="mb-2 rounded border border-[var(--danger)]/45 bg-[var(--danger-soft)] px-2 py-1 text-[10px] text-[var(--danger)]">
                                    {libraryPanelError}
                                </div>
                            )}

                            <div className="ui-library-list max-h-[260px] overflow-y-auto rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-3">
                                {filteredLibraryAssets.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-[11px] text-[var(--text-subtle)]">
                                        No audio files found.
                                    </div>
                                ) : (
                                    <div className="ui-library-grid grid grid-cols-[repeat(auto-fill,minmax(118px,1fr))] gap-3">
                                        {filteredLibraryAssets.map((asset) => (
                                            <div key={asset.id} className="ui-library-tile relative rounded-lg px-1 py-1 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLibraryDelete(asset)}
                                                    className="ui-library-delete absolute right-1 top-1 z-10 rounded-full border border-[var(--danger)]/50 bg-[var(--panel-bg)] px-1.5 py-0.5 text-[10px] text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
                                                    title="Delete file from library"
                                                >
                                                    x
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePreviewToggle(asset.id)}
                                                    className="ui-library-icon mx-auto mb-2 flex h-[106px] w-[96px] items-center justify-center rounded-xl border border-[var(--panel-border)]"
                                                    title={previewAssetId === asset.id ? 'Stop preview' : 'Preview audio'}
                                                >
                                                    <span className="ui-library-note-glyph">♪</span>
                                                    <span className="ui-library-play-overlay" aria-hidden="true">
                                                        {previewAssetId === asset.id ? '■' : '▶'}
                                                    </span>
                                                </button>
                                                <div className="truncate px-1 text-[11px] font-semibold text-[var(--text)]" title={asset.name}>
                                                    {asset.name}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-subtle)]">
                                                    {formatBytes(asset.size)} · {formatDuration(asset.durationSec)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <aside className="ui-panel ui-panel-right flex h-full min-h-0 flex-col border-l border-[var(--panel-border)]">
                <div className="ui-panel-header border-b border-[var(--panel-border)] px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--text-subtle)]">
                        Inspect
                    </span>
                    <button
                        type="button"
                        onClick={toggleInspector}
                        className="ui-collapse-button rounded-xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-[11px] font-semibold text-[var(--text-subtle)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                        aria-pressed={!isInspectorCollapsed}
                        title={isInspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
                    >
                        {isInspectorCollapsed ? '<' : '>'}
                    </button>
                </div>
                {isInspectorCollapsed ? (
                    <div className="flex flex-1 items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                        Select a node
                    </div>
                ) : (
                    <Inspector />
                )}
            </aside>
        </div>
    );
};

export const PlaygroundDemo: FC = () => (
    <MidiProvider runtime={playgroundMidiRuntime}>
        <PlaygroundDemoContent />
    </MidiProvider>
);

export default PlaygroundDemo;
