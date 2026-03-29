import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type MixNodeData } from '../store';

const MixNode = memo(({ id, data, selected }: NodeProps) => {
    const mixData = data as MixNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const handleValueChange = (key: 'a' | 'b' | 't', value: number) => {
        updateNodeData(id, { [key]: value });
    };

    return (
        <div className={`audio-node mix-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">mix</span>
                    <span className="node-title">{mixData.label}</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-param" style={{ right: '0px' }} />
            </div>

            <div className="node-content">
                <div className="node-control" style={{ position: 'relative' }}>
                    <label>A</label>
                    <input
                        type="number"
                        step="0.01"
                        value={mixData.a}
                        onChange={(e) => handleValueChange('a', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="a"
                        className="handle handle-in handle-param"
                    />
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>B</label>
                    <input
                        type="number"
                        step="0.01"
                        value={mixData.b}
                        onChange={(e) => handleValueChange('b', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="b"
                        className="handle handle-in handle-param"
                    />
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>T</label>
                    <input
                        type="number"
                        step="0.01"
                        value={mixData.t}
                        onChange={(e) => handleValueChange('t', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="t"
                        className="handle handle-in handle-param"
                    />
                </div>

                <div className="node-control">
                    <label>Clamp</label>
                    <input
                        type="checkbox"
                        checked={mixData.clamp}
                        onChange={(e) => updateNodeData(id, { clamp: e.target.checked })}
                        className="accent-[var(--accent)]"
                    />
                </div>
            </div>
        </div>
    );
});

MixNode.displayName = 'MixNode';
export default MixNode;
