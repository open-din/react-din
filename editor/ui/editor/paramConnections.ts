import { useEffect, useMemo, useState } from 'react';
import type { Edge, Node } from '@xyflow/react';
import type {
    AudioNodeData,
    ClampNodeData,
    CompareNodeData,
    InputNodeData,
    UiTokensNodeData,
    MathNodeData,
    MixNodeData,
    NoteNodeData,
    SwitchNodeData,
} from './store';
import { useAudioGraphStore } from './store';
import { isDataNodeType, isInputLikeNodeType, resolveInputParamByHandle } from './nodeHelpers';
import { audioEngine } from './AudioEngine';
import { clamp, compare, math, mix, switchValue } from '@din/react/data';

export interface TargetHandleConnectionInfo {
    connected: boolean;
    value: number | null;
}

type LiveConnectionListener = () => void;

const liveConnectionListeners = new Set<LiveConnectionListener>();
let liveConnectionTimerId: number | null = null;

function notifyLiveConnectionListeners() {
    liveConnectionListeners.forEach((listener) => listener());
}

function startLiveConnectionBroadcast() {
    if (liveConnectionTimerId !== null || typeof window === 'undefined') return;

    liveConnectionTimerId = window.setInterval(() => {
        if (liveConnectionListeners.size === 0) {
            stopLiveConnectionBroadcast();
            return;
        }

        notifyLiveConnectionListeners();
    }, 50);
}

function stopLiveConnectionBroadcast() {
    if (liveConnectionTimerId === null) return;
    window.clearInterval(liveConnectionTimerId);
    liveConnectionTimerId = null;
}

function subscribeToLiveConnectionBroadcast(listener: LiveConnectionListener): () => void {
    liveConnectionListeners.add(listener);
    startLiveConnectionBroadcast();
    listener();

    return () => {
        liveConnectionListeners.delete(listener);
        if (liveConnectionListeners.size === 0) {
            stopLiveConnectionBroadcast();
        }
    };
}

function resolveSourceHandleValue(
    sourceNode: Node<AudioNodeData>,
    sourceHandle: string | null | undefined,
    nodeById: Map<string, Node<AudioNodeData>>,
    controlEdgesByTarget: Map<string, Edge[]>,
    visiting: Set<string>,
    cache: Map<string, number>
): number | null {
    const sourceData = sourceNode.data;

    if (isInputLikeNodeType(sourceData.type)) {
        const inputData = sourceData as InputNodeData | UiTokensNodeData;
        return resolveInputParamByHandle(inputData.params, sourceHandle)?.param.value ?? null;
    }

    if (sourceData.type === 'note' && sourceHandle === 'freq') {
        return (sourceData as NoteNodeData).frequency;
    }

    if (sourceData.type === 'constantSource' && sourceHandle === 'out') {
        const value = (sourceData as Record<string, unknown>).offset;
        return typeof value === 'number' ? value : null;
    }

    if (sourceData.type === 'eventTrigger' && sourceHandle === 'trigger') {
        const value = (sourceData as Record<string, unknown>).token;
        return typeof value === 'number' ? value : null;
    }

    if (sourceData.type === 'voice' || sourceData.type === 'midiNote' || sourceData.type === 'midiCC') {
        return sourceHandle ? audioEngine.getSourceOutputValue(sourceNode.id, sourceHandle) : null;
    }

    if (isDataNodeType(sourceData.type)) {
        return evaluateDataNode(sourceNode.id, nodeById, controlEdgesByTarget, visiting, cache);
    }

    if (sourceHandle) {
        const rawValue = (sourceData as Record<string, unknown>)[sourceHandle];
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            return rawValue;
        }
    }

    return null;
}

function evaluateDataNode(
    nodeId: string,
    nodeById: Map<string, Node<AudioNodeData>>,
    controlEdgesByTarget: Map<string, Edge[]>,
    visiting: Set<string>,
    cache: Map<string, number>
): number {
    if (cache.has(nodeId)) return cache.get(nodeId) ?? 0;
    if (visiting.has(nodeId)) return 0;

    const node = nodeById.get(nodeId);
    if (!node || !isDataNodeType(node.data.type)) return 0;

    visiting.add(nodeId);

    const getHandleValue = (handle: string, fallback: number): number => {
        const edge = (controlEdgesByTarget.get(nodeId) ?? []).find((candidate) => candidate.targetHandle === handle);
        if (!edge) return fallback;

        const sourceNode = nodeById.get(edge.source);
        if (!sourceNode) return fallback;

        const value = resolveSourceHandleValue(sourceNode, edge.sourceHandle, nodeById, controlEdgesByTarget, visiting, cache);
        return value ?? fallback;
    };

    let result = 0;

    switch (node.data.type) {
        case 'math': {
            const data = node.data as MathNodeData;
            const a = getHandleValue('a', data.a);
            const b = getHandleValue('b', data.b);
            const c = getHandleValue('c', data.c);
            result = math(data.operation, a, b, c);
            break;
        }
        case 'compare': {
            const data = node.data as CompareNodeData;
            const a = getHandleValue('a', data.a);
            const b = getHandleValue('b', data.b);
            result = compare(data.operation, a, b);
            break;
        }
        case 'mix': {
            const data = node.data as MixNodeData;
            const a = getHandleValue('a', data.a);
            const b = getHandleValue('b', data.b);
            const t = getHandleValue('t', data.t);
            result = mix(a, b, t, data.clamp);
            break;
        }
        case 'clamp': {
            const data = node.data as ClampNodeData;
            const value = getHandleValue('value', data.value);
            const min = getHandleValue('min', data.min);
            const max = getHandleValue('max', data.max);
            result = clamp(value, min, max, data.mode);
            break;
        }
        case 'switch': {
            const data = node.data as SwitchNodeData;
            const inputs = Math.max(1, data.inputs || data.values?.length || 1);
            const values = Array.from({ length: inputs }, (_, index) => {
                const fallback = data.values?.[index] ?? 0;
                return getHandleValue(`in_${index}`, fallback);
            });
            const indexValue = getHandleValue('index', data.selectedIndex);
            result = switchValue(indexValue, values, values[0] ?? 0);
            break;
        }
        default:
            result = 0;
    }

    cache.set(nodeId, result);
    visiting.delete(nodeId);
    return result;
}

export function getTargetHandleConnectionInfo(
    nodes: Node<AudioNodeData>[],
    edges: Edge[],
    nodeId: string,
    targetHandle: string
): TargetHandleConnectionInfo {
    const edge = edges.find((candidate) => candidate.target === nodeId && candidate.targetHandle === targetHandle);
    if (!edge) {
        return { connected: false, value: null };
    }

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const sourceNode = nodeById.get(edge.source);
    if (!sourceNode) {
        return { connected: true, value: null };
    }

    const controlEdgesByTarget = new Map<string, Edge[]>();
    edges.forEach((candidate) => {
        const list = controlEdgesByTarget.get(candidate.target) ?? [];
        list.push(candidate);
        controlEdgesByTarget.set(candidate.target, list);
    });

    const value = resolveSourceHandleValue(
        sourceNode,
        edge.sourceHandle,
        nodeById,
        controlEdgesByTarget,
        new Set<string>(),
        new Map<string, number>()
    );

    return { connected: true, value };
}

export function useTargetHandleConnection(nodeId: string, targetHandle: string): TargetHandleConnectionInfo {
    const nodes = useAudioGraphStore((state) => state.nodes);
    const edges = useAudioGraphStore((state) => state.edges);
    const [, setRevision] = useState(0);
    const hasTargetHandle = targetHandle.trim().length > 0;

    const connectionInfo = useMemo(
        () => (hasTargetHandle ? getTargetHandleConnectionInfo(nodes, edges, nodeId, targetHandle) : { connected: false, value: null }),
        [hasTargetHandle, nodes, edges, nodeId, targetHandle]
    );

    useEffect(() => {
        if (!hasTargetHandle || !connectionInfo.connected) {
            setRevision(0);
            return undefined;
        }

        return subscribeToLiveConnectionBroadcast(() => {
            setRevision((value) => value + 1);
        });
    }, [connectionInfo.connected, hasTargetHandle, nodeId, targetHandle]);

    if (!connectionInfo.connected) {
        return connectionInfo;
    }

    const engineValue = audioEngine.getControlInputValue(nodeId, targetHandle);
    const liveValue = engineValue ?? connectionInfo.value;

    return {
        connected: true,
        value: liveValue,
    };
}

export function formatConnectedValue(
    value: number | null,
    formatter?: (value: number) => string
): string {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return 'Connected';
    }
    return formatter ? formatter(value) : value.toFixed(2);
}
