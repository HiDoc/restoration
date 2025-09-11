// Optional SQLite (sql.js) persistence for simulation snapshots.
// Requires sql.js to be available (e.g., via CDN) providing window.SQL.Database
// or window.initSqlJs to initialize. This DB is in-memory unless you export
// and persist the Uint8Array yourself (not covered here).

export interface SqliteSnapshot {
  id?: number;
  createdAt: number;
  tick: number;
  state: any;
}

export class SqliteSimDB {
  private db: any | null = null;

  constructor(db?: any) {
    if (db) this.db = db;
  }

  async init(): Promise<boolean> {
    if (this.db) { this.ensureSchema(); return true; }
    const w: any = window as any;
    try {
      if (w.SQL?.Database) {
        this.db = new w.SQL.Database();
        this.ensureSchema();
        return true;
      }
      if (typeof w.initSqlJs === 'function') {
        const SQL = await w.initSqlJs({});
        this.db = new SQL.Database();
        this.ensureSchema();
        return true;
      }
    } catch (e) {
      console.warn('SQLite init failed:', e);
    }
    console.warn('SQLite not available (sql.js missing).');
    return false;
  }

  private ensureSchema() {
    this.db!.run(
      'CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, createdAt INTEGER, tick INTEGER, state TEXT)'
    );
    this.db!.run('CREATE INDEX IF NOT EXISTS idx_snap_created ON snapshots(createdAt)');
  }

  async saveSnapshot(snapshot: Omit<SqliteSnapshot, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Sqlite DB not initialized');
    const stmt = this.db.prepare('INSERT INTO snapshots (createdAt, tick, state) VALUES (?, ?, ?)');
    stmt.run([snapshot.createdAt, snapshot.tick, JSON.stringify(snapshot.state)]);
    stmt.free();
    // Get last inserted id
    const res = this.db.exec('SELECT last_insert_rowid() as id');
    const id = res && res[0] && res[0].values && res[0].values[0] ? (res[0].values[0][0] as number) : 0;
    return id;
  }

  async loadLatest(): Promise<SqliteSnapshot | null> {
    if (!this.db) throw new Error('Sqlite DB not initialized');
    const res = this.db.exec('SELECT id, createdAt, tick, state FROM snapshots ORDER BY createdAt DESC LIMIT 1');
    if (!res || !res[0] || !res[0].values || res[0].values.length === 0) return null;
    const row = res[0].values[0];
    return { id: row[0] as number, createdAt: row[1] as number, tick: row[2] as number, state: JSON.parse(row[3] as string) };
    }

  async clearAll(): Promise<void> {
    if (!this.db) throw new Error('Sqlite DB not initialized');
    this.db.run('DELETE FROM snapshots');
  }
}

