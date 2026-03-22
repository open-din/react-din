import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useMidi } from '../../../../src/midi';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import { useAudioGraphStore, type MidiCCOutputNodeData } from '../store';
import { buildOutputOptions } from './midiNodeUtils';

const MidiCCOutputNode = memo(({ id, data, selected }: NodeProps) => {
    const midiData = data as MidiCCOutputNodeData;
    const updateNodeData = useAudioGraphStore((state) => state.updateNodeData);
    const midi = useMidi();
    const valueConnection = useTargetHandleConnection(id, 'value');

    const handleChange = (patch: Partial<MidiCCOutputNodeData>) => {
        updateNodeData(id, patch);
        audioEngine.updateNode(id, patch);
    };

    return (
        <div className={`audio-node midi-cc-output-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ background: '#4dd4a0', color: '#093d2c' }}>
                <span className="node-icon">📤</span>
                <span className="node-title">{midiData.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Status</label>
                    <span className="value">{midi.lastOutputEvent?.kind === 'cc' ? 'Sending' : 'Ready'}</span>
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
                    <label>Value Mode</label>
                    <select
                        value={midiData.valueFormat}
                        onChange={(event) => handleChange({ valueFormat: event.target.value as MidiCCOutputNodeData['valueFormat'] })}
                    >
                        <option value="normalized">Normalized</option>
                        <option value="raw">Raw</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Value</label>
                    {valueConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(valueConnection.value)}</div>
                    ) : (
                        <input
                            type="number"
                            min={midiData.valueFormat === 'raw' ? 0 : 0}
                            max={midiData.valueFormat === 'raw' ? 127 : 1}
                            step={midiData.valueFormat === 'raw' ? 1 : 0.01}
                            value={midiData.value}
                            onChange={(event) => handleChange({ value: Number(event.target.value) })}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="value" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

MidiCCOutputNode.displayName = 'MidiCCOutputNode';
export default MidiCCOutputNode;
