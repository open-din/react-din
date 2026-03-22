import type { FC } from 'react';
import { useMidiNote } from './useMidi';
import type { MidiNoteInputProps } from './types';

export const MidiNoteInput: FC<MidiNoteInputProps> = ({ children, ...options }) => {
    return <>{children(useMidiNote(options))}</>;
};
