import { memo, useEffect, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMidi, useMidiCC } from '../../../../src/midi';
import { audioEngine } from '../AudioEngine';
import { useAudioGraphStore, type MidiCCNodeData } from '../store';
import { buildInputOptions, getChannelFilterValue, getStatusBadge } from './midiNodeUtils';

const MidiCCNode = memo(({ id, data, selected }: NodeProps) => {
    const midiData = data as MidiCCNodeData;
    const updateNodeData = useAudioGraphStore((state) => state.updateNodeData);
    const midi = useMidi();
    const midiCC = useMidiCC({
        inputId: midiData.inputId,
        channel: midiData.channel,
        cc: midiData.cc,
    });
    const [learning, setLearning] = useState(false);

    useEffect(() => {
        const event = midi.lastInputEvent;
        if (!learning || !event || event.kind !== 'cc' || event.cc === null || event.channel === null) return;
        updateNodeData(id, {
            inputId: event.inputId,
            channel: event.channel,
            cc: event.cc,
        });
        audioEngine.updateNode(id, {
            inputId: event.inputId,
            channel: event.channel,
            cc: event.cc,
        });
        setLearning(false);
    }, [audioEngine, id, learning, midi.lastInputEvent, updateNodeData]);

    const inputOptions = useMemo(
        () => buildInputOptions(midi.inputs, midiData.inputId),
        [midi.inputs, midiData.inputId]
    );

    const handleChange = (patch: Partial<MidiCCNodeData>) => {
        updateNodeData(id, patch);
        audioEngine.updateNode(id, patch);
    };

    return (
        <div className={`audio-node midi-cc-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ background: '#4dd4a0', color: '#093d2c' }}>
                <span className="node-icon">🎛️</span>
                <span className="node-title">{midiData.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Status</label>
                    <span className="value">{getStatusBadge(midi.status, midiCC.lastEvent !== null)}</span>
                </div>
                {midi.status !== 'granted' && (
                    <div className="node-control">
                        <label>Access</label>
                        <button type="button" onClick={() => void midi.requestAccess()}>
                            Connect MIDI
                        </button>
                    </div>
                )}
                <div className="node-control">
                    <label>Input Device</label>
                    <select
                        value={midiData.inputId}
                        onChange={(event) => handleChange({ inputId: event.target.value as MidiCCNodeData['inputId'] })}
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
                        onChange={(event) => handleChange({
                            channel: event.target.value === 'all' ? 'all' : Number(event.target.value),
                        })}
                    >
                        <option value="all">All</option>
                        {Array.from({ length: 16 }, (_, index) => (
                            <option key={index + 1} value={index + 1}>{index + 1}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Controller</label>
                    <input
                        type="number"
                        min="0"
                        max="127"
                        value={midiData.cc}
                        onChange={(event) => handleChange({ cc: Number(event.target.value) })}
                    />
                </div>
                <div className="node-control">
                    <label>Learn</label>
                    <button type="button" onClick={() => setLearning((value) => !value)}>
                        {learning ? 'Waiting...' : 'Learn'}
                    </button>
                </div>
                <div className="node-control">
                    <label>Normalized</label>
                    <span className="value">{midiCC.normalized.toFixed(2)}</span>
                </div>
                <div className="node-control">
                    <label>Raw</label>
                    <span className="value">{midiCC.raw}</span>
                </div>
            </div>

            <Handle type="source" position={Position.Right} id="normalized" style={{ top: '40%', background: '#4488ff' }} />
            <Handle type="source" position={Position.Right} id="raw" style={{ top: '68%', background: '#ffd166' }} />
        </div>
    );
});

MidiCCNode.displayName = 'MidiCCNode';
export default MidiCCNode;
