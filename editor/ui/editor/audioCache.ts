import { deleteAsset, getAssetObjectUrl, releaseAssetObjectUrl, saveAssetById } from './audioLibrary';

// Backward-compatible wrapper kept for existing callers.
export async function saveAudioToCache(sampleId: string, file: Blob): Promise<void> {
    await saveAssetById(sampleId, file, sampleId);
}

// Deprecated in favor of getAssetObjectUrl.
export async function loadAudioFromCache(sampleId: string): Promise<Blob | null> {
    const objectUrl = await getAssetObjectUrl(sampleId);
    if (!objectUrl) return null;
    try {
        const response = await fetch(objectUrl);
        if (!response.ok) return null;
        return response.blob();
    } catch {
        return null;
    }
}

export async function getAudioObjectUrl(sampleId: string): Promise<string | null> {
    return getAssetObjectUrl(sampleId);
}

export function releaseAudioObjectUrl(sampleId: string): void {
    releaseAssetObjectUrl(sampleId);
}

export async function deleteAudioFromCache(sampleId: string): Promise<void> {
    await deleteAsset(sampleId);
}
