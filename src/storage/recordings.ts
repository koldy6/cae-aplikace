// Speaking recordings in IndexedDB (Blobs do not fit localStorage). Every call fails soft: null / false / [].

const DB = 'cae-recordings';
const STORE = 'recordings';

const open = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = req.onblocked = () => resolve(null);
    } catch {
      resolve(null); // indexedDB missing (or blocked in private mode)
    }
  });

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest, fallback: T, map: (r: any) => T): Promise<T> {
  const db = await open();
  if (!db) return fallback;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => { db.close(); resolve(map(req.result)); };
      tx.onerror = tx.onabort = () => { db.close(); resolve(fallback); };
    } catch {
      db.close();
      resolve(fallback);
    }
  });
}

export const putRecording = (key: string, blob: Blob): Promise<boolean> => run('readwrite', (s) => s.put(blob, key), false, () => true);
export const getRecording = (key: string): Promise<Blob | null> => run('readonly', (s) => s.get(key), null, (r) => (r instanceof Blob ? r : null));
export const deleteRecording = (key: string): Promise<boolean> => run('readwrite', (s) => s.delete(key), false, () => true);
export const listKeys = (): Promise<string[]> => run('readonly', (s) => s.getAllKeys(), [] as string[], (r) => (r as IDBValidKey[]).map(String));
