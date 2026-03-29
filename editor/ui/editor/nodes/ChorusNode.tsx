import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type ChorusNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const ChorusNode = memo(({ id, data, selected }: NodeProps) => {
    const chorusData = data as ChorusNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const rateConnection = useTargetHandleConnection(id, 'rate');
    const depthConnection = useTargetHandleConnection(id, 'depth');
    const feedbackConnection = useTargetHandleConnection(id, 'feedback');
    const delayConnection = useTargetHandleConnection(id, 'delay');
    const mixConnection = useTargetHandleConnection(id, 'mix');

    const handleChange = (key: keyof ChorusNodeData, value: number | boolean) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node chorus-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#44ccff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🌊</span>
                    <span className="node-title">Chorus</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Rate</label>
                    {rateConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(rateConnection.value, (value) => `${value.toFixed(2)} Hz`)}</div>
                    ) : (
                        <input type="range" min="0.1" max="10" step="0.01" value={chorusData.rate} onChange={(e) => handleChange('rate', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="rate" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Depth</label>
                    {depthConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(depthConnection.value, (value) => `${value.toFixed(2)} ms`)}</div>
                    ) : (
                        <input type="range" min="0" max="20" step="0.1" value={chorusData.depth} onChange={(e) => handleChange('depth', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="depth" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Feedback</label>
                    {feedbackConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(feedbackConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="0.99" step="0.01" value={chorusData.feedback} onChange={(e) => handleChange('feedback', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="feedback" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Delay</label>
                    {delayConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(delayConnection.value, (value) => `${value.toFixed(2)} ms`)}</div>
                    ) : (
                        <input type="range" min="1" max="60" step="0.1" value={chorusData.delay} onChange={(e) => handleChange('delay', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="delay" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Mix</label>
                    {mixConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(mixConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="1" step="0.01" value={chorusData.mix} onChange={(e) => handleChange('mix', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="mix" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" checked={chorusData.stereo} onChange={(e) => handleChange('stereo', e.target.checked)} />
                        Stereo
                    </label>
                </div>
            </div>
        </div>
    );
});

ChorusNode.displayName = 'ChorusNode';
export default ChorusNode;
