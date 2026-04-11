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
            runtimeRef.current?.setInput(key, 1);
            const ms = Math.max(0, event.duration * 1000);
            window.setTimeout(() => {
                runtimeRef.current?.setInput(key, 0);
            }, ms);
        };
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
                return;
            }
            requestAnimationFrame(rafPoll);
        };
        requestAnimationFrame(rafPoll);
    });
}
