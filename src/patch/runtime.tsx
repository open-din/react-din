import React, { createContext, useContext, useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { migratePatchDocument, resolvePatchAssetPath } from './document';
import type { PatchDocument, PatchRuntimeProps } from './types';

const INLINE_PATCH_CACHE = new WeakMap<object, PatchDocument>();
const INLINE_PATCH_SOURCE_KEYS = new WeakMap<object, string>();
const ASSET_PATCH_CACHE = new Map<string, Promise<PatchDocument>>();

let inlinePatchSourceCounter = 0;

export const PatchSourceStackContext = createContext<readonly string[]>([]);

/**
 * Throws when a `patch` node’s `patchInline` closes a cycle by reusing an ancestor document
 * (same object identity on the recursion path). Required for wasm graphs where nested loading
 * no longer passes through `ResolvedPatchSource`.
 */
export function assertNoRecursivePatchInline(patch: PatchDocument, path: Set<object> = new Set()): void {
    const root = patch as unknown as object;
    if (path.has(root)) {
        throw new Error(`Recursive patch reference detected for "${patch.name}".`);
    }
    path.add(root);
    try {
        for (const node of patch.nodes) {
            if (node.data.type !== 'patch') continue;
            const inline = (node.data as { patchInline?: PatchDocument | null }).patchInline;
            if (inline) {
                assertNoRecursivePatchInline(inline, path);
            }
        }
    } finally {
        path.delete(root);
    }
}

export interface PatchSourceDescriptor {
    key: string;
    label: string;
    kind: 'inline' | 'asset';
    load: () => Promise<PatchDocument>;
}

export interface ResolvedPatchSourceProps extends Pick<PatchRuntimeProps, 'patchInline' | 'patchAsset' | 'patchName' | 'assetRoot'> {
    children: (patch: PatchDocument) => ReactNode;
}

function getInlineSourceKey(source: PatchDocument): string {
    const cached = INLINE_PATCH_SOURCE_KEYS.get(source as object);
    if (cached) return cached;

    inlinePatchSourceCounter += 1;
    const key = `inline:${inlinePatchSourceCounter}`;
    INLINE_PATCH_SOURCE_KEYS.set(source as object, key);
    return key;
}

function resolveInlinePatch(source: PatchDocument): PatchDocument {
    const cached = INLINE_PATCH_CACHE.get(source as object);
    if (cached) return cached;

    const resolved = migratePatchDocument(source);
    INLINE_PATCH_CACHE.set(source as object, resolved);
    return resolved;
}

function loadAssetPatch(assetPath: string): Promise<PatchDocument> {
    const cached = ASSET_PATCH_CACHE.get(assetPath);
    if (cached) return cached;

    const promise = (async () => {
        const response = await fetch(assetPath);
        if (!response.ok) {
            throw new Error(`Failed to load patch asset "${assetPath}" (${response.status} ${response.statusText}).`);
        }

        const rawPatch = JSON.parse(await response.text()) as PatchDocument;
        return migratePatchDocument(rawPatch);
    })();

    ASSET_PATCH_CACHE.set(assetPath, promise);
    return promise;
}

/**
 * Builds a loadable patch source descriptor from inline JSON or a resolved asset path.
 *
 * @param props - Inline patch document, optional asset ref, display name, and asset root URL.
 * @returns Descriptor with stable key and async loader, or null when no source is configured.
 */
export function resolvePatchSourceDescriptor({
    patchInline,
    patchAsset,
    patchName,
    assetRoot,
}: Pick<PatchRuntimeProps, 'patchInline' | 'patchAsset' | 'patchName' | 'assetRoot'>): PatchSourceDescriptor | null {
    if (patchInline) {
        const sourceKey = getInlineSourceKey(patchInline);
        const label = typeof patchName === 'string' && patchName.trim()
            ? patchName.trim()
            : typeof patchInline.name === 'string' && patchInline.name.trim()
                ? patchInline.name.trim()
                : 'inline patch';
        return {
            key: sourceKey,
            label,
            kind: 'inline',
            load: () => Promise.resolve(resolveInlinePatch(patchInline)),
        };
    }

    const resolvedAssetPath = resolvePatchAssetPath(patchAsset ?? undefined, assetRoot);
    if (!resolvedAssetPath) return null;

    return {
        key: `asset:${resolvedAssetPath}`,
        label: typeof patchName === 'string' && patchName.trim()
            ? patchName.trim()
            : resolvedAssetPath,
        kind: 'asset',
        load: () => loadAssetPatch(resolvedAssetPath),
    };
}

function usePatchSourceDescriptor(
    props: Pick<PatchRuntimeProps, 'patchInline' | 'patchAsset' | 'patchName' | 'assetRoot'>
): PatchSourceDescriptor | null {
    return useMemo(() => resolvePatchSourceDescriptor(props), [
        props.assetRoot,
        props.patchAsset,
        props.patchInline,
        props.patchName,
    ]);
}

function usePatchSourceStack(): readonly string[] {
    return useContext(PatchSourceStackContext);
}

/**
 * Resolves and caches a `PatchDocument` from inline or asset-backed props inside React.
 *
 * @param props - Patch source props mirrored from `PatchRuntime`.
 * @returns Loaded patch or null while asset loads are pending; throws on recursion.
 */
export function useResolvedPatchDocument(
    props: Pick<PatchRuntimeProps, 'patchInline' | 'patchAsset' | 'patchName' | 'assetRoot'>
): PatchDocument | null {
    const { patchInline } = props;
    const stack = usePatchSourceStack();
    const source = usePatchSourceDescriptor(props);
    const [patch, setPatch] = useState<PatchDocument | null>(() => {
        if (source?.kind === 'inline' && patchInline) {
            return resolveInlinePatch(patchInline);
        }
        return null;
    });
    const [error, setError] = useState<Error | null>(null);

    if (source && stack.includes(source.key)) {
        throw new Error(`Recursive patch reference detected for "${source.label}".`);
    }

    useEffect(() => {
        let cancelled = false;

        if (!source) {
            setPatch(null);
            setError(null);
            return () => {
                cancelled = true;
            };
        }

        if (source.kind === 'inline' && patchInline) {
            setPatch(resolveInlinePatch(patchInline));
            setError(null);
            return () => {
                cancelled = true;
            };
        }

        setPatch(null);
        setError(null);

        source.load()
            .then((resolvedPatch) => {
                if (!cancelled) {
                    setPatch(resolvedPatch);
                }
            })
            .catch((loadingError) => {
                if (!cancelled) {
                    setError(loadingError instanceof Error ? loadingError : new Error(String(loadingError)));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [patchInline, source]);

    if (error) {
        throw error;
    }

    return patch;
}

export const ResolvedPatchSource: FC<ResolvedPatchSourceProps> = ({
    children,
    patchInline,
    patchAsset,
    patchName,
    assetRoot,
}) => {
    const stack = usePatchSourceStack();
    const source = usePatchSourceDescriptor({ patchInline, patchAsset, patchName, assetRoot });
    const patch = useResolvedPatchDocument({ patchInline, patchAsset, patchName, assetRoot });
    const nextStack = source ? [...stack, source.key] : stack;

    if (!source || !patch) {
        return null;
    }

    return (
        <PatchSourceStackContext.Provider value={nextStack}>
            {children(patch)}
        </PatchSourceStackContext.Provider>
    );
};
