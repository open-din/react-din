import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    useAudioGraphStore,
    type AudioNodeData,
    type DelayNodeData,
    type ADSRNodeData,
    type AnalyzerNodeData,
    type ChorusNodeData,
    type CompressorNodeData,
    type ConstantSourceNodeData,
    type ConvolverNodeData,
    type DistortionNodeData,
    type EQ3NodeData,
    type EventTriggerNodeData,
    type FilterNodeData,
    type FlangerNodeData,
    type GainNodeData,
    type InputNodeData,
    type UiTokensNodeData,
    type LFONodeData,
    type MediaStreamNodeData,
    type MathNodeData,
    type CompareNodeData,
    type MixNodeData,
    type ClampNodeData,
    type NoiseBurstNodeData,
    type SwitchNodeData,
    type NoiseNodeData,
    type NoteNodeData,
    type OscNodeData,
    type OutputNodeData,
    type Panner3DNodeData,
    type PianoRollNodeData,
    type PhaserNodeData,
    type ReverbNodeData,
    type SamplerNodeData,
    type StepSequencerNodeData,
    type StereoPannerNodeData,
    type TremoloNodeData,
    type AuxSendNodeData,
    type AuxReturnNodeData,
    type MatrixMixerNodeData,
    type WaveShaperNodeData,
    type VoiceNodeData,
    type MidiNoteNodeData,
    type MidiCCNodeData,
    type MidiNoteOutputNodeData,
    type MidiCCOutputNodeData,
    type MidiSyncNodeData
} from './store';
import { type Node, type Edge } from '@xyflow/react';
import { toPascalCase } from './graphUtils';
import {
    ADSR,
    Analyzer,
    AudioOutProvider,
    AudioProvider,
    AuxReturn,
    AuxSend,
    Chorus,
    Compressor,
    ConstantSource,
    Convolver,
    Delay,
    Distortion,
    EQ3,
    Envelope,
    EventTrigger,
    Filter,
    Flanger,
    Gain,
    MatrixMixer,
    MediaStream,
    clamp,
    compare,
    math,
    mix,
    Noise,
    NoiseBurst,
    Osc,
    Panner,
    Phaser,
    PresetWaveShaper,
    Reverb,
    Sampler,
    Sequencer,
    StereoPanner,
    Tremolo,
    TriggeredSampler,
    WaveShaper,
    switchValue,
    Track,
    TransportProvider,
    Voice,
    MidiProvider,
    MidiNoteOutput,
    MidiCCOutput,
    MidiTransportSync,
    useAudio,
    useAudioOut,
    useLFO,
    useMidiNote,
    useMidiCC,
} from '@din/react';
import type { LFOOutput, VoiceRenderProps } from '@din/react';
import {
    getInputParamHandleId,
    getTransportConnections,
    isAudioConnection,
    isAudioNodeType,
    isDataNodeType,
    isInputLikeNodeType,
} from './nodeHelpers';

export const CodeGenerator: React.FC = () => {
    const nodes = useAudioGraphStore((s) => s.nodes);
    const edges = useAudioGraphStore((s) => s.edges);
    const graphName = useAudioGraphStore((s) => {
        const activeGraph = s.graphs.find((graph) => graph.id === s.activeGraphId);
        return activeGraph?.name ?? 'AudioGraph';
    });
    const [includeProvider, setIncludeProvider] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const generatedCode = useMemo(() => {
        return generateCode(nodes, edges, includeProvider, graphName);
    }, [nodes, edges, includeProvider, graphName]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode);
    };

    const handleTogglePreview = useCallback(() => {
        setShowPreview((prev) => !prev);
    }, []);

    return (
        <div className="flex h-full flex-col bg-[var(--panel-bg)] text-[var(--text)]">
            <div className="flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3">
                <h4 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                    Code Generator
                </h4>
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <label className="flex items-center gap-1" title="Wrap in self-contained AudioContext logic">
                        <input
                            type="checkbox"
                            checked={includeProvider}
                            onChange={(e) => setIncludeProvider(e.target.checked)}
                            className="accent-[var(--accent)]"
                        />
                        Include Provider
                    </label>
                    <button
                        onClick={handleTogglePreview}
                        className={`rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                            showPreview
                                ? 'border-[var(--accent)] text-[var(--accent)]'
                                : 'border-[var(--panel-border)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                        }`}
                    >
                        {showPreview ? 'Stop' : 'Test'}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="rounded border border-[var(--panel-border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                        Copy
                    </button>
                </div>
            </div>
            {showPreview && (
                <div className="border-b border-[var(--panel-border)] bg-[var(--panel-muted)]/60">
                    <div className="flex items-center justify-between px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
                        Test Component
                        <span className="text-[9px] font-normal tracking-[0.18em] text-[var(--text-muted)]">
                            Audio Preview
                        </span>
                    </div>
                    <div className="px-4 pb-4">
                        <div className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-[10px] text-[var(--text-muted)]">
                            Preview running. Use your speakers or headphones.
                            <PreviewErrorBoundary>
                                <div className="sr-only">
                                    <PreviewGraph nodes={nodes} edges={edges} includeProvider={includeProvider} />
                                </div>
                            </PreviewErrorBoundary>
                        </div>
                    </div>
                </div>
            )}
            <textarea
                className="flex-1 resize-none bg-transparent p-4 font-mono text-[10px] text-[var(--text)] outline-none"
                value={generatedCode}
                readOnly
                spellCheck={false}
            />
        </div>
    );
};

export function generateCode(
    nodes: Node<AudioNodeData>[],
    edges: Edge[],
    includeProvider: boolean = false,
    graphName: string = 'AudioGraph'
): string {
    const indent = (level: number) => '    '.repeat(level);
    const componentName = toPascalCase(graphName);
    const rootName = `${componentName}Root`;

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const transportConnectedIds = getTransportConnections(edges, nodeById);
    const isAudioEdge = (edge: Edge) => isAudioConnection(edge, nodeById);

    const audioEdges = edges.filter(isAudioEdge);
    const controlEdges = edges.filter((edge) => !isAudioEdge(edge));

    const audioEdgesByTarget = new Map<string, Edge[]>();
    audioEdges.forEach((edge) => {
        const list = audioEdgesByTarget.get(edge.target) ?? [];
        list.push(edge);
        audioEdgesByTarget.set(edge.target, list);
    });

    const controlEdgesByTarget = new Map<string, Edge[]>();
    controlEdges.forEach((edge) => {
        const list = controlEdgesByTarget.get(edge.target) ?? [];
        list.push(edge);
        controlEdgesByTarget.set(edge.target, list);
    });

    const sidechainEdgesBySource = new Map<string, Edge[]>();
    controlEdges
        .filter((edge) => edge.targetHandle === 'sidechainIn')
        .forEach((edge) => {
            const list = sidechainEdgesBySource.get(edge.source) ?? [];
            list.push(edge);
            sidechainEdgesBySource.set(edge.source, list);
        });

    const inputParamInfo = (() => {
        const paramInfoByHandle = new Map<string, ParamInfo>();
        const paramInfoByName = new Map<string, ParamInfo>();
        const usedNames = new Set<string>();
        const inputNodes = nodes.filter((node) => isInputLikeNodeType(node.data.type)) as Array<Node<InputNodeData | UiTokensNodeData>>;

        inputNodes.forEach((node) => {
            const params = (node.data as InputNodeData | UiTokensNodeData).params || [];
            params.forEach((param, index) => {
                const rawName = param.label || param.name || `param${index + 1}`;
                const baseName = toSafeIdentifier(rawName, `param${index + 1}`);
                const name = ensureUniqueName(baseName, usedNames);
                usedNames.add(name);
                const defaultValue = Number.isFinite(param.defaultValue)
                    ? param.defaultValue
                    : Number.isFinite(param.value)
                        ? param.value
                        : 0;

                const info = { name, defaultValue };
                paramInfoByHandle.set(`${node.id}:${getInputParamHandleId(param)}`, info);
                paramInfoByName.set(name, info);
            });
        });

        return { paramInfoByHandle, paramInfoByName };
    })();

    const dataState = (() => {
        const dataVarsById = new Map<string, string>();
        const dataDeclarations: string[] = [];
        const dataImports = new Set<string>();
        const usedNames = new Set<string>();
        const visiting = new Set<string>();

        const getSourceExpression = (edge: Edge): string | null => {
            const sourceNode = nodeById.get(edge.source);
            if (!sourceNode) return null;

            if (isInputLikeNodeType(sourceNode.data.type)) {
                const info = inputParamInfo.paramInfoByHandle.get(`${edge.source}:${edge.sourceHandle}`);
                return info?.name ?? null;
            }

            if (sourceNode.data.type === 'note') {
                const noteData = sourceNode.data as NoteNodeData;
                return Number.isFinite(noteData.frequency) ? formatNumber(noteData.frequency) : '0';
            }

            if (sourceNode.data.type === 'midiNote') {
                const varName = midiNoteVarsById.get(sourceNode.id);
                if (!varName) return null;
                switch (edge.sourceHandle) {
                    case 'frequency':
                        return `${varName}.frequency ?? 0`;
                    case 'note':
                        return `${varName}.note ?? 0`;
                    case 'gate':
                        return `${varName}.gate ? 1 : 0`;
                    case 'velocity':
                        return `${varName}.velocity`;
                    default:
                        return null;
                }
            }

            if (sourceNode.data.type === 'midiCC') {
                const varName = midiCCVarsById.get(sourceNode.id);
                if (!varName) return null;
                if (edge.sourceHandle === 'normalized') return `${varName}.normalized`;
                if (edge.sourceHandle === 'raw') return `${varName}.raw`;
            }

            if (isDataNodeType(sourceNode.data.type)) {
                return getDataVar(edge.source) ?? null;
            }

            return null;
        };

        const getHandleExpression = (nodeId: string, handle: string, fallback: string) => {
            const edgesForTarget = controlEdgesByTarget.get(nodeId) ?? [];
            const edge = edgesForTarget.find((item) => item.targetHandle === handle);
            if (!edge) return fallback;
            const expr = getSourceExpression(edge);
            return expr ?? fallback;
        };

        const buildExpression = (node: Node<AudioNodeData>) => {
            switch (node.data.type) {
                case 'math': {
                    const data = node.data as MathNodeData;
                    const a = getHandleExpression(node.id, 'a', formatNumber(data.a));
                    const b = getHandleExpression(node.id, 'b', formatNumber(data.b));
                    const c = getHandleExpression(node.id, 'c', formatNumber(data.c));
                    dataImports.add('math');
                    return `math(${JSON.stringify(data.operation)}, ${a}, ${b}, ${c})`;
                }
                case 'compare': {
                    const data = node.data as CompareNodeData;
                    const a = getHandleExpression(node.id, 'a', formatNumber(data.a));
                    const b = getHandleExpression(node.id, 'b', formatNumber(data.b));
                    dataImports.add('compare');
                    return `compare(${JSON.stringify(data.operation)}, ${a}, ${b})`;
                }
                case 'mix': {
                    const data = node.data as MixNodeData;
                    const a = getHandleExpression(node.id, 'a', formatNumber(data.a));
                    const b = getHandleExpression(node.id, 'b', formatNumber(data.b));
                    const t = getHandleExpression(node.id, 't', formatNumber(data.t));
                    dataImports.add('mix');
                    return `mix(${a}, ${b}, ${t}, ${data.clamp ? 'true' : 'false'})`;
                }
                case 'clamp': {
                    const data = node.data as ClampNodeData;
                    const value = getHandleExpression(node.id, 'value', formatNumber(data.value));
                    const min = getHandleExpression(node.id, 'min', formatNumber(data.min));
                    const max = getHandleExpression(node.id, 'max', formatNumber(data.max));
                    dataImports.add('clamp');
                    return `clamp(${value}, ${min}, ${max}, ${JSON.stringify(data.mode)})`;
                }
                case 'switch': {
                    const data = node.data as SwitchNodeData;
                    const inputs = Math.max(1, data.inputs || data.values?.length || 1);
                    const values = Array.from({ length: inputs }, (_, index) =>
                        getHandleExpression(node.id, `in_${index}`, formatNumber(data.values?.[index] ?? 0))
                    );
                    const indexValue = getHandleExpression(node.id, 'index', formatNumber(data.selectedIndex));
                    dataImports.add('switchValue');
                    return `switchValue(${indexValue}, [${values.join(', ')}], ${values[0] ?? '0'})`;
                }
                default:
                    return '0';
            }
        };

        const getDataVar = (nodeId: string): string | undefined => {
            if (dataVarsById.has(nodeId)) return dataVarsById.get(nodeId);
            if (visiting.has(nodeId)) return '0';

            const node = nodeById.get(nodeId);
            if (!node || !isDataNodeType(node.data.type)) return undefined;

            visiting.add(nodeId);

            const label = (node.data as { label?: string }).label || node.data.type;
            const baseName = toSafeIdentifier(label, node.data.type);
            const varName = ensureUniqueName(baseName, usedNames);
            usedNames.add(varName);

            const expression = buildExpression(node);
            dataDeclarations.push(`${indent(1)}const ${varName} = ${expression};`);
            dataVarsById.set(nodeId, varName);

            visiting.delete(nodeId);
            return varName;
        };

        return { getDataVar, dataDeclarations, dataImports };
    })();

    const usedParamNames = new Set<string>();
    controlEdges.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source);
        if (!sourceNode || !isInputLikeNodeType(sourceNode.data.type)) return;
        const info = inputParamInfo.paramInfoByHandle.get(`${edge.source}:${edge.sourceHandle}`);
        if (info) {
            usedParamNames.add(info.name);
        }
    });

    const usedParamInfo = Array.from(usedParamNames)
        .map((name) => inputParamInfo.paramInfoByName.get(name))
        .filter((info): info is ParamInfo => !!info);

    const usedLfoIds = new Set<string>();
    controlEdges.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source);
        if (sourceNode?.data.type === 'lfo') {
            usedLfoIds.add(edge.source);
        }
    });

    const lfoVarsById = new Map<string, string>();
    const usedLfoNames = new Set<string>();
    nodes.forEach((node, index) => {
        if (!usedLfoIds.has(node.id)) return;
        const lfoData = node.data as LFONodeData;
        const baseName = toSafeIdentifier(lfoData.label || `lfo${index + 1}`, `lfo${index + 1}`);
        const varName = ensureUniqueName(baseName, usedLfoNames);
        usedLfoNames.add(varName);
        lfoVarsById.set(node.id, varName);
    });

    const midiNoteNodes = nodes.filter((node) => node.data.type === 'midiNote') as Node<MidiNoteNodeData>[];
    const midiCCNodes = nodes.filter((node) => node.data.type === 'midiCC') as Node<MidiCCNodeData>[];
    const midiNoteOutputNodes = nodes.filter((node) => node.data.type === 'midiNoteOutput') as Node<MidiNoteOutputNodeData>[];
    const midiCCOutputNodes = nodes.filter((node) => node.data.type === 'midiCCOutput') as Node<MidiCCOutputNodeData>[];
    const midiSyncNode = nodes.find((node) => node.data.type === 'midiSync') as Node<MidiSyncNodeData> | undefined;
    const hasMidiNodes = midiNoteNodes.length > 0
        || midiCCNodes.length > 0
        || midiNoteOutputNodes.length > 0
        || midiCCOutputNodes.length > 0
        || Boolean(midiSyncNode);
    const effectiveIncludeProvider = includeProvider || hasMidiNodes;

    const midiNoteVarsById = new Map<string, string>();
    const midiCCVarsById = new Map<string, string>();
    const usedMidiVarNames = new Set<string>();

    midiNoteNodes.forEach((node, index) => {
        const baseName = toSafeIdentifier(node.data.label || `midiNote${index + 1}`, `midiNote${index + 1}`);
        const varName = ensureUniqueName(baseName, usedMidiVarNames);
        usedMidiVarNames.add(varName);
        midiNoteVarsById.set(node.id, varName);
    });

    midiCCNodes.forEach((node, index) => {
        const baseName = toSafeIdentifier(node.data.label || `midiCc${index + 1}`, `midiCc${index + 1}`);
        const varName = ensureUniqueName(baseName, usedMidiVarNames);
        usedMidiVarNames.add(varName);
        midiCCVarsById.set(node.id, varName);
    });

    const adsrTargets = new Map<string, Node<ADSRNodeData>>();
    controlEdges.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source);
        if (sourceNode?.data.type === 'adsr' && edge.targetHandle === 'gain') {
            adsrTargets.set(edge.target, sourceNode as Node<ADSRNodeData>);
        }
    });

    const usedImports = new Set<string>();
    const trackSourcesUsed = new Set<string>();
    const trackInfoById = new Map<string, TrackInfo>();
    let usesFeedbackDelay = false;
    const buildContext = {
        controlEdgesByTarget,
        nodeById,
        inputParamInfo,
        lfoVarsById,
        midiNoteVarsById,
        midiCCVarsById,
        getDataVar: dataState.getDataVar,
    };

    const getAudioSources = (nodeId: string) => {
        const edgesForTarget = audioEdgesByTarget.get(nodeId) ?? [];
        return edgesForTarget
            .map((edge) => nodeById.get(edge.source))
            .filter((node): node is Node<AudioNodeData> => !!node);
    };

    const getSequencerSource = (nodeId: string) => {
        const edgesForTarget = controlEdgesByTarget.get(nodeId) ?? [];
        const triggerEdge = edgesForTarget.find((edge) => edge.targetHandle === 'trigger' || edge.targetHandle === 'gate');
        if (!triggerEdge) return null;
        const sourceNode = nodeById.get(triggerEdge.source);
        if (!sourceNode) return null;
        if (sourceNode.data.type === 'stepSequencer' || sourceNode.data.type === 'pianoRoll') {
            return transportConnectedIds.has(sourceNode.id) ? sourceNode : null;
        }
        return null;
    };

    const getEventTriggerSource = (nodeId: string) => {
        const edgesForTarget = controlEdgesByTarget.get(nodeId) ?? [];
        const edge = edgesForTarget.find((item) => {
            if (item.targetHandle !== 'trigger' && item.targetHandle !== 'gate') return false;
            return nodeById.get(item.source)?.data.type === 'eventTrigger';
        });
        if (!edge) return null;
        const sourceNode = nodeById.get(edge.source);
        return sourceNode?.data.type === 'eventTrigger' ? sourceNode as Node<EventTriggerNodeData> : null;
    };

    const getMidiNoteTriggerSource = (nodeId: string) => {
        const edgesForTarget = controlEdgesByTarget.get(nodeId) ?? [];
        const edge = edgesForTarget.find((item) => {
            if (item.targetHandle !== 'trigger' && item.targetHandle !== 'gate') return false;
            return nodeById.get(item.source)?.data.type === 'midiNote';
        });
        if (!edge) return null;
        const sourceNode = nodeById.get(edge.source);
        return sourceNode?.data.type === 'midiNote' ? sourceNode as Node<MidiNoteNodeData> : null;
    };

    const getEventTriggerTokenExpression = (nodeId: string, fallbackValue: number): string => {
        const edgesForTarget = controlEdgesByTarget.get(nodeId) ?? [];
        const tokenEdge = edgesForTarget.find((edge) => edge.targetHandle === 'token');
        if (!tokenEdge) return formatNumber(fallbackValue);

        const sourceNode = nodeById.get(tokenEdge.source);
        if (!sourceNode) return formatNumber(fallbackValue);

        if (isInputLikeNodeType(sourceNode.data.type)) {
            const info = inputParamInfo.paramInfoByHandle.get(`${tokenEdge.source}:${tokenEdge.sourceHandle}`);
            return info?.name ?? formatNumber(fallbackValue);
        }

        if (sourceNode.data.type === 'note') {
            const noteData = sourceNode.data as NoteNodeData;
            return Number.isFinite(noteData.frequency) ? formatNumber(noteData.frequency) : formatNumber(fallbackValue);
        }

        if (isDataNodeType(sourceNode.data.type)) {
            return dataState.getDataVar(tokenEdge.source) ?? formatNumber(fallbackValue);
        }

        if (sourceNode.data.type === 'constantSource') {
            const sourceData = sourceNode.data as ConstantSourceNodeData;
            return formatNumber(sourceData.offset);
        }

        if (sourceNode.data.type === 'eventTrigger') {
            const triggerData = sourceNode.data as EventTriggerNodeData;
            return formatNumber(triggerData.token);
        }

        return formatNumber(fallbackValue);
    };

    const getControlExpression = (nodeId: string, handle: string, fallback: string): string => {
        const edge = (controlEdgesByTarget.get(nodeId) ?? []).find((item) => item.targetHandle === handle);
        if (!edge) return fallback;
        const sourceNode = nodeById.get(edge.source);
        if (!sourceNode) return fallback;

        if (isInputLikeNodeType(sourceNode.data.type)) {
            return inputParamInfo.paramInfoByHandle.get(`${edge.source}:${edge.sourceHandle}`)?.name ?? fallback;
        }

        if (sourceNode.data.type === 'note') {
            const noteData = sourceNode.data as NoteNodeData;
            return Number.isFinite(noteData.frequency) ? formatNumber(noteData.frequency) : fallback;
        }

        if (sourceNode.data.type === 'constantSource') {
            return formatNumber((sourceNode.data as ConstantSourceNodeData).offset);
        }

        if (sourceNode.data.type === 'eventTrigger') {
            const triggerData = sourceNode.data as EventTriggerNodeData;
            return edge.sourceHandle === 'trigger' ? formatNumber(triggerData.token) : fallback;
        }

        if (sourceNode.data.type === 'midiNote') {
            const varName = midiNoteVarsById.get(sourceNode.id);
            if (!varName) return fallback;
            switch (edge.sourceHandle) {
                case 'trigger':
                    return `${varName}.triggerToken`;
                case 'frequency':
                    return `${varName}.frequency ?? ${fallback}`;
                case 'note':
                    return `${varName}.note ?? ${fallback}`;
                case 'gate':
                    return `${varName}.gate`;
                case 'velocity':
                    return `${varName}.velocity`;
                default:
                    return fallback;
            }
        }

        if (sourceNode.data.type === 'midiCC') {
            const varName = midiCCVarsById.get(sourceNode.id);
            if (!varName) return fallback;
            return edge.sourceHandle === 'raw' ? `${varName}.raw` : `${varName}.normalized`;
        }

        if (sourceNode.data.type === 'lfo') {
            return lfoVarsById.get(sourceNode.id) ?? fallback;
        }

        if (isDataNodeType(sourceNode.data.type)) {
            return dataState.getDataVar(sourceNode.id) ?? fallback;
        }

        return fallback;
    };

    const getTrackInfo = (node: Node<AudioNodeData>): TrackInfo => {
        if (trackInfoById.has(node.id)) {
            return trackInfoById.get(node.id)!;
        }

        let info: TrackInfo = { steps: 16, pattern: '[]' };
        if (node.data.type === 'stepSequencer') {
            const seq = node.data as StepSequencerNodeData;
            const steps = seq.steps || 16;
            const activeSteps = seq.activeSteps || Array(steps).fill(false);
            const velocities = seq.pattern || Array(steps).fill(0.8);
            const pattern = activeSteps.map((on, i) => (on ? (velocities[i] ?? 1) : 0));
            info = {
                steps,
                pattern: `[${pattern.map(formatNumber).join(', ')}]`,
            };
        } else if (node.data.type === 'pianoRoll') {
            const piano = node.data as PianoRollNodeData;
            const steps = piano.steps || 16;
            const notes = piano.notes || [];
            const pattern = Array.from({ length: steps }, () => 0);
            notes.forEach((note) => {
                const velocity = Math.max(0, Math.min(1, note.velocity ?? 0));
                pattern[note.step] = Math.max(pattern[note.step], velocity);
            });
            const pitches = Array.from(new Set(notes.map((note) => note.pitch)));
            info = {
                steps,
                pattern: `[${pattern.map(formatNumber).join(', ')}]`,
                note: pitches.length === 1 ? pitches[0] : undefined,
            };
        }

        trackInfoById.set(node.id, info);
        return info;
    };

    const renderNode = (node: Node<AudioNodeData>, level: number, visited: Set<string> = new Set()): string => {
        if (visited.has(node.id)) return '';
        visited.add(node.id);

        const indentation = indent(level);
        const controlEdges = controlEdgesByTarget.get(node.id) ?? [];
        const componentName = getGeneratedComponentName(node, controlEdges);
        if (!componentName) return '';

        const importedComponentName = getAudioComponentName(node.data.type);
        if (componentName === 'FeedbackDelay') {
            usesFeedbackDelay = true;
        } else if (componentName === 'TriggeredSampler' || componentName === 'PresetWaveShaper') {
            usedImports.add(componentName);
        } else if (importedComponentName) {
            usedImports.add(importedComponentName);
        }

        const directVoiceEdges = (controlEdgesByTarget.get(node.id) ?? []).filter(
            (edge) => nodeById.get(edge.source)?.data.type === 'voice'
        );
        const adsrNode = adsrTargets.get(node.id);
        const adsrTrackSource = adsrNode ? getSequencerSource(adsrNode.id) : null;
        const adsrVoiceEdge = adsrNode
            ? (controlEdgesByTarget.get(adsrNode.id) ?? []).find(
                (edge) => nodeById.get(edge.source)?.data.type === 'voice' && edge.targetHandle === 'gate'
            )
            : null;

        const voiceNode = directVoiceEdges[0]
            ? nodeById.get(directVoiceEdges[0].source)
            : adsrVoiceEdge
                ? nodeById.get(adsrVoiceEdge.source)
                : null;

        const voiceVars = new Set<string>();
        const props = buildNodeProps(node, directVoiceEdges, voiceVars, buildContext);

        const sources = getAudioSources(node.id);
        const content = sources
            .map((source) => renderNode(source, level + 1, new Set(visited)))
            .filter(Boolean)
            .join('\n');

        let nodeJsx = '';
        const propsString = props.length ? ' ' + props.join(' ') : '';
        if (content) {
            nodeJsx = `${indentation}<${componentName}${propsString}>\n${content}\n${indentation}</${componentName}>`;
        } else {
            nodeJsx = `${indentation}<${componentName}${propsString} />`;
        }

        const sidechainEdges = sidechainEdgesBySource.get(node.id) ?? [];
        if (sidechainEdges.length > 0) {
            sidechainEdges.forEach((edge) => {
                const busId = `sc-${edge.source}-${edge.target}`;
                usedImports.add('AuxSend');
                nodeJsx = `${indentation}<AuxSend busId=${JSON.stringify(busId)} sendGain={1}>\n${indentLines(nodeJsx, 1, indent)}\n${indentation}</AuxSend>`;
            });
        }

        if (adsrNode) {
            const adsrData = adsrNode.data as ADSRNodeData;
            const adsrProps = buildAdsrProps(adsrData);
            const useEnvelope = !!adsrTrackSource;
            const adsrComponent = useEnvelope ? 'Envelope' : 'ADSR';

            usedImports.add(adsrComponent);

            if (!useEnvelope) {
                if (adsrVoiceEdge) {
                    voiceVars.add('gate');
                    voiceVars.add('velocity');
                    voiceVars.add('duration');
                    adsrProps.push('trigger={gate}');
                    adsrProps.push('velocity={velocity}');
                    adsrProps.push('duration={duration}');
                }
            }

            const adsrPropsString = adsrProps.length ? ' ' + adsrProps.join(' ') : '';
            nodeJsx = `${indentation}<${adsrComponent}${adsrPropsString}>\n${indentLines(nodeJsx, 1, indent)}\n${indentation}</${adsrComponent}>`;

            if (adsrTrackSource) {
                trackSourcesUsed.add(adsrTrackSource.id);
            }
        }

        if (voiceNode) {
            const voiceData = voiceNode.data as VoiceNodeData;
            const voiceProps: string[] = [];
            if (voiceData.portamento > 0) {
                voiceProps.push(`portamento={${formatNumber(voiceData.portamento)}}`);
            }
            usedImports.add('Voice');

            const renderArgs = Array.from(voiceVars);
            const renderSignature = renderArgs.length ? `{(${renderArgs.join(', ')}) => (` : '{() => (';
            nodeJsx = `${indentation}<Voice${voiceProps.length ? ' ' + voiceProps.join(' ') : ''}>\n` +
                `${indentation}  ${renderSignature}\n` +
                `${indentLines(nodeJsx, 2, indent)}\n` +
                `${indentation}  )}\n` +
                `${indentation}</Voice>`;

            const voiceTrackSource = getSequencerSource(voiceNode.id);
            if (voiceTrackSource) {
                trackSourcesUsed.add(voiceTrackSource.id);
            }
        }

        const directTrackSource = getSequencerSource(node.id);
        const trackSource = directTrackSource || (voiceNode ? getSequencerSource(voiceNode.id) : null) || adsrTrackSource;
        if (trackSource) {
            const trackInfo = getTrackInfo(trackSource);
            const trackProps = [
                `id=${JSON.stringify(trackSource.id)}`,
                `steps={${trackInfo.steps}}`,
                `pattern={${trackInfo.pattern}}`,
            ];
            if (trackInfo.note !== undefined) {
                trackProps.push(`note={${trackInfo.note}}`);
            }
            usedImports.add('Track');
            trackSourcesUsed.add(trackSource.id);
            nodeJsx = `${indentation}<Track ${trackProps.join(' ')}>\n${indentLines(nodeJsx, 1, indent)}\n${indentation}</Track>`;
        }

        const midiNoteTriggerSource = !trackSource
            ? getMidiNoteTriggerSource(node.id)
                || (voiceNode ? getMidiNoteTriggerSource(voiceNode.id) : null)
                || (adsrNode ? getMidiNoteTriggerSource(adsrNode.id) : null)
            : null;

        const eventSource = !trackSource && !midiNoteTriggerSource
            ? getEventTriggerSource(node.id)
                || (voiceNode ? getEventTriggerSource(voiceNode.id) : null)
                || (adsrNode ? getEventTriggerSource(adsrNode.id) : null)
            : null;

        if (midiNoteTriggerSource) {
            const midiVar = midiNoteVarsById.get(midiNoteTriggerSource.id);
            if (midiVar) {
                usedImports.add('EventTrigger');
                nodeJsx = `${indentation}<EventTrigger token={${midiVar}.triggerToken} velocity={${midiVar}.velocity} note={${midiVar}.note ?? 60}>\n${indentLines(nodeJsx, 1, indent)}\n${indentation}</EventTrigger>`;
            }
        }

        if (eventSource) {
            const triggerData = eventSource.data as EventTriggerNodeData;
            const tokenExpression = getEventTriggerTokenExpression(eventSource.id, triggerData.token);
            const eventProps = [
                `token={${tokenExpression}}`,
            ];
            if (triggerData.mode !== 'change') eventProps.push(`mode=${JSON.stringify(triggerData.mode)}`);
            if (triggerData.cooldownMs > 0) eventProps.push(`cooldownMs={${formatNumber(triggerData.cooldownMs)}}`);
            if (triggerData.velocity !== 1) eventProps.push(`velocity={${formatNumber(triggerData.velocity)}}`);
            if (triggerData.duration !== 0.1) eventProps.push(`duration={${formatNumber(triggerData.duration)}}`);
            if (triggerData.note !== 60) eventProps.push(`note={${formatNumber(triggerData.note)}}`);
            if (triggerData.trackId && triggerData.trackId !== 'event') eventProps.push(`trackId=${JSON.stringify(triggerData.trackId)}`);

            usedImports.add('EventTrigger');
            nodeJsx = `${indentation}<EventTrigger ${eventProps.join(' ')}>\n${indentLines(nodeJsx, 1, indent)}\n${indentation}</EventTrigger>`;
        }

        return nodeJsx;
    };

    const midiHookDeclarations: string[] = [];

    midiNoteNodes.forEach((node) => {
        const varName = midiNoteVarsById.get(node.id);
        if (!varName) return;
        usedImports.add('useMidiNote');
        const options: string[] = [];
        if (node.data.inputId !== 'default') options.push(`inputId: ${JSON.stringify(node.data.inputId)}`);
        if (node.data.channel !== 'all') options.push(`channel: ${formatNumber(node.data.channel)}`);
        if (node.data.noteMode === 'single') {
            options.push(`note: ${formatNumber(node.data.note)}`);
        } else if (node.data.noteMode === 'range') {
            options.push(`note: [${formatNumber(node.data.noteMin)}, ${formatNumber(node.data.noteMax)}]`);
        }
        midiHookDeclarations.push(`${indent(1)}const ${varName} = useMidiNote(${options.length ? `{ ${options.join(', ')} }` : ''});`);
    });

    midiCCNodes.forEach((node) => {
        const varName = midiCCVarsById.get(node.id);
        if (!varName) return;
        usedImports.add('useMidiCC');
        const options = [
            `cc: ${formatNumber(node.data.cc)}`,
        ];
        if (node.data.inputId !== 'default') options.push(`inputId: ${JSON.stringify(node.data.inputId)}`);
        if (node.data.channel !== 'all') options.push(`channel: ${formatNumber(node.data.channel)}`);
        midiHookDeclarations.push(`${indent(1)}const ${varName} = useMidiCC({ ${options.join(', ')} });`);
    });

    const midiOutputElements = midiNoteOutputNodes.map((node) => {
        usedImports.add('MidiNoteOutput');
        const props = [
            `channel={${formatNumber(node.data.channel)}}`,
            `note={${getControlExpression(node.id, 'note', formatNumber(node.data.note))}}`,
            `frequency={${getControlExpression(node.id, 'frequency', formatNumber(node.data.frequency))}}`,
            `velocity={${getControlExpression(node.id, 'velocity', formatNumber(node.data.velocity))}}`,
            `gate={${getControlExpression(node.id, 'gate', node.data.gate > 0.5 ? 'true' : 'false')}}`,
        ];
        if (node.data.outputId) props.push(`outputId=${JSON.stringify(node.data.outputId)}`);
        const triggerExpression = getControlExpression(node.id, 'trigger', '');
        if (triggerExpression) {
            props.push(`triggerToken={${triggerExpression}}`);
        }
        return `${indent(2)}<MidiNoteOutput ${props.join(' ')} />`;
    });

    const midiCCOutputElements = midiCCOutputNodes.map((node) => {
        usedImports.add('MidiCCOutput');
        const props = [
            `channel={${formatNumber(node.data.channel)}}`,
            `cc={${formatNumber(node.data.cc)}}`,
            `value={${getControlExpression(node.id, 'value', formatNumber(node.data.value))}}`,
        ];
        if (node.data.outputId) props.push(`outputId=${JSON.stringify(node.data.outputId)}`);
        if (node.data.valueFormat !== 'normalized') {
            props.push(`valueFormat=${JSON.stringify(node.data.valueFormat)}`);
        }
        return `${indent(2)}<MidiCCOutput ${props.join(' ')} />`;
    });

    const midiSyncElement = midiSyncNode
        ? `${indent(2)}<MidiTransportSync mode=${JSON.stringify(midiSyncNode.data.mode)}${midiSyncNode.data.inputId ? ` inputId=${JSON.stringify(midiSyncNode.data.inputId)}` : ''}${midiSyncNode.data.outputId ? ` outputId=${JSON.stringify(midiSyncNode.data.outputId)}` : ''}${!midiSyncNode.data.sendStartStop ? ' sendStartStop={false}' : ''}${!midiSyncNode.data.sendClock ? ' sendClock={false}' : ''} />`
        : '';

    if (midiSyncElement) {
        usedImports.add('MidiTransportSync');
    }

    const renderableNodes = nodes.filter((node) => !!getAudioComponentName(node.data.type));
    const nodesWithOutputs = new Set(audioEdges.map((edge) => edge.source));
    const rootNodes = renderableNodes.filter((node) => !nodesWithOutputs.has(node.id));

    const transportNode = nodes.find((node) => node.data.type === 'transport');

    const renderGraphContent = (level: number) => {
        const extraElements = [...midiOutputElements, ...midiCCOutputElements, ...(midiSyncElement ? [midiSyncElement] : [])].join('\n');
        let content = `${indent(level)}return (\n`;

        const nodesContent = rootNodes
            .map((root) => renderNode(root, level + 1, new Set()))
            .filter(Boolean)
            .join('\n');

        const trimmedNodesContent = nodesContent.trim();
        const fallbackContent = `${indent(level + 1)}null`;

        const sequencerSteps = trackSourcesUsed.size > 0
            ? Math.max(...Array.from(trackSourcesUsed).map((id) => getTrackInfo(nodeById.get(id)!).steps))
            : 16;

        const sequencerProps: string[] = [];
        if (trackSourcesUsed.size > 0) {
            sequencerProps.push(`steps={${sequencerSteps}}`);
            if (transportNode?.data && 'bpm' in transportNode.data && transportNode.data.bpm) {
                const bpm = (transportNode.data as any).bpm;
                sequencerProps.push(`bpm={${formatNumber(bpm)}}`);
            }
            sequencerProps.push('autoStart');
        }

        if (trackSourcesUsed.size > 0) {
            content += `${indent(level + 1)}<>\n`;
            content += `${indent(level + 2)}<Sequencer ${sequencerProps.join(' ')}>\n`;
            if (trimmedNodesContent) {
                content += `${indentLines(nodesContent, 2, indent)}\n`;
            } else {
                content += `${indentLines(fallbackContent, 2, indent)}\n`;
            }
            content += `${indent(level + 2)}</Sequencer>\n`;
            if (extraElements) {
                content += `${extraElements}\n`;
            }
            content += `${indent(level + 1)}</>\n`;
        } else if (trimmedNodesContent || extraElements) {
            content += `${indent(level + 1)}<>\n`;
            if (trimmedNodesContent) {
                content += `${indentLines(nodesContent, 1, indent)}\n`;
            }
            if (extraElements) {
                content += `${extraElements}\n`;
            }
            content += `${indent(level + 1)}</>\n`;
        } else {
            content += `${fallbackContent}\n`;
        }

        content += `${indent(level)});\n`;
        return content;
    };

    const graphContent = renderGraphContent(1);

    dataState.dataImports.forEach((value) => usedImports.add(value));

    if (effectiveIncludeProvider) {
        usedImports.add('AudioProvider');
        if (transportNode) {
            usedImports.add('TransportProvider');
        }
    }

    if (hasMidiNodes) {
        usedImports.add('MidiProvider');
    }

    if (trackSourcesUsed.size > 0) {
        usedImports.add('Sequencer');
    }

    if (lfoVarsById.size > 0) {
        usedImports.add('useLFO');
    }

    if (usesFeedbackDelay) {
        usedImports.add('AudioOutProvider');
        usedImports.add('useAudio');
        usedImports.add('useAudioOut');
    }

    const importList = Array.from(usedImports).sort();
    const usesReactHooks = usesFeedbackDelay;
    const needsReactNodeType = usesReactHooks;
    let code = '';
    if (usesReactHooks) {
        code = `import { useEffect, useRef, useState, type ReactNode } from 'react';\n`;
    } else if (needsReactNodeType) {
        code = `import { type ReactNode } from 'react';\n`;
    }
    code += importList.length > 0
        ? `import { ${importList.join(', ')} } from '@din/react';\n\n`
        : '\n';

    if (usedParamInfo.length > 0) {
        code += `export interface ${componentName}Props {\n`;
        usedParamInfo.forEach((param) => {
            code += `${indent(1)}${param.name}?: number;\n`;
        });
        code += `}\n\n`;
    }

    if (usesFeedbackDelay) {
        code += `${generateFeedbackDelayHelper()}\n\n`;
    }

    const lfoDeclarations = Array.from(lfoVarsById.entries()).map(([id, varName]) => {
        const data = nodeById.get(id)?.data as LFONodeData | undefined;
        if (!data) return '';
        return `${indent(1)}const ${varName} = useLFO({ rate: ${formatNumber(data.rate)}, depth: ${formatNumber(data.depth)}, waveform: ${JSON.stringify(data.waveform)} });`;
    }).filter(Boolean);

    const propsType = usedParamInfo.length > 0 ? `${componentName}Props` : '';
    const propsParam = propsType ? `props: ${propsType}` : '';
    const hasProps = Boolean(propsType);

    if (effectiveIncludeProvider) {
        code += `export const ${rootName} = (${propsParam || ''}) => {\n`;
        code += `${indent(1)}return (\n`;
        if (hasMidiNodes) {
            code += `${indent(2)}<MidiProvider>\n`;
        }
        code += `${indent(hasMidiNodes ? 3 : 2)}<AudioProvider>\n`;

        if (transportNode) {
            const tData = transportNode.data as any;
            const transportProps: string[] = [];
            if (tData.bpm) transportProps.push(`bpm={${formatNumber(tData.bpm)}}`);
            if (tData.beatsPerBar) transportProps.push(`beatsPerBar={${formatNumber(tData.beatsPerBar)}}`);
            if (tData.beatUnit) transportProps.push(`beatUnit={${formatNumber(tData.beatUnit)}}`);
            if (tData.stepsPerBeat) transportProps.push(`stepsPerBeat={${formatNumber(tData.stepsPerBeat)}}`);
            if (tData.barsPerPhrase) transportProps.push(`barsPerPhrase={${formatNumber(tData.barsPerPhrase)}}`);
            if (tData.swing) transportProps.push(`swing={${formatNumber(tData.swing)}}`);
            if (midiSyncNode?.data.mode === 'midi-master') transportProps.push(`mode="manual"`);

            code += `${indent(hasMidiNodes ? 4 : 3)}<TransportProvider${transportProps.length ? ' ' + transportProps.join(' ') : ''}>\n`;
            code += `${indent(hasMidiNodes ? 5 : 4)}<${componentName}${hasProps ? ' {...props}' : ''} />\n`;
            code += `${indent(hasMidiNodes ? 4 : 3)}</TransportProvider>\n`;
        } else {
            code += `${indent(hasMidiNodes ? 4 : 3)}<${componentName}${hasProps ? ' {...props}' : ''} />\n`;
        }

        code += `${indent(hasMidiNodes ? 3 : 2)}</AudioProvider>\n`;
        if (hasMidiNodes) {
            code += `${indent(2)}</MidiProvider>\n`;
        }
        code += `${indent(1)});\n`;
        code += `};\n\n`;
    }

    code += `export const ${componentName} = (${propsParam || ''}) => {\n`;
    if (hasProps) {
        const propLines = usedParamInfo.map((param) => `${param.name} = ${formatNumber(param.defaultValue)}`);
        code += `${indent(1)}const { ${propLines.join(', ')} } = props;\n\n`;
    }

    if (midiHookDeclarations.length > 0) {
        code += `${midiHookDeclarations.join('\n')}\n\n`;
    }

    if (lfoDeclarations.length > 0) {
        code += `${lfoDeclarations.join('\n')}\n\n`;
    }

    if (dataState.dataDeclarations.length > 0) {
        code += `${dataState.dataDeclarations.join('\n')}\n\n`;
    }

    code += graphContent;
    code += `};\n`;

    return code;
}

const AUDIO_COMPONENTS: Record<string, string> = {
    osc: 'Osc',
    gain: 'Gain',
    filter: 'Filter',
    delay: 'Delay',
    compressor: 'Compressor',
    phaser: 'Phaser',
    flanger: 'Flanger',
    tremolo: 'Tremolo',
    eq3: 'EQ3',
    reverb: 'Reverb',
    distortion: 'Distortion',
    chorus: 'Chorus',
    noiseBurst: 'NoiseBurst',
    convolver: 'Convolver',
    analyzer: 'Analyzer',
    panner3d: 'Panner',
    panner: 'StereoPanner',
    constantSource: 'ConstantSource',
    mediaStream: 'MediaStream',
    output: 'Gain',
    mixer: 'Gain',
    auxSend: 'AuxSend',
    auxReturn: 'AuxReturn',
    matrixMixer: 'MatrixMixer',
    noise: 'Noise',
    waveShaper: 'WaveShaper',
    sampler: 'Sampler',
};

const AUDIO_NODE_COMPONENTS: Record<string, React.ComponentType<any>> = {
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

function getAudioComponentName(type: string): string | null {
    return AUDIO_COMPONENTS[type] ?? null;
}

function shouldUseFeedbackDelay(node: Node<AudioNodeData>): boolean {
    return node.data.type === 'delay' && ((node.data as DelayNodeData).feedback ?? 0) > 0;
}

function shouldUseTriggeredSampler(node: Node<AudioNodeData>, controlEdges: Edge[]): boolean {
    return node.data.type === 'sampler' && controlEdges.some((edge) => edge.targetHandle === 'trigger');
}

function shouldUsePresetWaveShaper(node: Node<AudioNodeData>): boolean {
    return node.data.type === 'waveShaper';
}

function getGeneratedComponentName(node: Node<AudioNodeData>, controlEdges: Edge[]): string | null {
    if (shouldUseFeedbackDelay(node)) return 'FeedbackDelay';
    if (shouldUseTriggeredSampler(node, controlEdges)) return 'TriggeredSampler';
    if (shouldUsePresetWaveShaper(node)) return 'PresetWaveShaper';
    return getAudioComponentName(node.data.type);
}

function getPreviewComponent(node: Node<AudioNodeData>, controlEdges: Edge[]): React.ComponentType<any> | null {
    if (shouldUseFeedbackDelay(node)) return PreviewFeedbackDelay;
    if (shouldUseTriggeredSampler(node, controlEdges)) return TriggeredSampler;
    if (shouldUsePresetWaveShaper(node)) return PresetWaveShaper;
    return AUDIO_NODE_COMPONENTS[node.data.type] ?? null;
}

interface ParamInfo {
    name: string;
    defaultValue: number;
}

interface TrackInfo {
    steps: number;
    pattern: string;
    note?: number;
}

function formatNumber(value: number): string {
    if (!Number.isFinite(value)) return '0';
    const rounded = Math.round(value * 10000) / 10000;
    return rounded.toString();
}

function toSafeIdentifier(value: string, fallback: string): string {
    const normalized = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    if (!normalized) return fallback;
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;
    const [first, ...rest] = parts;
    let result = first.toLowerCase() + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    result = result.replace(/^[^a-zA-Z_]+/, '');
    if (!result || RESERVED_IDENTIFIERS.has(result)) {
        result = fallback;
    }
    if (/^\d/.test(result)) {
        result = `${fallback}${result}`;
    }
    return result;
}

function ensureUniqueName(base: string, usedNames: Set<string>): string {
    if (!usedNames.has(base)) return base;
    let counter = 2;
    let candidate = `${base}${counter}`;
    while (usedNames.has(candidate)) {
        counter += 1;
        candidate = `${base}${counter}`;
    }
    return candidate;
}

function resolveConvolverImpulseForExport(convolver: ConvolverNodeData): string | undefined {
    const externalAssetPath = typeof convolver.assetPath === 'string' ? convolver.assetPath.trim() : '';
    if (externalAssetPath) {
        return externalAssetPath;
    }

    const rawImpulse = typeof convolver.impulseSrc === 'string' ? convolver.impulseSrc.trim() : '';
    if (!rawImpulse) {
        const rawFileName = typeof convolver.impulseFileName === 'string' ? convolver.impulseFileName.trim() : '';
        if (!rawFileName) return undefined;
        const fileNameCandidate = rawFileName.split(/[\\/]/).pop() || '';
        const safeFileName = fileNameCandidate.replace(/[^a-zA-Z0-9._-]+/g, '-');
        const finalFileName = safeFileName || 'impulse.wav';
        return `/impulses/${finalFileName}`;
    }

    const isInlineOrEphemeralSource = rawImpulse.startsWith('data:') || rawImpulse.startsWith('blob:');
    if (!isInlineOrEphemeralSource) {
        return rawImpulse;
    }

    const rawFileName = typeof convolver.impulseFileName === 'string' ? convolver.impulseFileName.trim() : '';
    const fileNameCandidate = rawFileName.split(/[\\/]/).pop() || '';
    const safeFileName = fileNameCandidate.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const finalFileName = safeFileName || 'impulse.wav';
    return `/impulses/${finalFileName}`;
}

function resolveSamplerSrcForExport(sampler: SamplerNodeData): string {
    const externalAssetPath = typeof sampler.assetPath === 'string' ? sampler.assetPath.trim() : '';
    if (externalAssetPath) {
        return externalAssetPath;
    }

    const rawSrc = typeof sampler.src === 'string' ? sampler.src.trim() : '';
    const isEphemeralSource = rawSrc.startsWith('blob:') || rawSrc.startsWith('data:');
    if (rawSrc && !isEphemeralSource) {
        return rawSrc;
    }

    const rawFileName = typeof sampler.fileName === 'string' ? sampler.fileName.trim() : '';
    const fileNameCandidate = rawFileName.split(/[\\/]/).pop() || '';
    const safeFileName = fileNameCandidate.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const finalFileName = safeFileName || 'sample.wav';
    return `/samples/${finalFileName}`;
}

const RESERVED_IDENTIFIERS = new Set([
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'new',
    'return',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
]);

function indentLines(text: string, level: number, indent: (level: number) => string): string {
    const prefix = indent(level);
    return text
        .split('\n')
        .map((line) => (line.length > 0 ? prefix + line : line))
        .join('\n');
}

function buildAdsrProps(adsr: ADSRNodeData): string[] {
    const props: string[] = [];
    if (adsr.attack !== undefined) props.push(`attack={${formatNumber(adsr.attack)}}`);
    if (adsr.decay !== undefined) props.push(`decay={${formatNumber(adsr.decay)}}`);
    if (adsr.sustain !== undefined) props.push(`sustain={${formatNumber(adsr.sustain)}}`);
    if (adsr.release !== undefined) props.push(`release={${formatNumber(adsr.release)}}`);
    return props;
}

function buildNodeProps(
    node: Node<AudioNodeData>,
    voiceEdges: Edge[],
    voiceVars: Set<string>,
    context: {
        controlEdgesByTarget: Map<string, Edge[]>;
        nodeById: Map<string, Node<AudioNodeData>>;
        inputParamInfo: { paramInfoByHandle: Map<string, ParamInfo> };
        lfoVarsById: Map<string, string>;
        midiNoteVarsById: Map<string, string>;
        midiCCVarsById: Map<string, string>;
        getDataVar: (nodeId: string) => string | undefined;
    }
): string[] {
    const props: string[] = [];

    const nodeData = node.data;
    const controlEdges = context.controlEdgesByTarget.get(node.id) ?? [];
    const addBooleanProp = (name: string, value: boolean) => {
        if (value) props.push(name);
    };
    const addValueProp = (name: string, value: string | number) => {
        props.push(`${name}={${value}}`);
    };
    const addStringProp = (name: string, value: string) => {
        props.push(`${name}=${JSON.stringify(value)}`);
    };
    const addNodeRef = (name: string, refName: string) => {
        props.push(`${name}={${refName}}`);
        voiceVars.add(refName);
    };

    const resolveHandleValue = (
        handle: string,
        options: {
            baseValue?: number;
            modulatable?: boolean;
            numericGate?: boolean;
        }
    ) => {
        const voiceEdge = voiceEdges.find((edge) => edge.targetHandle === handle);
        if (voiceEdge) {
            if (voiceEdge.sourceHandle === 'note') {
                voiceVars.add('frequency');
                return { value: 'frequency' };
            }
            if (voiceEdge.sourceHandle === 'velocity') {
                voiceVars.add('velocity');
                return { value: 'velocity' };
            }
            if (voiceEdge.sourceHandle === 'gate') {
                voiceVars.add('gate');
                return { value: options.numericGate ? '(gate ? 1 : 0)' : 'gate' };
            }
        }

        const edgesForHandle = controlEdges.filter((edge) => edge.targetHandle === handle);
        const noteEdge = edgesForHandle.find(
            (edge) => context.nodeById.get(edge.source)?.data.type === 'note'
        );
        if (noteEdge) {
            const noteNode = context.nodeById.get(noteEdge.source);
            const noteData = noteNode?.data as NoteNodeData | undefined;
            if (noteData?.frequency !== undefined) {
                return { value: formatNumber(noteData.frequency) };
            }
        }

        const midiNoteEdge = edgesForHandle.find(
            (edge) => context.nodeById.get(edge.source)?.data.type === 'midiNote'
        );
        if (midiNoteEdge) {
            const varName = context.midiNoteVarsById.get(midiNoteEdge.source);
            if (varName) {
                switch (midiNoteEdge.sourceHandle) {
                    case 'frequency':
                        return { value: `${varName}.frequency ?? 0` };
                    case 'note':
                        return { value: `${varName}.note ?? 0` };
                    case 'gate':
                        return { value: options.numericGate ? `(${varName}.gate ? 1 : 0)` : `${varName}.gate` };
                    case 'velocity':
                        return { value: `${varName}.velocity` };
                    default:
                        break;
                }
            }
        }

        const dataEdge = edgesForHandle.find((edge) => {
            const sourceNode = context.nodeById.get(edge.source);
            return sourceNode ? isDataNodeType(sourceNode.data.type) : false;
        });
        const dataValue = dataEdge ? context.getDataVar(dataEdge.source) : undefined;

        const inputEdge = edgesForHandle.find(
            (edge) => {
                const sourceType = context.nodeById.get(edge.source)?.data.type;
                return sourceType ? isInputLikeNodeType(sourceType) : false;
            }
        );
        const inputInfo = inputEdge
            ? context.inputParamInfo.paramInfoByHandle.get(`${inputEdge.source}:${inputEdge.sourceHandle}`)
            : undefined;
        const inputValue = inputInfo?.name;

        const midiCCEdge = edgesForHandle.find(
            (edge) => context.nodeById.get(edge.source)?.data.type === 'midiCC'
        );
        const midiCCVar = midiCCEdge ? context.midiCCVarsById.get(midiCCEdge.source) : undefined;
        const midiCCValue = midiCCVar
            ? midiCCEdge?.sourceHandle === 'raw'
                ? `${midiCCVar}.raw`
                : `${midiCCVar}.normalized`
            : undefined;

        const lfoEdge = edgesForHandle.find(
            (edge) => context.nodeById.get(edge.source)?.data.type === 'lfo'
        );
        const lfoVar = lfoEdge ? context.lfoVarsById.get(lfoEdge.source) : undefined;
        if (lfoVar && options.modulatable) {
            const baseValue = dataValue ?? inputValue ?? (options.baseValue !== undefined ? formatNumber(options.baseValue) : undefined);
            return { value: lfoVar, base: baseValue };
        }

        if (dataValue !== undefined) {
            return { value: dataValue };
        }

        if (inputValue) {
            return { value: inputValue };
        }

        if (midiCCValue) {
            return { value: midiCCValue };
        }

        if (options.baseValue !== undefined) {
            return { value: formatNumber(options.baseValue) };
        }

        return { value: undefined };
    };

    switch (nodeData.type) {
        case 'osc': {
            const osc = nodeData as OscNodeData;
            addStringProp('type', osc.waveform);
            addBooleanProp('autoStart', true);
            const frequency = resolveHandleValue('frequency', { baseValue: osc.frequency, modulatable: true });
            if (frequency.value !== undefined) addValueProp('frequency', frequency.value);
            if (frequency.base !== undefined) addValueProp('frequencyBase', frequency.base);
            const detune = resolveHandleValue('detune', { baseValue: osc.detune, modulatable: true });
            if (detune.value !== undefined) addValueProp('detune', detune.value);
            if (detune.base !== undefined) addValueProp('detuneBase', detune.base);
            const hasVoiceFrequency = voiceEdges.some((edge) => edge.targetHandle === 'frequency');
            if (hasVoiceFrequency) {
                addNodeRef('nodeRef', 'oscRef');
            }
            break;
        }
        case 'gain': {
            const gain = nodeData as GainNodeData;
            const gainValue = resolveHandleValue('gain', {
                baseValue: gain.gain,
                modulatable: true,
                numericGate: true,
            });
            if (gainValue.value !== undefined) addValueProp('gain', gainValue.value);
            if (gainValue.base !== undefined) addValueProp('gainBase', gainValue.base);
            if (voiceEdges.some((edge) => edge.targetHandle === 'gain')) {
                addNodeRef('nodeRef', 'gainRef');
            }
            break;
        }
        case 'output': {
            const output = nodeData as OutputNodeData;
            addValueProp('gain', formatNumber(output.masterGain));
            break;
        }
        case 'filter': {
            const filter = nodeData as FilterNodeData;
            addStringProp('type', filter.filterType);
            const frequency = resolveHandleValue('frequency', { baseValue: filter.frequency, modulatable: true });
            if (frequency.value !== undefined) addValueProp('frequency', frequency.value);
            if (frequency.base !== undefined) addValueProp('frequencyBase', frequency.base);
            const qValue = resolveHandleValue('q', { baseValue: filter.q, modulatable: true });
            if (qValue.value !== undefined) addValueProp('Q', qValue.value);
            if (qValue.base !== undefined) addValueProp('QBase', qValue.base);
            const detune = resolveHandleValue('detune', { baseValue: filter.detune, modulatable: true });
            if (detune.value !== undefined) addValueProp('detune', detune.value);
            if (detune.base !== undefined) addValueProp('detuneBase', detune.base);
            const gainValue = resolveHandleValue('gain', { baseValue: filter.gain, modulatable: true });
            if (gainValue.value !== undefined) addValueProp('gain', gainValue.value);
            if (gainValue.base !== undefined) addValueProp('gainBase', gainValue.base);
            if (voiceEdges.some((edge) => edge.targetHandle === 'frequency' || edge.targetHandle === 'q')) {
                addNodeRef('nodeRef', 'filterRef');
            }
            break;
        }
        case 'delay': {
            const delay = nodeData as DelayNodeData;
            if (delay.delayTime !== undefined) addValueProp('delayTime', formatNumber(delay.delayTime));
            if (delay.feedback > 0) addValueProp('feedback', formatNumber(delay.feedback));
            break;
        }
        case 'compressor': {
            const compressor = nodeData as CompressorNodeData;
            const threshold = resolveHandleValue('threshold', { baseValue: compressor.threshold, modulatable: true });
            if (threshold.value !== undefined) addValueProp('threshold', threshold.value);
            const knee = resolveHandleValue('knee', { baseValue: compressor.knee, modulatable: true });
            if (knee.value !== undefined) addValueProp('knee', knee.value);
            const ratio = resolveHandleValue('ratio', { baseValue: compressor.ratio, modulatable: true });
            if (ratio.value !== undefined) addValueProp('ratio', ratio.value);
            const attack = resolveHandleValue('attack', { baseValue: compressor.attack, modulatable: true });
            if (attack.value !== undefined) addValueProp('attack', attack.value);
            const release = resolveHandleValue('release', { baseValue: compressor.release, modulatable: true });
            if (release.value !== undefined) addValueProp('release', release.value);
            const sidechainStrength = resolveHandleValue('sidechainStrength', { baseValue: compressor.sidechainStrength ?? 0.7, modulatable: true });
            if (sidechainStrength.value !== undefined) addValueProp('sidechainStrength', sidechainStrength.value);
            const sidechainEdge = controlEdges.find((edge) => edge.targetHandle === 'sidechainIn');
            if (sidechainEdge) {
                addStringProp('sidechainBusId', `sc-${sidechainEdge.source}-${sidechainEdge.target}`);
            }
            break;
        }
        case 'phaser': {
            const phaser = nodeData as PhaserNodeData;
            const rate = resolveHandleValue('rate', { baseValue: phaser.rate, modulatable: true });
            if (rate.value !== undefined) addValueProp('rate', rate.value);
            const depth = resolveHandleValue('depth', { baseValue: phaser.depth, modulatable: true });
            if (depth.value !== undefined) addValueProp('depth', depth.value);
            const feedback = resolveHandleValue('feedback', { baseValue: phaser.feedback, modulatable: true });
            if (feedback.value !== undefined) addValueProp('feedback', feedback.value);
            const baseFrequency = resolveHandleValue('baseFrequency', { baseValue: phaser.baseFrequency, modulatable: true });
            if (baseFrequency.value !== undefined) addValueProp('baseFrequency', baseFrequency.value);
            const stages = resolveHandleValue('stages', { baseValue: phaser.stages, modulatable: true });
            if (stages.value !== undefined) addValueProp('stages', stages.value);
            const mixValue = resolveHandleValue('mix', { baseValue: phaser.mix, modulatable: true });
            if (mixValue.value !== undefined) addValueProp('mix', mixValue.value);
            break;
        }
        case 'flanger': {
            const flanger = nodeData as FlangerNodeData;
            const rate = resolveHandleValue('rate', { baseValue: flanger.rate, modulatable: true });
            if (rate.value !== undefined) addValueProp('rate', rate.value);
            const depth = resolveHandleValue('depth', { baseValue: flanger.depth, modulatable: true });
            if (depth.value !== undefined) addValueProp('depth', depth.value);
            const feedback = resolveHandleValue('feedback', { baseValue: flanger.feedback, modulatable: true });
            if (feedback.value !== undefined) addValueProp('feedback', feedback.value);
            const delay = resolveHandleValue('delay', { baseValue: flanger.delay, modulatable: true });
            if (delay.value !== undefined) addValueProp('delay', delay.value);
            const mixValue = resolveHandleValue('mix', { baseValue: flanger.mix, modulatable: true });
            if (mixValue.value !== undefined) addValueProp('mix', mixValue.value);
            break;
        }
        case 'tremolo': {
            const tremolo = nodeData as TremoloNodeData;
            const rate = resolveHandleValue('rate', { baseValue: tremolo.rate, modulatable: true });
            if (rate.value !== undefined) addValueProp('rate', rate.value);
            const depth = resolveHandleValue('depth', { baseValue: tremolo.depth, modulatable: true });
            if (depth.value !== undefined) addValueProp('depth', depth.value);
            const mixValue = resolveHandleValue('mix', { baseValue: tremolo.mix, modulatable: true });
            if (mixValue.value !== undefined) addValueProp('mix', mixValue.value);
            addStringProp('waveform', tremolo.waveform);
            addBooleanProp('stereo', tremolo.stereo);
            break;
        }
        case 'eq3': {
            const eq3 = nodeData as EQ3NodeData;
            const low = resolveHandleValue('low', { baseValue: eq3.low, modulatable: true });
            if (low.value !== undefined) addValueProp('low', low.value);
            const mid = resolveHandleValue('mid', { baseValue: eq3.mid, modulatable: true });
            if (mid.value !== undefined) addValueProp('mid', mid.value);
            const high = resolveHandleValue('high', { baseValue: eq3.high, modulatable: true });
            if (high.value !== undefined) addValueProp('high', high.value);
            const lowFrequency = resolveHandleValue('lowFrequency', { baseValue: eq3.lowFrequency, modulatable: true });
            if (lowFrequency.value !== undefined) addValueProp('lowFrequency', lowFrequency.value);
            const highFrequency = resolveHandleValue('highFrequency', { baseValue: eq3.highFrequency, modulatable: true });
            if (highFrequency.value !== undefined) addValueProp('highFrequency', highFrequency.value);
            const mixValue = resolveHandleValue('mix', { baseValue: eq3.mix, modulatable: true });
            if (mixValue.value !== undefined) addValueProp('mix', mixValue.value);
            break;
        }
        case 'reverb': {
            const reverb = nodeData as ReverbNodeData;
            addValueProp('decay', formatNumber(reverb.decay));
            addValueProp('mix', formatNumber(reverb.mix));
            break;
        }
        case 'distortion': {
            const distortion = nodeData as DistortionNodeData;
            addStringProp('type', distortion.distortionType);
            const drive = resolveHandleValue('drive', { baseValue: distortion.drive, modulatable: true });
            if (drive.value !== undefined) addValueProp('drive', drive.value);
            const level = resolveHandleValue('level', { baseValue: distortion.level, modulatable: true });
            if (level.value !== undefined) addValueProp('level', level.value);
            const mixValue = resolveHandleValue('mix', { baseValue: distortion.mix, modulatable: true });
            if (mixValue.value !== undefined) addValueProp('mix', mixValue.value);
            const tone = resolveHandleValue('tone', { baseValue: distortion.tone, modulatable: true });
            if (tone.value !== undefined) addValueProp('tone', tone.value);
            break;
        }
        case 'chorus': {
            const chorus = nodeData as ChorusNodeData;
            const rate = resolveHandleValue('rate', { baseValue: chorus.rate, modulatable: true });
            if (rate.value !== undefined) addValueProp('rate', rate.value);
            const depth = resolveHandleValue('depth', { baseValue: chorus.depth, modulatable: true });
            if (depth.value !== undefined) addValueProp('depth', depth.value);
            const feedback = resolveHandleValue('feedback', { baseValue: chorus.feedback, modulatable: true });
            if (feedback.value !== undefined) addValueProp('feedback', feedback.value);
            const delay = resolveHandleValue('delay', { baseValue: chorus.delay, modulatable: true });
            if (delay.value !== undefined) addValueProp('delay', delay.value);
            const mixValue = resolveHandleValue('mix', { baseValue: chorus.mix, modulatable: true });
            if (mixValue.value !== undefined) addValueProp('mix', mixValue.value);
            addBooleanProp('stereo', chorus.stereo);
            break;
        }
        case 'noiseBurst': {
            const burst = nodeData as NoiseBurstNodeData;
            addStringProp('type', burst.noiseType);
            const duration = resolveHandleValue('duration', { baseValue: burst.duration, modulatable: true });
            if (duration.value !== undefined) addValueProp('duration', duration.value);
            const gainValue = resolveHandleValue('gain', { baseValue: burst.gain, modulatable: true });
            if (gainValue.value !== undefined) addValueProp('gain', gainValue.value);
            const attack = resolveHandleValue('attack', { baseValue: burst.attack, modulatable: true });
            if (attack.value !== undefined) addValueProp('attack', attack.value);
            const release = resolveHandleValue('release', { baseValue: burst.release, modulatable: true });
            if (release.value !== undefined) addValueProp('release', release.value);
            break;
        }
        case 'waveShaper': {
            const waveShaper = nodeData as WaveShaperNodeData;
            const amount = resolveHandleValue('amount', { baseValue: waveShaper.amount });
            if (amount.value !== undefined) addValueProp('amount', amount.value);
            addStringProp('preset', waveShaper.preset);
            addStringProp('oversample', waveShaper.oversample);
            break;
        }
        case 'convolver': {
            const convolver = nodeData as ConvolverNodeData;
            const impulseForExport = resolveConvolverImpulseForExport(convolver);
            if (impulseForExport) {
                addStringProp('impulse', impulseForExport);
            }
            if (!convolver.normalize) {
                props.push('normalize={false}');
            }
            break;
        }
        case 'analyzer': {
            const analyzer = nodeData as AnalyzerNodeData;
            addValueProp('fftSize', formatNumber(analyzer.fftSize));
            addValueProp('smoothingTimeConstant', formatNumber(analyzer.smoothingTimeConstant));
            addValueProp('updateRate', formatNumber(analyzer.updateRate));
            if (!analyzer.autoUpdate) {
                props.push('autoUpdate={false}');
            }
            break;
        }
        case 'panner': {
            const pan = nodeData as StereoPannerNodeData;
            addValueProp('pan', formatNumber(pan.pan));
            break;
        }
        case 'panner3d': {
            const panner = nodeData as Panner3DNodeData;
            const x = resolveHandleValue('positionX', { baseValue: panner.positionX, modulatable: true });
            if (x.value !== undefined) addValueProp('positionX', x.value);
            const y = resolveHandleValue('positionY', { baseValue: panner.positionY, modulatable: true });
            if (y.value !== undefined) addValueProp('positionY', y.value);
            const z = resolveHandleValue('positionZ', { baseValue: panner.positionZ, modulatable: true });
            if (z.value !== undefined) addValueProp('positionZ', z.value);
            const refDistance = resolveHandleValue('refDistance', { baseValue: panner.refDistance, modulatable: true });
            if (refDistance.value !== undefined) addValueProp('refDistance', refDistance.value);
            const maxDistance = resolveHandleValue('maxDistance', { baseValue: panner.maxDistance, modulatable: true });
            if (maxDistance.value !== undefined) addValueProp('maxDistance', maxDistance.value);
            const rolloff = resolveHandleValue('rolloffFactor', { baseValue: panner.rolloffFactor, modulatable: true });
            if (rolloff.value !== undefined) addValueProp('rolloffFactor', rolloff.value);
            addStringProp('panningModel', panner.panningModel);
            addStringProp('distanceModel', panner.distanceModel);
            break;
        }
        case 'noise': {
            const noise = nodeData as NoiseNodeData;
            addStringProp('type', noise.noiseType);
            addBooleanProp('autoStart', true);
            break;
        }
        case 'constantSource': {
            const source = nodeData as ConstantSourceNodeData;
            const offset = resolveHandleValue('offset', { baseValue: source.offset, modulatable: true });
            if (offset.value !== undefined) addValueProp('offset', offset.value);
            addBooleanProp('autoStart', true);
            break;
        }
        case 'mediaStream': {
            const stream = nodeData as MediaStreamNodeData;
            addBooleanProp('requestMic', stream.requestMic);
            break;
        }
        case 'sampler': {
            const sampler = nodeData as SamplerNodeData;
            const src = resolveSamplerSrcForExport(sampler);
            props.push(`src=${JSON.stringify(src)}`);
            addBooleanProp('loop', sampler.loop);
            if (sampler.playbackRate !== undefined && sampler.playbackRate !== 1) {
                addValueProp('playbackRate', formatNumber(sampler.playbackRate));
            }
            if (sampler.detune !== undefined && sampler.detune !== 0) {
                addValueProp('detune', formatNumber(sampler.detune));
            }
            const hasTrigger = controlEdges.some((edge) => edge.targetHandle === 'trigger');
            if (voiceEdges.some((edge) => edge.targetHandle === 'trigger')) {
                voiceVars.add('gate');
                voiceVars.add('duration');
                props.push('active={gate}');
                props.push('duration={duration}');
            }
            if (!hasTrigger) {
                addBooleanProp('autoStart', true);
            }
            break;
        }
        case 'mixer': {
            break;
        }
        case 'auxSend': {
            const auxSend = nodeData as AuxSendNodeData;
            addStringProp('busId', auxSend.busId || 'aux');
            addStringProp('tap', auxSend.tap || 'pre');
            const sendGain = resolveHandleValue('sendGain', { baseValue: auxSend.sendGain, modulatable: true });
            if (sendGain.value !== undefined) addValueProp('sendGain', sendGain.value);
            break;
        }
        case 'auxReturn': {
            const auxReturn = nodeData as AuxReturnNodeData;
            addStringProp('busId', auxReturn.busId || 'aux');
            const gain = resolveHandleValue('gain', { baseValue: auxReturn.gain, modulatable: true });
            if (gain.value !== undefined) addValueProp('gain', gain.value);
            break;
        }
        case 'matrixMixer': {
            const matrix = nodeData as MatrixMixerNodeData;
            addValueProp('inputs', formatNumber(matrix.inputs));
            addValueProp('outputs', formatNumber(matrix.outputs));
            const matrixLiteral = JSON.stringify(matrix.matrix ?? []);
            props.push(`matrix={${matrixLiteral}}`);
            break;
        }
        default:
            break;
    }

    return props;
}

type LfoValues = Record<string, LFOOutput | null>;

const LfoContext = React.createContext<LfoValues>({});

interface PreviewTrackInfo {
    steps: number;
    pattern: number[];
    note?: number;
}

class PreviewErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="text-[10px] text-[var(--danger)]">
                    Preview failed: {this.state.error.message}
                </div>
            );
        }
        return this.props.children;
    }
}

interface PreviewGraphProps {
    nodes: Node<AudioNodeData>[];
    edges: Edge[];
    includeProvider: boolean;
}

const PreviewGraph: React.FC<PreviewGraphProps> = ({ nodes, edges, includeProvider }) => {
    const lfoNodes = useMemo(
        () => nodes.filter((node) => node.data.type === 'lfo') as Node<LFONodeData>[],
        [nodes]
    );
    const transportNode = useMemo(
        () => nodes.find((node) => node.data.type === 'transport'),
        [nodes]
    );

    const transportProps = useMemo(() => {
        if (!transportNode) return {};
        const data = transportNode.data as any;
        return {
            bpm: data.bpm,
            beatsPerBar: data.beatsPerBar,
            beatUnit: data.beatUnit,
            stepsPerBeat: data.stepsPerBeat,
            barsPerPhrase: data.barsPerPhrase,
            swing: data.swing,
        };
    }, [transportNode]);

    const graphData = useMemo(() => buildPreviewGraphData(nodes, edges), [nodes, edges]);
    const hasMidiNodes = useMemo(
        () => nodes.some((node) => node.data.type === 'midiNote'
            || node.data.type === 'midiCC'
            || node.data.type === 'midiNoteOutput'
            || node.data.type === 'midiCCOutput'
            || node.data.type === 'midiSync'),
        [nodes]
    );

    const sequencerBpm = useMemo(() => {
        if (!transportNode) return undefined;
        const bpm = (transportNode.data as { bpm?: number }).bpm;
        return Number.isFinite(bpm) && bpm ? bpm : undefined;
    }, [transportNode]);

    const content = (
        <LfoRegistry nodes={lfoNodes}>
            <PreviewRenderer graph={graphData} sequencerBpm={sequencerBpm} />
        </LfoRegistry>
    );

    const wrappedContent = (
        <AudioProvider>
            {includeProvider && transportNode ? (
                <TransportProvider {...transportProps}>
                    {content}
                </TransportProvider>
            ) : (
                content
            )}
        </AudioProvider>
    );

    return hasMidiNodes ? (
        <MidiProvider>
            {wrappedContent}
        </MidiProvider>
    ) : wrappedContent;
};

interface PreviewGraphData {
    nodeById: Map<string, Node<AudioNodeData>>;
    audioEdgesByTarget: Map<string, Edge[]>;
    controlEdgesByTarget: Map<string, Edge[]>;
    sidechainEdgesBySource: Map<string, Edge[]>;
    adsrTargets: Map<string, Node<ADSRNodeData>>;
    paramsByHandle: Map<string, number>;
    rootNodes: Node<AudioNodeData>[];
    trackSourcesUsed: Set<string>;
    transportConnectedIds: Set<string>;
}

function buildPreviewGraphData(nodes: Node<AudioNodeData>[], edges: Edge[]): PreviewGraphData {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const transportConnectedIds = getTransportConnections(edges, nodeById);
    const isAudioEdge = (edge: Edge) => isAudioConnection(edge, nodeById);

    const audioEdges = edges.filter(isAudioEdge);
    const controlEdges = edges.filter((edge) => !isAudioEdge(edge));

    const audioEdgesByTarget = new Map<string, Edge[]>();
    audioEdges.forEach((edge) => {
        const list = audioEdgesByTarget.get(edge.target) ?? [];
        list.push(edge);
        audioEdgesByTarget.set(edge.target, list);
    });

    const controlEdgesByTarget = new Map<string, Edge[]>();
    controlEdges.forEach((edge) => {
        const list = controlEdgesByTarget.get(edge.target) ?? [];
        list.push(edge);
        controlEdgesByTarget.set(edge.target, list);
    });

    const sidechainEdgesBySource = new Map<string, Edge[]>();
    controlEdges
        .filter((edge) => edge.targetHandle === 'sidechainIn')
        .forEach((edge) => {
            const list = sidechainEdgesBySource.get(edge.source) ?? [];
            list.push(edge);
            sidechainEdgesBySource.set(edge.source, list);
        });

    const adsrTargets = new Map<string, Node<ADSRNodeData>>();
    controlEdges.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source);
        if (sourceNode?.data.type === 'adsr' && edge.targetHandle === 'gain') {
            adsrTargets.set(edge.target, sourceNode as Node<ADSRNodeData>);
        }
    });

    const paramsByHandle = new Map<string, number>();
    nodes.forEach((node) => {
        if (!isInputLikeNodeType(node.data.type)) return;
        const input = node.data as InputNodeData | UiTokensNodeData;
        input.params?.forEach((param) => {
            const value = Number.isFinite(param.value)
                ? param.value
                : Number.isFinite(param.defaultValue)
                    ? param.defaultValue
                    : 0;
            paramsByHandle.set(`${node.id}:${getInputParamHandleId(param)}`, value);
        });
    });

    const renderableNodes = nodes.filter((node) => !!AUDIO_NODE_COMPONENTS[node.data.type]);
    const nodesWithOutputs = new Set(audioEdges.map((edge) => edge.source));
    const rootNodes = renderableNodes.filter((node) => !nodesWithOutputs.has(node.id));

    const trackSourcesUsed = new Set<string>();
    controlEdges.forEach((edge) => {
        if (edge.targetHandle !== 'trigger' && edge.targetHandle !== 'gate') return;
        const sourceNode = nodeById.get(edge.source);
        if (
            (sourceNode?.data.type === 'stepSequencer' || sourceNode?.data.type === 'pianoRoll')
            && transportConnectedIds.has(sourceNode.id)
        ) {
            trackSourcesUsed.add(sourceNode.id);
        }
    });

    return {
        nodeById,
        audioEdgesByTarget,
        controlEdgesByTarget,
        sidechainEdgesBySource,
        adsrTargets,
        paramsByHandle,
        rootNodes,
        trackSourcesUsed,
        transportConnectedIds,
    };
}

const LfoRegistry: React.FC<{ nodes: Node<LFONodeData>[]; children: React.ReactNode }> = ({ nodes, children }) => {
    const [values, setValues] = useState<LfoValues>({});

    const register = useCallback((id: string, value: LFOOutput | null) => {
        setValues((prev) => {
            if (prev[id] === value) return prev;
            return { ...prev, [id]: value };
        });
    }, []);

    const unregister = useCallback((id: string) => {
        setValues((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
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
    node: Node<LFONodeData>;
    onReady: (id: string, value: LFOOutput | null) => void;
    onCleanup: (id: string) => void;
}> = ({ node, onReady, onCleanup }) => {
    const lfo = useLFO({
        rate: node.data.rate,
        depth: node.data.depth,
        waveform: node.data.waveform,
    });

    useEffect(() => {
        onReady(node.id, lfo);
        return () => onCleanup(node.id);
    }, [node.id, lfo, onReady, onCleanup]);

    return null;
};

const PreviewRenderer: React.FC<{ graph: PreviewGraphData; sequencerBpm?: number }> = ({ graph, sequencerBpm }) => {
    const lfoValues = useContext(LfoContext);
    const trackInfoById = useMemo(() => new Map<string, PreviewTrackInfo>(), []);
    const dataValues = useMemo(() => new Map<string, number>(), [graph]);

    const getSequencerSource = useCallback((nodeId: string) => {
        const edgesForTarget = graph.controlEdgesByTarget.get(nodeId) ?? [];
        const triggerEdge = edgesForTarget.find((edge) => edge.targetHandle === 'trigger' || edge.targetHandle === 'gate');
        if (!triggerEdge) return null;
        const sourceNode = graph.nodeById.get(triggerEdge.source);
        if (!sourceNode) return null;
        if (sourceNode.data.type === 'stepSequencer' || sourceNode.data.type === 'pianoRoll') {
            return graph.transportConnectedIds.has(sourceNode.id) ? sourceNode : null;
        }
        return null;
    }, [graph.controlEdgesByTarget, graph.nodeById, graph.transportConnectedIds]);

    const getEventTriggerSource = useCallback((nodeId: string) => {
        const edgesForTarget = graph.controlEdgesByTarget.get(nodeId) ?? [];
        const triggerEdge = edgesForTarget.find((edge) => {
            if (edge.targetHandle !== 'trigger' && edge.targetHandle !== 'gate') return false;
            return graph.nodeById.get(edge.source)?.data.type === 'eventTrigger';
        });
        if (!triggerEdge) return null;
        const sourceNode = graph.nodeById.get(triggerEdge.source);
        return sourceNode?.data.type === 'eventTrigger' ? sourceNode as Node<EventTriggerNodeData> : null;
    }, [graph.controlEdgesByTarget, graph.nodeById]);

    const getEventTriggerTokenValue = useCallback((eventTriggerNodeId: string, fallback: number): number => {
        const edgesForTarget = graph.controlEdgesByTarget.get(eventTriggerNodeId) ?? [];
        const tokenEdge = edgesForTarget.find((edge) => edge.targetHandle === 'token');
        if (!tokenEdge) return fallback;

        const sourceNode = graph.nodeById.get(tokenEdge.source);
        if (!sourceNode) return fallback;

        if (isInputLikeNodeType(sourceNode.data.type)) {
            return graph.paramsByHandle.get(`${tokenEdge.source}:${tokenEdge.sourceHandle}`) ?? fallback;
        }
        if (sourceNode.data.type === 'note') {
            const noteData = sourceNode.data as NoteNodeData;
            return Number.isFinite(noteData.frequency) ? noteData.frequency : fallback;
        }
        if (sourceNode.data.type === 'constantSource') {
            return (sourceNode.data as ConstantSourceNodeData).offset ?? fallback;
        }
        if (sourceNode.data.type === 'eventTrigger') {
            return (sourceNode.data as EventTriggerNodeData).token ?? fallback;
        }
        return fallback;
    }, [graph.controlEdgesByTarget, graph.nodeById, graph.paramsByHandle]);

    const getTrackInfo = useCallback((node: Node<AudioNodeData>): PreviewTrackInfo => {
        if (trackInfoById.has(node.id)) {
            return trackInfoById.get(node.id)!;
        }

        let info: PreviewTrackInfo = { steps: 16, pattern: [] };
        if (node.data.type === 'stepSequencer') {
            const seq = node.data as StepSequencerNodeData;
            const steps = seq.steps || 16;
            const activeSteps = seq.activeSteps || Array(steps).fill(false);
            const velocities = seq.pattern || Array(steps).fill(0.8);
            const pattern = activeSteps.map((on, i) => (on ? (velocities[i] ?? 1) : 0));
            info = {
                steps,
                pattern,
            };
        } else if (node.data.type === 'pianoRoll') {
            const piano = node.data as PianoRollNodeData;
            const steps = piano.steps || 16;
            const notes = piano.notes || [];
            const pattern = Array.from({ length: steps }, () => 0);
            notes.forEach((note) => {
                const velocity = Math.max(0, Math.min(1, note.velocity ?? 0));
                pattern[note.step] = Math.max(pattern[note.step], velocity);
            });
            const pitches = Array.from(new Set(notes.map((note) => note.pitch)));
            info = {
                steps,
                pattern,
                note: pitches.length === 1 ? pitches[0] : undefined,
            };
        }

        trackInfoById.set(node.id, info);
        return info;
    }, [trackInfoById]);

    const getDataValue = useCallback((
        nodeId: string,
        visiting: Set<string> = new Set()
    ): number => {
        if (dataValues.has(nodeId)) {
            return dataValues.get(nodeId)!;
        }

        if (visiting.has(nodeId)) return 0;

        const node = graph.nodeById.get(nodeId);
        if (!node || !isDataNodeType(node.data.type)) return 0;

        visiting.add(nodeId);

        const getHandleValue = (handle: string, fallback: number) => {
            const edgesForTarget = graph.controlEdgesByTarget.get(nodeId) ?? [];
            const edge = edgesForTarget.find((item) => item.targetHandle === handle);
            if (!edge) return fallback;

            const sourceNode = graph.nodeById.get(edge.source);
            if (!sourceNode) return fallback;

            if (isInputLikeNodeType(sourceNode.data.type)) {
                const value = graph.paramsByHandle.get(`${edge.source}:${edge.sourceHandle}`);
                return value ?? fallback;
            }

            if (sourceNode.data.type === 'note') {
                const noteData = sourceNode.data as NoteNodeData;
                return Number.isFinite(noteData.frequency) ? noteData.frequency : fallback;
            }

            if (isDataNodeType(sourceNode.data.type)) {
                return getDataValue(sourceNode.id, visiting);
            }

            return fallback;
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
                const values = Array.from({ length: inputs }, (_, index) =>
                    getHandleValue(`in_${index}`, data.values?.[index] ?? 0)
                );
                const indexValue = getHandleValue('index', data.selectedIndex);
                result = switchValue(indexValue, values, values[0] ?? 0);
                break;
            }
            default:
                result = 0;
        }

        dataValues.set(nodeId, result);
        visiting.delete(nodeId);
        return result;
    }, [dataValues, graph.controlEdgesByTarget, graph.nodeById, graph.paramsByHandle]);

    const renderNodeElement = useCallback((
        node: Node<AudioNodeData>,
        visited: Set<string>,
        voiceContext?: VoiceRenderProps
    ): React.ReactNode => {
        if (visited.has(node.id)) return null;
        visited.add(node.id);

        const controlEdges = graph.controlEdgesByTarget.get(node.id) ?? [];
        const Component = getPreviewComponent(node, controlEdges);
        if (!Component) return null;

        const voiceEdges = controlEdges.filter(
            (edge) => graph.nodeById.get(edge.source)?.data.type === 'voice'
        );
        const adsrNode = graph.adsrTargets.get(node.id);
        const adsrTrackSource = adsrNode ? getSequencerSource(adsrNode.id) : null;
        const adsrVoiceEdge = adsrNode
            ? (graph.controlEdgesByTarget.get(adsrNode.id) ?? []).find(
                (edge) => graph.nodeById.get(edge.source)?.data.type === 'voice' && edge.targetHandle === 'gate'
            )
            : null;
        const voiceNode = voiceEdges[0]
            ? graph.nodeById.get(voiceEdges[0].source)
            : adsrVoiceEdge
                ? graph.nodeById.get(adsrVoiceEdge.source)
                : null;

        const renderBase = (context?: VoiceRenderProps) => {
            const edgesForTarget = graph.audioEdgesByTarget.get(node.id) ?? [];
            const children = edgesForTarget
                .map((edge) => {
                    const sourceNode = graph.nodeById.get(edge.source);
                    if (!sourceNode) return null;
                    const child = renderNodeElement(sourceNode, new Set(visited), context);
                    if (!child) return null;
                    return (
                        <React.Fragment key={edge.id}>
                            {child}
                        </React.Fragment>
                    );
                })
                .filter(Boolean);

            const props = buildPreviewProps(node, voiceEdges, context, {
                controlEdgesByTarget: graph.controlEdgesByTarget,
                nodeById: graph.nodeById,
                paramsByHandle: graph.paramsByHandle,
                lfoValues,
                getDataValue,
            });

            let element = React.createElement(
                Component,
                { ...props, key: node.id },
                children.length > 0 ? children : undefined
            );

            if (adsrNode) {
                const adsrData = adsrNode.data as ADSRNodeData;
                const adsrProps = buildPreviewAdsrProps(
                    adsrData,
                    context,
                    adsrVoiceEdge,
                    !!adsrTrackSource
                );
                element = adsrTrackSource
                    ? React.createElement(Envelope, adsrProps, element)
                    : React.createElement(ADSR, adsrProps, element);
            }

            return element;
        };

        let element: React.ReactNode = voiceNode && !voiceContext
            ? (
                <Voice portamento={(voiceNode.data as VoiceNodeData).portamento || 0}>
                    {(context) => renderBase(context)}
                </Voice>
            )
            : renderBase(voiceContext);

        const sidechainEdges = graph.sidechainEdgesBySource.get(node.id) ?? [];
        if (sidechainEdges.length > 0) {
            sidechainEdges.forEach((edge) => {
                element = (
                    <AuxSend busId={`sc-${edge.source}-${edge.target}`} sendGain={1}>
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
                <Track
                    id={trackSource.id}
                    steps={trackInfo.steps}
                    pattern={trackInfo.pattern}
                    note={trackInfo.note}
                >
                    {element}
                </Track>
            );
        }

        const eventSource = !trackSource
            ? getEventTriggerSource(node.id)
                || (voiceNode ? getEventTriggerSource(voiceNode.id) : null)
                || (adsrNode ? getEventTriggerSource(adsrNode.id) : null)
            : null;

        if (eventSource) {
            const eventData = eventSource.data as EventTriggerNodeData;
            const tokenValue = getEventTriggerTokenValue(eventSource.id, eventData.token);
            const eventProps: Record<string, any> = { token: tokenValue };
            if (eventData.mode !== 'change') eventProps.mode = eventData.mode;
            if (eventData.cooldownMs > 0) eventProps.cooldownMs = eventData.cooldownMs;
            if (eventData.velocity !== 1) eventProps.velocity = eventData.velocity;
            if (eventData.duration !== 0.1) eventProps.duration = eventData.duration;
            if (eventData.note !== 60) eventProps.note = eventData.note;
            if (eventData.trackId && eventData.trackId !== 'event') eventProps.trackId = eventData.trackId;

            element = React.createElement(EventTrigger, eventProps, element);
        }

        return element;
    }, [graph, getSequencerSource, getEventTriggerSource, getEventTriggerTokenValue, getTrackInfo, lfoValues, getDataValue]);

    const rootElements = graph.rootNodes
        .map((node) => {
            const element = renderNodeElement(node, new Set());
            if (!element) return null;
            return (
                <React.Fragment key={node.id}>
                    {element}
                </React.Fragment>
            );
        })
        .filter(Boolean);

    const sequencerSteps = graph.trackSourcesUsed.size > 0
        ? Math.max(...Array.from(graph.trackSourcesUsed).map((id) => getTrackInfo(graph.nodeById.get(id)!).steps))
        : 16;

    let content: React.ReactNode = rootElements.length > 0
        ? <>{rootElements}</>
        : null;

    if (graph.trackSourcesUsed.size > 0) {
        content = (
            <Sequencer steps={sequencerSteps} autoStart bpm={sequencerBpm}>
                {content}
            </Sequencer>
        );
    }

    return <>{content}</>;
};

function buildPreviewProps(
    node: Node<AudioNodeData>,
    voiceEdges: Edge[],
    voiceContext: VoiceRenderProps | undefined,
    context: {
        controlEdgesByTarget: Map<string, Edge[]>;
        nodeById: Map<string, Node<AudioNodeData>>;
        paramsByHandle: Map<string, number>;
        lfoValues: LfoValues;
        getDataValue: (nodeId: string) => number;
    }
): Record<string, any> {
    const props: Record<string, any> = {};
    const nodeData = node.data;
    const controlEdges = context.controlEdgesByTarget.get(node.id) ?? [];

    const resolveControlValue = (
        handle: string,
        options: {
            baseValue?: number;
            modulatable?: boolean;
            numericGate?: boolean;
        }
    ) => {
        const voiceEdge = voiceEdges.find((edge) => edge.targetHandle === handle);
        if (voiceEdge && voiceContext) {
            if (voiceEdge.sourceHandle === 'note') {
                return { value: voiceContext.frequency };
            }
            if (voiceEdge.sourceHandle === 'velocity') {
                return { value: voiceContext.velocity };
            }
            if (voiceEdge.sourceHandle === 'gate') {
                return { value: options.numericGate ? (voiceContext.gate ? 1 : 0) : voiceContext.gate };
            }
        }

        const edgesForHandle = controlEdges.filter((edge) => edge.targetHandle === handle);
        const noteEdge = edgesForHandle.find(
            (edge) => context.nodeById.get(edge.source)?.data.type === 'note'
        );
        if (noteEdge) {
            const noteData = context.nodeById.get(noteEdge.source)?.data as NoteNodeData | undefined;
            if (noteData?.frequency !== undefined) {
                return { value: noteData.frequency };
            }
        }

        const dataEdge = edgesForHandle.find((edge) => {
            const sourceNode = context.nodeById.get(edge.source);
            return sourceNode ? isDataNodeType(sourceNode.data.type) : false;
        });
        const dataValue = dataEdge ? context.getDataValue(dataEdge.source) : undefined;

        const inputEdge = edgesForHandle.find(
            (edge) => {
                const sourceType = context.nodeById.get(edge.source)?.data.type;
                return sourceType ? isInputLikeNodeType(sourceType) : false;
            }
        );
        const inputValue = inputEdge
            ? context.paramsByHandle.get(`${inputEdge.source}:${inputEdge.sourceHandle}`)
            : undefined;

        const lfoEdge = edgesForHandle.find(
            (edge) => context.nodeById.get(edge.source)?.data.type === 'lfo'
        );
        const lfoValue = lfoEdge ? context.lfoValues[lfoEdge.source] ?? undefined : undefined;

        if (lfoValue && options.modulatable) {
            return { value: lfoValue, base: dataValue ?? inputValue ?? options.baseValue };
        }

        if (dataValue !== undefined) {
            return { value: dataValue };
        }

        if (inputValue !== undefined) {
            return { value: inputValue };
        }

        if (options.baseValue !== undefined) {
            return { value: options.baseValue };
        }

        return {};
    };

    switch (nodeData.type) {
        case 'osc': {
            const osc = nodeData as OscNodeData;
            props.type = osc.waveform;
            props.autoStart = true;
            const frequency = resolveControlValue('frequency', { baseValue: osc.frequency, modulatable: true });
            if (frequency.value !== undefined) props.frequency = frequency.value;
            if (frequency.base !== undefined) props.frequencyBase = frequency.base;
            const detune = resolveControlValue('detune', { baseValue: osc.detune, modulatable: true });
            if (detune.value !== undefined) props.detune = detune.value;
            if (detune.base !== undefined) props.detuneBase = detune.base;
            if (voiceEdges.some((edge) => edge.targetHandle === 'frequency') && voiceContext) {
                props.nodeRef = voiceContext.oscRef;
            }
            break;
        }
        case 'gain': {
            const gain = nodeData as GainNodeData;
            const gainValue = resolveControlValue('gain', {
                baseValue: gain.gain,
                modulatable: true,
                numericGate: true,
            });
            if (gainValue.value !== undefined) props.gain = gainValue.value;
            if (gainValue.base !== undefined) props.gainBase = gainValue.base;
            if (voiceEdges.some((edge) => edge.targetHandle === 'gain') && voiceContext) {
                props.nodeRef = voiceContext.gainRef;
            }
            break;
        }
        case 'output': {
            const output = nodeData as OutputNodeData;
            props.gain = output.masterGain;
            break;
        }
        case 'filter': {
            const filter = nodeData as FilterNodeData;
            props.type = filter.filterType;
            const frequency = resolveControlValue('frequency', { baseValue: filter.frequency, modulatable: true });
            if (frequency.value !== undefined) props.frequency = frequency.value;
            if (frequency.base !== undefined) props.frequencyBase = frequency.base;
            const qValue = resolveControlValue('q', { baseValue: filter.q, modulatable: true });
            if (qValue.value !== undefined) props.Q = qValue.value;
            if (qValue.base !== undefined) props.QBase = qValue.base;
            const detune = resolveControlValue('detune', { baseValue: filter.detune, modulatable: true });
            if (detune.value !== undefined) props.detune = detune.value;
            if (detune.base !== undefined) props.detuneBase = detune.base;
            const gainValue = resolveControlValue('gain', { baseValue: filter.gain, modulatable: true });
            if (gainValue.value !== undefined) props.gain = gainValue.value;
            if (gainValue.base !== undefined) props.gainBase = gainValue.base;
            if (voiceEdges.some((edge) => edge.targetHandle === 'frequency' || edge.targetHandle === 'q') && voiceContext) {
                props.nodeRef = voiceContext.filterRef;
            }
            break;
        }
        case 'delay': {
            const delay = nodeData as DelayNodeData;
            props.delayTime = delay.delayTime;
            props.feedback = delay.feedback;
            break;
        }
        case 'compressor': {
            const compressor = nodeData as CompressorNodeData;
            const threshold = resolveControlValue('threshold', { baseValue: compressor.threshold, modulatable: true });
            if (threshold.value !== undefined) props.threshold = threshold.value;
            const knee = resolveControlValue('knee', { baseValue: compressor.knee, modulatable: true });
            if (knee.value !== undefined) props.knee = knee.value;
            const ratio = resolveControlValue('ratio', { baseValue: compressor.ratio, modulatable: true });
            if (ratio.value !== undefined) props.ratio = ratio.value;
            const attack = resolveControlValue('attack', { baseValue: compressor.attack, modulatable: true });
            if (attack.value !== undefined) props.attack = attack.value;
            const release = resolveControlValue('release', { baseValue: compressor.release, modulatable: true });
            if (release.value !== undefined) props.release = release.value;
            const sidechainStrength = resolveControlValue('sidechainStrength', { baseValue: compressor.sidechainStrength ?? 0.7, modulatable: true });
            if (sidechainStrength.value !== undefined) props.sidechainStrength = sidechainStrength.value;
            const sidechainEdge = controlEdges.find((edge) => edge.targetHandle === 'sidechainIn');
            if (sidechainEdge) {
                props.sidechainBusId = `sc-${sidechainEdge.source}-${sidechainEdge.target}`;
            }
            break;
        }
        case 'phaser': {
            const phaser = nodeData as PhaserNodeData;
            const rate = resolveControlValue('rate', { baseValue: phaser.rate, modulatable: true });
            if (rate.value !== undefined) props.rate = rate.value;
            const depth = resolveControlValue('depth', { baseValue: phaser.depth, modulatable: true });
            if (depth.value !== undefined) props.depth = depth.value;
            const feedback = resolveControlValue('feedback', { baseValue: phaser.feedback, modulatable: true });
            if (feedback.value !== undefined) props.feedback = feedback.value;
            const baseFrequency = resolveControlValue('baseFrequency', { baseValue: phaser.baseFrequency, modulatable: true });
            if (baseFrequency.value !== undefined) props.baseFrequency = baseFrequency.value;
            const stages = resolveControlValue('stages', { baseValue: phaser.stages, modulatable: true });
            if (stages.value !== undefined) props.stages = stages.value;
            const mixValue = resolveControlValue('mix', { baseValue: phaser.mix, modulatable: true });
            if (mixValue.value !== undefined) props.mix = mixValue.value;
            break;
        }
        case 'flanger': {
            const flanger = nodeData as FlangerNodeData;
            const rate = resolveControlValue('rate', { baseValue: flanger.rate, modulatable: true });
            if (rate.value !== undefined) props.rate = rate.value;
            const depth = resolveControlValue('depth', { baseValue: flanger.depth, modulatable: true });
            if (depth.value !== undefined) props.depth = depth.value;
            const feedback = resolveControlValue('feedback', { baseValue: flanger.feedback, modulatable: true });
            if (feedback.value !== undefined) props.feedback = feedback.value;
            const delay = resolveControlValue('delay', { baseValue: flanger.delay, modulatable: true });
            if (delay.value !== undefined) props.delay = delay.value;
            const mixValue = resolveControlValue('mix', { baseValue: flanger.mix, modulatable: true });
            if (mixValue.value !== undefined) props.mix = mixValue.value;
            break;
        }
        case 'tremolo': {
            const tremolo = nodeData as TremoloNodeData;
            const rate = resolveControlValue('rate', { baseValue: tremolo.rate, modulatable: true });
            if (rate.value !== undefined) props.rate = rate.value;
            const depth = resolveControlValue('depth', { baseValue: tremolo.depth, modulatable: true });
            if (depth.value !== undefined) props.depth = depth.value;
            const mixValue = resolveControlValue('mix', { baseValue: tremolo.mix, modulatable: true });
            if (mixValue.value !== undefined) props.mix = mixValue.value;
            props.waveform = tremolo.waveform;
            props.stereo = tremolo.stereo;
            break;
        }
        case 'eq3': {
            const eq3 = nodeData as EQ3NodeData;
            const low = resolveControlValue('low', { baseValue: eq3.low, modulatable: true });
            if (low.value !== undefined) props.low = low.value;
            const mid = resolveControlValue('mid', { baseValue: eq3.mid, modulatable: true });
            if (mid.value !== undefined) props.mid = mid.value;
            const high = resolveControlValue('high', { baseValue: eq3.high, modulatable: true });
            if (high.value !== undefined) props.high = high.value;
            const lowFrequency = resolveControlValue('lowFrequency', { baseValue: eq3.lowFrequency, modulatable: true });
            if (lowFrequency.value !== undefined) props.lowFrequency = lowFrequency.value;
            const highFrequency = resolveControlValue('highFrequency', { baseValue: eq3.highFrequency, modulatable: true });
            if (highFrequency.value !== undefined) props.highFrequency = highFrequency.value;
            const mixValue = resolveControlValue('mix', { baseValue: eq3.mix, modulatable: true });
            if (mixValue.value !== undefined) props.mix = mixValue.value;
            break;
        }
        case 'reverb': {
            const reverb = nodeData as ReverbNodeData;
            props.decay = reverb.decay;
            props.mix = reverb.mix;
            break;
        }
        case 'distortion': {
            const distortion = nodeData as DistortionNodeData;
            props.type = distortion.distortionType;
            const drive = resolveControlValue('drive', { baseValue: distortion.drive, modulatable: true });
            if (drive.value !== undefined) props.drive = drive.value;
            const level = resolveControlValue('level', { baseValue: distortion.level, modulatable: true });
            if (level.value !== undefined) props.level = level.value;
            const mixValue = resolveControlValue('mix', { baseValue: distortion.mix, modulatable: true });
            if (mixValue.value !== undefined) props.mix = mixValue.value;
            const tone = resolveControlValue('tone', { baseValue: distortion.tone, modulatable: true });
            if (tone.value !== undefined) props.tone = tone.value;
            break;
        }
        case 'chorus': {
            const chorus = nodeData as ChorusNodeData;
            const rate = resolveControlValue('rate', { baseValue: chorus.rate, modulatable: true });
            if (rate.value !== undefined) props.rate = rate.value;
            const depth = resolveControlValue('depth', { baseValue: chorus.depth, modulatable: true });
            if (depth.value !== undefined) props.depth = depth.value;
            const feedback = resolveControlValue('feedback', { baseValue: chorus.feedback, modulatable: true });
            if (feedback.value !== undefined) props.feedback = feedback.value;
            const delay = resolveControlValue('delay', { baseValue: chorus.delay, modulatable: true });
            if (delay.value !== undefined) props.delay = delay.value;
            const mixValue = resolveControlValue('mix', { baseValue: chorus.mix, modulatable: true });
            if (mixValue.value !== undefined) props.mix = mixValue.value;
            if (chorus.stereo) props.stereo = true;
            break;
        }
        case 'noiseBurst': {
            const burst = nodeData as NoiseBurstNodeData;
            props.type = burst.noiseType;
            const duration = resolveControlValue('duration', { baseValue: burst.duration, modulatable: true });
            if (duration.value !== undefined) props.duration = duration.value;
            const gainValue = resolveControlValue('gain', { baseValue: burst.gain, modulatable: true });
            if (gainValue.value !== undefined) props.gain = gainValue.value;
            const attack = resolveControlValue('attack', { baseValue: burst.attack, modulatable: true });
            if (attack.value !== undefined) props.attack = attack.value;
            const release = resolveControlValue('release', { baseValue: burst.release, modulatable: true });
            if (release.value !== undefined) props.release = release.value;
            break;
        }
        case 'waveShaper': {
            const waveShaper = nodeData as WaveShaperNodeData;
            const amount = resolveControlValue('amount', { baseValue: waveShaper.amount });
            if (amount.value !== undefined) props.amount = amount.value;
            props.preset = waveShaper.preset;
            props.oversample = waveShaper.oversample;
            break;
        }
        case 'convolver': {
            const convolver = nodeData as ConvolverNodeData;
            const impulseForExport = resolveConvolverImpulseForExport(convolver);
            if (impulseForExport) {
                props.impulse = impulseForExport;
            }
            props.normalize = convolver.normalize;
            break;
        }
        case 'analyzer': {
            const analyzer = nodeData as AnalyzerNodeData;
            props.fftSize = analyzer.fftSize;
            props.smoothingTimeConstant = analyzer.smoothingTimeConstant;
            props.updateRate = analyzer.updateRate;
            props.autoUpdate = analyzer.autoUpdate;
            break;
        }
        case 'panner': {
            const pan = nodeData as StereoPannerNodeData;
            props.pan = pan.pan;
            break;
        }
        case 'panner3d': {
            const panner = nodeData as Panner3DNodeData;
            const x = resolveControlValue('positionX', { baseValue: panner.positionX, modulatable: true });
            if (x.value !== undefined) props.positionX = x.value;
            const y = resolveControlValue('positionY', { baseValue: panner.positionY, modulatable: true });
            if (y.value !== undefined) props.positionY = y.value;
            const z = resolveControlValue('positionZ', { baseValue: panner.positionZ, modulatable: true });
            if (z.value !== undefined) props.positionZ = z.value;
            const refDistance = resolveControlValue('refDistance', { baseValue: panner.refDistance, modulatable: true });
            if (refDistance.value !== undefined) props.refDistance = refDistance.value;
            const maxDistance = resolveControlValue('maxDistance', { baseValue: panner.maxDistance, modulatable: true });
            if (maxDistance.value !== undefined) props.maxDistance = maxDistance.value;
            const rolloff = resolveControlValue('rolloffFactor', { baseValue: panner.rolloffFactor, modulatable: true });
            if (rolloff.value !== undefined) props.rolloffFactor = rolloff.value;
            props.panningModel = panner.panningModel;
            props.distanceModel = panner.distanceModel;
            break;
        }
        case 'noise': {
            const noise = nodeData as NoiseNodeData;
            props.type = noise.noiseType;
            props.autoStart = true;
            break;
        }
        case 'constantSource': {
            const source = nodeData as ConstantSourceNodeData;
            const offset = resolveControlValue('offset', { baseValue: source.offset, modulatable: true });
            if (offset.value !== undefined) props.offset = offset.value;
            props.autoStart = true;
            break;
        }
        case 'mediaStream': {
            const stream = nodeData as MediaStreamNodeData;
            if (stream.requestMic) props.requestMic = true;
            break;
        }
        case 'sampler': {
            const sampler = nodeData as SamplerNodeData;
            props.src = resolveSamplerSrcForExport(sampler);
            if (sampler.loop) props.loop = sampler.loop;
            if (sampler.playbackRate !== undefined && sampler.playbackRate !== 1) {
                props.playbackRate = sampler.playbackRate;
            }
            if (sampler.detune !== undefined && sampler.detune !== 0) {
                props.detune = sampler.detune;
            }
            const hasTrigger = controlEdges.some((edge) => edge.targetHandle === 'trigger');
            if (voiceEdges.some((edge) => edge.targetHandle === 'trigger') && voiceContext) {
                props.active = voiceContext.gate;
                props.duration = voiceContext.duration;
            }
            if (!hasTrigger) {
                props.autoStart = true;
            }
            break;
        }
        case 'auxSend': {
            const auxSend = nodeData as AuxSendNodeData;
            props.busId = auxSend.busId || 'aux';
            props.tap = auxSend.tap || 'pre';
            const sendGain = resolveControlValue('sendGain', { baseValue: auxSend.sendGain, modulatable: true });
            if (sendGain.value !== undefined) props.sendGain = sendGain.value;
            break;
        }
        case 'auxReturn': {
            const auxReturn = nodeData as AuxReturnNodeData;
            props.busId = auxReturn.busId || 'aux';
            const gain = resolveControlValue('gain', { baseValue: auxReturn.gain, modulatable: true });
            if (gain.value !== undefined) props.gain = gain.value;
            break;
        }
        case 'matrixMixer': {
            const matrix = nodeData as MatrixMixerNodeData;
            props.inputs = matrix.inputs;
            props.outputs = matrix.outputs;
            props.matrix = matrix.matrix;
            break;
        }
        default:
            break;
    }

    return props;
}

function buildPreviewAdsrProps(
    adsr: ADSRNodeData,
    voiceContext: VoiceRenderProps | undefined,
    voiceEdge: Edge | null | undefined,
    usesEnvelope: boolean
): Record<string, any> {
    const props: Record<string, any> = {};
    if (adsr.attack !== undefined) props.attack = adsr.attack;
    if (adsr.decay !== undefined) props.decay = adsr.decay;
    if (adsr.sustain !== undefined) props.sustain = adsr.sustain;
    if (adsr.release !== undefined) props.release = adsr.release;

    if (!usesEnvelope && voiceEdge && voiceContext) {
        props.trigger = voiceContext.gate;
        props.velocity = voiceContext.velocity;
        props.duration = voiceContext.duration;
    }

    return props;
}

interface PreviewFeedbackDelayProps {
    children?: React.ReactNode;
    delayTime?: number;
    feedback?: number;
    maxDelayTime?: number;
    bypass?: boolean;
}

function PreviewFeedbackDelay({
    children,
    delayTime = 0,
    feedback = 0,
    maxDelayTime = 2,
    bypass = false,
}: PreviewFeedbackDelayProps) {
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
            try { input.disconnect(); } catch { /* ignore */ }
            try { delay.disconnect(); } catch { /* ignore */ }
            try { feedbackGain.disconnect(); } catch { /* ignore */ }
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
                // Ignore disconnect errors during teardown.
            }
        };
    }, [outputNode, bypass]);

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
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
}

function generateFeedbackDelayHelper(): string {
    return [
        'type FeedbackDelayProps = {',
        '    children?: ReactNode;',
        '    delayTime?: number;',
        '    feedback?: number;',
        '    maxDelayTime?: number;',
        '    bypass?: boolean;',
        '};',
        '',
        'const FeedbackDelay = ({',
        '    children,',
        '    delayTime = 0,',
        '    feedback = 0,',
        '    maxDelayTime = 2,',
        '    bypass = false,',
        '}: FeedbackDelayProps) => {',
        '    const { context } = useAudio();',
        '    const { outputNode } = useAudioOut();',
        '    const inputRef = useRef<GainNode | null>(null);',
        '    const delayRef = useRef<DelayNode | null>(null);',
        '    const feedbackRef = useRef<GainNode | null>(null);',
        '',
        '    useEffect(() => {',
        '        if (!context) return;',
        '',
        '        const input = context.createGain();',
        '        const delay = context.createDelay(maxDelayTime);',
        '        const feedbackGain = context.createGain();',
        '',
        '        input.connect(delay);',
        '        delay.connect(feedbackGain);',
        '        feedbackGain.connect(delay);',
        '',
        '        inputRef.current = input;',
        '        delayRef.current = delay;',
        '        feedbackRef.current = feedbackGain;',
        '',
        '        return () => {',
        '            try { input.disconnect(); } catch {}',
        '            try { delay.disconnect(); } catch {}',
        '            try { feedbackGain.disconnect(); } catch {}',
        '            inputRef.current = null;',
        '            delayRef.current = null;',
        '            feedbackRef.current = null;',
        '        };',
        '    }, [context, maxDelayTime]);',
        '',
        '    useEffect(() => {',
        '        if (!delayRef.current || !outputNode || bypass) return;',
        '        delayRef.current.connect(outputNode);',
        '        return () => {',
        '            try {',
        '                delayRef.current?.disconnect(outputNode);',
        '            } catch {}',
        '        };',
        '    }, [outputNode, bypass]);',
        '',
        '    useEffect(() => {',
        '        if (delayRef.current) {',
        '            delayRef.current.delayTime.value = delayTime;',
        '        }',
        '    }, [delayTime]);',
        '',
        '    useEffect(() => {',
        '        if (feedbackRef.current) {',
        '            feedbackRef.current.gain.value = feedback;',
        '        }',
        '    }, [feedback]);',
        '',
        '    return (',
        '        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>',
        '            {children}',
        '        </AudioOutProvider>',
        '    );',
        '};',
    ].join('\n');
}
