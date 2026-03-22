import { useEffect, useRef, type FC } from 'react';
import { useMidi } from './useMidi';
import type { MidiCCOutputProps } from './types';

export const MidiCCOutput: FC<MidiCCOutputProps> = ({
    outputId = null,
    channel = 1,
    cc,
    value,
    valueFormat = 'normalized',
}) => {
    const { sendCC, status } = useMidi();
    const lastSignatureRef = useRef<string>('');

    useEffect(() => {
        if (!Number.isFinite(value)) return;
        const signature = `${outputId ?? 'default'}:${channel}:${cc}:${valueFormat}:${value}`;
        if (signature === lastSignatureRef.current) return;
        lastSignatureRef.current = signature;
        const sent = sendCC({
            outputId,
            channel,
            cc,
            value,
            valueFormat,
        });
        if (!sent) {
            lastSignatureRef.current = '';
        }
    }, [cc, channel, outputId, sendCC, status, value, valueFormat]);

    return null;
};
