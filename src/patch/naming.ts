const RESERVED_IDENTIFIERS = new Set([
    'break',
    'case',
    'catch',
    'children',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'includeProvider',
    'instanceof',
    'key',
    'midi',
    'new',
    'patch',
    'ref',
    'return',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
]);

/**
 * Produces a JavaScript-safe identifier from arbitrary human-readable text.
 *
 * @param value - Raw label or name.
 * @param fallback - Identifier used when normalization fails or hits reserved words.
 * @param reserved - Optional extra reserved tokens beyond the built-in list.
 * @returns camelCase-safe identifier string.
 */
export function toSafeIdentifier(value: string, fallback: string, reserved?: ReadonlySet<string>): string {
    const normalized = value.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    if (!normalized) return fallback;

    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return fallback;

    const [first, ...rest] = parts;
    let result = first.toLowerCase() + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    result = result.replace(/^[^a-zA-Z_]+/, '');

    if (!result || RESERVED_IDENTIFIERS.has(result) || reserved?.has(result)) {
        result = fallback;
    }

    if (/^\d/.test(result)) {
        result = `${fallback}${result}`;
    }

    return result;
}

/**
 * Appends a numeric suffix until `base` is unique within `usedNames`.
 *
 * @param base - Preferred base name.
 * @param usedNames - Names already claimed in the current scope.
 * @returns A name not present in `usedNames`.
 */
export function ensureUniqueName(base: string, usedNames: Set<string>): string {
    if (!usedNames.has(base)) return base;

    let counter = 2;
    let candidate = `${base}${counter}`;
    while (usedNames.has(candidate)) {
        counter += 1;
        candidate = `${base}${counter}`;
    }

    return candidate;
}
