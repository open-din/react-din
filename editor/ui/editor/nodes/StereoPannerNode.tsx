import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type StereoPannerNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const StereoPannerNode = memo(({ id, data, selected }: NodeProps) => {
    const pannerData = data as StereoPannerNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const panConnection = useTargetHandleConnection(id, 'pan');

    const handlePanChange = (value: number) => {
        updateNodeData(id, { pan: value });
        audioEngine.updateNode(id, { pan: value });
    };

    return (
        <div className={`audio-node panner-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">↔️</span>
                    <span className="node-title">Pan</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>L/R</label>
                    {panConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(panConnection.value, (value) =>
                                value < 0 ? `L ${Math.abs(Math.round(value * 100))}` : value > 0 ? `R ${Math.round(value * 100)}` : 'C'
                            )}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.01"
                            value={pannerData.pan}
                            onChange={(e) => handlePanChange(Number(e.target.value))}
                            title="Stereo pan position"
                        />
                    )}
                    {!panConnection.connected && (
                        <span className="value">
                            {pannerData.pan < 0 ? `L ${Math.abs(Math.round(pannerData.pan * 100))}` :
                                pannerData.pan > 0 ? `R ${Math.round(pannerData.pan * 100)}` : 'C'}
                        </span>
                    )}
                    <Handle type="target" position={Position.Left} id="pan" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

StereoPannerNode.displayName = 'StereoPannerNode';
export default StereoPannerNode;
