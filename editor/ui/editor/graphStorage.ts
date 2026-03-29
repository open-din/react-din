import type { GraphDocument } from './store';

const DB_NAME = 'din-editor';
const DB_VERSION = 1;
const GRAPH_STORE = 'graphs';
const META_STORE = 'meta';
const ACTIVE_GRAPH_KEY = 'activeGraphId';

interface MetaRecord {
    key: string;
    value: string;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(GRAPH_STORE)) {
                db.createObjectStore(GRAPH_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(META_STORE)) {
                db.createObjectStore(META_STORE, { keyPath: 'key' });
            }
        };
    });
}

export async function loadGraphs(): Promise<GraphDocument[]> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(GRAPH_STORE, 'readonly');
        const store = tx.objectStore(GRAPH_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve((request.result ?? []) as GraphDocument[]);
        request.onerror = () => reject(request.error);
    });
}

export async function saveGraph(graph: GraphDocument): Promise<void> {
    const db = await openDb();

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(GRAPH_STORE, 'readwrite');
        tx.objectStore(GRAPH_STORE).put(graph);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function deleteGraph(graphId: string): Promise<void> {
    const db = await openDb();

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(GRAPH_STORE, 'readwrite');
        tx.objectStore(GRAPH_STORE).delete(graphId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadActiveGraphId(): Promise<string | null> {
    const db = await openDb();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readonly');
        const store = tx.objectStore(META_STORE);
        const request = store.get(ACTIVE_GRAPH_KEY);

        request.onsuccess = () => {
            const record = request.result as MetaRecord | undefined;
            resolve(record?.value ?? null);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function saveActiveGraphId(graphId: string | null): Promise<void> {
    const db = await openDb();

    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(META_STORE, 'readwrite');
        const store = tx.objectStore(META_STORE);

        if (!graphId) {
            store.delete(ACTIVE_GRAPH_KEY);
        } else {
            store.put({ key: ACTIVE_GRAPH_KEY, value: graphId } as MetaRecord);
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
