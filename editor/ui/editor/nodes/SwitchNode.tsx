import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type SwitchNodeData } from '../store';

const MIN_INPUTS = 2;
const MAX_INPUTS = 8;

const SwitchNode = memo(({ id, data, selected }: NodeProps) => {
    const switchData = data as SwitchNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const inputsCount = Math.min(Math.max(switchData.inputs || MIN_INPUTS, MIN_INPUTS), MAX_INPUTS);
    const values = Array.from({ length: inputsCount }, (_, index) => switchData.values?.[index] ?? 0);

    const updateInputs = (value: number) => {
        const safeValue = Number.isFinite(value) ? value : MIN_INPUTS;
        const nextInputs = Math.min(Math.max(safeValue, MIN_INPUTS), MAX_INPUTS);
        const nextValues = Array.from({ length: nextInputs }, (_, index) => values[index] ?? 0);
        const nextSelected = Math.min(switchData.selectedIndex, nextInputs - 1);
        updateNodeData(id, {
            inputs: nextInputs,
            values: nextValues,
            selectedIndex: nextSelected,
        });
    };

    const updateValue = (index: number, nextValue: number) => {
        const nextValues = [...values];
        nextValues[index] = nextValue;
        updateNodeData(id, { values: nextValues });
    };

    return (
        <div className={`audio-node switch-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">sw</span>
                    <span className="node-title">{switchData.label}</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-param" style={{ right: '0px' }} />
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Inputs</label>
                    <input
                        type="number"
                        min={MIN_INPUTS}
                        max={MAX_INPUTS}
                        step={1}
                        value={inputsCount}
                        onChange={(e) => updateInputs(Number(e.target.value))}
                    />
                </div>

                <div className="node-control">
                    <label>Select</label>
                    <select
                        value={Math.min(switchData.selectedIndex, inputsCount - 1)}
                        onChange={(e) => updateNodeData(id, { selectedIndex: Number(e.target.value) })}
                    >
                        {Array.from({ length: inputsCount }, (_, index) => (
                            <option key={index} value={index}>
                                Input {index + 1}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="node-control" style={{ position: 'relative' }}>
                    <label>Index</label>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="index"
                        className="handle handle-in handle-param"
                    />
                </div>

                {values.map((value, index) => (
                    <div key={index} className="node-control" style={{ position: 'relative' }}>
                        <label>In {index + 1}</label>
                        <input
                            type="number"
                            step="0.01"
                            value={value}
                            onChange={(e) => updateValue(index, Number(e.target.value))}
                        />
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`in_${index}`}
                            className="handle handle-in handle-param"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

SwitchNode.displayName = 'SwitchNode';
export default SwitchNode;
