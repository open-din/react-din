import type { InputParam } from './store';

export const UI_TOKEN_IDS = ['hoverToken', 'successToken', 'errorToken'] as const;
export type UiTokenId = (typeof UI_TOKEN_IDS)[number];

const UI_TOKEN_LABELS: Record<UiTokenId, string> = {
    hoverToken: 'Hover Token',
    successToken: 'Success Token',
    errorToken: 'Error Token',
};

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 9999;

function toFiniteNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asUiTokenId(value: string | null | undefined): UiTokenId | null {
    if (!value) return null;
    const trimmed = value.trim();
    return (UI_TOKEN_IDS as readonly string[]).includes(trimmed) ? (trimmed as UiTokenId) : null;
}

export function createUiTokenParam(tokenId: UiTokenId): InputParam {
    return {
        id: tokenId,
        name: tokenId,
        label: UI_TOKEN_LABELS[tokenId],
        type: 'float',
        value: 0,
        defaultValue: 0,
        min: DEFAULT_MIN,
        max: DEFAULT_MAX,
    };
}

export function createUiTokenParams(): InputParam[] {
    return UI_TOKEN_IDS.map((tokenId) => createUiTokenParam(tokenId));
}

export function isUiTokensInputParams(params: InputParam[] | undefined): boolean {
    if (!params || params.length === 0) return false;
    const seen = new Set<UiTokenId>();
    params.forEach((param) => {
        const tokenId = asUiTokenId(param.id) ?? asUiTokenId(param.name);
        if (tokenId) {
            seen.add(tokenId);
        }
    });
    return UI_TOKEN_IDS.every((tokenId) => seen.has(tokenId));
}

export function hasAnyUiTokenInputParam(params: InputParam[] | undefined): boolean {
    if (!params || params.length === 0) return false;
    return params.some((param) => {
        const tokenId = asUiTokenId(param.id) ?? asUiTokenId(param.name);
        return Boolean(tokenId);
    });
}

export function normalizeUiTokenParams(params: InputParam[] | undefined): InputParam[] {
    const result: InputParam[] = [];
    const usedIds = new Set<string>();

    params?.forEach((param, index) => {
        const fallbackName = param.name?.trim() || param.label?.trim() || `Token ${index + 1}`;
        const baseId = param.id?.trim() || fallbackName;
        if (!baseId) return;

        let nextId = baseId;
        let suffix = 2;
        while (usedIds.has(nextId)) {
            nextId = `${baseId}_${suffix++}`;
        }
        usedIds.add(nextId);

        const tokenId = asUiTokenId(nextId) ?? asUiTokenId(fallbackName);
        const defaultLabel = tokenId ? UI_TOKEN_LABELS[tokenId] : fallbackName;

        const defaultValue = toFiniteNumber(param.defaultValue, toFiniteNumber(param.value, 0));
        const value = toFiniteNumber(param.value, defaultValue);

        result.push({
            id: nextId,
            name: fallbackName,
            label: param.label?.trim() || defaultLabel,
            type: 'float',
            defaultValue,
            value,
            min: toFiniteNumber(param.min, DEFAULT_MIN),
            max: toFiniteNumber(param.max, DEFAULT_MAX),
        });
    });

    return result;
}

export function normalizeUiTokensLabel(label: string | undefined): string {
    const trimmed = label?.trim();
    return trimmed || 'UI Tokens';
}

export function isLegacyUiTokensInputLabel(label: string | undefined): boolean {
    return label?.trim().toLowerCase() === 'ui tokens';
}

export interface UiTokensDataShape {
    params: InputParam[];
    label: string;
}

export function normalizeUiTokensNodeData<T extends UiTokensDataShape>(data: T): T {
    return {
        ...data,
        params: normalizeUiTokenParams(data.params),
        label: normalizeUiTokensLabel(data.label),
    };
}
