import {
    dinCoreClamp,
    dinCoreCompare,
    dinCoreMath,
    dinCoreMix,
    dinCoreSwitchValue,
    type ClampMode,
    type CompareOperation,
    type MathOperation,
} from '@din/vanilla/core';

export type { MathOperation, CompareOperation, ClampMode };

export function math(operation: MathOperation, a = 0, b = 0, c = 0): number {
    return dinCoreMath(operation, a, b, c);
}

export function compare(operation: CompareOperation, a = 0, b = 0): number {
    return dinCoreCompare(operation, a, b);
}

export function mix(a = 0, b = 0, t = 0, clamp = false): number {
    return dinCoreMix(a, b, t, clamp);
}

export function clamp(value = 0, min = 0, max = 1, mode: ClampMode = 'minmax'): number {
    return dinCoreClamp(value, min, max, mode);
}

export function switchValue(index: number, values: number[], fallback = 0): number {
    return dinCoreSwitchValue(index, values, fallback);
}
