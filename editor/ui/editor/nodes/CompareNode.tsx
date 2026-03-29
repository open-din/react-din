import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type CompareNodeData, type CompareOperation } from '../store';

const OPERATIONS: Array<{ value: CompareOperation; label: string }> = [
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less or Equal' },
    { value: 'eq', label: 'Equal' },
    { value: 'neq', label: 'Not Equal' },
];

const CompareNode = memo(({ id, data, selected }: NodeProps) => {
    const compareData = data as CompareNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const handleValueChange = (key: 'a' | 'b', value: number) => {
        updateNodeData(id, { [key]: value });
    };

    return (
        <div className={`audio-node compare-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">&gt;=</span>
                    <span className="node-title">{compareData.label}</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-param" style={{ right: '0px' }} />
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Operation</label>
                    <select
                        value={compareData.operation}
                        onChange={(e) => updateNodeData(id, { operation: e.target.value })}
                    >
                        {OPERATIONS.map((op) => (
                            <option key={op.value} value={op.value}>
                                {op.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>A</label>
                    <input
                        type="number"
                        step="0.01"
                        value={compareData.a}
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
                        value={compareData.b}
                        onChange={(e) => handleValueChange('b', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="b"
                        className="handle handle-in handle-param"
                    />
                </div>
            </div>
        </div>
    );
});

CompareNode.displayName = 'CompareNode';
export default CompareNode;
