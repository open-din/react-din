import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { type InputNodeData } from '../store';
import { getInputParamHandleId } from '../nodeHelpers';

const InputNode = memo(({ data, selected }: NodeProps<Node<InputNodeData>>) => {
    const inputData = data;

    return (
        <div className={`audio-node input-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <div className="header-title">
                    <span className="node-icon">⏱️</span>
                    <span className="node-title">{inputData.label || 'Params'}</span>
                </div>
            </div>

            <div className="node-content">
                {/* Parameters */}
                {(inputData.params || []).map((param, index) => (
                    <div key={param.id || index} className="node-control input-param-row" style={{ justifyContent: 'center' }}>
                        <div className="input-param-row" style={{ width: '100%' }}>
                            <label className="input-param-label">{param.label || param.name}</label>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={getInputParamHandleId(param)}
                                className="handle handle-out handle-param"
                            />
                        </div>
                    </div>
                ))}

                {!inputData.params?.length && (
                    <div className="node-control text-no-outputs">
                        No outputs
                    </div>
                )}
            </div>
        </div>
    );
});

InputNode.displayName = 'InputNode';
export default InputNode;
