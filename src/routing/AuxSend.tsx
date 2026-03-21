import { useEffect, useRef, type FC } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut, AudioOutProvider } from '../core/AudioOutContext';
import type { AuxSendProps } from './types';
import { getOrCreateBusNode } from './busRegistry';

export const AuxSend: FC<AuxSendProps> = ({
    children,
    bypass = false,
    busId = 'aux',
    sendGain = 0.5,
    tap = 'pre',
    nodeRef: externalRef,
}) => {
    const { context } = useAudio();
    const { outputNode } = useAudioOut();

    const inputRef = useRef<GainNode | null>(null);
    const passRef = useRef<GainNode | null>(null);
    const sendRef = useRef<GainNode | null>(null);

    useEffect(() => {
        if (!context || !outputNode) return;

        const input = context.createGain();
        const pass = context.createGain();
        const send = context.createGain();
        const busNode = getOrCreateBusNode(context, busId);

        pass.gain.value = 1;
        send.gain.value = bypass ? 0 : Math.max(0, sendGain);

        input.connect(pass);
        pass.connect(outputNode);

        input.connect(send);
        send.connect(busNode);

        inputRef.current = input;
        passRef.current = pass;
        sendRef.current = send;

        if (externalRef) {
            (externalRef as React.MutableRefObject<GainNode | null>).current = send;
        }

        return () => {
            try { input.disconnect(); } catch { /* noop */ }
            try { pass.disconnect(); } catch { /* noop */ }
            try { send.disconnect(); } catch { /* noop */ }
            inputRef.current = null;
            passRef.current = null;
            sendRef.current = null;
            if (externalRef) {
                (externalRef as React.MutableRefObject<GainNode | null>).current = null;
            }
        };
    }, [context, outputNode, busId, externalRef]);

    useEffect(() => {
        if (!sendRef.current || !context) return;
        const next = bypass ? 0 : Math.max(0, sendGain);
        if (typeof sendRef.current.gain.setTargetAtTime === 'function') {
            sendRef.current.gain.setTargetAtTime(next, context.currentTime, 0.01);
        } else {
            sendRef.current.gain.value = next;
        }
    }, [context, sendGain, bypass, tap]);

    return (
        <AudioOutProvider node={bypass ? outputNode : inputRef.current}>
            {children}
        </AudioOutProvider>
    );
};
