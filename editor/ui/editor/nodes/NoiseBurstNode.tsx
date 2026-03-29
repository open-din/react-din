import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type NoiseBurstNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const noiseTypes: NoiseBurstNodeData['noiseType'][] = ['white', 'pink', 'brown'];

const NoiseBurstNode = memo(({ id, data, selected }: NodeProps) => {
    const burstData = data as NoiseBurstNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const durationConnection = useTargetHandleConnection(id, 'duration');
    const gainConnection = useTargetHandleConnection(id, 'gain');
    const attackConnection = useTargetHandleConnection(id, 'attack');
    const releaseConnection = useTargetHandleConnection(id, 'release');

    const handleChange = (key: keyof NoiseBurstNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node noise-burst-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#666666' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">💥</span>
                    <span className="node-title">Noise Burst</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Type</label>
                    <select value={burstData.noiseType} onChange={(e) => handleChange('noiseType', e.target.value)}>
                        {noiseTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
                <div className="node-control">
                    <label>Duration</label>
                    {durationConnection.connected ? <div className="node-connected-value">{formatConnectedValue(durationConnection.value, (value) => `${(value * 1000).toFixed(0)} ms`)}</div> : (
                        <input type="range" min="0.01" max="1" step="0.001" value={burstData.duration} onChange={(e) => handleChange('duration', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="duration" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Gain</label>
                    {gainConnection.connected ? <div className="node-connected-value">{formatConnectedValue(gainConnection.value)}</div> : (
                        <input type="range" min="0" max="1" step="0.01" value={burstData.gain} onChange={(e) => handleChange('gain', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="gain" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Attack</label>
                    {attackConnection.connected ? <div className="node-connected-value">{formatConnectedValue(attackConnection.value, (value) => `${(value * 1000).toFixed(1)} ms`)}</div> : (
                        <input type="range" min="0" max="0.2" step="0.0005" value={burstData.attack} onChange={(e) => handleChange('attack', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="attack" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Release</label>
                    {releaseConnection.connected ? <div className="node-connected-value">{formatConnectedValue(releaseConnection.value, (value) => `${(value * 1000).toFixed(1)} ms`)}</div> : (
                        <input type="range" min="0" max="0.4" step="0.0005" value={burstData.release} onChange={(e) => handleChange('release', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="release" className="handle handle-in handle-param" />
                </div>
            </div>
            <Handle type="target" position={Position.Left} id="trigger" className="handle handle-in handle-trigger" style={{ top: '50%' }} />
        </div>
    );
});

NoiseBurstNode.displayName = 'NoiseBurstNode';
export default NoiseBurstNode;
