// Lightweight IndexedDB helper to persist simulation snapshots in-browser.
// Stores full engine exportState payloads.

export interface SimSnapshot {
  id?: number;
  createdAt: number;
  tick: number;
  state: any;
}

export class SimDB {
  private dbp: Promise<IDBDatabase>;

  constructor(name = 'simDB', version = 1) {
    this.dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(name, version);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('snapshots')) {
          const store = db.createObjectStore('snapshots', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_createdAt', 'createdAt');
          store.createIndex('by_tick', 'tick');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => T | Promise<T>): Promise<T> {
    const db = await this.dbp;
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction('snapshots', mode);
      const store = tx.objectStore('snapshots');
      Promise.resolve(fn(store))
        .then((val) => tx.oncomplete = () => resolve(val as T))
        .catch((err) => reject(err));
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async saveSnapshot(snapshot: Omit<SimSnapshot, 'id'>): Promise<number> {
    return this.withStore('readwrite', (store) => {
      return new Promise<number>((resolve, reject) => {
        const req = store.add(snapshot as SimSnapshot);
        req.onsuccess = () => resolve(req.result as number);
        req.onerror = () => reject(req.error);
      });
    });
  }

  async loadLatest(): Promise<SimSnapshot | null> {
    const db = await this.dbp;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const index = store.index('by_createdAt');
      const req = index.openCursor(null, 'prev');
      req.onsuccess = () => {
        const cursor = req.result as IDBCursorWithValue | null;
        resolve(cursor ? (cursor.value as SimSnapshot) : null);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll(): Promise<void> {
    await this.withStore('readwrite', (store) => store.clear());
  }
}

