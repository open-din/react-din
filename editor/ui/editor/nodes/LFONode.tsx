import React, { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAudioGraphStore, type LFONodeData } from '../store';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import '../editor.css';

const WAVEFORMS = ['sine', 'triangle', 'sawtooth', 'square'] as const;

export const LFONode: React.FC<NodeProps<Node<LFONodeData>>> = memo(({ id, data, selected }) => {
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const rateConnection = useTargetHandleConnection(id, 'rate');
    const depthConnection = useTargetHandleConnection(id, 'depth');

    return (
        <div className={`audio-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-icon">🌀</span>
                <span className="node-title">{data.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Waveform</label>
                    <select
                        value={data.waveform}
                        onChange={(e) => updateNodeData(id, { waveform: e.target.value })}
                    >
                        {WAVEFORMS.map((w) => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                </div>

                <div className="node-control">
                    <label>Rate</label>
                    {rateConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(rateConnection.value, (value) => `${value.toFixed(2)} Hz`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={data.rate}
                            onChange={(e) => updateNodeData(id, { rate: parseFloat(e.target.value) })}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="rate" className="handle handle-in handle-param" />
                </div>

                <div className="node-control">
                    <label>Depth</label>
                    {depthConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(depthConnection.value, (value) => `${Math.round(value)}`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="2000"
                            step="10"
                            value={data.depth}
                            onChange={(e) => updateNodeData(id, { depth: parseFloat(e.target.value) })}
                        />
                    )}
                    <Handle type="target" position={Position.Left} id="depth" className="handle handle-in handle-param" />
                </div>
            </div>

            {/* Output */}
            <Handle
                type="source"
                position={Position.Right}
                id="out"
                className="handle handle-out handle-cv"
            />
        </div>
    );
});
