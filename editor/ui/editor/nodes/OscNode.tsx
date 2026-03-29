import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type OscNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const waveforms: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

const OscNode = memo(({ id, data, selected }: NodeProps) => {
    const oscData = data as OscNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const frequencyConnection = useTargetHandleConnection(id, 'frequency');
    const detuneConnection = useTargetHandleConnection(id, 'detune');

    const handleFrequencyChange = (value: number) => {
        updateNodeData(id, { frequency: value });
        audioEngine.updateNode(id, { frequency: value });
    };

    const handleDetuneChange = (value: number) => {
        updateNodeData(id, { detune: value });
        audioEngine.updateNode(id, { detune: value });
    };

    const handleWaveformChange = (value: OscillatorType) => {
        updateNodeData(id, { waveform: value });
        audioEngine.updateNode(id, { waveform: value });
    };

    return (
        <div className={`audio-node osc-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">◐</span>
                    <span className="node-title">Oscillator</span>
                </div>
                {/* Audio Out aligned with header/top */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Audio Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Type</label>
                    <select
                        value={oscData.waveform}
                        onChange={(e) => handleWaveformChange(e.target.value as OscillatorType)}
                        title="Waveform type"
                    >
                        {waveforms.map((w) => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Freq</label>
                    {frequencyConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(frequencyConnection.value, (value) => `${Math.round(value)} Hz`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="20"
                            max="2000"
                            value={oscData.frequency}
                            onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                            title="Frequency in Hz"
                        />
                    )}
                    {!frequencyConnection.connected && <span className="value">{Math.round(oscData.frequency)} Hz</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="frequency"
                        className="handle handle-in handle-param"
                    />
                </div>
                <div className="node-control">
                    <label>Detune</label>
                    {detuneConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(detuneConnection.value, (value) => `${Math.round(value)} c`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="-1200"
                            max="1200"
                            step="10"
                            value={oscData.detune}
                            onChange={(e) => handleDetuneChange(Number(e.target.value))}
                            title="Detune in cents"
                        />
                    )}
                    {!detuneConnection.connected && <span className="value">{oscData.detune} c</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="detune"
                        className="handle handle-in handle-param"
                    />
                </div>
            </div>
        </div>
    );
});

OscNode.displayName = 'OscNode';
export default OscNode;
