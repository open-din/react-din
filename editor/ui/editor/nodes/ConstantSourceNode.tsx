import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type ConstantSourceNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const ConstantSourceNode = memo(({ id, data, selected }: NodeProps) => {
    const sourceData = data as ConstantSourceNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const offsetConnection = useTargetHandleConnection(id, 'offset');

    const handleOffsetChange = (value: number) => {
        updateNodeData(id, { offset: value });
        audioEngine.updateNode(id, { offset: value });
    };

    return (
        <div className={`audio-node constant-source-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#7bd1ff', color: '#072033' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">━</span>
                    <span className="node-title">Constant Source</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Offset</label>
                    {offsetConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(offsetConnection.value)}</div>
                    ) : (
                        <input type="number" step="0.01" value={sourceData.offset} onChange={(e) => handleOffsetChange(Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="offset" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

ConstantSourceNode.displayName = 'ConstantSourceNode';
export default ConstantSourceNode;
