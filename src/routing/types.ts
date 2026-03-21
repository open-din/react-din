import type { ReactNode, RefObject } from 'react';

export interface RoutingNodeProps {
    children?: ReactNode;
    bypass?: boolean;
    id?: string;
}

export interface AuxSendProps extends RoutingNodeProps {
    busId?: string;
    sendGain?: number;
    tap?: 'pre' | 'post';
    nodeRef?: RefObject<GainNode | null>;
}

export interface AuxReturnProps extends RoutingNodeProps {
    busId?: string;
    gain?: number;
    nodeRef?: RefObject<GainNode | null>;
}

export interface MatrixMixerProps extends RoutingNodeProps {
    inputs?: number;
    outputs?: number;
    matrix?: number[][];
    smoothingTime?: number;
    nodeRef?: RefObject<GainNode | null>;
}
