import { describe, expect, it, vi } from 'vitest';

describe('audio library storage', () => {
    it('adds, lists, resolves and deletes cached audio assets', async () => {
        vi.resetModules();
        vi.stubGlobal('indexedDB', undefined);
        vi.stubGlobal('caches', undefined);
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:asset-url'),
            revokeObjectURL: vi.fn(),
        } as unknown as typeof URL);

        const { addAssetFromBlob, deleteAsset, getAssetObjectUrl, listAssets, subscribeAssets } = await import('../../ui/editor/audioLibrary');
        const events = vi.fn();
        const unsubscribe = subscribeAssets(events);

        const asset = await addAssetFromBlob(new Blob(['kick'], { type: 'audio/wav' }), 'kick.wav');
        const listedAfterAdd = await listAssets();

        expect(listedAfterAdd).toHaveLength(1);
        expect(listedAfterAdd[0]?.id).toBe(asset.id);
        expect(listedAfterAdd[0]?.name).toBe('kick.wav');

        const objectUrl = await getAssetObjectUrl(asset.id);
        expect(typeof objectUrl).toBe('string');
        expect(objectUrl).toBe('blob:asset-url');

        await deleteAsset(asset.id);
        expect(await listAssets()).toHaveLength(0);
        expect(events).toHaveBeenCalledTimes(2);

        unsubscribe();
        vi.unstubAllGlobals();
    });
});
