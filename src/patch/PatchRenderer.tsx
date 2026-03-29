import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react';
import { AudioOutProvider, AudioProvider, useAudio, useAudioOut } from '../core';
import { Analyzer } from '../analyzers';
import { clamp, compare, math, mix, switchValue } from '../data';
import { Chorus, Distortion, EQ3, Flanger, Phaser, Reverb, Tremolo } from '../effects';
import {
    MidiCCOutput,
    MidiNoteOutput,
    MidiTransportSync,
    type MidiCCValue,
    type MidiNoteValue,
} from '../midi';
import { ADSR, Compressor, Convolver, Delay, Filter, Gain, Osc, Panner, PresetWaveShaper, StereoPanner, WaveShaper } from '../nodes';
import { AuxReturn, AuxSend, MatrixMixer } from '../routing';
import { EventTrigger, Sequencer, Track } from '../sequencer';
import { ConstantSource, MediaStream, Noise, NoiseBurst, Sampler, TriggeredSampler, useLFO } from '../sources';
import { Envelope, Voice, type VoiceRenderProps } from '../synths';
import { TransportProvider } from '../transport';
import {
    getTransportConnections,
    isAudioConnectionLike,
    migratePatchDocument,
    resolvePatchAssetPath,
} from './document';
import type {
    ImportPatchOptions,
    PatchConnection,
    PatchDocument,
    PatchMidiBindings,
    PatchMidiOutput,
    PatchNode,
    PatchRendererProps,
    PatchProps,
} from './types';

type AnyNodeData = Record<string, unknown> & { type: string; label?: string };
type LfoValues = Record<string, ReturnType<typeof useLFO> | null>;

const AUDIO_NODE_COMPONENTS: Record<string, ComponentType<any>> = {
    osc: Osc,
    gain: Gain,
    filter: Filter,
    delay: Delay,
    compressor: Compressor,
    phaser: Phaser,
    flanger: Flanger,
    tremolo: Tremolo,
    eq3: EQ3,
    reverb: Reverb,
    distortion: Distortion,
    chorus: Chorus,
    noiseBurst: NoiseBurst,
    convolver: Convolver,
    analyzer: Analyzer,
    panner3d: Panner,
    panner: StereoPanner,
    constantSource: ConstantSource,
    mediaStream: MediaStream,
    output: Gain,
    mixer: Gain,
    auxSend: AuxSend,
    auxReturn: AuxReturn,
    matrixMixer: MatrixMixer,
    noise: Noise,
    waveShaper: WaveShaper,
    sampler: Sampler,
};

const DATA_NODE_TYPES = new Set(['math', 'compare', 'mix', 'clamp', 'switch']);
const INPUT_LIKE_NODE_TYPES = new Set(['input', 'uiTokens']);

const EMPTY_MIDI_NOTE_VALUE: MidiNoteValue = {
    gate: false,
    note: null,
    frequency: null,
    velocity: 0,
    channel: null,
    triggerToken: 0,
    activeNotes: [],
    lastEvent: null,
    source: { id: null, name: null },
};

const EMPTY_MIDI_CC_VALUE: MidiCCValue = {
    raw: 0,
    normalized: 0,
    channel: null,
    lastEvent: null,
    source: { id: null, name: null },
};

const LfoContext = React.createContext<LfoValues>({});

interface PatchGraphData {
    nodeById: Map<string, PatchNode>;
    audioConnectionsByTarget: Map<string, PatchConnection[]>;
    controlConnectionsByTarget: Map<string, PatchConnection[]>;
    sidechainConnectionsBySource: Map<string, PatchConnection[]>;
    adsrTargets: Map<string, PatchNode>;
    rootNodes: PatchNode[];
    trackSourcesUsed: Set<string>;
    transportConnectedIds: Set<string>;
}

interface PreviewTrackInfo {
    steps: number;
    pattern: number[];
    note?: number;
}

function asNumber(value: unknown, fallback = 0): number {
    return Number.isFinite(value) ? Number(value) : fallback;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function isDataNodeType(type: string): boolean {
    return DATA_NODE_TYPES.has(type);
}

function isInputLikeNodeType(type: string): boolean {
    return INPUT_LIKE_NODE_TYPES.has(type);
}

function shouldUseFeedbackDelay(node: PatchNode): boolean {
    return node.data.type === 'delay' && asNumber((node.data as AnyNodeData).feedback, 0) > 0;
}

function shouldUseTriggeredSampler(node: PatchNode, controlConnections: PatchConnection[]): boolean {
    return node.data.type === 'sampler' && controlConnections.some((connection) => connection.targetHandle === 'trigger');
}

function shouldUsePresetWaveShaper(node: PatchNode): boolean {
    return node.data.type === 'waveShaper';
}

function getRenderComponent(node: PatchNode, controlConnections: PatchConnection[]): ComponentType<any> | null {
    if (shouldUseFeedbackDelay(node)) return PatchFeedbackDelay;
    if (shouldUseTriggeredSampler(node, controlConnections)) return TriggeredSampler;
    if (shouldUsePresetWaveShaper(node)) return PresetWaveShaper;
    return AUDIO_NODE_COMPONENTS[node.data.type] ?? null;
}

function buildPatchGraphData(patch: PatchDocument): PatchGraphData {
    const nodeById = new Map(patch.nodes.map((node) => [node.id, node] as const));
    const transportConnectedIds = getTransportConnections(patch.connections, nodeById);
    const audioConnections = patch.connections.filter((connection) => isAudioConnectionLike(connection, nodeById));
    const controlConnections = patch.connections.filter((connection) => !isAudioConnectionLike(connection, nodeById));

    const audioConnectionsByTarget = new Map<string, PatchConnection[]>();
    audioConnections.forEach((connection) => {
        const next = audioConnectionsByTarget.get(connection.target) ?? [];
        next.push(connection);
        audioConnectionsByTarget.set(connection.target, next);
    });

    const controlConnectionsByTarget = new Map<string, PatchConnection[]>();
    controlConnections.forEach((connection) => {
        const next = controlConnectionsByTarget.get(connection.target) ?? [];
        next.push(connection);
        controlConnectionsByTarget.set(connection.target, next);
    });

    const sidechainConnectionsBySource = new Map<string, PatchConnection[]>();
    controlConnections
        .filter((connection) => connection.targetHandle === 'sidechainIn')
        .forEach((connection) => {
            const next = sidechainConnectionsBySource.get(connection.source) ?? [];
            next.push(connection);
            sidechainConnectionsBySource.set(connection.source, next);
        });

    const adsrTargets = new Map<string, PatchNode>();
    controlConnections.forEach((connection) => {
        const sourceNode = nodeById.get(connection.source);
        if (sourceNode?.data.type === 'adsr' && connection.targetHandle === 'gain') {
            adsrTargets.set(connection.target, sourceNode);
        }
    });

    const renderableNodes = patch.nodes.filter((node) => Boolean(AUDIO_NODE_COMPONENTS[node.data.type]));
    const nodesWithOutputs = new Set(audioConnections.map((connection) => connection.source));
    const rootNodes = renderableNodes.filter((node) => !nodesWithOutputs.has(node.id));

    const trackSourcesUsed = new Set<string>();
    controlConnections.forEach((connection) => {
        if (connection.targetHandle !== 'trigger' && connection.targetHandle !== 'gate') return;
        const sourceNode = nodeById.get(connection.source);
        if (
            (sourceNode?.data.type === 'stepSequencer' || sourceNode?.data.type === 'pianoRoll')
            && transportConnectedIds.has(sourceNode.id)
        ) {
            trackSourcesUsed.add(sourceNode.id);
        }
    });

    return {
        nodeById,
        audioConnectionsByTarget,
        controlConnectionsByTarget,
        sidechainConnectionsBySource,
        adsrTargets,
        rootNodes,
        trackSourcesUsed,
        transportConnectedIds,
    };
}

const LfoRegistry: React.FC<{ nodes: PatchNode[]; children: ReactNode }> = ({ nodes, children }) => {
    const [values, setValues] = useState<LfoValues>({});

    const register = useCallback((id: string, value: ReturnType<typeof useLFO> | null) => {
        setValues((previous) => {
            if (previous[id] === value) return previous;
            return { ...previous, [id]: value };
        });
    }, []);

    const unregister = useCallback((id: string) => {
        setValues((previous) => {
            if (!(id in previous)) return previous;
            const next = { ...previous };
            delete next[id];
            return next;
        });
    }, []);

    return (
        <LfoContext.Provider value={values}>
            {nodes.map((node) => (
                <LfoInstance key={node.id} node={node} onReady={register} onCleanup={unregister} />
            ))}
            {children}
        </LfoContext.Provider>
    );
};

const LfoInstance: React.FC<{
    node: PatchNode;
    onReady: (id: string, value: ReturnType<typeof useLFO> | null) => void;
    onCleanup: (id: string) => void;
}> = ({ node, onReady, onCleanup }) => {
    const data = node.data as AnyNodeData;
    const lfo = useLFO({
        rate: asNumber(data.rate, 1),
        depth: asNumber(data.depth, 1),
        waveform: (data.waveform as 'sine' | 'triangle' | 'square' | 'sawtooth' | undefined) ?? 'sine',
    });

    useEffect(() => {
        onReady(node.id, lfo);
        return () => onCleanup(node.id);
    }, [lfo, node.id, onCleanup, onReady]);

    return null;
};

function getMidiNoteInputValue(
    nodeId: string,
    bindingsByNodeId: Map<string, MidiNoteValue | MidiCCValue>
): MidiNoteValue {
    const value = bindingsByNodeId.get(nodeId);
    if (!value || !('triggerToken' in value)) return EMPTY_MIDI_NOTE_VALUE;
    return value;
}

function getMidiCCInputValue(
    nodeId: string,
    bindingsByNodeId: Map<string, MidiNoteValue | MidiCCValue>
): MidiCCValue {
    const value = bindingsByNodeId.get(nodeId);
    if (!value || !('normalized' in value)) return EMPTY_MIDI_CC_VALUE;
    return value;
}

function buildTransportProps(
    transportNode: PatchNode | undefined,
    syncBindings: Array<{ node: PatchNode; binding: Record<string, unknown>; metadata: PatchMidiOutput }>
) {
    const data = (transportNode?.data ?? {}) as AnyNodeData;
    const props: Record<string, unknown> = {};

    if (transportNode) {
        props.bpm = asNumber(data.bpm, 120);
        props.beatsPerBar = asNumber(data.beatsPerBar, 4);
        props.beatUnit = asNumber(data.beatUnit, 4);
        props.stepsPerBeat = asNumber(data.stepsPerBeat, 4);
        props.barsPerPhrase = asNumber(data.barsPerPhrase, 4);
        props.swing = asNumber(data.swing, 0);
    }

    const requiresManualMode = syncBindings.some(({ node, binding }) => {
        const nodeData = node.data as AnyNodeData;
        const mode = asString(binding.mode, asString(nodeData.mode, 'transport-master'));
        return mode === 'midi-master';
    });

    if (requiresManualMode) {
        props.mode = 'manual';
    }

    return props;
}

function buildPatchParameterMap(
    patch: PatchDocument,
    propValues: Record<string, unknown>
): Map<string, number> {
    const interfaceByNodeAndParam = new Map(
        patch.interface.inputs.map((input) => [`${input.nodeId}:${input.paramId}`, input] as const)
    );
    const paramsByHandle = new Map<string, number>();

    patch.nodes.forEach((node) => {
        if (!isInputLikeNodeType(node.data.type)) return;
        const params = Array.isArray((node.data as AnyNodeData).params)
            ? ((node.data as AnyNodeData).params as Array<Record<string, unknown>>)
            : [];

        params.forEach((param, index) => {
            const paramId = asString(param.id) || `${node.id}-param-${index + 1}`;
            const handle = `param:${paramId}`;
            const patchInput = interfaceByNodeAndParam.get(`${node.id}:${paramId}`);
            const publicValue = patchInput ? propValues[patchInput.key] : undefined;
            const value = Number.isFinite(publicValue)
                ? Number(publicValue)
                : Number.isFinite(param.value)
                    ? Number(param.value)
                    : Number.isFinite(param.defaultValue)
                        ? Number(param.defaultValue)
                        : 0;
            paramsByHandle.set(`${node.id}:${handle}`, value);
        });
    });

    return paramsByHandle;
}

function buildMidiInputBindingMap<TPatch extends PatchDocument>(
    patch: TPatch,
    midi: PatchMidiBindings<TPatch> | undefined
): Map<string, MidiNoteValue | MidiCCValue> {
    const bindings = new Map<string, MidiNoteValue | MidiCCValue>();
    patch.interface.midiInputs.forEach((item) => {
        const value = midi?.inputs?.[item.key as keyof typeof midi.inputs];
        if (value) {
            bindings.set(item.nodeId, value as MidiNoteValue | MidiCCValue);
        }
    });
    return bindings;
}

function buildMidiOutputBindingList<TPatch extends PatchDocument>(
    patch: TPatch,
    midi: PatchMidiBindings<TPatch> | undefined
) {
    return patch.interface.midiOutputs.flatMap((item) => {
        const binding = midi?.outputs?.[item.key as keyof typeof midi.outputs];
        if (!binding) return [];
        const node = patch.nodes.find((candidate) => candidate.id === item.nodeId);
        if (!node) return [];
        return [{
            node,
            metadata: item,
            binding: binding as Record<string, unknown>,
        }];
    });
}

function buildPublicEventValueMap(
    patch: PatchDocument,
    propValues: Record<string, unknown>
): Map<string, unknown> {
    const eventValues = new Map<string, unknown>();
    patch.interface.events.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(propValues, item.key)) {
            eventValues.set(item.nodeId, propValues[item.key]);
        }
    });
    return eventValues;
}

const RuntimeRenderer: React.FC<{
    patch: PatchDocument;
    graph: PatchGraphData;
    assetRoot?: string;
    propValues: Record<string, unknown>;
    midi?: PatchMidiBindings<PatchDocument>;
}> = ({ patch, graph, assetRoot, propValues, midi }) => {
    const lfoValues = useContext(LfoContext);
    const paramsByHandle = useMemo(() => buildPatchParameterMap(patch, propValues), [patch, propValues]);
    const midiInputBindings = useMemo(() => buildMidiInputBindingMap(patch, midi), [midi, patch]);
    const midiOutputBindings = useMemo(() => buildMidiOutputBindingList(patch, midi), [midi, patch]);
    const publicEventValues = useMemo(() => buildPublicEventValueMap(patch, propValues), [patch, propValues]);
    const trackInfoById = useMemo(() => new Map<string, PreviewTrackInfo>(), []);
    const dataValues = useMemo(() => new Map<string, number>(), [graph]);

    const getSequencerSource = useCallback((nodeId: string) => {
        const connections = graph.controlConnectionsByTarget.get(nodeId) ?? [];
        const triggerConnection = connections.find((connection) => connection.targetHandle === 'trigger' || connection.targetHandle === 'gate');
        if (!triggerConnection) return null;
        const sourceNode = graph.nodeById.get(triggerConnection.source);
        if (!sourceNode) return null;
        if (sourceNode.data.type === 'stepSequencer' || sourceNode.data.type === 'pianoRoll') {
            return graph.transportConnectedIds.has(sourceNode.id) ? sourceNode : null;
        }
        return null;
    }, [graph.controlConnectionsByTarget, graph.nodeById, graph.transportConnectedIds]);

    const getEventTriggerSource = useCallback((nodeId: string) => {
        const connections = graph.controlConnectionsByTarget.get(nodeId) ?? [];
        const triggerConnection = connections.find((connection) => {
            if (connection.targetHandle !== 'trigger' && connection.targetHandle !== 'gate') return false;
            return graph.nodeById.get(connection.source)?.data.type === 'eventTrigger';
        });
        if (!triggerConnection) return null;
        const sourceNode = graph.nodeById.get(triggerConnection.source);
        return sourceNode?.data.type === 'eventTrigger' ? sourceNode : null;
    }, [graph.controlConnectionsByTarget, graph.nodeById]);

    const getMidiNoteTriggerSource = useCallback((nodeId: string) => {
        const connections = graph.controlConnectionsByTarget.get(nodeId) ?? [];
        const triggerConnection = connections.find((connection) => {
            if (connection.targetHandle !== 'trigger' && connection.targetHandle !== 'gate') return false;
            return graph.nodeById.get(connection.source)?.data.type === 'midiNote';
        });
        if (!triggerConnection) return null;
        const sourceNode = graph.nodeById.get(triggerConnection.source);
        return sourceNode?.data.type === 'midiNote' ? sourceNode : null;
    }, [graph.controlConnectionsByTarget, graph.nodeById]);

    const getTrackInfo = useCallback((node: PatchNode): PreviewTrackInfo => {
        if (trackInfoById.has(node.id)) {
            return trackInfoById.get(node.id)!;
        }

        let info: PreviewTrackInfo = { steps: 16, pattern: [] };
        const data = node.data as AnyNodeData;

        if (data.type === 'stepSequencer') {
            const steps = asNumber(data.steps, 16);
            const activeSteps = Array.isArray(data.activeSteps) ? data.activeSteps : Array(steps).fill(false);
            const velocities = Array.isArray(data.pattern) ? data.pattern : Array(steps).fill(0.8);
            info = {
                steps,
                pattern: Array.from({ length: steps }, (_, index) =>
                    activeSteps[index] ? asNumber(velocities[index], 1) : 0
                ),
            };
        } else if (data.type === 'pianoRoll') {
            const steps = asNumber(data.steps, 16);
            const notes = Array.isArray(data.notes) ? data.notes as Array<Record<string, unknown>> : [];
            const pattern = Array.from({ length: steps }, () => 0);
            notes.forEach((note) => {
                const step = asNumber(note.step, -1);
                if (step < 0 || step >= steps) return;
                const velocity = Math.max(0, Math.min(1, asNumber(note.velocity, 0)));
                pattern[step] = Math.max(pattern[step], velocity);
            });
            const pitches = Array.from(new Set(notes.map((note) => asNumber(note.pitch, 60))));
            info = {
                steps,
                pattern,
                note: pitches.length === 1 ? pitches[0] : undefined,
            };
        }

        trackInfoById.set(node.id, info);
        return info;
    }, [trackInfoById]);

    const getNumericSourceValue = (
        sourceNode: PatchNode,
        sourceHandle: string | null | undefined,
        fallback: number,
        visiting: Set<string>
    ): number => {
        const data = sourceNode.data as AnyNodeData;

        if (isInputLikeNodeType(data.type)) {
            return paramsByHandle.get(`${sourceNode.id}:${sourceHandle}`) ?? fallback;
        }
        if (data.type === 'note') {
            return asNumber(data.frequency, fallback);
        }
        if (data.type === 'constantSource') {
            return asNumber(data.offset, fallback);
        }
        if (data.type === 'eventTrigger') {
            const eventFallback = Number.isFinite(data.token) ? Number(data.token) : fallback;
            return asNumber(getEventTriggerTokenValue(sourceNode.id, eventFallback, visiting), eventFallback);
        }
        if (data.type === 'midiNote') {
            const midiValue = getMidiNoteInputValue(sourceNode.id, midiInputBindings);
            switch (sourceHandle) {
                case 'frequency':
                    return midiValue.frequency ?? fallback;
                case 'note':
                    return midiValue.note ?? fallback;
                case 'gate':
                    return midiValue.gate ? 1 : 0;
                case 'velocity':
                    return midiValue.velocity;
                case 'trigger':
                    return asNumber(midiValue.triggerToken, fallback);
                default:
                    return fallback;
            }
        }
        if (data.type === 'midiCC') {
            const midiValue = getMidiCCInputValue(sourceNode.id, midiInputBindings);
            return sourceHandle === 'raw' ? midiValue.raw : midiValue.normalized;
        }
        if (isDataNodeType(data.type)) {
            return getDataValue(sourceNode.id, visiting);
        }

        return fallback;
    };

    const getDataValue = (
        nodeId: string,
        visiting: Set<string> = new Set()
    ): number => {
        if (dataValues.has(nodeId)) {
            return dataValues.get(nodeId)!;
        }

        if (visiting.has(nodeId)) return 0;
        visiting.add(nodeId);

        const node = graph.nodeById.get(nodeId);
        if (!node || !isDataNodeType(node.data.type)) return 0;

        const getHandleValue = (handle: string, fallback: number) => {
            const connections = graph.controlConnectionsByTarget.get(nodeId) ?? [];
            const connection = connections.find((candidate) => candidate.targetHandle === handle);
            if (!connection) return fallback;
            const sourceNode = graph.nodeById.get(connection.source);
            if (!sourceNode) return fallback;
            return getNumericSourceValue(sourceNode, connection.sourceHandle, fallback, visiting);
        };

        const data = node.data as AnyNodeData;
        let result = 0;

        switch (data.type) {
            case 'math':
                result = math(
                    asString(data.operation, 'add') as Parameters<typeof math>[0],
                    getHandleValue('a', asNumber(data.a, 0)),
                    getHandleValue('b', asNumber(data.b, 0)),
                    getHandleValue('c', asNumber(data.c, 0))
                );
                break;
            case 'compare':
                result = compare(
                    asString(data.operation, 'greaterThan') as Parameters<typeof compare>[0],
                    getHandleValue('a', asNumber(data.a, 0)),
                    getHandleValue('b', asNumber(data.b, 0))
                );
                break;
            case 'mix':
                result = mix(
                    getHandleValue('a', asNumber(data.a, 0)),
                    getHandleValue('b', asNumber(data.b, 0)),
                    getHandleValue('t', asNumber(data.t, 0.5)),
                    asBoolean(data.clamp, true)
                );
                break;
            case 'clamp':
                result = clamp(
                    getHandleValue('value', asNumber(data.value, 0)),
                    getHandleValue('min', asNumber(data.min, 0)),
                    getHandleValue('max', asNumber(data.max, 1)),
                    asString(data.mode, 'clip') as Parameters<typeof clamp>[3]
                );
                break;
            case 'switch': {
                const inputs = Math.max(1, asNumber(data.inputs, Array.isArray(data.values) ? data.values.length : 1));
                const values = Array.from({ length: inputs }, (_, index) =>
                    getHandleValue(`in_${index}`, Array.isArray(data.values) ? asNumber(data.values[index], 0) : 0)
                );
                result = switchValue(
                    getHandleValue('index', asNumber(data.selectedIndex, 0)),
                    values,
                    values[0] ?? 0
                );
                break;
            }
            default:
                result = 0;
        }

        dataValues.set(nodeId, result);
        visiting.delete(nodeId);
        return result;
    };

    const getEventTriggerTokenValue = (
        eventTriggerNodeId: string,
        fallback: unknown,
        visiting: Set<string> = new Set()
    ): unknown => {
        if (publicEventValues.has(eventTriggerNodeId)) {
            return publicEventValues.get(eventTriggerNodeId);
        }

        if (visiting.has(eventTriggerNodeId)) {
            return fallback;
        }
        visiting.add(eventTriggerNodeId);

        const connections = graph.controlConnectionsByTarget.get(eventTriggerNodeId) ?? [];
        const tokenConnection = connections.find((candidate) => candidate.targetHandle === 'token');
        if (!tokenConnection) {
            visiting.delete(eventTriggerNodeId);
            return fallback;
        }

        const sourceNode = graph.nodeById.get(tokenConnection.source);
        if (!sourceNode) {
            visiting.delete(eventTriggerNodeId);
            return fallback;
        }

        const value = getNumericSourceValue(
            sourceNode,
            tokenConnection.sourceHandle,
            Number.isFinite(fallback) ? Number(fallback) : 0,
            visiting
        );
        visiting.delete(eventTriggerNodeId);
        return value;
    };

    const renderNodeElement = useCallback((
        node: PatchNode,
        visited: Set<string>,
        voiceContext?: VoiceRenderProps
    ): ReactNode => {
        if (visited.has(node.id)) return null;
        visited.add(node.id);

        const controlConnections = graph.controlConnectionsByTarget.get(node.id) ?? [];
        const Component = getRenderComponent(node, controlConnections);
        if (!Component) return null;

        const voiceConnections = controlConnections.filter(
            (connection) => graph.nodeById.get(connection.source)?.data.type === 'voice'
        );
        const adsrNode = graph.adsrTargets.get(node.id);
        const adsrTrackSource = adsrNode ? getSequencerSource(adsrNode.id) : null;
        const adsrVoiceConnection = adsrNode
            ? (graph.controlConnectionsByTarget.get(adsrNode.id) ?? []).find(
                (connection) => graph.nodeById.get(connection.source)?.data.type === 'voice' && connection.targetHandle === 'gate'
            )
            : null;
        const voiceNode = voiceConnections[0]
            ? graph.nodeById.get(voiceConnections[0].source)
            : adsrVoiceConnection
                ? graph.nodeById.get(adsrVoiceConnection.source)
                : null;

        const renderBase = (context?: VoiceRenderProps) => {
            const incomingAudio = graph.audioConnectionsByTarget.get(node.id) ?? [];
            const children = incomingAudio
                .map((connection) => {
                    const sourceNode = graph.nodeById.get(connection.source);
                    if (!sourceNode) return null;
                    return (
                        <React.Fragment key={connection.id}>
                            {renderNodeElement(sourceNode, new Set(visited), context)}
                        </React.Fragment>
                    );
                })
                .filter(Boolean);

            const props = buildRuntimeProps(node, context, controlConnections, {
                assetRoot,
                graph,
                paramsByHandle,
                lfoValues,
                midiInputBindings,
                getDataValue,
            });

            let element = React.createElement(
                Component,
                { ...props, key: node.id },
                children.length > 0 ? children : undefined
            );

            if (adsrNode) {
                const adsrData = adsrNode.data as AnyNodeData;
                const adsrProps = buildAdsrProps(adsrData, context, Boolean(adsrTrackSource), Boolean(adsrVoiceConnection));
                element = adsrTrackSource
                    ? React.createElement(Envelope, adsrProps, element)
                    : React.createElement(ADSR, adsrProps, element);
            }

            return element;
        };

        let element: ReactNode = voiceNode && !voiceContext
            ? (
                <Voice portamento={asNumber((voiceNode.data as AnyNodeData).portamento, 0)}>
                    {(context) => renderBase(context)}
                </Voice>
            )
            : renderBase(voiceContext);

        const sidechainConnections = graph.sidechainConnectionsBySource.get(node.id) ?? [];
        if (sidechainConnections.length > 0) {
            sidechainConnections.forEach((connection) => {
                element = (
                    <AuxSend busId={`sc-${connection.source}-${connection.target}`} sendGain={1}>
                        {element}
                    </AuxSend>
                );
            });
        }

        const trackSource = getSequencerSource(node.id)
            || (voiceNode ? getSequencerSource(voiceNode.id) : null)
            || adsrTrackSource;

        if (trackSource) {
            const trackInfo = getTrackInfo(trackSource);
            element = (
                <Track id={trackSource.id} steps={trackInfo.steps} pattern={trackInfo.pattern} note={trackInfo.note}>
                    {element}
                </Track>
            );
        }

        const midiTriggerSource = !trackSource
            ? getMidiNoteTriggerSource(node.id)
                || (voiceNode ? getMidiNoteTriggerSource(voiceNode.id) : null)
                || (adsrNode ? getMidiNoteTriggerSource(adsrNode.id) : null)
            : null;

        const eventSource = !trackSource && !midiTriggerSource
            ? getEventTriggerSource(node.id)
                || (voiceNode ? getEventTriggerSource(voiceNode.id) : null)
                || (adsrNode ? getEventTriggerSource(adsrNode.id) : null)
            : null;

        if (midiTriggerSource) {
            const midiValue = getMidiNoteInputValue(midiTriggerSource.id, midiInputBindings);
            element = (
                <EventTrigger token={midiValue.triggerToken} velocity={midiValue.velocity} note={midiValue.note ?? 60}>
                    {element}
                </EventTrigger>
            );
        }

        if (eventSource) {
            const eventData = eventSource.data as AnyNodeData;
            const eventProps: Record<string, unknown> = {
                token: getEventTriggerTokenValue(eventSource.id, eventData.token ?? 0),
            };
            if (asString(eventData.mode, 'change') !== 'change') eventProps.mode = eventData.mode;
            if (asNumber(eventData.cooldownMs, 0) > 0) eventProps.cooldownMs = asNumber(eventData.cooldownMs, 0);
            if (asNumber(eventData.velocity, 1) !== 1) eventProps.velocity = asNumber(eventData.velocity, 1);
            if (asNumber(eventData.duration, 0.1) !== 0.1) eventProps.duration = asNumber(eventData.duration, 0.1);
            if (asNumber(eventData.note, 60) !== 60) eventProps.note = asNumber(eventData.note, 60);
            if (asString(eventData.trackId, 'event') !== 'event') eventProps.trackId = asString(eventData.trackId, 'event');

            element = React.createElement(EventTrigger as ComponentType<any>, eventProps, element);
        }

        return element;
    }, [
        assetRoot,
        getDataValue,
        getEventTriggerSource,
        getEventTriggerTokenValue,
        getMidiNoteTriggerSource,
        getSequencerSource,
        getTrackInfo,
        graph,
        lfoValues,
        midiInputBindings,
        paramsByHandle,
    ]);

    const rootElements = graph.rootNodes
        .map((node) => (
            <React.Fragment key={node.id}>
                {renderNodeElement(node, new Set())}
            </React.Fragment>
        ))
        .filter(Boolean);

    const sequencerSteps = graph.trackSourcesUsed.size > 0
        ? Math.max(...Array.from(graph.trackSourcesUsed).map((id) => getTrackInfo(graph.nodeById.get(id)!).steps))
        : 16;

    const transportNode = patch.nodes.find((node) => node.data.type === 'transport');
    const sequencerBpm = transportNode ? asNumber((transportNode.data as AnyNodeData).bpm, 120) : undefined;

    let content: ReactNode = rootElements.length > 0 ? <>{rootElements}</> : null;
    if (graph.trackSourcesUsed.size > 0) {
        content = (
            <Sequencer steps={sequencerSteps} autoStart bpm={sequencerBpm}>
                {content}
            </Sequencer>
        );
    }

    const midiOutputElements = midiOutputBindings.map(({ node, metadata, binding }) => {
        const data = node.data as AnyNodeData;
        const controls = graph.controlConnectionsByTarget.get(node.id) ?? [];
        const resolveNumber = (handle: string, fallback: number) => {
            const connection = controls.find((candidate) => candidate.targetHandle === handle);
            if (!connection) return fallback;
            const sourceNode = graph.nodeById.get(connection.source);
            if (!sourceNode) return fallback;
            return getNumericSourceValue(sourceNode, connection.sourceHandle, fallback, new Set());
        };

        switch (metadata.kind) {
            case 'midi-note-output': {
                const props = {
                    outputId: asString(binding.outputId, asString(data.outputId, '')) || null,
                    channel: asNumber(binding.channel, asNumber(data.channel, 1)),
                    gate: Boolean(resolveNumber('gate', asNumber(data.gate, 0)) > 0.5),
                    note: resolveNumber('note', asNumber(data.note, 60)),
                    frequency: resolveNumber('frequency', asNumber(data.frequency, 261.63)),
                    velocity: resolveNumber('velocity', asNumber(data.velocity, 1)),
                    triggerToken: resolveNumber('trigger', 0),
                    duration: asNumber(binding.duration, 0.1),
                };
                return <MidiNoteOutput key={node.id} {...props} />;
            }
            case 'midi-cc-output': {
                const props = {
                    outputId: asString(binding.outputId, asString(data.outputId, '')) || null,
                    channel: asNumber(binding.channel, asNumber(data.channel, 1)),
                    cc: asNumber(binding.cc, asNumber(data.cc, 1)),
                    value: resolveNumber('value', asNumber(data.value, 0)),
                    valueFormat: asString(binding.valueFormat, asString(data.valueFormat, 'normalized')) as 'normalized' | 'raw',
                };
                return <MidiCCOutput key={node.id} {...props} />;
            }
            case 'midi-sync-output': {
                const props = {
                    mode: asString(binding.mode, asString(data.mode, 'transport-master')) as 'midi-master' | 'transport-master',
                    inputId: asString(binding.inputId, asString(data.inputId, '')) || null,
                    outputId: asString(binding.outputId, asString(data.outputId, '')) || null,
                    sendStartStop: binding.sendStartStop === undefined ? asBoolean(data.sendStartStop, true) : Boolean(binding.sendStartStop),
                    sendClock: binding.sendClock === undefined ? asBoolean(data.sendClock, true) : Boolean(binding.sendClock),
                };
                return <MidiTransportSync key={node.id} {...props} />;
            }
            default:
                return null;
        }
    }).filter(Boolean);

    return (
        <>
            {content}
            {midiOutputElements}
        </>
    );
};

function buildRuntimeProps(
    node: PatchNode,
    voiceContext: VoiceRenderProps | undefined,
    controlConnections: PatchConnection[],
    context: {
        assetRoot?: string;
        graph: PatchGraphData;
        paramsByHandle: Map<string, number>;
        lfoValues: LfoValues;
        midiInputBindings: Map<string, MidiNoteValue | MidiCCValue>;
        getDataValue: (nodeId: string, visiting?: Set<string>) => number;
    }
): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    const data = node.data as AnyNodeData;
    const voiceConnections = controlConnections.filter(
        (connection) => context.graph.nodeById.get(connection.source)?.data.type === 'voice'
    );

    const resolveControlValue = (
        handle: string,
        options: { baseValue?: number; modulatable?: boolean; numericGate?: boolean }
    ) => {
        const voiceConnection = voiceConnections.find((connection) => connection.targetHandle === handle);
        if (voiceConnection && voiceContext) {
            if (voiceConnection.sourceHandle === 'note') return { value: voiceContext.frequency };
            if (voiceConnection.sourceHandle === 'velocity') return { value: voiceContext.velocity };
            if (voiceConnection.sourceHandle === 'gate') {
                return { value: options.numericGate ? (voiceContext.gate ? 1 : 0) : voiceContext.gate };
            }
        }

        const connectionsForHandle = controlConnections.filter((connection) => connection.targetHandle === handle);
        const noteConnection = connectionsForHandle.find((connection) => context.graph.nodeById.get(connection.source)?.data.type === 'note');
        if (noteConnection) {
            const noteNode = context.graph.nodeById.get(noteConnection.source)?.data as AnyNodeData | undefined;
            if (noteNode?.frequency !== undefined) {
                return { value: asNumber(noteNode.frequency, 0) };
            }
        }

        const dataConnection = connectionsForHandle.find((connection) => {
            const sourceNode = context.graph.nodeById.get(connection.source);
            return sourceNode ? isDataNodeType(sourceNode.data.type) : false;
        });
        const dataValue = dataConnection ? context.getDataValue(dataConnection.source) : undefined;

        const inputConnection = connectionsForHandle.find((connection) => {
            const sourceType = context.graph.nodeById.get(connection.source)?.data.type;
            return sourceType ? isInputLikeNodeType(sourceType) : false;
        });
        const inputValue = inputConnection
            ? context.paramsByHandle.get(`${inputConnection.source}:${inputConnection.sourceHandle}`)
            : undefined;

        const midiNoteConnection = connectionsForHandle.find((connection) => context.graph.nodeById.get(connection.source)?.data.type === 'midiNote');
        const midiNoteValue = midiNoteConnection
            ? getMidiNoteInputValue(midiNoteConnection.source, context.midiInputBindings)
            : null;

        const midiCCConnection = connectionsForHandle.find((connection) => context.graph.nodeById.get(connection.source)?.data.type === 'midiCC');
        const midiCCValue = midiCCConnection
            ? getMidiCCInputValue(midiCCConnection.source, context.midiInputBindings)
            : null;

        const lfoConnection = connectionsForHandle.find((connection) => context.graph.nodeById.get(connection.source)?.data.type === 'lfo');
        const lfoValue = lfoConnection ? context.lfoValues[lfoConnection.source] ?? undefined : undefined;

        if (midiNoteValue) {
            switch (midiNoteConnection?.sourceHandle) {
                case 'frequency':
                    return { value: midiNoteValue.frequency ?? options.baseValue ?? 0 };
                case 'note':
                    return { value: midiNoteValue.note ?? options.baseValue ?? 0 };
                case 'gate':
                    return { value: options.numericGate ? (midiNoteValue.gate ? 1 : 0) : midiNoteValue.gate };
                case 'velocity':
                    return { value: midiNoteValue.velocity };
                default:
                    break;
            }
        }

        if (lfoValue && options.modulatable) {
            return { value: lfoValue, base: dataValue ?? inputValue ?? options.baseValue };
        }

        if (dataValue !== undefined) return { value: dataValue };
        if (inputValue !== undefined) return { value: inputValue };
        if (midiCCValue) return { value: midiCCConnection?.sourceHandle === 'raw' ? midiCCValue.raw : midiCCValue.normalized };
        if (options.baseValue !== undefined) return { value: options.baseValue };
        return {};
    };

    switch (data.type) {
        case 'osc': {
            props.type = asString(data.waveform, 'sine');
            props.autoStart = true;
            const frequency = resolveControlValue('frequency', { baseValue: asNumber(data.frequency, 440), modulatable: true });
            if (frequency.value !== undefined) props.frequency = frequency.value;
            if (frequency.base !== undefined) props.frequencyBase = frequency.base;
            const detune = resolveControlValue('detune', { baseValue: asNumber(data.detune, 0), modulatable: true });
            if (detune.value !== undefined) props.detune = detune.value;
            if (detune.base !== undefined) props.detuneBase = detune.base;
            if (voiceConnections.some((connection) => connection.targetHandle === 'frequency') && voiceContext) {
                props.nodeRef = voiceContext.oscRef;
            }
            break;
        }
        case 'gain': {
            const gain = resolveControlValue('gain', { baseValue: asNumber(data.gain, 1), modulatable: true, numericGate: true });
            if (gain.value !== undefined) props.gain = gain.value;
            if (gain.base !== undefined) props.gainBase = gain.base;
            if (voiceConnections.some((connection) => connection.targetHandle === 'gain') && voiceContext) {
                props.nodeRef = voiceContext.gainRef;
            }
            break;
        }
        case 'output':
            props.gain = asNumber(data.masterGain, 0.5);
            break;
        case 'filter': {
            props.type = asString(data.filterType, 'lowpass');
            const frequency = resolveControlValue('frequency', { baseValue: asNumber(data.frequency, 350), modulatable: true });
            if (frequency.value !== undefined) props.frequency = frequency.value;
            if (frequency.base !== undefined) props.frequencyBase = frequency.base;
            const q = resolveControlValue('q', { baseValue: asNumber(data.q, 1), modulatable: true });
            if (q.value !== undefined) props.Q = q.value;
            if (q.base !== undefined) props.QBase = q.base;
            const detune = resolveControlValue('detune', { baseValue: asNumber(data.detune, 0), modulatable: true });
            if (detune.value !== undefined) props.detune = detune.value;
            if (detune.base !== undefined) props.detuneBase = detune.base;
            const gain = resolveControlValue('gain', { baseValue: asNumber(data.gain, 0), modulatable: true });
            if (gain.value !== undefined) props.gain = gain.value;
            if (gain.base !== undefined) props.gainBase = gain.base;
            if (voiceConnections.some((connection) => connection.targetHandle === 'frequency' || connection.targetHandle === 'q') && voiceContext) {
                props.nodeRef = voiceContext.filterRef;
            }
            break;
        }
        case 'delay':
            props.delayTime = asNumber(data.delayTime, 0);
            props.feedback = asNumber(data.feedback, 0);
            break;
        case 'compressor': {
            ['threshold', 'knee', 'ratio', 'attack', 'release', 'sidechainStrength'].forEach((handle) => {
                const resolved = resolveControlValue(handle, {
                    baseValue: handle === 'sidechainStrength' ? asNumber(data.sidechainStrength, 0.7) : asNumber(data[handle], 0),
                    modulatable: true,
                });
                if (resolved.value !== undefined) {
                    props[handle] = resolved.value;
                }
            });
            const sidechainConnection = controlConnections.find((connection) => connection.targetHandle === 'sidechainIn');
            if (sidechainConnection) {
                props.sidechainBusId = `sc-${sidechainConnection.source}-${sidechainConnection.target}`;
            }
            break;
        }
        case 'phaser':
        case 'flanger':
        case 'tremolo':
        case 'eq3':
        case 'distortion':
        case 'chorus':
        case 'noiseBurst':
        case 'panner3d':
        case 'constantSource':
        case 'auxSend':
        case 'auxReturn': {
            const handleMap: Record<string, string[]> = {
                phaser: ['rate', 'depth', 'feedback', 'baseFrequency', 'stages', 'mix'],
                flanger: ['rate', 'depth', 'feedback', 'delay', 'mix'],
                tremolo: ['rate', 'depth', 'mix'],
                eq3: ['low', 'mid', 'high', 'lowFrequency', 'highFrequency', 'mix'],
                distortion: ['drive', 'level', 'mix', 'tone'],
                chorus: ['rate', 'depth', 'feedback', 'delay', 'mix'],
                noiseBurst: ['duration', 'gain', 'attack', 'release'],
                panner3d: ['positionX', 'positionY', 'positionZ', 'refDistance', 'maxDistance', 'rolloffFactor'],
                constantSource: ['offset'],
                auxSend: ['sendGain'],
                auxReturn: ['gain'],
            };

            handleMap[data.type].forEach((handle) => {
                const resolved = resolveControlValue(handle, { baseValue: asNumber(data[handle], 0), modulatable: true });
                if (resolved.value !== undefined) props[handle] = resolved.value;
                if (resolved.base !== undefined) props[`${handle}Base`] = resolved.base;
            });

            if (data.type === 'tremolo') {
                props.waveform = asString(data.waveform, 'sine');
                props.stereo = asBoolean(data.stereo, false);
            }
            if (data.type === 'distortion') {
                props.type = asString(data.distortionType, 'soft');
            }
            if (data.type === 'chorus') {
                props.stereo = asBoolean(data.stereo, false);
            }
            if (data.type === 'noiseBurst') {
                props.type = asString(data.noiseType, 'white');
            }
            if (data.type === 'panner3d') {
                props.panningModel = asString(data.panningModel, 'HRTF');
                props.distanceModel = asString(data.distanceModel, 'inverse');
            }
            if (data.type === 'constantSource') {
                props.autoStart = true;
            }
            if (data.type === 'auxSend') {
                props.busId = asString(data.busId, 'aux');
                props.tap = asString(data.tap, 'pre');
            }
            if (data.type === 'auxReturn') {
                props.busId = asString(data.busId, 'aux');
            }
            break;
        }
        case 'reverb':
            props.decay = asNumber(data.decay, 2);
            props.mix = asNumber(data.mix, 0.5);
            break;
        case 'waveShaper':
            props.amount = resolveControlValue('amount', { baseValue: asNumber(data.amount, 0) }).value;
            props.preset = asString(data.preset, 'softClip');
            props.oversample = asString(data.oversample, 'none');
            break;
        case 'convolver': {
            const assetPath = resolvePatchAssetPath(asString(data.assetPath, ''), context.assetRoot);
            if (assetPath) props.impulse = assetPath;
            props.normalize = data.normalize !== false;
            break;
        }
        case 'analyzer':
            props.fftSize = asNumber(data.fftSize, 2048);
            props.smoothingTimeConstant = asNumber(data.smoothingTimeConstant, 0.8);
            props.updateRate = asNumber(data.updateRate, 60);
            props.autoUpdate = data.autoUpdate !== false;
            break;
        case 'panner':
            props.pan = asNumber(data.pan, 0);
            break;
        case 'noise':
            props.type = asString(data.noiseType, 'white');
            props.autoStart = true;
            break;
        case 'mediaStream':
            props.requestMic = asBoolean(data.requestMic, false);
            break;
        case 'sampler': {
            const assetPath = resolvePatchAssetPath(asString(data.assetPath, ''), context.assetRoot);
            if (assetPath) props.src = assetPath;
            props.loop = asBoolean(data.loop, false);
            if (asNumber(data.playbackRate, 1) !== 1) props.playbackRate = asNumber(data.playbackRate, 1);
            if (asNumber(data.detune, 0) !== 0) props.detune = asNumber(data.detune, 0);
            const hasTrigger = controlConnections.some((connection) => connection.targetHandle === 'trigger');
            if (voiceConnections.some((connection) => connection.targetHandle === 'trigger') && voiceContext) {
                props.active = voiceContext.gate;
                props.duration = voiceContext.duration;
            }
            if (!hasTrigger) {
                props.autoStart = true;
            }
            break;
        }
        case 'matrixMixer':
            props.inputs = asNumber(data.inputs, 2);
            props.outputs = asNumber(data.outputs, 2);
            props.matrix = Array.isArray(data.matrix) ? data.matrix : [];
            break;
        default:
            break;
    }

    return props;
}

function buildAdsrProps(
    adsrData: AnyNodeData,
    voiceContext: VoiceRenderProps | undefined,
    usesEnvelope: boolean,
    hasVoiceConnection: boolean
): Record<string, unknown> {
    const props: Record<string, unknown> = {
        attack: asNumber(adsrData.attack, 0.01),
        decay: asNumber(adsrData.decay, 0.1),
        sustain: asNumber(adsrData.sustain, 0.8),
        release: asNumber(adsrData.release, 0.2),
    };

    if (!usesEnvelope && hasVoiceConnection && voiceContext) {
        props.trigger = voiceContext.gate;
        props.velocity = voiceContext.velocity;
        props.duration = voiceContext.duration;
    }

    return props;
}

interface PatchFeedbackDelayProps {
    children?: ReactNode;
    delayTime?: number;
    feedback?: number;
    maxDelayTime?: number;
    bypass?: boolean;
}

function PatchFeedbackDelay({
    children,
    delayTime = 0,
    feedback = 0,
    maxDelayTime = 2,
    bypass = false,
}: PatchFeedbackDelayProps) {
    const { context } = useAudio();
    const { outputNode } = useAudioOut();
    const inputRef = useRef<GainNode | null>(null);
    const delayRef = useRef<DelayNode | null>(null);
    const feedbackRef = useRef<GainNode | null>(null);

    useEffect(() => {
        if (!context) return;

        const input = context.createGain();
        const delay = context.createDelay(maxDelayTime);
        const feedbackGain = context.createGain();

        input.connect(delay);
        delay.connect(feedbackGain);
        feedbackGain.connect(delay);

        inputRef.current = input;
        delayRef.current = delay;
        feedbackRef.current = feedbackGain;

        return () => {
            try { input.disconnect(); } catch { /* noop */ }
            try { delay.disconnect(); } catch { /* noop */ }
            try { feedbackGain.disconnect(); } catch { /* noop */ }
            inputRef.current = null;
            delayRef.current = null;
            feedbackRef.current = null;
        };
    }, [context, maxDelayTime]);

    useEffect(() => {
        if (!delayRef.current || !outputNode || bypass) return;
        delayRef.current.connect(outputNode);
        return () => {
            try {
                delayRef.current?.disconnect(outputNode);
            } catch {
                // Ignore disconnect during teardown.
            }
        };
    }, [bypass, outputNode]);

    useEffect(() => {
        if (delayRef.current) {
            delayRef.current.delayTime.value = delayTime;
        }
    }, [delayTime]);

    useEffect(() => {
        if (feedbackRef.current) {
            feedbackRef.current.gain.value = feedback;
        }
    }, [feedback]);

    return (
        <AudioOutProvider node={inputRef.current}>
            {children}
        </AudioOutProvider>
    );
}

/**
 * Render a patch document as a live `@din/react` graph.
 */
export function PatchRenderer<const TPatch extends PatchDocument>({
    patch,
    includeProvider = false,
    assetRoot,
    midi,
    ...rest
}: PatchRendererProps<TPatch>) {
    const migratedPatch = useMemo(() => migratePatchDocument(patch), [patch]);
    const graph = useMemo(() => buildPatchGraphData(migratedPatch), [migratedPatch]);
    const lfoNodes = useMemo(
        () => migratedPatch.nodes.filter((node) => node.data.type === 'lfo'),
        [migratedPatch.nodes]
    );
    const transportNode = useMemo(
        () => migratedPatch.nodes.find((node) => node.data.type === 'transport'),
        [migratedPatch.nodes]
    );
    const midiOutputBindings = useMemo(
        () => buildMidiOutputBindingList(migratedPatch, midi as PatchMidiBindings<PatchDocument> | undefined),
        [midi, migratedPatch]
    );
    const transportBindings = midiOutputBindings.filter(({ metadata }) => metadata.kind === 'midi-sync-output');
    const content = (
        <LfoRegistry nodes={lfoNodes}>
            <RuntimeRenderer
                patch={migratedPatch}
                graph={graph}
                assetRoot={assetRoot}
                propValues={rest as Record<string, unknown>}
                midi={midi as PatchMidiBindings<PatchDocument> | undefined}
            />
        </LfoRegistry>
    );

    if (!includeProvider) {
        return content;
    }

    const transportProps = buildTransportProps(transportNode, transportBindings);
    const needsTransportProvider = Boolean(transportNode) || transportBindings.length > 0;

    return (
        <AudioProvider>
            {needsTransportProvider ? (
                <TransportProvider {...transportProps}>
                    {content}
                </TransportProvider>
            ) : (
                content
            )}
        </AudioProvider>
    );
}

/**
 * Create a reusable React component from a patch document.
 */
export function importPatch<const TPatch extends PatchDocument>(
    patch: TPatch,
    options: ImportPatchOptions = {}
) {
    const migratedPatch = migratePatchDocument(patch);

    const ImportedPatch = (props: PatchProps<TPatch>) => (
        <PatchRenderer
            patch={migratedPatch as TPatch}
            includeProvider={options.includeProvider}
            assetRoot={options.assetRoot}
            {...props}
        />
    );

    const patchName = typeof migratedPatch.name === 'string' && migratedPatch.name.trim() ? migratedPatch.name.trim() : 'Patch';
    ImportedPatch.displayName = `${patchName.replace(/[^a-zA-Z0-9]+/g, '') || 'Patch'}Component`;

    return ImportedPatch;
}
