import React, { memo, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAudioGraphStore, type StepSequencerNodeData } from '../store';
import { audioEngine } from '../AudioEngine';
import '../editor.css';

export const StepSequencerNode: React.FC<NodeProps<Node<StepSequencerNodeData>>> = memo(({ id, data, selected }) => {
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const [currentStep, setCurrentStep] = useState<number>(-1);

    useEffect(() => {
        return audioEngine.subscribeStep((step) => {
            setCurrentStep(step);
        });
    }, []);

    // Ensure arrays exist
    const steps = data.steps || 16;
    const velocities = data.pattern || Array(steps).fill(0.8);
    const activeSteps = data.activeSteps || Array(steps).fill(false);
    const playingStep = currentStep >= 0 ? currentStep % steps : -1;

    const toggleStep = (index: number) => {
        const newActive = [...activeSteps];
        newActive[index] = !newActive[index];
        updateNodeData(id, { activeSteps: newActive });
    };

    const updateVelocity = (index: number, value: number) => {
        const newVelocities = [...velocities];
        newVelocities[index] = value;
        updateNodeData(id, { pattern: newVelocities });
    };

    const updateSteps = (nextSteps: number) => {
        const clampedSteps = Math.max(1, nextSteps);
        const nextPattern = Array.from(
            { length: clampedSteps },
            (_, index) => velocities[index] ?? 0.8
        );
        const nextActiveSteps = Array.from(
            { length: clampedSteps },
            (_, index) => activeSteps[index] ?? false
        );
        updateNodeData(id, {
            steps: clampedSteps,
            pattern: nextPattern,
            activeSteps: nextActiveSteps,
        });
    };

    return (
        <div className={`audio-node sequencer-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-icon">🎹</span>
                <span className="node-title">{data.label}</span>
            </div>

            <div className="node-content">
                <div className="node-control">
                    <label>Steps</label>
                    <select
                        value={steps}
                        onChange={(e) => updateSteps(Number(e.target.value))}
                    >
                        {[16, 32, 64].map((value) => (
                            <option key={value} value={value}>{value}</option>
                        ))}
                    </select>
                </div>
                <div className="sequencer-status" aria-live="polite">
                    <span className={`sequencer-status-dot ${playingStep >= 0 ? 'active' : ''}`} />
                    <span className="sequencer-status-text">
                        {playingStep >= 0 ? `Playing step ${playingStep + 1} / ${steps}` : 'Waiting for transport'}
                    </span>
                </div>
                <div className="sequencer-steps-row">
                    {Array.from({ length: steps }).map((_, i) => (
                        <div
                            key={`step-${i}`}
                            className={`step-column ${playingStep === i ? 'current-step-column' : ''} ${activeSteps[i] ? 'active-step-column' : ''}`}
                        >
                            <button
                                className={`sequencer-pad ${activeSteps[i] ? 'active' : ''} ${playingStep === i ? 'current-step' : ''}`}
                                onClick={() => toggleStep(i)}
                                title={`Step ${i + 1}`}
                            />
                            <div className="velocity-bar-container">
                                <div
                                    className="velocity-bar"
                                    style={{ height: `${velocities[i] * 100}%` }}
                                />
                                <input
                                    type="range"
                                    className="velocity-input"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={velocities[i]}
                                    onChange={(e) => updateVelocity(i, Number(e.target.value))}
                                    title={`Velocity ${i + 1}`}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Transport Input */}
            <Handle
                type="target"
                position={Position.Left}
                id="transport"
                className="handle handle-in"
            />
            <div className="handle-label handle-label-in" style={{ left: '-60px', top: '50%' }}>Transport</div>

            {/* Trigger Output */}
            <Handle
                type="source"
                position={Position.Right}
                id="trigger"
                className="handle handle-out"
            />
            <div className="handle-label handle-label-out">Trigger</div>
        </div>
    );
});
