import { describe, expect, it, vi } from 'vitest';

describe('audio library storage', () => {
    it('adds, lists, resolves and deletes cached audio assets', async () => {
        vi.resetModules();
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:asset-url'),
            revokeObjectURL: vi.fn(),
        } as unknown as typeof URL);

        const assets = new Map<string, { id: string; name: string; fileName: string; kind: 'audio'; relativePath: string; mimeType: string; size: number; createdAt: number; updatedAt: number }>();
        const assetEvents = new Set<() => void>();
        const objectUrls = new Map<string, string>();
        const { setActiveProjectController } = await import('../../project');
        setActiveProjectController({
            project: {
                id: 'project-test',
                name: 'Test',
                accentColor: '#68a5ff',
                createdAt: 0,
                updatedAt: 0,
                lastOpenedAt: 0,
                storageKind: 'browser-indexeddb',
                graphs: [],
                assets: [],
            },
            loadWorkspace: async () => ({ project: { id: 'project-test', name: 'Test', accentColor: '#68a5ff', createdAt: 0, updatedAt: 0, lastOpenedAt: 0, storageKind: 'browser-indexeddb', graphs: [], assets: Array.from(assets.values()) }, graphs: [], activeGraphId: null }),
            loadGraphs: async () => [],
            saveGraph: async () => undefined,
            deleteGraph: async () => undefined,
            loadActiveGraphId: async () => null,
            saveActiveGraphId: async () => undefined,
            listAssets: async () => Array.from(assets.values()),
            addAssetFromBlob: async (blob, name) => {
                const asset = {
                    id: `asset-${assets.size + 1}`,
                    name,
                    fileName: name,
                    kind: 'audio' as const,
                    relativePath: `samples/${name}`,
                    mimeType: blob.type || 'application/octet-stream',
                    size: blob.size,
                    createdAt: 0,
                    updatedAt: 0,
                };
                assets.set(asset.id, asset);
                assetEvents.forEach((callback) => callback());
                return asset;
            },
            saveAssetById: async (assetId, blob, name) => {
                const asset = {
                    id: assetId,
                    name: name ?? assetId,
                    fileName: name ?? assetId,
                    kind: 'audio' as const,
                    relativePath: `samples/${name ?? assetId}`,
                    mimeType: blob.type || 'application/octet-stream',
                    size: blob.size,
                    createdAt: 0,
                    updatedAt: 0,
                };
                assets.set(asset.id, asset);
                assetEvents.forEach((callback) => callback());
                return asset;
            },
            getAssetObjectUrl: async (assetId) => {
                const objectUrl = objectUrls.get(assetId) ?? 'blob:asset-url';
                objectUrls.set(assetId, objectUrl);
                return objectUrl;
            },
            releaseAssetObjectUrl: (assetId) => {
                objectUrls.delete(assetId);
            },
            deleteAsset: async (assetId) => {
                assets.delete(assetId);
                assetEvents.forEach((callback) => callback());
            },
            subscribeAssets: (callback) => {
                assetEvents.add(callback);
                return () => {
                    assetEvents.delete(callback);
                };
            },
            reveal: async () => undefined,
        });

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
        setActiveProjectController(null);
        vi.unstubAllGlobals();
    });
});
