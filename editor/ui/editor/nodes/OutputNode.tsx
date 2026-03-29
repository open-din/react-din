import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type OutputNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';

const OutputNode = memo(({ id, data, selected }: NodeProps) => {
    const outputData = data as OutputNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const nodes = useAudioGraphStore((s) => s.nodes);
    const edges = useAudioGraphStore((s) => s.edges);
    const masterGainConnection = useTargetHandleConnection(id, 'masterGain');

    const togglePlay = () => {
        const newPlaying = !outputData.playing;
        updateNodeData(id, { playing: newPlaying });

        if (newPlaying) {
            // Start audio with current graph
            audioEngine.start(nodes, edges);
        } else {
            // Stop audio
            audioEngine.stop();
        }
    };

    const handleMasterGainChange = (value: number) => {
        updateNodeData(id, { masterGain: value });
        // Update audio in real-time if playing
        if (outputData.playing) {
            audioEngine.updateNode(id, { masterGain: value });
        }
    };

    return (
        <div className={`audio-node output-node ${selected ? 'selected' : ''} ${outputData.playing ? 'playing' : ''}`}>
            <div className="node-header" style={{ justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Handle type="target" position={Position.Left} id="in" className="handle handle-in handle-audio" style={{ left: '0px' }} />
                    <span className="node-icon">🔊</span>
                    <span className="node-title">Output</span>
                </div>
            </div>
            <div className="node-content">
                <button
                    className={`play-button ${outputData.playing ? 'stop' : 'play'}`}
                    onClick={togglePlay}
                >
                    {outputData.playing ? '⏹ Stop' : '▶ Play'}
                </button>
                <div className="node-control">
                    <label>Master</label>
                    {masterGainConnection.connected ? (
                        <div className="node-connected-value">
                            {formatConnectedValue(masterGainConnection.value, (value) => `${Math.round(value * 100)}%`)}
                        </div>
                    ) : (
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={outputData.masterGain}
                            onChange={(e) => handleMasterGainChange(Number(e.target.value))}
                            title="Master volume control"
                        />
                    )}
                    {!masterGainConnection.connected && <span className="value">{Math.round(outputData.masterGain * 100)}%</span>}
                    <Handle type="target" position={Position.Left} id="masterGain" className="handle handle-in handle-param" />
                </div>
            </div>
        </div>
    );
});

OutputNode.displayName = 'OutputNode';
export default OutputNode;
