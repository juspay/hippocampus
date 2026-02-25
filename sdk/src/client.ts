import type { HippocampusConfig, StorageBackend, StorageConfig } from './types';
import { logger } from './logger';

const DEFAULT_PROMPT = `You are a memory condensation engine. You receive:
1. OLD_MEMORY: the user's existing memory summary (may be empty)
2. NEW_CONTENT: new conversation content

Your job: merge the old memory with relevant new information into a single condensed summary.

Rules:
- Output ONLY the condensed memory text, nothing else
- Maximum {{MAX_WORDS}} words
- Preserve important facts: names, preferences, goals, decisions, context
- Drop greetings, filler, redundant information
- If NEW_CONTENT has nothing worth remembering, return OLD_MEMORY unchanged
- If OLD_MEMORY is empty and NEW_CONTENT has nothing worth remembering, return empty string

OLD_MEMORY:
{{OLD_MEMORY}}

NEW_CONTENT:
{{NEW_CONTENT}}

Condensed memory:`;
export class Hippocampus {
  private storage: StorageBackend | null = null;
  private storageConfig: StorageConfig;
  private prompt: string;
  private maxWords: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private neurolink: any = null;
  private config: HippocampusConfig;

  constructor(config: HippocampusConfig = {}) {
    this.config = config;
    this.storageConfig = config.storage || { type: 'sqlite' };
    this.prompt = config.prompt || process.env.HC_CONDENSATION_PROMPT || DEFAULT_PROMPT;
    this.maxWords = config.maxWords || 50;

    logger.info('Hippocampus initialized', {
      storage: this.storageConfig.type,
      maxWords: this.maxWords,
    });
  }

  private async ensureStorage(): Promise<StorageBackend | null> {
    if (this.storage) {
      return this.storage;
    }

    try {
      switch (this.storageConfig.type) {
        case 'sqlite': {
          const { SqliteStorage } = await import('./storage/sqlite');
          this.storage = new SqliteStorage(this.storageConfig);
          break;
        }
        case 'redis': {
          const { RedisStorage } = await import('./storage/redis');
          this.storage = new RedisStorage(this.storageConfig);
          break;
        }
        case 's3': {
          const { S3Storage } = await import('./storage/s3');
          this.storage = new S3Storage(this.storageConfig);
          break;
        }
        default:
          logger.error('Unknown storage type', {
            type: (this.storageConfig as { type: string }).type,
          });
          return null;
      }
    } catch (error) {
      logger.error('Failed to initialize storage backend', {
        type: this.storageConfig.type,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }

    return this.storage;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async ensureNeurolink(): Promise<any | null> {
    if (this.neurolink) {
      return this.neurolink;
    }

    try {
      const { NeuroLink } = await import('@juspay/neurolink');
      this.neurolink = new NeuroLink();
      logger.info('NeuroLink instance created for Hippocampus condensation');
      return this.neurolink;
    } catch (error) {
      logger.error('Failed to initialize NeuroLink for condensation', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Add/update memory for an owner.
   *
   * Fetches existing memory, merges with new content via LLM, stores result.
   *
   * @param ownerId - Unique identifier (user ID, session ID, etc.)
   * @param content - New conversation content to incorporate
   * @returns The condensed memory string that was stored, or empty string on failure
   */
  async add(ownerId: string, content: string): Promise<string> {
    try {
      const storage = await this.ensureStorage();
      if (!storage) {
        return '';
      }

      const neurolink = await this.ensureNeurolink();
      if (!neurolink) {
        return '';
      }

      let oldMemory = '';
      try {
        oldMemory = (await storage.get(ownerId)) || '';
      } catch (error) {
        logger.warn('Failed to fetch existing memory, proceeding without it', {
          ownerId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      const filledPrompt = this.prompt
        .replaceAll('{{OLD_MEMORY}}', oldMemory || '(none)')
        .replaceAll('{{NEW_CONTENT}}', content)
        .replaceAll('{{MAX_WORDS}}', String(this.maxWords));

      logger.debug('Condensing memory', {
        ownerId,
        oldMemoryLength: oldMemory.length,
        newContentLength: content.length,
      });

      let condensed = '';
      try {
        const result = await neurolink.generate({
          input: { text: filledPrompt },
          provider: this.config.neurolink?.provider,
          model: this.config.neurolink?.model,
          temperature: this.config.neurolink?.temperature ?? 0.1,
          disableTools: true,
        });
        condensed = (result?.content || '').trim();
      } catch (error) {
        logger.error('LLM condensation call failed', {
          ownerId,
          error: error instanceof Error ? error.message : String(error),
        });
        return oldMemory;
      }

      if (condensed) {
        try {
          await storage.set(ownerId, condensed);
          logger.info('Memory updated', { ownerId, words: condensed.split(/\s+/).length });
        } catch (error) {
          logger.error('Failed to persist condensed memory', {
            ownerId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else if (oldMemory) {
        logger.debug('No new memory extracted, keeping existing', { ownerId });
      }

      return condensed || oldMemory;
    } catch (error) {
      logger.error('Unexpected error in add()', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  /**
   * Get the stored memory for an owner.
   *
   * @param ownerId - Unique identifier
   * @returns The condensed memory string, or null if none exists or on failure
   */
  async get(ownerId: string): Promise<string | null> {
    try {
      const storage = await this.ensureStorage();
      if (!storage) {
        return null;
      }
      return await storage.get(ownerId);
    } catch (error) {
      logger.error('Failed to get memory', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Delete memory for an owner.
   *
   * @param ownerId - Unique identifier
   */
  async delete(ownerId: string): Promise<void> {
    try {
      const storage = await this.ensureStorage();
      if (!storage) {
        return;
      }
      await storage.delete(ownerId);
      logger.info('Memory deleted', { ownerId });
    } catch (error) {
      logger.error('Failed to delete memory', {
        ownerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Close storage connections and clean up resources.
   */
  async close(): Promise<void> {
    try {
      if (this.storage) {
        await this.storage.close();
        this.storage = null;
      }
      logger.info('Hippocampus closed');
    } catch (error) {
      logger.error('Failed to close Hippocampus', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.storage = null;
    }
  }
}
