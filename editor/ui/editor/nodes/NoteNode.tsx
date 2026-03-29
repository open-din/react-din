import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useAudioGraphStore, type NoteNodeData } from '../store';
import { audioEngine } from '../AudioEngine';

// Note mappings
const NOTES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const noteToFreq = (note: string, octave: number): number => {
    const noteIndex = NOTES_EN.indexOf(note.replace('♯', '#').replace('b', 'b'));
    const frenchIndex = NOTES_FR.findIndex(n =>
        note.startsWith(n) || n === note.replace('#', '♯')
    );
    const index = noteIndex !== -1 ? noteIndex : (frenchIndex !== -1 ? frenchIndex : 0);
    const midiNote = 12 + index + (octave * 12);
    return 440 * Math.pow(2, (midiNote - 69) / 12);
};

const NoteNode = memo(({ id, data, selected }: NodeProps<Node<NoteNodeData>>) => {
    const noteData = data;
    const updateNodeData = useAudioGraphStore((s) => s.updateNodeData);

    const notes = noteData.language === 'fr' ? NOTES_FR : NOTES_EN;
    const currentNote = noteData.language === 'fr'
        ? NOTES_FR[NOTES_EN.indexOf(noteData.note)] || noteData.note
        : noteData.note;

    const handleNoteChange = (note: string) => {
        // Convert to English note for storage
        const englishNote = noteData.language === 'fr'
            ? NOTES_EN[NOTES_FR.indexOf(note)] || note
            : note;
        const freq = noteToFreq(englishNote, noteData.octave);
        updateNodeData(id, { note: englishNote, frequency: freq });
        audioEngine.updateNode(id, { frequency: freq });
    };

    const handleOctaveChange = (octave: number) => {
        const freq = noteToFreq(noteData.note, octave);
        updateNodeData(id, { octave, frequency: freq });
        audioEngine.updateNode(id, { frequency: freq });
    };

    const handleLanguageToggle = () => {
        updateNodeData(id, {
            language: noteData.language === 'en' ? 'fr' : 'en'
        });
    };

    return (
        <div className={`audio-node note-node ${selected ? 'selected' : ''}`}>
            <div className="node-header">
                <span className="node-icon">🎵</span>
                <span className="node-title">Note</span>
                <button
                    className="lang-toggle"
                    onClick={handleLanguageToggle}
                    title={`Switch to ${noteData.language === 'en' ? 'Solmization (Do, Re, Mi)' : 'Alphabetical (A, B, C)'}`}
                >
                    {noteData.language === 'en' ? 'DoReMi' : 'ABC'}
                </button>
            </div>
            <div className="node-content">
                <div className="node-control">
                    <label>Note</label>
                    <select
                        value={currentNote}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        title="Note name"
                    >
                        {notes.map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
                <div className="node-control">
                    <label>Octave</label>
                    <input
                        type="range"
                        min="0"
                        max="8"
                        step="1"
                        value={noteData.octave}
                        onChange={(e) => handleOctaveChange(Number(e.target.value))}
                        title="Octave"
                    />
                    <span className="value">{noteData.octave}</span>
                </div>
                <div className="note-display">
                    <span className="note-name">{currentNote}{noteData.octave}</span>
                    <span className="freq">{noteData.frequency.toFixed(1)} Hz</span>
                </div>
            </div>
            <Handle type="source" position={Position.Right} id="freq" className="handle handle-out" title="Frequency output" />
        </div>
    );
});

NoteNode.displayName = 'NoteNode';
export default NoteNode;
