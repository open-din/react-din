import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { AudioProvider, EventTrigger, Sequencer, Track, TransportProvider, useOnTrigger, useTrigger, useTransport } from '@din/react';

function TransportProbe() {
    const transport = useTransport();
    return (
        <button onClick={transport.play} type="button">
            {transport.isPlaying ? 'running' : 'idle'}
        </button>
    );
}

function TriggerProbe() {
    const trigger = useTrigger();
    return <span data-testid="trigger">{trigger ? `${trigger.trackId}:${trigger.step}` : 'none'}</span>;
}

function EventCountProbe() {
    const [count, setCount] = useState(0);
    useOnTrigger(() => {
        setCount((value) => value + 1);
    });
    return <span data-testid="event-count">{count}</span>;
}

describe('transport and sequencer components', () => {
    it('starts the transport and emits sequencer triggers', async () => {
        render(
            <AudioProvider>
                <TransportProvider>
                    <TransportProbe />
                </TransportProvider>
                <Sequencer bpm={120} steps={4} autoStart>
                    <Track id="lead" pattern={[1, 0, 1, 0]}>
                        <TriggerProbe />
                    </Track>
                </Sequencer>
            </AudioProvider>
        );

        expect(screen.getByRole('button')).toHaveTextContent('idle');

        fireEvent.click(document);
        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByRole('button')).toHaveTextContent('running');
        expect(screen.getByTestId('trigger')).toHaveTextContent('none');
    });

    it('emits event triggers on token changes and applies cooldown', async () => {
        function Harness() {
            const [token, setToken] = useState(0);
            return (
                <>
                    <button type="button" onClick={() => setToken((value) => value + 1)}>
                        emit
                    </button>
                    <EventTrigger token={token} cooldownMs={1000} trackId="ui">
                        <EventCountProbe />
                    </EventTrigger>
                </>
            );
        }

        render(
            <AudioProvider>
                <Harness />
            </AudioProvider>
        );

        expect(screen.getByTestId('event-count')).toHaveTextContent('0');

        fireEvent.click(screen.getByRole('button', { name: 'emit' }));
        await waitFor(() => {
            expect(screen.getByTestId('event-count')).toHaveTextContent('1');
        });

        fireEvent.click(screen.getByRole('button', { name: 'emit' }));
        await waitFor(() => {
            expect(screen.getByTestId('event-count')).toHaveTextContent('1');
        });
    });

    it('supports rising mode for boolean tokens', async () => {
        function Harness() {
            const [token, setToken] = useState(false);
            return (
                <>
                    <button type="button" onClick={() => setToken((value) => !value)}>
                        toggle
                    </button>
                    <EventTrigger token={token} mode="rising" trackId="ui">
                        <EventCountProbe />
                    </EventTrigger>
                </>
            );
        }

        render(
            <AudioProvider>
                <Harness />
            </AudioProvider>
        );

        expect(screen.getByTestId('event-count')).toHaveTextContent('0');

        fireEvent.click(screen.getByRole('button', { name: 'toggle' })); // false -> true
        await waitFor(() => {
            expect(screen.getByTestId('event-count')).toHaveTextContent('1');
        });

        fireEvent.click(screen.getByRole('button', { name: 'toggle' })); // true -> false
        await waitFor(() => {
            expect(screen.getByTestId('event-count')).toHaveTextContent('1');
        });

        fireEvent.click(screen.getByRole('button', { name: 'toggle' })); // false -> true
        await waitFor(() => {
            expect(screen.getByTestId('event-count')).toHaveTextContent('2');
        });
    });

    it('advances in manual mode when update is called externally', async () => {
        function ManualProbe() {
            const transport = useTransport();
            return (
                <>
                    <button type="button" onClick={transport.play}>play</button>
                    <button type="button" onClick={() => transport.update(1)}>tick</button>
                    <span data-testid="manual-steps">{transport.totalSteps}</span>
                </>
            );
        }

        render(
            <AudioProvider>
                <TransportProvider mode="manual">
                    <ManualProbe />
                </TransportProvider>
            </AudioProvider>
        );

        fireEvent.click(document);
        fireEvent.click(screen.getByRole('button', { name: 'play' }));
        fireEvent.click(screen.getByRole('button', { name: 'tick' }));

        await waitFor(() => {
            expect(Number(screen.getByTestId('manual-steps').textContent ?? '0')).toBeGreaterThan(0);
        });
    });
});
