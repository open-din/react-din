import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AudioProvider, useAudio } from '@din/react';

function AudioProbe() {
    const audio = useAudio();
    return (
        <div>
            <span data-testid="state">{audio.state}</span>
            <span data-testid="unlocked">{String(audio.isUnlocked)}</span>
        </div>
    );
}

describe('AudioProvider', () => {
    it('creates and unlocks the audio context on user gesture', async () => {
        const onUnlock = vi.fn();

        render(
            <AudioProvider onUnlock={onUnlock}>
                <AudioProbe />
            </AudioProvider>
        );

        expect(screen.getByTestId('state')).toHaveTextContent('suspended');
        expect(screen.getByTestId('unlocked')).toHaveTextContent('false');

        fireEvent.click(document);

        await waitFor(() => {
            expect(onUnlock).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('state')).toHaveTextContent('running');
            expect(screen.getByTestId('unlocked')).toHaveTextContent('true');
        });
    });
});
