import { DataStore } from '../types/db.types.js';
import { EmbedderProvider } from '../types/provider.types.js';
import { Engram } from '../types/engram.types.js';
import { sha256 } from '../utils/crypto.js';
import { cosineSimilarity } from '../utils/math.js';
import { logger } from '../utils/logger.js';

export class DeduplicationService {
  private threshold: number;

  constructor(
    private store: DataStore,
    private embedder: EmbedderProvider,
    threshold = 0.92
  ) {
    this.threshold = threshold;
  }

  async checkDuplicate(
    ownerId: string,
    content: string,
    embedding: number[]
  ): Promise<{ isDuplicate: boolean; existing?: Engram; similarity?: number }> {
    // Step 1: Exact hash match
    const contentHash = sha256(content);
    const hashMatch = await this.store.findByContentHash(ownerId, contentHash);

    if (hashMatch) {
      logger.debug('Exact hash match found', { id: hashMatch.id });
      return { isDuplicate: true, existing: hashMatch, similarity: 1.0 };
    }

    // Step 2: Vector similarity check
    const candidates = await this.store.vectorSearch(ownerId, embedding, 5);

    for (const candidate of candidates) {
      const similarity = cosineSimilarity(embedding, candidate.engram.embedding);
      if (similarity >= this.threshold) {
        logger.debug('Vector similarity match found', { id: candidate.engram.id, similarity });
        return { isDuplicate: true, existing: candidate.engram, similarity };
      }
    }

    return { isDuplicate: false };
  }

  computeHash(content: string): string {
    return sha256(content);
  }
}
