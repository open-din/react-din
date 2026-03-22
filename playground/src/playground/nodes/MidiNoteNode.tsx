import { memo, useEffect, useMemo, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMidi, useMidiNote } from '../../../../src/midi';
import { audioEngine } from '../AudioEngine';
import { normalizeMidiNoteNodeData } from '../nodeHelpers';
import { useAudioGraphStore, type MidiInMapping, type MidiNoteNodeData } from '../store';
import { buildInputOptions, getChannelFilterValue, getStatusBadge } from './midiNodeUtils';

const createMappingId = (inputId: string, channel: number) => `${inputId}:${channel}`;

const findMappingIdForSelection = (
    mappings: MidiInMapping[],
    inputId: MidiNoteNodeData['inputId'],
    channel: MidiNoteNodeData['channel']
): string | null => {
    if (inputId === 'default' || inputId === 'all' || channel === 'all') return null;
    return mappings.find((mapping) => mapping.inputId === inputId && mapping.channel === channel)?.mappingId ?? null;
};

const resolveInputLabel = (
    inputId: MidiNoteNodeData['inputId'],
    mappings: MidiInMapping[],
    availableInputs: Array<{ id: string; name: string }>
) => {
    if (inputId === 'default') return 'Default';
    if (inputId === 'all') return 'All Inputs';
    return availableInputs.find((input) => input.id === inputId)?.name
        ?? mappings.find((mapping) => mapping.inputId === inputId)?.inputName
        ?? inputId;
};

const describeSelection = (
    data: MidiNoteNodeData,
    availableInputs: Array<{ id: string; name: string }>
) => `${resolveInputLabel(data.inputId, data.mappings, availableInputs)} / ${data.channel === 'all' ? 'All Channels' : `Ch ${data.channel}`}`;

const getMostRecentMapping = (mappings: MidiInMapping[]) =>
    [...mappings].sort((left, right) => right.lastSeenAt - left.lastSeenAt)[0] ?? null;

const MidiNoteNode = memo(({ id, data, selected }: NodeProps) => {
    const midiData = useMemo(
        () => normalizeMidiNoteNodeData(data as MidiNoteNodeData),
        [data]
    );
    const updateNodeData = useAudioGraphStore((state) => state.updateNodeData);
    const midi = useMidi();
    const midiNote = useMidiNote({
        inputId: midiData.inputId,
        channel: midiData.channel,
        note: midiData.noteMode === 'single'
            ? midiData.note
            : midiData.noteMode === 'range'
                ? [midiData.noteMin, midiData.noteMax]
                : undefined,
    });
    const learnBaselineSeqRef = useRef<number | null>(null);
    const previousMappingEnabledRef = useRef(midiData.mappingEnabled);

    const inputOptions = useMemo(
        () => buildInputOptions(midi.inputs, midiData.inputId),
        [midi.inputs, midiData.inputId]
    );
    const activeMapping = useMemo(
        () => midiData.mappings.find((mapping) => mapping.mappingId === midiData.activeMappingId) ?? null,
        [midiData.activeMappingId, midiData.mappings]
    );
    const sortedMappings = useMemo(
        () => [...midiData.mappings].sort((left, right) => right.lastSeenAt - left.lastSeenAt),
        [midiData.mappings]
    );
    const connectedInputIds = useMemo(
        () => new Set(midi.inputs.map((input) => input.id)),
        [midi.inputs]
    );

    const commitPatch = (
        patch: Partial<MidiNoteNodeData>,
        options?: { syncActiveMappingFromSelection?: boolean }
    ) => {
        const merged = {
            ...midiData,
            ...patch,
        } as MidiNoteNodeData;

        if (options?.syncActiveMappingFromSelection && !('activeMappingId' in patch)) {
            merged.activeMappingId = findMappingIdForSelection(
                Array.isArray(merged.mappings) ? merged.mappings : [],
                merged.inputId,
                merged.channel
            );
        }

        const nextData = normalizeMidiNoteNodeData(merged);
        updateNodeData(id, nextData);
        audioEngine.updateNode(id, nextData);
    };

    useEffect(() => {
        if (midiData.mappingEnabled && !previousMappingEnabledRef.current) {
            learnBaselineSeqRef.current = midi.lastInputEvent?.seq ?? null;
        }
        previousMappingEnabledRef.current = midiData.mappingEnabled;
    }, [midi.lastInputEvent?.seq, midiData.mappingEnabled]);

    useEffect(() => {
        const event = midi.lastInputEvent;
        if (!midiData.mappingEnabled || !event) return;
        if (event.kind !== 'noteon' && event.kind !== 'noteoff') return;
        if (event.note === null || event.channel === null) return;
        if (learnBaselineSeqRef.current !== null && event.seq <= learnBaselineSeqRef.current) return;

        learnBaselineSeqRef.current = event.seq;

        const mappingId = createMappingId(event.inputId, event.channel);
        const inputName = midi.inputs.find((input) => input.id === event.inputId)?.name ?? event.inputId;
        const nextMapping: MidiInMapping = {
            mappingId,
            inputId: event.inputId,
            inputName,
            channel: event.channel,
            lastNote: event.note,
            lastVelocity: event.velocity ?? 0,
            lastSeenAt: event.receivedAt ?? Date.now(),
        };

        const nextMappings = midiData.mappings.some((mapping) => mapping.mappingId === mappingId)
            ? midiData.mappings.map((mapping) => mapping.mappingId === mappingId ? nextMapping : mapping)
            : [...midiData.mappings, nextMapping];

        commitPatch({
            mappings: nextMappings,
            activeMappingId: mappingId,
            inputId: event.inputId,
            channel: event.channel,
        });
    }, [id, midi.inputs, midi.lastInputEvent, midiData.mappingEnabled, midiData.mappings]);

    const badge = getStatusBadge(midi.status, midiNote.gate);
    const activeSourceLabel = activeMapping
        ? `${activeMapping.inputName} / Ch ${activeMapping.channel}`
        : `Manual / ${describeSelection(midiData, midi.inputs)}`;

    const handleActivateMapping = (mappingId: string) => {
        const mapping = midiData.mappings.find((item) => item.mappingId === mappingId);
        if (!mapping) return;
        commitPatch({
            activeMappingId: mapping.mappingId,
            inputId: mapping.inputId,
            channel: mapping.channel,
        });
    };

    const handleRemoveMapping = (mappingId: string) => {
        const remainingMappings = midiData.mappings.filter((mapping) => mapping.mappingId !== mappingId);
        const removingActive = midiData.activeMappingId === mappingId;
        const fallbackMapping = removingActive ? getMostRecentMapping(remainingMappings) : null;

        commitPatch({
            mappings: remainingMappings,
            activeMappingId: removingActive ? fallbackMapping?.mappingId ?? null : midiData.activeMappingId,
            inputId: removingActive && fallbackMapping ? fallbackMapping.inputId : midiData.inputId,
            channel: removingActive && fallbackMapping ? fallbackMapping.channel : midiData.channel,
        });
    };

    return (
        <div className={`audio-node midi-note-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ background: '#4dd4a0', color: '#093d2c' }}>
                <span className="node-icon">🎹</span>
                <span className="node-title">{midiData.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Status</label>
                    <span className="value">{badge}</span>
                </div>
                <div className="node-control">
                    <label>Access</label>
                    {midi.status === 'granted' ? (
                        <span className="value">Connected</span>
                    ) : (
                        <button type="button" onClick={() => void midi.requestAccess()}>
                            Connect MIDI
                        </button>
                    )}
                </div>
                <div className="node-control">
                    <label>Map</label>
                    <button
                        type="button"
                        aria-pressed={midiData.mappingEnabled}
                        onClick={() => commitPatch({ mappingEnabled: !midiData.mappingEnabled })}
                    >
                        {midiData.mappingEnabled ? 'Map On' : 'Map Off'}
                    </button>
                </div>
                <div className="node-control">
                    <label>Active Source</label>
                    <span className="value">{activeSourceLabel}</span>
                </div>
                <div className="node-control">
                    <label>Mapped Sources</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sortedMappings.length === 0 ? (
                            <span className="value">{midiData.mappingEnabled ? 'Listening for MIDI...' : 'No mapped sources'}</span>
                        ) : (
                            sortedMappings.map((mapping) => {
                                const isActive = mapping.mappingId === midiData.activeMappingId;
                                const isConnected = connectedInputIds.has(mapping.inputId);
                                return (
                                    <div
                                        key={mapping.mappingId}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto',
                                            gap: 6,
                                            alignItems: 'stretch',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            aria-pressed={isActive}
                                            onClick={() => handleActivateMapping(mapping.mappingId)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                gap: 4,
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                border: `1px solid ${isActive ? '#4dd4a0' : '#3b4a57'}`,
                                                background: isActive ? 'rgba(77, 212, 160, 0.16)' : 'rgba(9, 17, 26, 0.45)',
                                                color: 'inherit',
                                                textAlign: 'left',
                                            }}
                                        >
                                            <span>{mapping.inputName} / Ch {mapping.channel}</span>
                                            <span className="value">
                                                {isActive ? 'Active' : 'Mapped'} / {isConnected ? 'Connected' : 'Disconnected'}
                                            </span>
                                            <span className="value">
                                                Note {mapping.lastNote} / Vel {mapping.lastVelocity.toFixed(2)}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${mapping.inputName} channel ${mapping.channel}`}
                                            onClick={() => handleRemoveMapping(mapping.mappingId)}
                                            style={{ padding: '8px 10px' }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div className="node-control">
                    <label>Input Device</label>
                    <select
                        value={midiData.inputId}
                        onChange={(event) => commitPatch({
                            inputId: event.target.value as MidiNoteNodeData['inputId'],
                        }, { syncActiveMappingFromSelection: true })}
                    >
                        {inputOptions.map((option) => (
                            <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Channel</label>
                    <select
                        value={getChannelFilterValue(midiData.channel)}
                        onChange={(event) => commitPatch({
                            channel: event.target.value === 'all' ? 'all' : Number(event.target.value),
                        }, { syncActiveMappingFromSelection: true })}
                    >
                        <option value="all">All</option>
                        {Array.from({ length: 16 }, (_, index) => (
                            <option key={index + 1} value={index + 1}>{index + 1}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Filter</label>
                    <select
                        value={midiData.noteMode}
                        onChange={(event) => commitPatch({ noteMode: event.target.value as MidiNoteNodeData['noteMode'] })}
                    >
                        <option value="all">All Notes</option>
                        <option value="single">Single Note</option>
                        <option value="range">Range</option>
                    </select>
                </div>
                {midiData.noteMode === 'single' && (
                    <div className="node-control">
                        <label>Note</label>
                        <input
                            type="number"
                            min="0"
                            max="127"
                            value={midiData.note}
                            onChange={(event) => commitPatch({ note: Number(event.target.value) })}
                        />
                    </div>
                )}
                {midiData.noteMode === 'range' && (
                    <>
                        <div className="node-control">
                            <label>Note Min</label>
                            <input
                                type="number"
                                min="0"
                                max="127"
                                value={midiData.noteMin}
                                onChange={(event) => commitPatch({ noteMin: Number(event.target.value) })}
                            />
                        </div>
                        <div className="node-control">
                            <label>Note Max</label>
                            <input
                                type="number"
                                min="0"
                                max="127"
                                value={midiData.noteMax}
                                onChange={(event) => commitPatch({ noteMax: Number(event.target.value) })}
                            />
                        </div>
                    </>
                )}
                <div className="node-control">
                    <label>Last Note</label>
                    <span className="value">{midiNote.note ?? '-'}</span>
                </div>
                <div className="node-control">
                    <label>Velocity</label>
                    <span className="value">{midiNote.velocity.toFixed(2)}</span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} id="trigger" style={{ top: '22%', background: '#ff4466' }} />
            <Handle type="source" position={Position.Right} id="frequency" style={{ top: '38%', background: '#ff9f43' }} />
            <Handle type="source" position={Position.Right} id="note" style={{ top: '54%', background: '#ffd166' }} />
            <Handle type="source" position={Position.Right} id="gate" style={{ top: '70%', background: '#44cc44' }} />
            <Handle type="source" position={Position.Right} id="velocity" style={{ top: '86%', background: '#4488ff' }} />
        </div>
    );
});

MidiNoteNode.displayName = 'MidiNoteNode';
export default MidiNoteNode;
