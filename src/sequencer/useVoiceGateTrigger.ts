import { usePatchRuntime } from '../core/PatchRuntimeProvider';
import { useOnTrigger } from './useTrigger';

/**
 * Opens a WASM `gain` node's `gate` for each sequencer hit and closes it after `event.duration`.
 * Per-voice gating avoids the engine's single global `midi_gate`, which breaks multi-track graphs.
 */
export function useVoiceGateTrigger(gainNodeId: string | null, enabled: boolean): void {
    const { runtimeRef } = usePatchRuntime();
    useOnTrigger((event) => {
        if (!enabled || !gainNodeId) {
            return;
        }
        const key = `${gainNodeId}:gate`;
        const fire = () => {
            const rt = runtimeRef.current;
            if (rt) {
                // eslint-disable-next-line no-console -- intentional sequencer / WASM gate trace
                console.debug('[react-din] useVoiceGateTrigger setInput', key, 1, {
                    hasRuntime: true,
                });
                rt.setInput(key, 1);
            }
            const ms = Math.max(0, event.duration * 1000);
            window.setTimeout(() => {
                const rtClose = runtimeRef.current;
                if (rtClose) {
                    // eslint-disable-next-line no-console -- intentional sequencer / WASM gate trace
                    console.debug('[react-din] useVoiceGateTrigger setInput', key, 0, {
                        hasRuntime: true,
                    });
                    rtClose.setInput(key, 0);
                }
            }, ms);
        };
        // eslint-disable-next-line no-console -- intentional sequencer / WASM gate trace
        console.debug('[react-din] useVoiceGateTrigger trigger', {
            key,
            hasRuntime: Boolean(runtimeRef.current),
        });
        if (runtimeRef.current) {
            fire();
            return;
        }
        let frames = 0;
        const rafPoll = () => {
            if (runtimeRef.current) {
                fire();
                return;
            }
            frames += 1;
            if (frames > 600) {
                console.warn(
                    '[react-din] useVoiceGateTrigger: PatchRuntime not ready after ~600 frames; gate messages were dropped.',
                    { key, gainNodeId }
                );
                return;
            }
            requestAnimationFrame(rafPoll);
        };
        requestAnimationFrame(rafPoll);
    });
}
