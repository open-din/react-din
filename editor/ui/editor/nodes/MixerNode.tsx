import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { type MixerNodeData } from '../store';

const MixerNode = memo(({ selected }: NodeProps) => {
    return (
        <div className={`audio-node mixer-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">⊕</span>
                    <span className="node-title">Mixer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control" style={{ minHeight: '30px' }}>
                    <label>In 1</label>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="in1"
                        className="handle handle-in handle-audio"
                    />
                </div>
                <div className="node-control" style={{ minHeight: '30px' }}>
                    <label>In 2</label>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="in2"
                        className="handle handle-in handle-audio"
                    />
                </div>
                <div className="node-control" style={{ minHeight: '30px' }}>
                    <label>In 3</label>
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="in3"
                        className="handle handle-in handle-audio"
                    />
                </div>
            </div>
        </div>
    );
});

MixerNode.displayName = 'MixerNode';
export default MixerNode;
