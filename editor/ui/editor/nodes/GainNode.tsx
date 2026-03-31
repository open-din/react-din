import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { CustomHandle } from '../components/CustomHandle';
import { useAudioGraphStore, type GainNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const GainNode = memo(({ id, data, selected }: NodeProps) => {
    const gainData = data as GainNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const gainConnection = useTargetHandleConnection(id, 'gain');

    const handleGainChange = (value: number) => {
        updateNodeData(id, { gain: value });
        audioEngine.updateNode(id, { gain: value });
    };

    return (
        <div className={`node gain-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-label">Gain</span>
            </div>
            <div className="node-content">
                <div className="parameter">
                    <label>Gain</label>
                    <div className="param-value">
                        {gainConnection ? formatConnectedValue(gainConnection.value) : (
                            <input
                                type="number"
                                value={gainData.gain}
                                onChange={(e) => handleGainChange(Number(e.target.value))}
                                step="0.01"
                            />
                        )}
                    </div>
                </div>
            </div>

            <CustomHandle
                type="target"
                position={Position.Left}
                id="in"
                style={{ top: '25%' }}
            />
            <CustomHandle
                type="target"
                position={Position.Left}
                id="gain"
                style={{ top: '75%' }}
            />
            <CustomHandle
                type="source"
                position={Position.Right}
                id="out"
            />
        </div>
    );
});

GainNode.displayName = 'GainNode';
export default GainNode;

