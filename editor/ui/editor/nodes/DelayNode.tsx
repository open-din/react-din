import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type DelayNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const DelayNode = memo(({ id, data, selected }: NodeProps<Node<DelayNodeData>>) => {
    const delayData = data;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const delayTimeConnection = useTargetHandleConnection(id, 'delayTime');
    const feedbackConnection = useTargetHandleConnection(id, 'feedback');

    const handleDelayChange = (value: number) => {
        updateNodeData(id, { delayTime: value });
        audioEngine.updateNode(id, { delayTime: value });
    };

    const handleFeedbackChange = (value: number) => {
        updateNodeData(id, { feedback: value });
        audioEngine.updateNode(id, { feedback: value });
    };

    return (
        <div className={`audio-node delay-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">⏱️</span>
                    <span className="node-title">Delay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Time</label>
                    {delayTimeConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(delayTimeConnection.value, (value) => `${(value * 1000).toFixed(0)} ms`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={delayData.delayTime}
                            onChange={(e) => handleDelayChange(Number(e.target.value))}
                            title="Delay time in seconds"
                        />
                    )}
                    {!delayTimeConnection.connected && <span className="value">{(delayData.delayTime * 1000).toFixed(0)} ms</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="delayTime"
                        className="handle handle-in handle-param"
                    />
                </div>
                <div className="node-control">
                    <label>Feedback</label>
                    {feedbackConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(feedbackConnection.value, (value) => `${Math.round(value * 100)}%`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="0.95"
                            step="0.01"
                            value={delayData.feedback}
                            onChange={(e) => handleFeedbackChange(Number(e.target.value))}
                            title="Feedback amount"
                        />
                    )}
                    {!feedbackConnection.connected && <span className="value">{Math.round(delayData.feedback * 100)}%</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="feedback"
                        className="handle handle-in handle-param"
                    />
                </div>
            </div>
        </div>
    );
});

DelayNode.displayName = 'DelayNode';
export default DelayNode;
