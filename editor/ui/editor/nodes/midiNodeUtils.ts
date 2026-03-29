import type { MidiPortDescriptor } from '../../../../src/midi';

export interface MidiPortOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export function buildInputOptions(
    inputs: MidiPortDescriptor[],
    selected: string | 'default' | 'all'
): MidiPortOption[] {
    const options: MidiPortOption[] = [
        { value: 'default', label: 'Default' },
        { value: 'all', label: 'All Inputs' },
        ...inputs.map((input) => ({
            value: input.id,
            label: input.name,
        })),
    ];

    if (selected !== 'default' && selected !== 'all' && !inputs.some((input) => input.id === selected)) {
        options.push({
            value: selected,
            label: `Missing: ${selected}`,
            disabled: true,
        });
    }

    return options;
}

export function buildOutputOptions(
    outputs: MidiPortDescriptor[],
    selected: string | null
): MidiPortOption[] {
    const options: MidiPortOption[] = [
        { value: '', label: 'Default' },
        ...outputs.map((output) => ({
            value: output.id,
            label: output.name,
        })),
    ];

    if (selected && !outputs.some((output) => output.id === selected)) {
        options.push({
            value: selected,
            label: `Missing: ${selected}`,
            disabled: true,
        });
    }

    return options;
}

export function getChannelFilterValue(value: number | 'all'): string {
    return value === 'all' ? 'all' : String(value);
}

export function getStatusBadge(
    status: 'granted' | 'pending' | 'unsupported' | 'idle' | 'denied' | 'error',
    active: boolean
): string {
    if (status !== 'granted') {
        if (status === 'denied') return 'No device';
        if (status === 'pending') return 'Connecting';
        if (status === 'unsupported') return 'Unsupported';
        return 'Idle';
    }
    return active ? 'Receiving' : 'Listening';
}
