import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { env } from './env.js';
import { logger } from '../core/logger.js';

const require = createRequire(import.meta.url);

export interface IDatabaseDriver {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
}

let dbInstance: IDatabaseDriver | null = null;

export function initializeDatabase(): IDatabaseDriver {
  if (dbInstance) {
    return dbInstance;
  }

  const dbDir = path.dirname(env.RESOLVED_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info({ dbDir }, 'Created database directory');
  }

  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(env.RESOLVED_DB_PATH);

    // Optimize SQLite for high performance and integrity
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');

    logger.info({ path: env.RESOLVED_DB_PATH, driver: 'node:sqlite' }, 'Connected to SQLite database with WAL mode');

    applyMigrations(db);
    dbInstance = db;
    return db;
  } catch (error) {
    logger.warn({ err: error }, 'Native SQLite initialization failed. Initializing resilient file-backed engine fallback');
    const fallback = createFallbackJsonDriver(env.RESOLVED_DB_PATH + '.json');
    dbInstance = fallback;
    return fallback;
  }
}

function applyMigrations(db: IDatabaseDriver): void {
  // Create assets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      language TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create performance indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
    CREATE INDEX IF NOT EXISTS idx_assets_is_pinned ON assets(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at);
    CREATE INDEX IF NOT EXISTS idx_assets_title ON assets(title);
  `);

  // Create pipeline execution history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_history (
      execution_id TEXT PRIMARY KEY,
      pipeline_id TEXT NOT NULL,
      status TEXT NOT NULL,
      exit_code INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  logger.info('Database migrations applied successfully');
}

/**
 * Resilient JSON-backed driver fallback if SQLite native bindings are unavailable.
 * Matches IDatabaseDriver contract for zero-downtime execution.
 */
function createFallbackJsonDriver(filePath: string): IDatabaseDriver {
  let memoryData: { assets: any[]; pipeline_history: any[] } = {
    assets: [],
    pipeline_history: [],
  };

  if (fs.existsSync(filePath)) {
    try {
      memoryData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      memoryData = { assets: [], pipeline_history: [] };
    }
  }

  const flush = () => {
    fs.writeFileSync(filePath, JSON.stringify(memoryData, null, 2), 'utf-8');
  };

  return {
    exec(_sql: string) {
      // Schema migrations are virtual in JSON driver
    },
    prepare(sql: string) {
      const lower = sql.toLowerCase().trim();
      return {
        run(...params: unknown[]) {
          if (lower.startsWith('insert into assets')) {
            const [id, title, description, category, language, content, tags, is_pinned, created_at, updated_at] = params;
            memoryData.assets.push({
              id,
              title,
              description,
              category,
              language,
              content,
              tags,
              is_pinned,
              created_at,
              updated_at,
            });
            flush();
            return { changes: 1, lastInsertRowid: 1 };
          }
          if (lower.startsWith('update assets')) {
            const id = params[params.length - 1];
            const idx = memoryData.assets.findIndex((a) => a.id === id);
            if (idx >= 0) {
              const [title, description, category, language, content, tags, is_pinned, updated_at] = params;
              memoryData.assets[idx] = {
                ...memoryData.assets[idx],
                title,
                description,
                category,
                language,
                content,
                tags,
                is_pinned,
                updated_at,
              };
              flush();
              return { changes: 1, lastInsertRowid: 1 };
            }
            return { changes: 0, lastInsertRowid: 0 };
          }
          if (lower.startsWith('delete from assets')) {
            const id = params[0];
            const lenBefore = memoryData.assets.length;
            memoryData.assets = memoryData.assets.filter((a) => a.id !== id);
            flush();
            return { changes: lenBefore - memoryData.assets.length, lastInsertRowid: 0 };
          }
          if (lower.startsWith('insert into pipeline_history')) {
            const [execution_id, pipeline_id, status, exit_code, duration_ms, created_at] = params;
            memoryData.pipeline_history.push({ execution_id, pipeline_id, status, exit_code, duration_ms, created_at });
            flush();
            return { changes: 1, lastInsertRowid: 1 };
          }
          return { changes: 0, lastInsertRowid: 0 };
        },
        get(...params: unknown[]) {
          if (lower.includes('from assets where id =')) {
            const id = params[0];
            return memoryData.assets.find((a) => a.id === id);
          }
          if (lower.includes('count(*)')) {
            return { count: memoryData.assets.length };
          }
          return undefined;
        },
        all(..._params: unknown[]) {
          return memoryData.assets;
        },
      };
    },
    close() {
      flush();
    },
  };
}
