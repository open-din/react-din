import React, { memo, useRef, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAudioGraphStore, type ADSRNodeData } from '../store';
import { formatConnectedValue, useTargetHandleConnection } from '../paramConnections';
import '../editor.css';

export const ADSRNode: React.FC<NodeProps<Node<ADSRNodeData>>> = memo(({ id, data, selected }) => {
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const attackConnection = useTargetHandleConnection(id, 'attack');
    const decayConnection = useTargetHandleConnection(id, 'decay');
    const sustainConnection = useTargetHandleConnection(id, 'sustain');
    const releaseConnection = useTargetHandleConnection(id, 'release');

    const attack = data.attack ?? 0.1;
    const decay = data.decay ?? 0.2;
    const sustain = data.sustain ?? 0.5;
    const release = data.release ?? 0.5;

    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<'A' | 'D' | 'S' | 'R' | null>(null);

    // SVG Dimensions
    const width = 280;
    const height = 120;
    const padding = 10;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    // Scale helpers (Times in seconds, Max total time visible ~ 5s?)
    const maxTime = 3.0; // Seconds visible on X axis
    const timeToX = (t: number) => padding + (Math.min(t, maxTime) / maxTime) * graphWidth;
    const xToTime = (x: number) => ((x - padding) / graphWidth) * maxTime;
    const valueToY = (v: number) => padding + (1 - v) * graphHeight;
    const yToValue = (y: number) => 1 - ((y - padding) / graphHeight);

    // Points
    const pStart = { x: timeToX(0), y: valueToY(0) };
    const pAttack = { x: timeToX(attack), y: valueToY(1) };
    const pDecay = { x: timeToX(attack + decay), y: valueToY(sustain) };
    // Sustain duration is visualized as fixed 0.5s for now
    const sustainDuration = 0.5;
    const pSustainEnd = { x: timeToX(attack + decay + sustainDuration), y: valueToY(sustain) };
    const pRelease = { x: timeToX(attack + decay + sustainDuration + release), y: valueToY(0) };

    const pathD = `
        M ${pStart.x} ${pStart.y}
        L ${pAttack.x} ${pAttack.y}
        L ${pDecay.x} ${pDecay.y}
        L ${pSustainEnd.x} ${pSustainEnd.y}
        L ${pRelease.x} ${pRelease.y}
    `;

    // Handlers
    const handleSliderChange = (param: 'attack' | 'decay' | 'sustain' | 'release', val: number) => {
        updateNodeData(id, { [param]: val });
    };

    const handleMouseDown = (e: React.MouseEvent, param: 'A' | 'D' | 'R') => {
        e.stopPropagation(); // Prevent node drag
        setDragging(param);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const t = Math.max(0, xToTime(x));
        const val = Math.max(0, Math.min(1, yToValue(y)));

        if (dragging === 'A') {
            // Dragging Attack Point: Change Attack Time
            // Attack time is simply t
            const newAttack = Math.max(0.01, t);
            updateNodeData(id, { attack: newAttack });
        } else if (dragging === 'D') {
            // Dragging Decay Point: Change Decay Time (X) and Sustain Level (Y)
            // t = attack + decay -> decay = t - attack
            const newDecay = Math.max(0.01, t - attack);
            updateNodeData(id, { decay: newDecay, sustain: val });
        } else if (dragging === 'R') {
            // Dragging Release Point: Change Release Time
            // t = attack + decay + sustainDuration + release
            // release = t - (attack + decay + sustainDuration)
            const paramBase = attack + decay + sustainDuration;
            const newRelease = Math.max(0.01, t - paramBase);
            updateNodeData(id, { release: newRelease });
        }
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    return (
        <div
            className={`audio-node adsr-node ${selected ? 'selected' : ''}`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="node-header">
                <span className="node-icon">📈</span>
                <span className="node-title">{data.label}</span>
            </div>

            <div className="node-content">
                {/* Visualization */}
                <div className="adsr-viz">
                    <svg ref={svgRef} width={width} height={height}>
                        {/* Grid/Guides */}
                        <line x1={padding} y1={valueToY(0)} x2={width - padding} y2={valueToY(0)} stroke="#444" strokeWidth="1" />
                        <line x1={padding} y1={valueToY(1)} x2={width - padding} y2={valueToY(1)} stroke="#444" strokeWidth="1" strokeDasharray="4" />

                        {/* Envelope Path */}
                        <path d={pathD} stroke="#0088ff" strokeWidth="2" fill="rgba(0, 136, 255, 0.2)" />

                        {/* Handles */}
                        {/* Attack Handle */}
                        <circle
                            cx={pAttack.x} cy={pAttack.y} r="5"
                            className="adsr-handle attack"
                            onMouseDown={(e) => handleMouseDown(e, 'A')}
                        />
                        {/* Decay/Sustain Handle */}
                        <circle
                            cx={pDecay.x} cy={pDecay.y} r="5"
                            className="adsr-handle decay"
                            onMouseDown={(e) => handleMouseDown(e, 'D')}
                        />
                        {/* Release Handle */}
                        <circle
                            cx={pRelease.x} cy={pRelease.y} r="5"
                            className="adsr-handle release"
                            onMouseDown={(e) => handleMouseDown(e, 'R')}
                        />
                    </svg>
                </div>

                {/* Controls */}
                <div className="adsr-controls">
                    <div className="control-group node-control">
                        <label>Attack ({attack.toFixed(2)}s)</label>
                        {attackConnection.connected ? (
                            <div className="node-connected-value">
                                {formatConnectedValue(attackConnection.value, (value) => `${value.toFixed(2)}s`)}
                            </div>
                        ) : (
                            <input
                                type="range"
                                min="0.01" max="2" step="0.01"
                                value={attack}
                                title="Attack"
                                onChange={(e) => handleSliderChange('attack', Number(e.target.value))}
                            />
                        )}
                        <Handle type="target" position={Position.Left} id="attack" className="handle handle-in handle-param" />
                    </div>
                    <div className="control-group node-control">
                        <label>Decay ({decay.toFixed(2)}s)</label>
                        {decayConnection.connected ? (
                            <div className="node-connected-value">
                                {formatConnectedValue(decayConnection.value, (value) => `${value.toFixed(2)}s`)}
                            </div>
                        ) : (
                            <input
                                type="range"
                                min="0.01" max="2" step="0.01"
                                value={decay}
                                title="Decay"
                                onChange={(e) => handleSliderChange('decay', Number(e.target.value))}
                            />
                        )}
                        <Handle type="target" position={Position.Left} id="decay" className="handle handle-in handle-param" />
                    </div>
                    <div className="control-group node-control">
                        <label>Sustain ({sustain.toFixed(2)})</label>
                        {sustainConnection.connected ? (
                            <div className="node-connected-value">
                                {formatConnectedValue(sustainConnection.value)}
                            </div>
                        ) : (
                            <input
                                type="range"
                                min="0" max="1" step="0.01"
                                value={sustain}
                                title="Sustain"
                                onChange={(e) => handleSliderChange('sustain', Number(e.target.value))}
                            />
                        )}
                        <Handle type="target" position={Position.Left} id="sustain" className="handle handle-in handle-param" />
                    </div>
                    <div className="control-group node-control">
                        <label>Release ({release.toFixed(2)}s)</label>
                        {releaseConnection.connected ? (
                            <div className="node-connected-value">
                                {formatConnectedValue(releaseConnection.value, (value) => `${value.toFixed(2)}s`)}
                            </div>
                        ) : (
                            <input
                                type="range"
                                min="0.01" max="5" step="0.01"
                                value={release}
                                title="Release"
                                onChange={(e) => handleSliderChange('release', Number(e.target.value))}
                            />
                        )}
                        <Handle type="target" position={Position.Left} id="release" className="handle handle-in handle-param" />
                    </div>
                </div>
            </div>

            {/* Gate Input (Trigger) */}
            <Handle
                type="target"
                position={Position.Left}
                id="gate"
                className="handle handle-in"
            />
            <div className="handle-label handle-label-in" style={{ left: '-40px', top: '50%' }}>Gate</div>

            {/* Envelope Output */}
            <Handle
                type="source"
                position={Position.Right}
                id="envelope"
                className="handle handle-out"
            />
            <div className="handle-label handle-label-out">Envelope</div>
        </div>
    );
});
