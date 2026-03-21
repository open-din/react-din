import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type AuxSendNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const AuxSendNode = memo(({ id, data, selected }: NodeProps) => {
    const auxData = data as AuxSendNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const sendGainConnection = useTargetHandleConnection(id, 'sendGain');

    const handleChange = (key: keyof AuxSendNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node aux-send-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#ffaa44' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">↗️</span>
                    <span className="node-title">Aux Send</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Bus</label>
                    <input type="text" value={auxData.busId} onChange={(e) => handleChange('busId', e.target.value)} />
                </div>
                <div className="node-control">
                    <label>Tap</label>
                    <select value={auxData.tap} onChange={(e) => handleChange('tap', e.target.value)}>
                        <option value="pre">pre</option>
                        <option value="post">post</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Send Gain</label>
                    {sendGainConnection.connected ? (
                        <div className="node-connected-value">{formatConnectedValue(sendGainConnection.value)}</div>
                    ) : (
                        <input type="range" min="0" max="2" step="0.01" value={auxData.sendGain} onChange={(e) => handleChange('sendGain', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="sendGain" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

AuxSendNode.displayName = 'AuxSendNode';
export default AuxSendNode;
