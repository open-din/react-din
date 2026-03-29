// =============================================================================
// Notes Module - Utility Functions
// =============================================================================

import type { NoteInput, ParsedNote } from './types';
import {
    dinCoreMidiToFreq,
    dinCoreMidiToNote,
    dinCoreNoteFromFrench,
    dinCoreNoteToFrench,
    dinCoreNoteToFreq,
    dinCoreNoteToMidi,
    dinCoreParseNote,
} from '@din/vanilla/core';

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Parse a note input into its components.
 *
 * @param input - MIDI number, note string (e.g., "C4", "Do3", "F#5")
 * @returns Parsed note with name, octave, MIDI, and frequency
 *
 * @example
 * ```ts
 * parseNote('C4');     // { note: 'C', octave: 4, midi: 60, frequency: 261.63 }
 * parseNote('Do3');    // { note: 'C', octave: 3, midi: 48, frequency: 130.81 }
 * parseNote(69);       // { note: 'A', octave: 4, midi: 69, frequency: 440 }
 * parseNote('Sol#2');  // { note: 'G#', octave: 2, midi: 44, frequency: 92.50 }
 * ```
 */
export function parseNote(input: NoteInput): ParsedNote {
    return dinCoreParseNote(input);
}

/**
 * Convert a note string to MIDI number.
 *
 * @param note - Note string (e.g., "C4", "Do3", "F#5") or just note name
 * @param octave - Optional octave if not included in note string
 * @returns MIDI note number (0-127)
 *
 * @example
 * ```ts
 * noteToMidi('C4');      // 60
 * noteToMidi('A4');      // 69
 * noteToMidi('C', 4);    // 60
 * noteToMidi('Do4');     // 60 (French)
 * noteToMidi('Sol#2');   // 44 (French with sharp)
 * ```
 */
export function noteToMidi(note: string, octave?: number): number {
    return dinCoreNoteToMidi(note, octave);
}

/**
 * Convert a MIDI number to note string.
 *
 * @param midi - MIDI note number (0-127)
 * @param preferFlats - Use flat names instead of sharps
 * @returns Note string (e.g., "C4", "Bb3")
 *
 * @example
 * ```ts
 * midiToNote(60);        // "C4"
 * midiToNote(69);        // "A4"
 * midiToNote(61);        // "C#4"
 * midiToNote(61, true);  // "Db4"
 * ```
 */
export function midiToNote(midi: number, preferFlats = false): string {
    return dinCoreMidiToNote(midi, preferFlats);
}

/**
 * Convert a MIDI number to frequency in Hz.
 *
 * @param midi - MIDI note number
 * @returns Frequency in Hz
 *
 * @example
 * ```ts
 * midiToFreq(69);  // 440 (A4)
 * midiToFreq(60);  // 261.63 (C4)
 * ```
 */
export function midiToFreq(midi: number): number {
    return dinCoreMidiToFreq(midi);
}

/**
 * Convert a note to frequency in Hz.
 * Accepts MIDI number, note string, or French note name.
 *
 * @param note - Note input (MIDI number or note string)
 * @returns Frequency in Hz
 *
 * @example
 * ```ts
 * noteToFreq('A4');     // 440
 * noteToFreq('C4');     // 261.63
 * noteToFreq('Do4');    // 261.63 (French)
 * noteToFreq(69);       // 440
 * ```
 */
export function noteToFreq(note: NoteInput): number {
    return dinCoreNoteToFreq(note);
}

/**
 * Convert English note name to French (solfege).
 *
 * @param note - English note name
 * @returns French note name
 *
 * @example
 * ```ts
 * noteToFrench('C');   // "Do"
 * noteToFrench('G#');  // "Sol#"
 * ```
 */
export function noteToFrench(note: string): string {
    return dinCoreNoteToFrench(note);
}

/**
 * Convert French note name to English.
 *
 * @param note - French note name (solfege)
 * @returns English note name
 *
 * @example
 * ```ts
 * noteFromFrench('Do');    // "C"
 * noteFromFrench('Sol#');  // "G#"
 * ```
 */
export function noteFromFrench(note: string): string {
    return dinCoreNoteFromFrench(note);
}
