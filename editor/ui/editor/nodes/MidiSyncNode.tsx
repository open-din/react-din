import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useMidi, useMidiClock } from '../../../../src/midi';
import { audioEngine } from '../AudioEngine';
import { useAudioGraphStore, type MidiSyncNodeData } from '../store';
import { buildInputOptions, buildOutputOptions } from './midiNodeUtils';

const MidiSyncNode = memo(({ id, data, selected }: NodeProps) => {
    const midiData = data as MidiSyncNodeData;
    const updateNodeData = useAudioGraphStore((state) => state.updateNodeData);
    const midi = useMidi();
    const clock = useMidiClock({ inputId: midiData.inputId ?? undefined });

    const handleChange = (patch: Partial<MidiSyncNodeData>) => {
        updateNodeData(id, patch);
        audioEngine.updateNode(id, patch);
    };

    const clockBadge = clock.running ? 'Clock locked' : 'Clock idle';

    return (
        <div className={`audio-node midi-sync-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ background: '#4dd4a0', color: '#093d2c' }}>
                <span className="node-icon">⏱️</span>
                <span className="node-title">{midiData.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Status</label>
                    <span className="value">{clockBadge}</span>
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
                    <label>Mode</label>
                    <select
                        value={midiData.mode}
                        onChange={(event) => handleChange({ mode: event.target.value as MidiSyncNodeData['mode'] })}
                    >
                        <option value="transport-master">Transport Master</option>
                        <option value="midi-master">MIDI Master</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Input Device</label>
                    <select
                        value={midiData.inputId ?? 'default'}
                        onChange={(event) => handleChange({ inputId: event.target.value === 'default' ? null : event.target.value })}
                    >
                        {buildInputOptions(midi.inputs, (midiData.inputId ?? 'default') as string | 'default' | 'all')
                            .filter((option) => option.value !== 'all')
                            .map((option) => (
                                <option key={option.value} value={option.value} disabled={option.disabled}>
                                    {option.label}
                                </option>
                            ))}
                    </select>
                </div>
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
                    <label>Send Start / Stop</label>
                    <select
                        value={midiData.sendStartStop ? 'yes' : 'no'}
                        onChange={(event) => handleChange({ sendStartStop: event.target.value === 'yes' })}
                    >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Send Clock</label>
                    <select
                        value={midiData.sendClock ? 'yes' : 'no'}
                        onChange={(event) => handleChange({ sendClock: event.target.value === 'yes' })}
                    >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Clock Source</label>
                    <span className="value">{clock.source.name ?? '-'}</span>
                </div>
                <div className="node-control">
                    <label>Clock BPM</label>
                    <span className="value">{clock.bpmEstimate ? clock.bpmEstimate.toFixed(1) : '-'}</span>
                </div>
            </div>
        </div>
    );
});

MidiSyncNode.displayName = 'MidiSyncNode';
export default MidiSyncNode;
