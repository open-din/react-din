import { createElement, type ComponentType, type FC } from 'react';
import { PatchRenderer } from './PatchRenderer';
import { ResolvedPatchSource } from './runtime';
import type { PatchRuntimeProps } from './types';

/**
 * Resolve and render a nested patch from inline or asset-backed source data.
 */
export const Patch: FC<PatchRuntimeProps> = ({
    children,
    includeProvider = true,
    assetRoot,
    midi,
    patchInline,
    patchAsset,
    patchName,
}) => {
    return (
        <ResolvedPatchSource
            patchInline={patchInline}
            patchAsset={patchAsset}
            patchName={patchName}
            assetRoot={assetRoot}
        >
            {(patch) => (
                <>
                    {children}
                    {createElement(PatchRenderer as unknown as ComponentType<Record<string, unknown>>, {
                        patch,
                        includeProvider,
                        assetRoot,
                        midi,
                    })}
                </>
            )}
        </ResolvedPatchSource>
    );
};
