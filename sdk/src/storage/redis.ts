import type { StorageBackend, RedisStorageConfig } from '../types';
import { logger } from '../logger';

export class RedisStorage implements StorageBackend {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private keyPrefix: string;
  private ttl: number;
  private config: RedisStorageConfig;

  constructor(config: RedisStorageConfig) {
    this.config = config;
    this.keyPrefix = config.keyPrefix || 'hippocampus:memory:';
    this.ttl = config.ttl || 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async ensureClient(): Promise<any> {
    if (this.client) {
      return this.client;
    }

    const { createClient } = await import('redis');

    const host = this.config.host || process.env.REDIS_HOST || 'localhost';
    const port = this.config.port || parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = this.config.password || process.env.REDIS_PASSWORD || undefined;
    const db = this.config.db ?? parseInt(process.env.REDIS_DB || '0', 10);

    this.client = createClient({
      socket: { host, port },
      password,
      database: db,
    });

    this.client.on('error', (err: Error) => {
      logger.error('Redis client error', { error: err.message });
    });

    await this.client.connect();
    logger.info('Redis storage initialized', { host, port, db, keyPrefix: this.keyPrefix });
    return this.client;
  }

  private key(ownerId: string): string {
    return `${this.keyPrefix}${ownerId}`;
  }

  async get(ownerId: string): Promise<string | null> {
    try {
      const client = await this.ensureClient();
      return await client.get(this.key(ownerId));
    } catch (error) {
      logger.error('Redis get failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async set(ownerId: string, memory: string): Promise<void> {
    try {
      const client = await this.ensureClient();
      if (this.ttl > 0) {
        await client.set(this.key(ownerId), memory, { EX: this.ttl });
      } else {
        await client.set(this.key(ownerId), memory);
      }
    } catch (error) {
      logger.error('Redis set failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(ownerId: string): Promise<void> {
    try {
      const client = await this.ensureClient();
      await client.del(this.key(ownerId));
    } catch (error) {
      logger.error('Redis delete failed', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        logger.info('Redis storage closed');
      }
    } catch (error) {
      logger.error('Redis close failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.client = null;
    }
  }
}
