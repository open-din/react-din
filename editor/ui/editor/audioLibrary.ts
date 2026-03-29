const AUDIO_CACHE_NAME = 'din-editor-audio';
const AUDIO_CACHE_PREFIX = '/__editor_audio__/';
const AUDIO_LIBRARY_DB_NAME = 'din-editor-audio-library';
const AUDIO_LIBRARY_DB_VERSION = 1;
const AUDIO_LIBRARY_STORE = 'audioAssets';

export interface AudioLibraryAsset {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    durationSec?: number;
    createdAt: number;
    updatedAt: number;
}

interface AudioLibraryAssetRecord extends AudioLibraryAsset {}

const metadataFallbackStore = new Map<string, AudioLibraryAssetRecord>();
const blobFallbackStore = new Map<string, Blob>();
const objectUrlCache = new Map<string, string>();
const subscribers = new Set<() => void>();

function notifySubscribers() {
    subscribers.forEach((callback) => callback());
}

function hasIndexedDb(): boolean {
    return typeof indexedDB !== 'undefined';
}

function hasCacheApi(): boolean {
    return typeof caches !== 'undefined';
}

function getCacheKey(assetId: string): string {
    const origin = typeof location !== 'undefined' ? location.origin : 'https://din-editor.local';
    return `${origin}${AUDIO_CACHE_PREFIX}${assetId}`;
}

function sanitizeAssetName(name: string): string {
    const trimmed = name.trim();
    return trimmed || 'audio-file';
}

async function detectAudioDuration(blob: Blob): Promise<number | undefined> {
    if (typeof window === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof Audio === 'undefined') {
        return undefined;
    }

    const url = URL.createObjectURL(blob);
    try {
        const duration = await new Promise<number | undefined>((resolve) => {
            const audio = new Audio();
            let settled = false;

            const finalize = (value?: number) => {
                if (settled) return;
                settled = true;
                audio.src = '';
                resolve(value);
            };

            const timeoutId = window.setTimeout(() => finalize(undefined), 250);

            audio.preload = 'metadata';
            audio.onloadedmetadata = () => {
                window.clearTimeout(timeoutId);
                const value = Number.isFinite(audio.duration) ? audio.duration : undefined;
                finalize(value);
            };
            audio.onerror = () => {
                window.clearTimeout(timeoutId);
                finalize(undefined);
            };
            audio.src = url;
        });
        return duration;
    } finally {
        URL.revokeObjectURL(url);
    }
}

function createAssetId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `audio_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function openAudioLibraryDb(): Promise<IDBDatabase | null> {
    if (!hasIndexedDb()) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(AUDIO_LIBRARY_DB_NAME, AUDIO_LIBRARY_DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(AUDIO_LIBRARY_STORE)) {
                db.createObjectStore(AUDIO_LIBRARY_STORE, { keyPath: 'id' });
            }
        };
    });
}

async function saveAssetMetadata(record: AudioLibraryAssetRecord): Promise<void> {
    const db = await openAudioLibraryDb();
    if (!db) {
        metadataFallbackStore.set(record.id, record);
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUDIO_LIBRARY_STORE, 'readwrite');
        tx.objectStore(AUDIO_LIBRARY_STORE).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadAssetMetadata(assetId: string): Promise<AudioLibraryAssetRecord | null> {
    const db = await openAudioLibraryDb();
    if (!db) {
        return metadataFallbackStore.get(assetId) ?? null;
    }

    return new Promise((resolve, reject) => {
        const tx = db.transaction(AUDIO_LIBRARY_STORE, 'readonly');
        const request = tx.objectStore(AUDIO_LIBRARY_STORE).get(assetId);
        request.onsuccess = () => resolve((request.result as AudioLibraryAssetRecord | undefined) ?? null);
        request.onerror = () => reject(request.error);
    });
}

async function deleteAssetMetadata(assetId: string): Promise<void> {
    const db = await openAudioLibraryDb();
    if (!db) {
        metadataFallbackStore.delete(assetId);
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(AUDIO_LIBRARY_STORE, 'readwrite');
        tx.objectStore(AUDIO_LIBRARY_STORE).delete(assetId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function listAssetMetadata(): Promise<AudioLibraryAssetRecord[]> {
    const db = await openAudioLibraryDb();
    if (!db) {
        return Array.from(metadataFallbackStore.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return new Promise((resolve, reject) => {
        const tx = db.transaction(AUDIO_LIBRARY_STORE, 'readonly');
        const request = tx.objectStore(AUDIO_LIBRARY_STORE).getAll();
        request.onsuccess = () => {
            const rows = (request.result as AudioLibraryAssetRecord[] | undefined) ?? [];
            resolve(rows.sort((a, b) => b.updatedAt - a.updatedAt));
        };
        request.onerror = () => reject(request.error);
    });
}

async function saveAssetBlob(assetId: string, file: Blob): Promise<void> {
    if (hasCacheApi()) {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const response = new Response(file, {
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
            },
        });
        await cache.put(getCacheKey(assetId), response);
        return;
    }

    blobFallbackStore.set(assetId, file);
}

async function loadAssetBlob(assetId: string): Promise<Blob | null> {
    if (hasCacheApi()) {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        const response = await cache.match(getCacheKey(assetId));
        if (!response) return null;
        return response.blob();
    }

    return blobFallbackStore.get(assetId) ?? null;
}

async function deleteAssetBlob(assetId: string): Promise<void> {
    if (hasCacheApi()) {
        const cache = await caches.open(AUDIO_CACHE_NAME);
        await cache.delete(getCacheKey(assetId));
        return;
    }

    blobFallbackStore.delete(assetId);
}

export async function listAssets(): Promise<AudioLibraryAsset[]> {
    return listAssetMetadata();
}

export async function getAsset(assetId: string): Promise<AudioLibraryAsset | null> {
    return loadAssetMetadata(assetId);
}

export async function addAssetFromBlob(blob: Blob, name: string): Promise<AudioLibraryAsset> {
    const now = Date.now();
    const durationSec = await detectAudioDuration(blob);
    const record: AudioLibraryAssetRecord = {
        id: createAssetId(),
        name: sanitizeAssetName(name),
        mimeType: blob.type || 'application/octet-stream',
        size: blob.size,
        durationSec,
        createdAt: now,
        updatedAt: now,
    };

    await saveAssetBlob(record.id, blob);
    await saveAssetMetadata(record);
    notifySubscribers();
    return record;
}

export async function addAssetFromFile(file: File): Promise<AudioLibraryAsset> {
    return addAssetFromBlob(file, file.name);
}

export async function saveAssetById(assetId: string, blob: Blob, name?: string): Promise<AudioLibraryAsset> {
    const now = Date.now();
    const existing = await loadAssetMetadata(assetId);
    const createdAt = existing?.createdAt ?? now;
    const durationSec = await detectAudioDuration(blob);
    const record: AudioLibraryAssetRecord = {
        id: assetId,
        name: sanitizeAssetName(name ?? existing?.name ?? assetId),
        mimeType: blob.type || existing?.mimeType || 'application/octet-stream',
        size: blob.size,
        durationSec: durationSec ?? existing?.durationSec,
        createdAt,
        updatedAt: now,
    };

    await saveAssetBlob(assetId, blob);
    await saveAssetMetadata(record);
    notifySubscribers();
    return record;
}

export async function getAssetObjectUrl(assetId: string): Promise<string | null> {
    if (objectUrlCache.has(assetId)) {
        return objectUrlCache.get(assetId) ?? null;
    }

    const blob = await loadAssetBlob(assetId);
    if (!blob) return null;

    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(assetId, objectUrl);
    return objectUrl;
}

export function releaseAssetObjectUrl(assetId: string): void {
    const existing = objectUrlCache.get(assetId);
    if (!existing) return;
    URL.revokeObjectURL(existing);
    objectUrlCache.delete(assetId);
}

export async function deleteAsset(assetId: string): Promise<void> {
    releaseAssetObjectUrl(assetId);
    await Promise.all([
        deleteAssetMetadata(assetId),
        deleteAssetBlob(assetId),
    ]);
    notifySubscribers();
}

export function subscribeAssets(callback: () => void): () => void {
    subscribers.add(callback);
    return () => {
        subscribers.delete(callback);
    };
}
