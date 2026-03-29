import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type NoiseNodeData } from '../store';
import { audioEngine } from '../AudioEngine';

const noiseTypes = ['white', 'pink', 'brown'] as const;

const NoiseNode = memo(({ id, data, selected }: NodeProps) => {
    const noiseData = data as NoiseNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const handleTypeChange = (value: 'white' | 'pink' | 'brown') => {
        updateNodeData(id, { noiseType: value });
        audioEngine.updateNode(id, { noiseType: value });
    };

    return (
        <div className={`audio-node noise-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">〰️</span>
                    <span className="node-title">Noise</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Type</label>
                    <select
                        value={noiseData.noiseType}
                        onChange={(e) => handleTypeChange(e.target.value as 'white' | 'pink' | 'brown')}
                        title="Noise type"
                    >
                        {noiseTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
});

NoiseNode.displayName = 'NoiseNode';
export default NoiseNode;
