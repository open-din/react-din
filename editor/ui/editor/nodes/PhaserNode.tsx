import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type PhaserNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const PhaserNode = memo(({ id, data, selected }: NodeProps) => {
    const phaserData = data as PhaserNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const rateConnection = useTargetHandleConnection(id, 'rate');
    const depthConnection = useTargetHandleConnection(id, 'depth');
    const feedbackConnection = useTargetHandleConnection(id, 'feedback');
    const baseFrequencyConnection = useTargetHandleConnection(id, 'baseFrequency');
    const stagesConnection = useTargetHandleConnection(id, 'stages');
    const mixConnection = useTargetHandleConnection(id, 'mix');

    const handleChange = (key: keyof PhaserNodeData, value: number) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node phaser-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#7a9cff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🌀</span>
                    <span className="node-title">Phaser</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Rate</label>
                    {rateConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(rateConnection.value, (value) => `${value.toFixed(2)} Hz`)}</div>
                    ) : (
                        <input type="range" min="0.01" max="8" step="0.01" value={phaserData.rate} onChange={(e) => handleChange('rate', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="rate" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Depth</label>
                    {depthConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(depthConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={phaserData.depth} onChange={(e) => handleChange('depth', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="depth" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Feedback</label>
                    {feedbackConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(feedbackConnection.value)}</div>
                    ) : (
                        <input type="range" min="-0.95" max="0.95" step="0.01" value={phaserData.feedback} onChange={(e) => handleChange('feedback', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="feedback" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Base Freq</label>
                    {baseFrequencyConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(baseFrequencyConnection.value, (value) => `${Math.round(value)} Hz`)}</div>
                    ) : (
                        <input
                            type="range"
                            min="40"
                            max="8000"
                            step="10"
                            value={phaserData.baseFrequency}
                            onChange={(e) => handleChange('baseFrequency', Number(e.target.value))}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="baseFrequency" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Stages</label>
                    {stagesConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(stagesConnection.value, (value) => `${Math.round(value)}`)}</div>
                    ) : (
                        <input type="range" min="2" max="8" step="1" value={phaserData.stages} onChange={(e) => handleChange('stages', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="stages" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Mix</label>
                    {mixConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(mixConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={phaserData.mix} onChange={(e) => handleChange('mix', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="mix" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

PhaserNode.displayName = 'PhaserNode';
export default PhaserNode;
