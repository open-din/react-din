import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMidi } from '../../../../src/midi';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import { useAudioGraphStore, type MidiNoteOutputNodeData } from '../store';
import { buildOutputOptions } from './midiNodeUtils';

const MidiNoteOutputNode = memo(({ id, data, selected }: NodeProps) => {
    const midiData = data as MidiNoteOutputNodeData;
    const updateNodeData = useAudioGraphStore((state) => state.updateNodeData);
    const midi = useMidi();
    const gateConnection = useTargetHandleConnection(id, 'gate');
    const noteConnection = useTargetHandleConnection(id, 'note');
    const frequencyConnection = useTargetHandleConnection(id, 'frequency');
    const velocityConnection = useTargetHandleConnection(id, 'velocity');

    const handleChange = (patch: Partial<MidiNoteOutputNodeData>) => {
        updateNodeData(id, patch);
        audioEngine.updateNode(id, patch);
    };

    return (
        <div className={`audio-node midi-note-output-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ background: '#4dd4a0', color: '#093d2c' }}>
                <span className="node-icon">📤</span>
                <span className="node-title">{midiData.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Status</label>
                    <span className="value">{midi.lastOutputEvent?.kind === 'noteon' ? 'Sending' : 'Ready'}</span>
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
                    <label>Output Device</label>
                    <select
                        value={midiData.outputId ?? ''}
                        onChange={(event) => handleChange({ outputId: event.target.value || null })}
                    >
                        {buildOutputOptions(midi.outputs, midiData.outputId).map((option) => (
                            <option key={option.value} value={option.value} disabled={option.disabled}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Channel</label>
                    <input
                        type="number"
                        min="1"
                        max="16"
                        value={midiData.channel}
                        onChange={(event) => handleChange({ channel: Number(event.target.value) })}
                    />
                </div>
                <div className="node-control">
                    <label>Gate</label>
                    {gateConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(gateConnection.value)}</div>
                    ) : (
                        <select value={midiData.gate} onChange={(event) => handleChange({ gate: Number(event.target.value) })}>
                            <option value={0}>Off</option>
                            <option value={1}>On</option>
                        </select>
                    )}
                    <Handle type="target" position={Position.Left} id="gate" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Note</label>
                    {noteConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(noteConnection.value, (value) => String(Math.round(value)))}</div>
                    ) : (
                        <input
                            type="number"
                            min="0"
                            max="127"
                            value={midiData.note}
                            onChange={(event) => handleChange({ note: Number(event.target.value) })}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="note" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Frequency</label>
                    {frequencyConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(frequencyConnection.value, (value) => `${Math.round(value)} Hz`)}</div>
                    ) : (
                        <input
                            type="number"
                            min="1"
                            step="0.1"
                            value={midiData.frequency}
                            onChange={(event) => handleChange({ frequency: Number(event.target.value) })}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="frequency" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Velocity</label>
                    {velocityConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(velocityConnection.value)}</div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={midiData.velocity}
                            onChange={(event) => handleChange({ velocity: Number(event.target.value) })}
                        />
                    )}
                    {!velocityConnection.connected && <span className="value">{midiData.velocity.toFixed(2)}</span>}
                    <Handle type="target" position={Position.Left} id="velocity" className="handle handle-in handle-param" />
                </div>
            </div>

            <Handle type="target" position={Position.Left} id="trigger" style={{ top: '18%', background: '#ff4466' }} />
        </div>
    );
});

MidiNoteOutputNode.displayName = 'MidiNoteOutputNode';
export default MidiNoteOutputNode;
