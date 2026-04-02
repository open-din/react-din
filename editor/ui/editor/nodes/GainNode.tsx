import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type GainNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import {
    NodeHandleRow,
    NodeHelperText,
    NodeNumberField,
    NodeShell,
    NodeValueBadge,
    NodeWidget,
    NodeWidgetTitle,
} from '../components/NodeShell';

const GainNode = memo(({ id, data, selected }: NodeProps) => {
    const gainData = data as GainNodeData;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const gainConnection = useTargetHandleConnection(id, 'gain');

    const handleGainChange = (value: number) => {
        updateNodeData(id, { gain: value });
        audioEngine.updateNode(id, { gain: value });
    };

    const displayGain = gainConnection.value ?? gainData.gain;

    return (
        <NodeShell
            nodeType="gain"
            title={gainData.label?.trim() || 'Gain'}
            selected={selected}
            badge={<NodeValueBadge>attenuation</NodeValueBadge>}
        >
            <NodeHandleRow direction="source" label="audio out" handleId="out" handleKind="audio" />

            <NodeWidget
                title={<NodeWidgetTitle icon="gain">Gain</NodeWidgetTitle>}
                footer={gainConnection.connected ? <NodeHelperText>Numeric parameter is hidden while gain is driven by a connected input.</NodeHelperText> : null}
            >
                {gainConnection.connected ? (
                    <NodeHelperText>Use the incoming modulation value shown on the gain row to tune the connected source.</NodeHelperText>
                ) : (
                    <>
                        <NodeNumberField
                            aria-label="Gain level"
                            title="Gain level"
                            value={gainData.gain}
                            onChange={handleGainChange}
                            step="0.01"
                        />
                        <NodeHelperText>step 0.01</NodeHelperText>
                    </>
                )}
            </NodeWidget>

            <NodeHandleRow direction="target" label="audio in" handleId="in" handleKind="audio" />
            <NodeHandleRow
                direction="target"
                label="gain"
                handleId="gain"
                handleKind="control"
                trailing={gainConnection.connected
                    ? <NodeValueBadge live>{formatConnectedValue(gainConnection.value, (value) => value.toFixed(2))}</NodeValueBadge>
                    : <NodeValueBadge>{displayGain.toFixed(2)}</NodeValueBadge>}
            />
        </NodeShell>
    );
});

GainNode.displayName = 'GainNode';
export default GainNode;
