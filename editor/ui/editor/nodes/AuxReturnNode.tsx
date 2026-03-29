import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type AuxReturnNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const AuxReturnNode = memo(({ id, data, selected }: NodeProps) => {
    const auxData = data as AuxReturnNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const gainConnection = useTargetHandleConnection(id, 'gain');

    const handleChange = (key: keyof AuxReturnNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node aux-return-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#ffaa44' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">↘️</span>
                    <span className="node-title">Aux Return</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Bus</label>
                    <input type="text" value={auxData.busId} onChange={(e) => handleChange('busId', e.target.value)} />
                </div>
                <div className="node-control">
                    <label>Gain</label>
                    {gainConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(gainConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="2" step="0.01" value={auxData.gain} onChange={(e) => handleChange('gain', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="gain" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

AuxReturnNode.displayName = 'AuxReturnNode';
export default AuxReturnNode;
