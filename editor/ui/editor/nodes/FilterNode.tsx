import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type FilterNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import {
    NodeHandleRow,
    NodeNumberField,
    NodeSelectField,
    NodeShell,
    NodeValueBadge,
    NodeWidget,
    NodeWidgetTitle,
} from '../components/NodeShell';

const filterTypes: BiquadFilterType[] = ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'];

const FILTER_RANGE_MIN = Math.log10(20);
const FILTER_RANGE_MAX = Math.log10(20000);

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function formatFrequency(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return '--';
    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(2)} kHz`;
    }
    return `${Math.round(value)} Hz`;
}

function createFilterResponsePath(type: BiquadFilterType, frequency: number, q: number): string {
    const width = 272;
    const height = 72;
    const cutoff = clamp(
        (Math.log10(Math.max(20, frequency)) - FILTER_RANGE_MIN) / (FILTER_RANGE_MAX - FILTER_RANGE_MIN),
        0,
        1
    );
    const x = 12 + cutoff * (width - 24);
    const qLift = clamp(q, 0.1, 20);
    const peak = 8 + Math.min(18, qLift * 2.4);

    switch (type) {
        case 'highpass':
            return `M 0 ${height - 8} C ${Math.max(0, x - 50)} ${height - 8}, ${Math.max(0, x - 18)} ${height - 8}, ${x} ${height - 18} S ${Math.min(width, x + 24)} 12, ${width} 12`;
        case 'bandpass': {
            const left = clamp(x - 42, 20, width - 60);
            const right = clamp(x + 42, 60, width - 20);
            return `M 0 ${height - 8} C ${left - 24} ${height - 8}, ${left - 8} ${height - 8}, ${left} ${height - peak} S ${x} 10, ${right} ${height - peak} S ${right + 8} ${height - 8}, ${width} ${height - 8}`;
        }
        case 'notch':
            return `M 0 18 C ${Math.max(0, x - 40)} 18, ${Math.max(0, x - 16)} 18, ${x} ${height - 8} S ${Math.min(width, x + 16)} 18, ${width} 18`;
        case 'peaking': {
            const left = clamp(x - 34, 20, width - 40);
            const right = clamp(x + 34, 40, width - 20);
            return `M 0 22 C ${left - 20} 22, ${left - 8} 22, ${left} ${22 - peak / 2} S ${x} ${Math.max(6, 22 - peak)}, ${right} ${22 - peak / 2} S ${right + 8} 22, ${width} 22`;
        }
        case 'lowpass':
        case 'allpass':
        case 'lowshelf':
        case 'highshelf':
        default:
            return `M 0 18 C ${Math.max(0, x - 50)} 18, ${Math.max(0, x - 18)} 18, ${x} 20 S ${Math.min(width, x + 22)} ${height - 6}, ${width} ${height - 6}`;
    }
}

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

    const currentFrequency = frequencyConnection.value ?? filterData.frequency;
    const responsePath = useMemo(
        () => createFilterResponsePath(filterData.filterType, currentFrequency, filterData.q),
        [filterData.filterType, currentFrequency, filterData.q]
    );

    return (
        <NodeShell
            nodeType="filter"
            title={filterData.label?.trim() || 'Filter'}
            selected={selected}
            badge={<NodeValueBadge>{selected ? 'selected' : 'response'}</NodeValueBadge>}
        >
            <NodeHandleRow direction="source" label="audio out" handleId="out" handleKind="audio" />

            <NodeWidget
                title={<NodeWidgetTitle icon="filter">Response</NodeWidgetTitle>}
                footer={`${filterData.filterType} / ${formatFrequency(currentFrequency)}`}
            >
                <div className="node-shell__filter-plot">
                    <svg viewBox="0 0 272 72" className="node-shell__filter-svg" aria-hidden="true">
                        <path className="node-shell__filter-grid" d="M0 18H272 M0 36H272 M0 54H272" />
                        <path className="node-shell__filter-grid" d="M54 0V72 M108 0V72 M162 0V72 M216 0V72" />
                        <path className="node-shell__filter-curve" d={responsePath} />
                    </svg>
                </div>
                <NodeSelectField
                    aria-label="Filter type"
                    value={filterData.filterType}
                    onChange={(value) => handleChange('filterType', value)}
                >
                    {filterTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </NodeSelectField>
            </NodeWidget>

            <NodeHandleRow direction="target" label="audio in" handleId="in" handleKind="audio" />
            <NodeHandleRow
                direction="target"
                label="frequency"
                handleId="frequency"
                handleKind="control"
                trailing={frequencyConnection.connected ? (
                    <NodeValueBadge live>{formatConnectedValue(frequencyConnection.value, formatFrequency)}</NodeValueBadge>
                ) : (
                    <NodeNumberField
                        aria-label="Frequency"
                        className="node-shell__row-field"
                        min={20}
                        max={20000}
                        step={10}
                        value={filterData.frequency}
                        onChange={(value) => handleChange('frequency', value)}
                    />
                )}
            />
            <NodeHandleRow
                direction="target"
                label="Q"
                handleId="q"
                handleKind="control"
                trailing={qConnection.connected ? (
                    <NodeValueBadge live>{formatConnectedValue(qConnection.value, (value) => value.toFixed(2))}</NodeValueBadge>
                ) : (
                    <NodeNumberField
                        aria-label="Q"
                        className="node-shell__row-field"
                        min={0.1}
                        max={20}
                        step={0.1}
                        value={filterData.q}
                        onChange={(value) => handleChange('q', value)}
                    />
                )}
            />
            <NodeHandleRow
                direction="target"
                label="detune"
                handleId="detune"
                handleKind="control"
                trailing={detuneConnection.connected ? (
                    <NodeValueBadge live>{formatConnectedValue(detuneConnection.value, (value) => `${Math.round(value)} c`)}</NodeValueBadge>
                ) : (
                    <NodeNumberField
                        aria-label="Detune"
                        className="node-shell__row-field"
                        min={-1200}
                        max={1200}
                        step={10}
                        value={filterData.detune}
                        onChange={(value) => handleChange('detune', value)}
                    />
                )}
            />
            <NodeHandleRow
                direction="target"
                label="gain"
                handleId="gain"
                handleKind="control"
                trailing={gainConnection.connected ? (
                    <NodeValueBadge live>{formatConnectedValue(gainConnection.value, (value) => `${value.toFixed(1)} dB`)}</NodeValueBadge>
                ) : (
                    <NodeNumberField
                        aria-label="Gain"
                        className="node-shell__row-field"
                        min={-40}
                        max={40}
                        step={0.1}
                        value={filterData.gain}
                        onChange={(value) => handleChange('gain', value)}
                    />
                )}
            />
        </NodeShell>
    );
});

FilterNode.displayName = 'FilterNode';
export default FilterNode;
