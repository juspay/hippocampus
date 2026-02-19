import { DataStore } from '../types/db.types.js';
import { DatabaseConfig } from '../types/config.types.js';
import { PostgresStore } from './postgres.store.js';
import { SqliteStore } from './sqlite.store.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config.js';
import path from 'path';
import fs from 'fs';

export function resolveDatabaseConfig(): DatabaseConfig {
  const db = getConfig().database;

  if (db.pgHost || db.databaseUrl) {
    if (db.databaseUrl) {
      const url = new URL(db.databaseUrl);
      return {
        type: 'postgres',
        postgres: {
          host: url.hostname,
          port: parseInt(url.port || '5432', 10),
          database: url.pathname.slice(1),
          user: url.username,
          password: url.password,
          ssl: url.searchParams.get('sslmode') !== 'disable',
        },
      };
    }

    return {
      type: 'postgres',
      postgres: {
        host: db.pgHost!,
        port: db.pgPort,
        database: db.pgDatabase,
        user: db.pgUser,
        password: db.pgPassword,
        ssl: db.pgSsl,
      },
    };
  }

  return { type: 'sqlite', sqlite: { path: db.sqlitePath } };
}

export async function createDataStore(config?: DatabaseConfig, embeddingDimensions?: number): Promise<DataStore> {
  const dbConfig = config || resolveDatabaseConfig();

  if (dbConfig.type === 'postgres' && dbConfig.postgres) {
    logger.info('Using PostgreSQL database', { host: dbConfig.postgres.host, database: dbConfig.postgres.database });
    const store = new PostgresStore({
      host: dbConfig.postgres.host,
      port: dbConfig.postgres.port,
      database: dbConfig.postgres.database,
      user: dbConfig.postgres.user,
      password: dbConfig.postgres.password,
      ssl: dbConfig.postgres.ssl ? { rejectUnauthorized: false } : false,
    }, embeddingDimensions);
    await store.initialize();
    return store;
  }

  const sqlitePath = dbConfig.sqlite?.path || path.join(process.cwd(), 'data', 'hippocampus.sqlite');
  const dir = path.dirname(sqlitePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  logger.info('Using SQLite database', { path: sqlitePath });
  const store = new SqliteStore(sqlitePath);
  await store.initialize();
  return store;
}
