import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { type TransportNodeData } from '../store';
import '../editor.css';

export const TransportNode: React.FC<NodeProps<Node<TransportNodeData>>> = memo(({ data, selected }) => {
    return (
        <div className={`audio-node transport-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-icon">⏱️</span>
                <span className="node-title">{data.label}</span>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>BPM</label>
                    <span className="value">{data.bpm}</span>
                </div>
                <div className="node-control">
                    <label>Steps / Beat</label>
                    <span className="value">{data.stepsPerBeat ?? 4}</span>
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Bottom}
                id="out"
                className="handle handle-audio"
            />
            <div className="handle-label source-label">Clock</div>
        </div>
    );
});
