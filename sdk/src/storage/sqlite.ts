import type { StorageBackend, SqliteStorageConfig } from '../types';
import { logger } from '../logger';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

export class SqliteStorage implements StorageBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any = null;
  private dbPath: string;

  constructor(config?: SqliteStorageConfig) {
    this.dbPath = config?.path || path.join(process.cwd(), 'data', 'hippocampus.sqlite');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ensureDb(): any {
    if (this.db) {
      return this.db;
    }

    try {
      // Ensure parent directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const require = createRequire(import.meta.url);
      const Database = require('better-sqlite3');
      this.db = new Database(this.dbPath);

      this.db.pragma('journal_mode = WAL');

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS memories (
          owner_id TEXT PRIMARY KEY,
          memory TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      logger.info('SQLite storage initialized', { path: this.dbPath });
    } catch (error) {
      logger.error('Failed to initialize SQLite storage', {
        path: this.dbPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return this.db;
  }

  async get(ownerId: string): Promise<string | null> {
    try {
      const db = this.ensureDb();
      const row = db.prepare('SELECT memory FROM memories WHERE owner_id = ?').get(ownerId) as
        | { memory: string }
        | undefined;
      return row?.memory ?? null;
    } catch (error) {
      logger.error('SQLite get failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async set(ownerId: string, memory: string): Promise<void> {
    try {
      const db = this.ensureDb();
      db.prepare(
        `INSERT INTO memories (owner_id, memory, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(owner_id) DO UPDATE SET memory = excluded.memory, updated_at = excluded.updated_at`
      ).run(ownerId, memory);
    } catch (error) {
      logger.error('SQLite set failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(ownerId: string): Promise<void> {
    try {
      const db = this.ensureDb();
      db.prepare('DELETE FROM memories WHERE owner_id = ?').run(ownerId);
    } catch (error) {
      logger.error('SQLite delete failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async close(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
        logger.info('SQLite storage closed');
      }
    } catch (error) {
      logger.error('SQLite close failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.db = null;
    }
  }
}
