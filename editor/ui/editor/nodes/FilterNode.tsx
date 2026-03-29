import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type FilterNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const filterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];

const FilterNode = memo(({ id, data, selected }: NodeProps) => {
    const filterData = data as FilterNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const frequencyConnection = useTargetHandleConnection(id, 'frequency');
    const qConnection = useTargetHandleConnection(id, 'q');
    const detuneConnection = useTargetHandleConnection(id, 'detune');
    const gainConnection = useTargetHandleConnection(id, 'gain');

    const handleChange = (key: keyof FilterNodeData, value: number | string) => {
        updateNodeData(id, { [key]: value });
        audioEngine.updateNode(id, { [key]: value });
    };

    return (
        <div className={`audio-node filter-node ${selected ? 'selected' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Audio In Handle aligned with header/left */}
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">◇</span>
                    <span className="node-title">Filter</span>
                </div>
                {/* Audio Out Handle aligned with header/right */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="handle-label-static" style={{ fontSize: '9px', color: '#888', marginRight: '8px', textTransform: 'uppercase' }}>Out</span>
                    <Handle type="source" position={Position.Right} id="out" className="handle handle-out handle-audio" style={{ right: '0px' }} />
                </div>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Type</label>
                    <select
                        value={filterData.filterType}
                        onChange={(e) => handleChange('filterType', e.target.value)}
                    >
                        {filterTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Freq</label>
                    {frequencyConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(frequencyConnection.value, (value) => `${Math.round(value)} Hz`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="20"
                            max="20000"
                            step="10"
                            value={filterData.frequency}
                            onChange={(e) => handleChange('frequency', Number(e.target.value))}
                        />
                    )}
                    {!frequencyConnection.connected && <span className="value">{filterData.frequency} Hz</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="frequency"
                        className="handle handle-in handle-param"
                    />
                </div>
                <div className="node-control">
                    <label>Q</label>
                    {qConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(qConnection.value)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0.1"
                            max="20"
                            step="0.1"
                            value={filterData.q}
                            onChange={(e) => handleChange('q', Number(e.target.value))}
                        />
                    )}
                    {!qConnection.connected && <span className="value">{filterData.q}</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="q"
                        className="handle handle-in handle-param"
                    />
                </div>
                <div className="node-control">
                    <label>Detune</label>
                    {detuneConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(detuneConnection.value, (value) => `${Math.round(value)} c`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="-1200"
                            max="1200"
                            step="10"
                            value={filterData.detune}
                            onChange={(e) => handleChange('detune', Number(e.target.value))}
                        />
                    )}
                    {!detuneConnection.connected && <span className="value">{filterData.detune} c</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="detune"
                        className="handle handle-in handle-param"
                    />
                </div>
                <div className="node-control">
                    <label>Gain</label>
                    {gainConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(gainConnection.value, (value) => `${value.toFixed(1)} dB`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="-40"
                            max="40"
                            value={filterData.gain}
                            onChange={(e) => handleChange('gain', Number(e.target.value))}
                        />
                    )}
                    {!gainConnection.connected && <span className="value">{filterData.gain} dB</span>}
                    <Handle
                        type="target"
                        position={Position.Left}
                        id="gain"
                        className="handle handle-in handle-param"
                    />
                </div>
            </div>
        </div>
    );
});

FilterNode.displayName = 'FilterNode';
export default FilterNode;
