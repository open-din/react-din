import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type Panner3DNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const Panner3DNode = memo(({ id, data, selected }: NodeProps) => {
    const pannerData = data as Panner3DNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const xConnection = useTargetHandleConnection(id, 'positionX');
    const yConnection = useTargetHandleConnection(id, 'positionY');
    const zConnection = useTargetHandleConnection(id, 'positionZ');
    const refDistanceConnection = useTargetHandleConnection(id, 'refDistance');
    const maxDistanceConnection = useTargetHandleConnection(id, 'maxDistance');
    const rolloffConnection = useTargetHandleConnection(id, 'rolloffFactor');

    const handleChange = (key: keyof Panner3DNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node panner3d-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#44cccc', color: '#03262f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🧭</span>
                    <span className="node-title">Panner 3D</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>X</label>
                    {xConnection.connected ? <div className="node-connected-value">{formatConnectedValue(xConnection.value)}</div> : <input type="range" min="-20" max="20" step="0.1" value={pannerData.positionX} onChange={(e) => handleChange('positionX', Number(e.target.value))} />}
                    <Handle type="target" position={Position.Left} id="positionX" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Y</label>
                    {yConnection.connected ? <div className="node-connected-value">{formatConnectedValue(yConnection.value)}</div> : <input type="range" min="-20" max="20" step="0.1" value={pannerData.positionY} onChange={(e) => handleChange('positionY', Number(e.target.value))} />}
                    <Handle type="target" position={Position.Left} id="positionY" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Z</label>
                    {zConnection.connected ? <div className="node-connected-value">{formatConnectedValue(zConnection.value)}</div> : <input type="range" min="-20" max="20" step="0.1" value={pannerData.positionZ} onChange={(e) => handleChange('positionZ', Number(e.target.value))} />}
                    <Handle type="target" position={Position.Left} id="positionZ" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Ref Distance</label>
                    {refDistanceConnection.connected ? <div className="node-connected-value">{formatConnectedValue(refDistanceConnection.value)}</div> : <input type="number" min="0.1" max="100" step="0.1" value={pannerData.refDistance} onChange={(e) => handleChange('refDistance', Number(e.target.value))} />}
                    <Handle type="target" position={Position.Left} id="refDistance" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Max Distance</label>
                    {maxDistanceConnection.connected ? <div className="node-connected-value">{formatConnectedValue(maxDistanceConnection.value)}</div> : <input type="number" min="1" max="50000" step="1" value={pannerData.maxDistance} onChange={(e) => handleChange('maxDistance', Number(e.target.value))} />}
                    <Handle type="target" position={Position.Left} id="maxDistance" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Rolloff</label>
                    {rolloffConnection.connected ? <div className="node-connected-value">{formatConnectedValue(rolloffConnection.value)}</div> : <input type="range" min="0" max="5" step="0.01" value={pannerData.rolloffFactor} onChange={(e) => handleChange('rolloffFactor', Number(e.target.value))} />}
                    <Handle type="target" position={Position.Left} id="rolloffFactor" className="handle handle-in handle-param" />
                </div>
                <div className="node-control">
                    <label>Panning Model</label>
                    <select value={pannerData.panningModel} onChange={(e) => handleChange('panningModel', e.target.value)}>
                        <option value="equalpower">equalpower</option>
                        <option value="HRTF">HRTF</option>
                    </select>
                </div>
                <div className="node-control">
                    <label>Distance Model</label>
                    <select value={pannerData.distanceModel} onChange={(e) => handleChange('distanceModel', e.target.value)}>
                        <option value="linear">linear</option>
                        <option value="inverse">inverse</option>
                        <option value="exponential">exponential</option>
                    </select>
                </div>
            </div>
        </div>
    );
});

Panner3DNode.displayName = 'Panner3DNode';
export default Panner3DNode;
