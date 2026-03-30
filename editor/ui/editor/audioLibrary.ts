import {
    requireActiveProjectController,
    type AudioLibraryAsset,
    type AddProjectAssetOptions,
} from '../../project';

export type { AudioLibraryAsset };

export async function listAssets(): Promise<AudioLibraryAsset[]> {
    return requireActiveProjectController().listAssets();
}

export async function getAsset(assetId: string): Promise<AudioLibraryAsset | null> {
    const assets = await listAssets();
    return assets.find((asset) => asset.id === assetId) ?? null;
}

export async function addAssetFromBlob(
    blob: Blob,
    name: string,
    options?: AddProjectAssetOptions,
): Promise<AudioLibraryAsset> {
    return requireActiveProjectController().addAssetFromBlob(blob, name, options);
}

export async function addAssetFromFile(
    file: File,
    options?: AddProjectAssetOptions,
): Promise<AudioLibraryAsset> {
    return addAssetFromBlob(file, file.name, options);
}

export async function saveAssetById(
    assetId: string,
    blob: Blob,
    name?: string,
    options?: Omit<AddProjectAssetOptions, 'preserveAssetId'>,
): Promise<AudioLibraryAsset> {
    return requireActiveProjectController().saveAssetById(assetId, blob, name, options);
}

export async function getAssetObjectUrl(assetId: string): Promise<string | null> {
    return requireActiveProjectController().getAssetObjectUrl(assetId);
}

export function releaseAssetObjectUrl(assetId: string): void {
    requireActiveProjectController().releaseAssetObjectUrl(assetId);
}

export async function deleteAsset(assetId: string): Promise<void> {
    await requireActiveProjectController().deleteAsset(assetId);
}

export function subscribeAssets(callback: () => void): () => void {
    return requireActiveProjectController().subscribeAssets(callback);
}
