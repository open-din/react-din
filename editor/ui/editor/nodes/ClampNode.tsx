import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type ClampNodeData, type ClampMode } from '../store';

const MODES: Array<{ value: ClampMode; label: string }> = [
    { value: 'minmax', label: 'Min/Max' },
    { value: 'range', label: 'Range' },
];

const ClampNode = memo(({ id, data, selected }: NodeProps) => {
    const clampData = data as ClampNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const handleValueChange = (key: 'value' | 'min' | 'max', value: number) => {
        updateNodeData(id, { [key]: value });
    };

    return (
        <div className={`audio-node clamp-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">[]</span>
                    <span className="node-title">{clampData.label}</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-param" style={{ right: '0px' }} />
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Mode</label>
                    <select
                        value={clampData.mode}
                        onChange={(e) => updateNodeData(id, { mode: e.target.value })}
                    >
                        {MODES.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                                {mode.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>Value</label>
                    <input
                        type="number"
                        step="0.01"
                        value={clampData.value}
                        onChange={(e) => handleValueChange('value', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="value"
                        className="handle handle-in handle-param"
                    />
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>Min</label>
                    <input
                        type="number"
                        step="0.01"
                        value={clampData.min}
                        onChange={(e) => handleValueChange('min', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="min"
                        className="handle handle-in handle-param"
                    />
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>Max</label>
                    <input
                        type="number"
                        step="0.01"
                        value={clampData.max}
                        onChange={(e) => handleValueChange('max', Number(e.target.value))}
                    />
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="max"
                        className="handle handle-in handle-param"
                    />
                </div>
            </div>
        </div>
    );
});

ClampNode.displayName = 'ClampNode';
export default ClampNode;
