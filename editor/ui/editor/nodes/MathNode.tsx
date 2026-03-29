import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type MathNodeData, type MathOperation } from '../store';

type InputConfig = { id: 'a' | 'b' | 'c'; label: string };
type OperationConfig = { label: string; inputs: InputConfig[] };

const OPERATION_GROUPS: Array<{ label: string; ops: Array<{ value: MathOperation; label: string; inputs: InputConfig[] }> }> = [
    {
        label: 'Functions',
        ops: [
            { value: 'add', label: 'Add', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'subtract', label: 'Subtract', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'multiply', label: 'Multiply', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'divide', label: 'Divide', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'multiplyAdd', label: 'Multiply Add', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }] },
            { value: 'power', label: 'Power', inputs: [{ id: 'a', label: 'Base' }, { id: 'b', label: 'Exponent' }] },
            { value: 'logarithm', label: 'Logarithm', inputs: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Base' }] },
            { value: 'sqrt', label: 'Square Root', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'invSqrt', label: 'Inverse Square Root', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'abs', label: 'Absolute', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'exp', label: 'Exponent', inputs: [{ id: 'a', label: 'Value' }] },
        ],
    },
    {
        label: 'Comparison',
        ops: [
            { value: 'min', label: 'Minimum', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'max', label: 'Maximum', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'lessThan', label: 'Less Than', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'greaterThan', label: 'Greater Than', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'sign', label: 'Sign', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'compare', label: 'Compare', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
            { value: 'smoothMin', label: 'Smooth Minimum', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'Smooth' }] },
            { value: 'smoothMax', label: 'Smooth Maximum', inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'Smooth' }] },
        ],
    },
    {
        label: 'Rounding',
        ops: [
            { value: 'round', label: 'Round', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'floor', label: 'Floor', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'ceil', label: 'Ceil', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'truncate', label: 'Truncate', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'fraction', label: 'Fraction', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'truncModulo', label: 'Truncated Modulo', inputs: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Divisor' }] },
            { value: 'floorModulo', label: 'Floored Modulo', inputs: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Divisor' }] },
            { value: 'wrap', label: 'Wrap', inputs: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Min' }, { id: 'c', label: 'Max' }] },
            { value: 'snap', label: 'Snap', inputs: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Step' }] },
            { value: 'pingPong', label: 'Ping-Pong', inputs: [{ id: 'a', label: 'Value' }, { id: 'b', label: 'Length' }] },
        ],
    },
    {
        label: 'Trigonometric',
        ops: [
            { value: 'sin', label: 'Sine', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'cos', label: 'Cosine', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'tan', label: 'Tangent', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'asin', label: 'Arcsine', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'acos', label: 'Arccosine', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'atan', label: 'Arctangent', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'atan2', label: 'Arctan2', inputs: [{ id: 'a', label: 'Y' }, { id: 'b', label: 'X' }] },
            { value: 'sinh', label: 'Hyperbolic Sine', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'cosh', label: 'Hyperbolic Cosine', inputs: [{ id: 'a', label: 'Value' }] },
            { value: 'tanh', label: 'Hyperbolic Tangent', inputs: [{ id: 'a', label: 'Value' }] },
        ],
    },
];

const OPERATION_MAP = OPERATION_GROUPS.reduce<Record<MathOperation, OperationConfig>>((acc, group) => {
    group.ops.forEach((op) => {
        acc[op.value] = { label: op.label, inputs: op.inputs };
    });
    return acc;
}, {} as Record<MathOperation, OperationConfig>);

const MathNode = memo(({ id, data, selected }: NodeProps) => {
    const mathData = data as MathNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const config = useMemo(
        () => OPERATION_MAP[mathData.operation] ?? OPERATION_MAP.add,
        [mathData.operation]
    );

    const handleValueChange = (key: 'a' | 'b' | 'c', value: number) => {
        updateNodeData(id, { [key]: value });
    };

    return (
        <div className={`audio-node math-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">fx</span>
                    <span className="node-title">{mathData.label}</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-param" style={{ right: '0px' }} />
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Operation</label>
                    <select
                        value={mathData.operation}
                        onChange={(e) => updateNodeData(id, { operation: e.target.value })}
                    >
                        {OPERATION_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                                {group.ops.map((op) => (
                                    <option key={op.value} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {config.inputs.map((input) => (
                    <div key={input.id} className="node-control" style={{ position: 'relative' }}>
                        <label>{input.label}</label>
                        <input
                            type="number"
                            step="0.01"
                            value={mathData[input.id]}
                            onChange={(e) => handleValueChange(input.id, Number(e.target.value))}
                        />
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={input.id}
                            className="handle handle-in handle-param"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
});

MathNode.displayName = 'MathNode';
export default MathNode;
