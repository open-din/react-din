import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type DistortionNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const distortionTypes: DistortionNodeData['distortionType'][] = ['soft', 'hard', 'fuzz', 'bitcrush', 'saturate'];

const DistortionNode = memo(({ id, data, selected }: NodeProps) => {
    const distortionData = data as DistortionNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const driveConnection = useTargetHandleConnection(id, 'drive');
    const levelConnection = useTargetHandleConnection(id, 'level');
    const mixConnection = useTargetHandleConnection(id, 'mix');
    const toneConnection = useTargetHandleConnection(id, 'tone');

    const handleChange = (key: keyof DistortionNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node distortion-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#ff7f50' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🔥</span>
                    <span className="node-title">Distortion</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Type</label>
                    <select value={distortionData.distortionType} onChange={(e) => handleChange('distortionType', e.target.value)}>
                        {distortionTypes.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Drive</label>
                    {driveConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(driveConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={distortionData.drive} onChange={(e) => handleChange('drive', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="drive" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Level</label>
                    {levelConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(levelConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={distortionData.level} onChange={(e) => handleChange('level', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="level" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Mix</label>
                    {mixConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(mixConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={distortionData.mix} onChange={(e) => handleChange('mix', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="mix" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Tone</label>
                    {toneConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(toneConnection.value, (value) => `${Math.round(value)} Hz`)}</div>
                    ) : (
                        <input type="range" min="100" max="12000" step="10" value={distortionData.tone} onChange={(e) => handleChange('tone', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="tone" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

DistortionNode.displayName = 'DistortionNode';
export default DistortionNode;
