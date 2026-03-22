import type { FC } from 'react';
import { useMidiCC } from './useMidi';
import type { MidiCCInputProps } from './types';

export const MidiCCInput: FC<MidiCCInputProps> = ({ children, ...options }) => {
    return <>{children(useMidiCC(options))}</>;
};
