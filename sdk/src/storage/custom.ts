import type { CustomStorageConfig, StorageBackend } from '../types';
import { logger } from '../logger';

/**
 * Custom storage backend that delegates all operations to consumer-provided callbacks.
 *
 * The consumer is responsible for the actual persistence — Hippocampus only
 * calls the provided onGet/onSet/onDelete/onClose functions.
 *
 * TypeScript enforces that onGet/onSet/onDelete are functions via CustomStorageConfig.
 * No runtime validation needed — the type system handles it at compile time.
 */
export class CustomStorage implements StorageBackend {
  private readonly config: CustomStorageConfig;

  constructor(config: CustomStorageConfig) {
    this.config = config;
    logger.info('Custom storage backend initialized');
  }

  async get(ownerId: string): Promise<string | null> {
    return this.config.onGet(ownerId);
  }

  async set(ownerId: string, memory: string): Promise<void> {
    return this.config.onSet(ownerId, memory);
  }

  async delete(ownerId: string): Promise<void> {
    return this.config.onDelete(ownerId);
  }

  async close(): Promise<void> {
    if (this.config.onClose) {
      return this.config.onClose();
    }
  }
}
