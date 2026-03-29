import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type EventTriggerNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const EventTriggerNode = memo(({ id, data, selected }: NodeProps) => {
    const triggerData = data as EventTriggerNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const tokenConnection = useTargetHandleConnection(id, 'token');

    const handleChange = (key: keyof EventTriggerNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node event-trigger-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#ffd166', color: '#5f3a00' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="node-icon">⚡</span>
                    <span className="node-title">Event Trigger</span>
                </div>
                <Handle type="source" position={Position.Right} id="trigger" className="handle handle-out handle-trigger" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Mode</label>
                    <select value={triggerData.mode} onChange={(e) => handleChange('mode', e.target.value)}>
                        <option value="change">change</option>
                        <option value="rising">rising</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Token</label>
                    {tokenConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(tokenConnection.value)}</div>
                    ) : (
                        <input type="number" step="1" value={triggerData.token} onChange={(e) => handleChange('token', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="token" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Cooldown (ms)</label>
                    <input type="number" min="0" value={triggerData.cooldownMs} onChange={(e) => handleChange('cooldownMs', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label>Velocity</label>
                    <input type="range" min="0" max="1" step="0.01" value={triggerData.velocity} onChange={(e) => handleChange('velocity', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label>Duration (s)</label>
                    <input type="number" min="0" step="0.01" value={triggerData.duration} onChange={(e) => handleChange('duration', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label>Note</label>
                    <input type="number" min="0" max="127" step="1" value={triggerData.note} onChange={(e) => handleChange('note', Number(e.target.value))} />
                </div>
                <div className="node-control">
                    <label>Track ID</label>
                    <input type="text" value={triggerData.trackId} onChange={(e) => handleChange('trackId', e.target.value)} />
                </div>
            </div>
        </div>
    );
});

EventTriggerNode.displayName = 'EventTriggerNode';
export default EventTriggerNode;
