import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type MatrixMixerNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const clampSize = (value: number) => Math.max(2, Math.min(8, Math.floor(value)));

const MatrixCellControl = ({
    nodeId,
    row,
    column,
    value,
    onChange,
}: {
    nodeId: string;
    row: number;
    column: number;
    value: number;
    onChange: (next: number) => void;
}) => {
    const handleId = `cell:${row}:${column}`;
    const connection = useTargetHandleConnection(nodeId, handleId);

    return (
        <div className="node-control">
            <label>{`M${row + 1}${column + 1}`}</label>
            {connection.connected ? (
                <div className="node-connected-value">{formatConnectedValue(connection.value)}</div>
            ) : (
                <input type="range" min="0" max="1" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} />
            )}
            <Handle type="target" position={Position.Left} id={handleId} className="handle handle-in handle-param" />
        </div>
    );
};

const MatrixMixerNode = memo(({ id, data, selected }: NodeProps) => {
    const matrixData = data as MatrixMixerNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const inputs = clampSize(matrixData.inputs || 4);
    const outputs = clampSize(matrixData.outputs || 4);
    const matrix = Array.from({ length: inputs }, (_, row) =>
        Array.from({ length: outputs }, (_, column) => matrixData.matrix?.[row]?.[column] ?? (row === column ? 1 : 0))
    );

    const updateMatrix = (nextMatrix: number[][], nextInputs = inputs, nextOutputs = outputs) => {
        const payload = {
            matrix: nextMatrix,
            inputs: nextInputs,
            outputs: nextOutputs,
        };
        updateNodeData(id, payload);
        audioEngine.updateNode(id, payload);
    };

    const updateSize = (kind: 'inputs' | 'outputs', nextValue: number) => {
        const nextInputs = kind === 'inputs' ? clampSize(nextValue) : inputs;
        const nextOutputs = kind === 'outputs' ? clampSize(nextValue) : outputs;
        const nextMatrix = Array.from({ length: nextInputs }, (_, row) =>
            Array.from({ length: nextOutputs }, (_, column) => matrixData.matrix?.[row]?.[column] ?? (row === column ? 1 : 0))
        );
        updateMatrix(nextMatrix, nextInputs, nextOutputs);
    };

    const updateCell = (row: number, column: number, nextValue: number) => {
        const nextMatrix = matrix.map((rowValues, rowIndex) =>
            rowValues.map((cellValue, colIndex) => (rowIndex === row && colIndex === column ? nextValue : cellValue))
        );
        updateMatrix(nextMatrix);
    };

    return (
        <div className={`audio-node matrix-mixer-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#ffaa44' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">▦</span>
                    <span className="node-title">Matrix Mixer</span>
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Inputs</label>
                    <input type="range" min="2" max="8" step="1" value={inputs} onChange={(e) => updateSize('inputs', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label>Outputs</label>
                    <input type="range" min="2" max="8" step="1" value={outputs} onChange={(e) => updateSize('outputs', Number(e.target.value))} />
                </div>
                {Array.from({ length: inputs }, (_, index) => (
                    <div className="node-control" key={`in-${index}`}>
                        <label>{`In ${index + 1}`}</label>
                        <Handle type="target" position={Position.Left} id={`in${index + 1}`} className="handle handle-in handle-audio" />
                    </div>
                ))}
                <div className="node-control">
                    <label>Out Mix</label>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" />
                </div>
                {Array.from({ length: outputs }, (_, index) => (
                    <div className="node-control" key={`out-${index}`}>
                        <label>{`Out ${index + 1}`}</label>
                        <Handle type="source" position={Position.Right} id={`out${index + 1}`} className="handle handle-out handle-audio" />
                    </div>
                ))}
                {matrix.flatMap((rowValues, row) =>
                    rowValues.map((cell, column) => (
                        <MatrixCellControl
                            key={`cell-${row}-${column}`}
                            nodeId={id}
                            row={row}
                            column={column}
                            value={cell}
                            onChange={(next) => updateCell(row, column, next)}
                        />
                    ))
                )}
            </div>
        </div>
    );
});

MatrixMixerNode.displayName = 'MatrixMixerNode';
export default MatrixMixerNode;
