import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useAudioGraphStore, type PianoRollNodeData, type NoteEvent } from '../store';
import { audioEngine } from '../AudioEngine';
import '../editor.css';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const midiToNoteName = (midi: number): string => {
    const octave = Math.floor(midi / 12) - 1;
    const note = NOTE_NAMES[midi % 12];
    return `${note}${octave}`;
};

interface DragState {
    isDrawing: boolean;
    startPitch: number;
    startStep: number;
    currentStep: number;
    isDeleting: boolean;
}

export const PianoRollNode: React.FC<NodeProps<Node<PianoRollNodeData>>> = memo(({ id, data, selected }) => {
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);
    const [currentPlayStep, setCurrentPlayStep] = useState<number>(-1);
    const [dragState, setDragState] = useState<DragState>({
        isDrawing: false,
        startPitch: -1,
        startStep: -1,
        currentStep: -1,
        isDeleting: false,
    });
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        return audioEngine.subscribeStep((step) => {
            setCurrentPlayStep(step);
        });
    }, []);

    const steps = data.steps || 16;
    const octaves = data.octaves || 2;
    const baseNote = data.baseNote || 48; // C3
    const notes = data.notes || [];

    const totalNotes = octaves * 12;

    const hasNoteAt = useCallback((pitch: number, step: number): NoteEvent | undefined => {
        return notes.find((n) => n.pitch === pitch && n.step === step);
    }, [notes]);

    // Check if a cell is covered by a note (note starts before but extends to this step)
    const isNoteCovering = useCallback((pitch: number, step: number): NoteEvent | undefined => {
        return notes.find((n) =>
            n.pitch === pitch &&
            n.step <= step &&
            n.step + n.duration > step
        );
    }, [notes]);

    const handleMouseDown = useCallback((pitch: number, step: number, e: React.MouseEvent) => {
        e.preventDefault();
        const existingNote = isNoteCovering(pitch, step);

        setDragState({
            isDrawing: true,
            startPitch: pitch,
            startStep: step,
            currentStep: step,
            isDeleting: !!existingNote,
        });

        // If deleting, remove the note immediately
        if (existingNote) {
            const newNotes = notes.filter((n) => !(n.pitch === pitch && n.step === existingNote.step));
            updateNodeData(id, { notes: newNotes });
        }
    }, [notes, isNoteCovering, updateNodeData, id]);

    const handleMouseEnter = useCallback((pitch: number, step: number) => {
        if (!dragState.isDrawing) return;

        // Only allow horizontal drawing on the same pitch
        if (pitch !== dragState.startPitch) return;

        setDragState(prev => ({
            ...prev,
            currentStep: step,
        }));
    }, [dragState.isDrawing, dragState.startPitch]);

    const handleMouseUp = useCallback(() => {
        if (!dragState.isDrawing || dragState.isDeleting) {
            setDragState(prev => ({ ...prev, isDrawing: false }));
            return;
        }

        // Create a note from startStep to currentStep
        const startStep = Math.min(dragState.startStep, dragState.currentStep);
        const endStep = Math.max(dragState.startStep, dragState.currentStep);
        const duration = endStep - startStep + 1;

        // Remove any existing notes that overlap
        const newNotes = notes.filter((n) => {
            if (n.pitch !== dragState.startPitch) return true;
            // Remove if overlapping
            const noteEnd = n.step + n.duration;
            if (n.step >= startStep && n.step <= endStep) return false;
            if (noteEnd > startStep && noteEnd <= endStep + 1) return false;
            if (n.step < startStep && noteEnd > endStep + 1) return false;
            return true;
        });

        // Add new note
        const newNote: NoteEvent = {
            pitch: dragState.startPitch,
            step: startStep,
            duration,
            velocity: 0.8,
        };
        newNotes.push(newNote);

        updateNodeData(id, { notes: newNotes });

        setDragState({
            isDrawing: false,
            startPitch: -1,
            startStep: -1,
            currentStep: -1,
            isDeleting: false,
        });
    }, [dragState, notes, updateNodeData, id]);

    // Handle mouse up outside the grid
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (dragState.isDrawing) {
                handleMouseUp();
            }
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [dragState.isDrawing, handleMouseUp]);

    // Check if a cell is part of the current drag selection
    const isInDragSelection = useCallback((pitch: number, step: number): boolean => {
        if (!dragState.isDrawing || dragState.isDeleting) return false;
        if (pitch !== dragState.startPitch) return false;
        const minStep = Math.min(dragState.startStep, dragState.currentStep);
        const maxStep = Math.max(dragState.startStep, dragState.currentStep);
        return step >= minStep && step <= maxStep;
    }, [dragState]);

    const updateSteps = useCallback((nextSteps: number) => {
        const clampedSteps = Math.max(1, nextSteps);
        updateNodeData(id, {
            steps: clampedSteps,
            notes: notes
                .filter((note) => note.step < clampedSteps)
                .map((note) => ({
                    ...note,
                    duration: Math.max(1, Math.min(note.duration, clampedSteps - note.step)),
                })),
        });
    }, [id, notes, updateNodeData]);

    const updateOctaves = useCallback((nextOctaves: number) => {
        updateNodeData(id, { octaves: Math.max(1, nextOctaves) });
    }, [id, updateNodeData]);

    const updateBaseNote = useCallback((nextBaseNote: number) => {
        updateNodeData(id, { baseNote: nextBaseNote });
    }, [id, updateNodeData]);

    return (
        <div className={`audio-node piano-roll-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-icon">🎼</span>
                <span className="node-title">{data.label}</span>
            </div>

            <div className="node-content">
                <div className="grid grid-cols-3 gap-2 pb-3">
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
                    <div className="node-control">
                        <label>Octaves</label>
                        <select
                            value={octaves}
                            onChange={(e) => updateOctaves(Number(e.target.value))}
                        >
                            {[1, 2, 3, 4].map((value) => (
                                <option key={value} value={value}>{value}</option>
                            ))}
                        </select>
                    </div>
                    <div className="node-control">
                        <label>Base</label>
                        <select
                            value={baseNote}
                            onChange={(e) => updateBaseNote(Number(e.target.value))}
                        >
                            {[36, 48, 60, 72].map((value) => (
                                <option key={value} value={value}>{midiToNoteName(value)}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="piano-roll-grid" ref={gridRef}>
                    {/* Piano keys column */}
                    <div className="piano-keys">
                        {Array.from({ length: totalNotes }).map((_, i) => {
                            const pitch = baseNote + totalNotes - 1 - i;
                            const isBlack = [1, 3, 6, 8, 10].includes(pitch % 12);
                            return (
                                <div
                                    key={`key-${pitch}`}
                                    className={`piano-key ${isBlack ? 'black' : 'white'}`}
                                    title={midiToNoteName(pitch)}
                                >
                                    {!isBlack && <span className="key-label">{midiToNoteName(pitch)}</span>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Grid */}
                    <div className="piano-grid-container">
                        {Array.from({ length: totalNotes }).map((_, rowIdx) => {
                            const pitch = baseNote + totalNotes - 1 - rowIdx;
                            return (
                                <div key={`row-${pitch}`} className="piano-grid-row">
                                    {Array.from({ length: steps }).map((_, stepIdx) => {
                                        const noteEvent = hasNoteAt(pitch, stepIdx);
                                        const coveringNote = isNoteCovering(pitch, stepIdx);
                                        const isCurrent = currentPlayStep % steps === stepIdx;
                                        const isBeat = stepIdx % 4 === 0;
                                        const isSelected = isInDragSelection(pitch, stepIdx);
                                        const isNoteStart = noteEvent !== undefined;
                                        const isNoteContinuation = coveringNote && !isNoteStart;

                                        return (
                                            <div
                                                key={`cell-${pitch}-${stepIdx}`}
                                                className={`piano-cell ${isNoteStart ? 'active note-start' : ''} ${isNoteContinuation ? 'active note-cont' : ''} ${isCurrent ? 'current' : ''} ${isBeat ? 'beat' : ''} ${isSelected ? 'selecting' : ''}`}
                                                onMouseDown={(e) => handleMouseDown(pitch, stepIdx, e)}
                                                onMouseEnter={() => handleMouseEnter(pitch, stepIdx)}
                                                title={`${midiToNoteName(pitch)} Step ${stepIdx + 1}${noteEvent ? ` (dur: ${noteEvent.duration})` : ''}`}
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Transport Input */}
            <Handle
                type="target"
                position={Position.Left}
                id="transport"
                className="handle handle-in"
            />

            {/* Trigger Output */}
            <Handle
                type="source"
                position={Position.Right}
                id="trigger"
                className="handle handle-out"
            />
        </div>
    );
});
