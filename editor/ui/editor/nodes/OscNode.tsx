import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { CustomHandle } from '../components/CustomHandle';
import { useAudioGraphStore, type OscNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

const waveforms: OscillatorType[] = ['sine', 'square', 'sawtooth', 'triangle'];

const OscNode = memo(({ id, data, selected }: NodeProps) => {
    const oscData = data as OscNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const frequencyConnection = useTargetHandleConnection(id, 'frequency');
    const detuneConnection = useTargetHandleConnection(id, 'detune');

    const handleFrequencyChange = (value: number) => {
        updateNodeData(id, { frequency: value });
        audioEngine.updateNode(id, { frequency: value });
    };

    const handleDetuneChange = (value: number) => {
        updateNodeData(id, { detune: value });
        audioEngine.updateNode(id, { detune: value });
    };

    const handleWaveformChange = (value: OscillatorType) => {
        updateNodeData(id, { waveform: value });
        audioEngine.updateNode(id, { waveform: value });
    };

    const handleLabelChange = (value: string) => {
        updateNodeData(id, { label: value });
    };

    return (
        <div className={`node osc-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <input
                    type="text"
                    value={oscData.label || 'Oscillator'}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className="node-label-input"
                />
            </div>

            <div className="node-content">
                <div className="parameter">
                    <label>Waveform</label>
                    <select
                        value={oscData.waveform}
                        onChange={(e) => handleWaveformChange(e.target.value as OscillatorType)}
                    >
                        {waveforms.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="parameter">
                    <label>Frequency (Hz)</label>
                    <div className="param-value">
                        {frequencyConnection ? formatConnectedValue(frequencyConnection.value) : (
                            <input
                                type="number"
                                value={oscData.frequency}
                                onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                                step="1"
                            />
                        )}
                    </div>
                </div>

                <div className="parameter">
                    <label>Detune (cents)</label>
                    <div className="param-value">
                        {detuneConnection ? formatConnectedValue(detuneConnection.value) : (
                            <input
                                type="number"
                                value={oscData.detune}
                                onChange={(e) => handleDetuneChange(Number(e.target.value))}
                                step="1"
                            />
                        )}
                    </div>
                </div>
            </div>

            <CustomHandle
                type="target"
                position={Position.Left}
                id="frequency"
                style={{ top: '65%' }}
            />
            <CustomHandle
                type="target"
                position={Position.Left}
                id="detune"
                style={{ top: '85%' }}
            />
            <CustomHandle
                type="source"
                position={Position.Right}
                id="out"
            />
        </div>
    );
});

OscNode.displayName = 'OscNode';

export { OscNode };
