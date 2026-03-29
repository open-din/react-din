import { useEffect, useRef, useState } from 'react';
import { useAudio } from '../core/AudioProvider';
import { useAudioOut } from '../core/AudioOutContext';

/**
 * Options for the useAudioNode hook.
 */
export interface UseAudioNodeOptions<T extends AudioNode> {
    /**
     * Factory function to create the AudioNode.
     * Called with the AudioContext.
     */
    createNode: (context: AudioContext) => T;

    /**
     * Whether to bypass the node (pass-through input to output).
     */
    bypass?: boolean;

    /**
     * Dependencies to watch for node recreation.
     */
    deps?: unknown[];
}

/**
 * Return type for useAudioNode hook.
 */
export interface UseAudioNodeResult<T extends AudioNode> {
    /**
     * Ref to the created AudioNode.
     */
    nodeRef: React.MutableRefObject<T | null>;

    /**
     * The AudioContext.
     */
    context: AudioContext | null;

    /**
     * Whether the audio system is unlocked.
     */
    isUnlocked: boolean;
}

/**
 * Base hook for creating and managing audio nodes.
 *
 * Handles:
 * - Node creation (client-side only)
 * - Connection to parent output
 * - Cleanup on unmount
 * - Bypass mode
 *
 * @example
 * ```tsx
 * function MyGainNode({ gain = 1, children }) {
 *   const { nodeRef } = useAudioNode({
 *     createNode: (ctx) => ctx.createGain(),
 *   });
 *
 *   useEffect(() => {
 *     if (nodeRef.current) {
 *       nodeRef.current.gain.value = gain;
 *     }
 *   }, [gain]);
 *
 *   return (
 *     <AudioOutProvider node={nodeRef.current}>
 *       {children}
 *     </AudioOutProvider>
 *   );
 * }
 * ```
 */
export function useAudioNode<T extends AudioNode>({
    createNode,
    bypass = false,
    deps = [],
}: UseAudioNodeOptions<T>): UseAudioNodeResult<T> {
    const { context, isUnlocked, debug } = useAudio();
    const { outputNode } = useAudioOut();
    const nodeRef = useRef<T | null>(null);
    const bypassConnectionRef = useRef<AudioNode | null>(null);

    const log = (...args: unknown[]) => {
        if (!debug) return;
        console.info('[@din/react]', ...args);
    };

    const getNodeName = (node: AudioNode | null) =>
        node?.constructor?.name ?? 'AudioNode';

    // Track node version to trigger reconnection when node is recreated
    const [nodeVersion, setNodeVersion] = useState(0);

    // Create node
    useEffect(() => {
        if (!context) return;

        const node = createNode(context);
        nodeRef.current = node;
        log('Node created', getNodeName(node));
        setNodeVersion((v: number) => v + 1); // Trigger reconnection

        return () => {
            log('Node disposed', getNodeName(node));
            node.disconnect();
            nodeRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [context, ...deps]);

    // Connect to output
    useEffect(() => {
        const node = nodeRef.current;
        if (!node || !outputNode) return;

        const nodeName = getNodeName(node);
        const outputName = getNodeName(outputNode);

        if (bypass) {
            // In bypass mode, we don't connect through this node
            // Children will connect directly to our parent
            bypassConnectionRef.current = outputNode;
            log('Node bypass', nodeName, '->', outputName);
        } else {
            node.connect(outputNode);
            bypassConnectionRef.current = null;
            log('Node connected', nodeName, '->', outputName);
        }

        return () => {
            if (!bypass) {
                try {
                    node.disconnect(outputNode);
                    log('Node disconnected', nodeName, '->', outputName);
                } catch {
                    // Node may already be disconnected
                }
            }
        };
    }, [outputNode, bypass, nodeVersion]);

    return {
        nodeRef,
        context,
        isUnlocked,
    };
}

/**
 * Hook to set an AudioParam value with optional automation.
 * Supports both fixed values and LFO modulation.
 *
 * @param param - The AudioParam to control
 * @param value - The target value (number) or LFO output for modulation
 * @param baseValue - Base value to use when LFO is connected (LFO adds to this)
 * @param rampTime - Time to ramp to the value (0 = immediate)
 * @param rampType - Type of ramp ('linear' or 'exponential')
 */
export function useAudioParam(
    param: AudioParam | null | undefined,
    value: number | import('../core/ModulatableValue').ModulatableValue,
    baseValue?: number,
    rampTime = 0,
    rampType: 'linear' | 'exponential' = 'exponential'
): void {
    useEffect(() => {
        if (!param) return;

        // Check if value is an LFO output
        const isLFO = (
            value !== null &&
            value !== undefined &&
            typeof value === 'object' &&
            '__lfoOutput' in value &&
            (value as any).__lfoOutput === true
        );

        if (isLFO) {
            const lfoOutput = value as import('../core/ModulatableValue').LFOOutput;

            // Set base value (LFO will modulate around this)
            const base = baseValue ?? 0;
            param.value = base;

            // Connect LFO node to the AudioParam
            try {
                lfoOutput.node.connect(param);
            } catch (e) {
                console.warn('[@din/react] Failed to connect LFO to AudioParam:', e);
            }

            return () => {
                try {
                    lfoOutput.node.disconnect(param);
                } catch {
                    // May already be disconnected
                }
            };
        }

        // Fixed value handling (original behavior)
        const numericValue = value as number;

        if (rampTime <= 0) {
            param.value = numericValue;
        } else {
            // Note: For proper automation, we use setValueAtTime and ramps
            // The ramp times are relative to current time
            param.setValueAtTime(param.value, 0);

            if (rampType === 'linear') {
                param.linearRampToValueAtTime(numericValue, rampTime);
            } else {
                // Exponential ramp can't go to 0, use a very small value
                const safeValue = Math.max(0.0001, numericValue);
                param.exponentialRampToValueAtTime(safeValue, rampTime);
            }
        }
    }, [param, value, baseValue, rampTime, rampType]);
}
