import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type ReverbNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const ReverbNode = memo(({ id, data, selected }: NodeProps) => {
    const reverbData = data as ReverbNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const decayConnection = useTargetHandleConnection(id, 'decay');
    const mixConnection = useTargetHandleConnection(id, 'mix');

    const handleDecayChange = (value: number) => {
        updateNodeData(id, { decay: value });
        audioEngine.updateNode(id, { decay: value });
    };

    const handleMixChange = (value: number) => {
        updateNodeData(id, { mix: value });
        audioEngine.updateNode(id, { mix: value });
    };

    return (
        <div className={`audio-node reverb-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🏛️</span>
                    <span className="node-title">Reverb</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Decay</label>
                    {decayConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(decayConnection.value, (value) => `${value.toFixed(1)}s`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={reverbData.decay}
                            onChange={(e) => handleDecayChange(Number(e.target.value))}
                            title="Decay time in seconds"
                        />
                    )}
                    {!decayConnection.connected && <span className="value">{reverbData.decay.toFixed(1)}s</span>}
                    <Handle type="target" position={Position.Left} id="decay" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Mix</label>
                    {mixConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(mixConnection.value, (value) => `${Math.round(value * 100)}%`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={reverbData.mix}
                            onChange={(e) => handleMixChange(Number(e.target.value))}
                            title="Wet/Dry mix"
                        />
                    )}
                    {!mixConnection.connected && <span className="value">{Math.round(reverbData.mix * 100)}%</span>}
                    <Handle type="target" position={Position.Left} id="mix" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

ReverbNode.displayName = 'ReverbNode';
export default ReverbNode;
