import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type CompressorNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const CompressorNode = memo(({ id, data, selected }: NodeProps) => {
    const compressorData = data as CompressorNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const thresholdConnection = useTargetHandleConnection(id, 'threshold');
    const kneeConnection = useTargetHandleConnection(id, 'knee');
    const ratioConnection = useTargetHandleConnection(id, 'ratio');
    const attackConnection = useTargetHandleConnection(id, 'attack');
    const releaseConnection = useTargetHandleConnection(id, 'release');
    const sidechainStrengthConnection = useTargetHandleConnection(id, 'sidechainStrength');

    const handleChange = (key: keyof CompressorNodeData, value: number) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node compressor-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#5fcd70' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <Handle type="target" position={Position.Left} id="sidechainIn" className="handle handle-in handle-audio" style={{ top: '30px' }} />
                    <span className="node-icon">🗜️</span>
                    <span className="node-title">Compressor</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Threshold</label>
                    {thresholdConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(thresholdConnection.value, (value) => `${value.toFixed(1)} dB`)}</div>
                    ) : (
                        <input type="range" min="-60" max="0" step="0.1" value={compressorData.threshold} onChange={(e) => handleChange('threshold', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="threshold" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Knee</label>
                    {kneeConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(kneeConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="40" step="0.1" value={compressorData.knee} onChange={(e) => handleChange('knee', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="knee" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Ratio</label>
                    {ratioConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(ratioConnection.value)}</div>
                    ) : (
                        <input type="range" min="1" max="20" step="0.1" value={compressorData.ratio} onChange={(e) => handleChange('ratio', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="ratio" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Attack</label>
                    {attackConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(attackConnection.value, (value) => `${(value * 1000).toFixed(1)} ms`)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.001" value={compressorData.attack} onChange={(e) => handleChange('attack', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="attack" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Release</label>
                    {releaseConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(releaseConnection.value, (value) => `${(value * 1000).toFixed(1)} ms`)}</div>
                    ) : (
                        <input type="range" min="0" max="2" step="0.001" value={compressorData.release} onChange={(e) => handleChange('release', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="release" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>SC Amount</label>
                    {sidechainStrengthConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(sidechainStrengthConnection.value)}</div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={compressorData.sidechainStrength ?? 0.7}
                            onChange={(e) => handleChange('sidechainStrength', Number(e.target.value))}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="sidechainStrength" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

CompressorNode.displayName = 'CompressorNode';
export default CompressorNode;
