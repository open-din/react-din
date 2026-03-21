import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type EQ3NodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const EQ3Node = memo(({ id, data, selected }: NodeProps) => {
    const eqData = data as EQ3NodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const lowConnection = useTargetHandleConnection(id, 'low');
    const midConnection = useTargetHandleConnection(id, 'mid');
    const highConnection = useTargetHandleConnection(id, 'high');
    const lowFreqConnection = useTargetHandleConnection(id, 'lowFrequency');
    const highFreqConnection = useTargetHandleConnection(id, 'highFrequency');
    const mixConnection = useTargetHandleConnection(id, 'mix');

    const handleChange = (key: keyof EQ3NodeData, value: number) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node eq3-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#7a9cff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🎚️</span>
                    <span className="node-title">EQ3</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Low</label>
                    {lowConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(lowConnection.value, (value) => `${value.toFixed(1)} dB`)}</div>
                    ) : (
                        <input type="range" min="-24" max="24" step="0.1" value={eqData.low} onChange={(e) => handleChange('low', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="low" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Mid</label>
                    {midConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(midConnection.value, (value) => `${value.toFixed(1)} dB`)}</div>
                    ) : (
                        <input type="range" min="-24" max="24" step="0.1" value={eqData.mid} onChange={(e) => handleChange('mid', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="mid" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>High</label>
                    {highConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(highConnection.value, (value) => `${value.toFixed(1)} dB`)}</div>
                    ) : (
                        <input type="range" min="-24" max="24" step="0.1" value={eqData.high} onChange={(e) => handleChange('high', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="high" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Low Freq</label>
                    {lowFreqConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(lowFreqConnection.value, (value) => `${Math.round(value)} Hz`)}</div>
                    ) : (
                        <input
                            type="range"
                            min="60"
                            max="1200"
                            step="10"
                            value={eqData.lowFrequency}
                            onChange={(e) => handleChange('lowFrequency', Number(e.target.value))}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="lowFrequency" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>High Freq</label>
                    {highFreqConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(highFreqConnection.value, (value) => `${Math.round(value)} Hz`)}</div>
                    ) : (
                        <input
                            type="range"
                            min="1200"
                            max="12000"
                            step="10"
                            value={eqData.highFrequency}
                            onChange={(e) => handleChange('highFrequency', Number(e.target.value))}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="highFrequency" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Mix</label>
                    {mixConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(mixConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={eqData.mix} onChange={(e) => handleChange('mix', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="mix" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

EQ3Node.displayName = 'EQ3Node';
export default EQ3Node;
