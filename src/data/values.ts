export type MathOperation =
    | 'add'
    | 'subtract'
    | 'multiply'
    | 'divide'
    | 'multiplyAdd'
    | 'power'
    | 'logarithm'
    | 'sqrt'
    | 'invSqrt'
    | 'abs'
    | 'exp'
    | 'min'
    | 'max'
    | 'lessThan'
    | 'greaterThan'
    | 'sign'
    | 'compare'
    | 'smoothMin'
    | 'smoothMax'
    | 'round'
    | 'floor'
    | 'ceil'
    | 'truncate'
    | 'fraction'
    | 'truncModulo'
    | 'floorModulo'
    | 'wrap'
    | 'snap'
    | 'pingPong'
    | 'sin'
    | 'cos'
    | 'tan'
    | 'asin'
    | 'acos'
    | 'atan'
    | 'atan2'
    | 'sinh'
    | 'cosh'
    | 'tanh';

export type CompareOperation = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';

export type ClampMode = 'minmax' | 'range';

const safeNumber = (value: number | undefined): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : 0
);

const truncate = (value: number) => {
    if (Number.isNaN(value)) return 0;
    if (typeof Math.trunc === 'function') return Math.trunc(value);
    return value < 0 ? Math.ceil(value) : Math.floor(value);
};

const clampRange = (value: number, min: number, max: number, mode: ClampMode) => {
    let minValue = min;
    let maxValue = max;
    if (mode === 'range' && minValue > maxValue) {
        [minValue, maxValue] = [maxValue, minValue];
    }
    return Math.min(Math.max(value, minValue), maxValue);
};

const wrapValue = (value: number, min: number, max: number) => {
    const range = max - min;
    if (!Number.isFinite(range) || range === 0) return min;
    const wrapped = ((value - min) % range + range) % range;
    return wrapped + min;
};

const flooredModulo = (value: number, divisor: number) => {
    if (!Number.isFinite(divisor) || divisor === 0) return 0;
    return value - Math.floor(value / divisor) * divisor;
};

const pingPongValue = (value: number, length: number) => {
    if (!Number.isFinite(length) || length === 0) return 0;
    const range = length * 2;
    const wrapped = wrapValue(value, 0, range);
    return length - Math.abs(wrapped - length);
};

const smoothMinValue = (a: number, b: number, k: number) => {
    const smooth = Math.max(0.0001, k);
    const h = clampRange(0.5 + 0.5 * (b - a) / smooth, 0, 1, 'minmax');
    return (b * (1 - h) + a * h) - smooth * h * (1 - h);
};

/**
 * Applies a named math operation to one or more scalar operands for patch data nodes.
 *
 * @param operation - Math opcode to apply.
 * @param a - First operand (default 0).
 * @param b - Second operand (default 0).
 * @param c - Third operand for ops such as multiply-add or smooth min/max (default 0).
 * @returns Numeric result, or 0 for unknown operations or invalid divide-by-zero cases.
 */
export function math(operation: MathOperation, a = 0, b = 0, c = 0): number {
    const av = safeNumber(a);
    const bv = safeNumber(b);
    const cv = safeNumber(c);

    switch (operation) {
        case 'add':
            return av + bv;
        case 'subtract':
            return av - bv;
        case 'multiply':
            return av * bv;
        case 'divide':
            return bv === 0 ? 0 : av / bv;
        case 'multiplyAdd':
            return av * bv + cv;
        case 'power':
            return Math.pow(av, bv);
        case 'logarithm': {
            if (av <= 0) return 0;
            if (!Number.isFinite(bv) || bv <= 0 || bv === 1) {
                return Math.log(av);
            }
            return Math.log(av) / Math.log(bv);
        }
        case 'sqrt':
            return av < 0 ? 0 : Math.sqrt(av);
        case 'invSqrt':
            return av <= 0 ? 0 : 1 / Math.sqrt(av);
        case 'abs':
            return Math.abs(av);
        case 'exp':
            return Math.exp(av);
        case 'min':
            return Math.min(av, bv);
        case 'max':
            return Math.max(av, bv);
        case 'lessThan':
            return av < bv ? 1 : 0;
        case 'greaterThan':
            return av > bv ? 1 : 0;
        case 'sign':
            return av === 0 ? 0 : av > 0 ? 1 : -1;
        case 'compare':
            return av === bv ? 0 : av > bv ? 1 : -1;
        case 'smoothMin':
            return smoothMinValue(av, bv, cv);
        case 'smoothMax':
            return -smoothMinValue(-av, -bv, cv);
        case 'round':
            return Math.round(av);
        case 'floor':
            return Math.floor(av);
        case 'ceil':
            return Math.ceil(av);
        case 'truncate':
            return truncate(av);
        case 'fraction':
            return av - Math.floor(av);
        case 'truncModulo':
            return bv === 0 ? 0 : av % bv;
        case 'floorModulo':
            return flooredModulo(av, bv);
        case 'wrap':
            return wrapValue(av, bv, cv);
        case 'snap':
            return bv === 0 ? av : Math.round(av / bv) * bv;
        case 'pingPong':
            return pingPongValue(av, bv);
        case 'sin':
            return Math.sin(av);
        case 'cos':
            return Math.cos(av);
        case 'tan':
            return Math.tan(av);
        case 'asin':
            return Math.asin(av);
        case 'acos':
            return Math.acos(av);
        case 'atan':
            return Math.atan(av);
        case 'atan2':
            return Math.atan2(av, bv);
        case 'sinh':
            return Math.sinh(av);
        case 'cosh':
            return Math.cosh(av);
        case 'tanh':
            return Math.tanh(av);
        default:
            return 0;
    }
}

/**
 * Compares two scalars and returns 1 when the relation holds, otherwise 0.
 *
 * @param operation - Comparison opcode (`gt`, `gte`, `lt`, `lte`, `eq`, `neq`).
 * @param a - Left-hand value (default 0).
 * @param b - Right-hand value (default 0).
 * @returns 1 if the comparison is true, else 0.
 */
export function compare(operation: CompareOperation, a = 0, b = 0): number {
    const av = safeNumber(a);
    const bv = safeNumber(b);

    switch (operation) {
        case 'gt':
            return av > bv ? 1 : 0;
        case 'gte':
            return av >= bv ? 1 : 0;
        case 'lt':
            return av < bv ? 1 : 0;
        case 'lte':
            return av <= bv ? 1 : 0;
        case 'eq':
            return av === bv ? 1 : 0;
        case 'neq':
            return av !== bv ? 1 : 0;
        default:
            return 0;
    }
}

/**
 * Linearly interpolates between two scalars.
 *
 * @param a - Start value (default 0).
 * @param b - End value (default 0).
 * @param t - Blend factor; clamped to [0,1] when `clamp` is true (default 0).
 * @param clamp - When true, restricts `t` to the unit interval before mixing.
 * @returns Blended value `a * (1 - t*) + b * t*` where `t*` is optionally clamped.
 */
export function mix(a = 0, b = 0, t = 0, clamp = false): number {
    const av = safeNumber(a);
    const bv = safeNumber(b);
    const tv = safeNumber(t);
    const mixValue = clamp ? clampRange(tv, 0, 1, 'minmax') : tv;
    return av * (1 - mixValue) + bv * mixValue;
}

/**
 * Clamps a scalar into `[min, max]` using the given clamp mode.
 *
 * @param value - Input scalar (default 0).
 * @param min - Lower bound (default 0).
 * @param max - Upper bound (default 1).
 * @param mode - Clamping strategy (`minmax`, etc.).
 * @returns Value constrained to the range per `mode`.
 */
export function clamp(value = 0, min = 0, max = 1, mode: ClampMode = 'minmax'): number {
    const v = safeNumber(value);
    const minValue = safeNumber(min);
    const maxValue = safeNumber(max);
    return clampRange(v, minValue, maxValue, mode);
}

/**
 * Selects a numeric entry from an array by integer index with bounds safety.
 *
 * @param index - Non-negative index; floored if fractional.
 * @param values - Candidate values (must be non-empty for meaningful selection).
 * @param fallback - Value used when `values` is empty or the entry is non-finite.
 * @returns Selected array element or `fallback`.
 */
export function switchValue(index: number, values: number[], fallback = 0): number {
    if (!Array.isArray(values) || values.length === 0) return fallback;
    const indexValue = Number.isFinite(index) ? Math.floor(index) : 0;
    const safeIndex = Math.min(Math.max(indexValue, 0), values.length - 1);
    const value = values[safeIndex];
    return Number.isFinite(value) ? value : fallback;
}
