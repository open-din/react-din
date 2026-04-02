import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type OutputNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import { EditorIcon } from '../components/EditorIcons';
import {
    NodeHandleRow,
    NodeNumberField,
    NodeShell,
    NodeValueBadge,
    NodeWidget,
} from '../components/NodeShell';

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

    const meterHeights = useMemo(() => {
        const intensity = outputData.playing ? outputData.masterGain : outputData.masterGain * 0.45;
        const base = [0.22, 0.36, 0.48, 0.6, 0.42, 0.28, 0.54, 0.46, 0.18, 0.12];
        return base.map((value, index) => {
            const shaped = Math.min(1, value * (0.72 + intensity));
            return `${Math.max(10, Math.round(shaped * 34 + (index % 3))) }px`;
        });
    }, [outputData.masterGain, outputData.playing]);

    return (
        <NodeShell
            nodeType="output"
            title={outputData.label?.trim() || 'Output'}
            selected={selected}
            className={outputData.playing ? 'playing' : ''}
            badge={<NodeValueBadge>sink</NodeValueBadge>}
        >
            <NodeHandleRow direction="source" label="No signal outputs" />

            <NodeWidget
                title={(
                    <>
                        <button
                            type="button"
                            className={`node-shell__transport-button ${outputData.playing ? 'is-live' : ''}`}
                            onClick={togglePlay}
                            aria-label={outputData.playing ? 'Stop output' : 'Start output'}
                        >
                            <EditorIcon name={outputData.playing ? 'stop' : 'play'} className="node-shell__transport-icon" />
                            <span>{outputData.playing ? 'LIVE' : 'PLAY'}</span>
                        </button>
                        <span className="node-shell__widget-meter-label">master {outputData.masterGain.toFixed(2)}</span>
                    </>
                )}
            >
                <div className="node-shell__meter" aria-hidden="true">
                    {meterHeights.map((height, index) => (
                        <span key={`${id}-meter-${index}`} className="node-shell__meter-bar" style={{ height }} />
                    ))}
                </div>
            </NodeWidget>

            <NodeHandleRow direction="target" label="audio in" handleId="in" handleKind="audio" />
            <NodeHandleRow
                direction="target"
                label="master"
                handleId="masterGain"
                handleKind="control"
                trailing={masterGainConnection.connected ? (
                    <NodeValueBadge live>{formatConnectedValue(masterGainConnection.value, (value) => `${Math.round(value * 100)}%`)}</NodeValueBadge>
                ) : (
                    <NodeNumberField
                        aria-label="Master volume control"
                        title="Master volume control"
                        className="node-shell__row-field"
                        min={0}
                        max={1}
                        step={0.01}
                        value={outputData.masterGain}
                        onChange={handleMasterGainChange}
                    />
                )}
            />
        </NodeShell>
    );
});

OutputNode.displayName = 'OutputNode';
export default OutputNode;
