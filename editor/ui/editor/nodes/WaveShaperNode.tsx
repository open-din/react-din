import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type WaveShaperNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const presets: WaveShaperNodeData['preset'][] = ['softClip', 'hardClip', 'saturate'];
const oversampleValues: WaveShaperNodeData['oversample'][] = ['none', '2x', '4x'];

const WaveShaperNode = memo(({ id, data, selected }: NodeProps) => {
    const wsData = data as WaveShaperNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const amountConnection = useTargetHandleConnection(id, 'amount');

    const handleChange = (key: keyof WaveShaperNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node wave-shaper-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative', background: '#ff7f50' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">∿</span>
                    <span className="node-title">WaveShaper</span>
                </div>
                <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Preset</label>
                    <select value={wsData.preset} onChange={(e) => handleChange('preset', e.target.value)}>
                        {presets.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
                <div className="node-control">
                    <label>Oversample</label>
                    <select value={wsData.oversample} onChange={(e) => handleChange('oversample', e.target.value)}>
                        {oversampleValues.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                </div>
                <div className="node-control">
                    <label>Amount</label>
                    {amountConnection.connected ? <div className="node-connected-value">{formatConnectedValue(amountConnection.value)}</div> : (
                        <input type="range" min="0" max="1" step="0.01" value={wsData.amount} onChange={(e) => handleChange('amount', Number(e.target.value))} />
                    )}
                    <Handle type="target" position={Position.Left} id="amount" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

WaveShaperNode.displayName = 'WaveShaperNode';
export default WaveShaperNode;
