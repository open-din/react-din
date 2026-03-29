import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAudioGraphStore, type VoiceNodeData } from '../store';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import '../editor.css';

export const VoiceNode: React.FC<NodeProps<Node<VoiceNodeData>>> = memo(({ id, data, selected }) => {
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const portamentoConnection = useTargetHandleConnection(id, 'portamento');

    const handlePortamentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const portamento = parseFloat(e.target.value);
        updateNodeData(id, { portamento });
    };

    return (
        <div className={`audio-node voice-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-icon">🗣️</span>
                <span className="node-title">{data.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Portamento: {data.portamento}s</label>
                    {portamentoConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(portamentoConnection.value, (value) => `${value.toFixed(2)}s`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={data.portamento}
                            onChange={handlePortamentoChange}
                            onDragStart={(e) => e.stopPropagation()}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="portamento" className="handle handle-in handle-param" />
                </div>
            </div>

            {/* Input: Trigger */}
            <Handle
                type="target"
                position={Position.Left}
                id="trigger"
                style={{ top: '50%', background: '#ff4466' }} // red/trigger color
                title="Trigger In"
            />

            {/* Output: Frequency CV */}
            <Handle
                type="source"
                position={Position.Right}
                id="note" // outputs frequency
                style={{ top: '30%', background: '#ff8844' }} // orange/freq color
                title="Frequency Out"
            />
            {/* Label for Freq */}
            <div style={{ position: 'absolute', right: -15, top: '25%', fontSize: 9, color: '#ff8844' }}>Freq</div>

            {/* Output: Gate CV */}
            <Handle
                type="source"
                position={Position.Right}
                id="gate" // outputs gate (0/1)
                style={{ top: '50%', background: '#44cc44' }} // green/gate color
                title="Gate Out"
            />
            <div style={{ position: 'absolute', right: -15, top: '45%', fontSize: 9, color: '#44cc44' }}>Gate</div>

            {/* Output: Velocity CV */}
            <Handle
                type="source"
                position={Position.Right}
                id="velocity" // outputs velocity (0-1)
                style={{ top: '70%', background: '#4488ff' }} // blue/vel color
                title="Velocity Out"
            />
            <div style={{ position: 'absolute', right: -15, top: '65%', fontSize: 9, color: '#4488ff' }}>Vel</div>
        </div>
    );
});
