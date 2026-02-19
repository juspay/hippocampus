import { CompletionProvider } from '../types/provider.types.js';
import { Strand, STRANDS } from '../types/engram.types.js';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config.js';

export interface TemporalFact {
  entity: string;
  attribute: string;
  value: string;
}

export interface ExtractionResult {
  facts: string[];
  strand: Strand;
  temporalFacts: TemporalFact[];
}

export class FactExtractionService {
  constructor(private completion: CompletionProvider) {}

  async extract(content: string): Promise<ExtractionResult> {
    try {
      const extractionPrompt = getConfig().extraction.prompt;
      const result = await this.completion.completeJson<{
        facts: string[];
        strand: string;
        temporalFacts?: TemporalFact[];
      }>(extractionPrompt, content);

      const strand = STRANDS.includes(result.strand as Strand)
        ? (result.strand as Strand)
        : 'general';

      const facts = Array.isArray(result.facts)
        ? result.facts.filter(f => typeof f === 'string' && f.length > 0)
        : [content];

      if (facts.length === 0) {
        facts.push(content);
      }

      const temporalFacts = Array.isArray(result.temporalFacts)
        ? result.temporalFacts.filter(
            tf => tf && typeof tf.entity === 'string' && typeof tf.attribute === 'string' && typeof tf.value === 'string'
          )
        : [];

      logger.debug('Extracted facts', { count: facts.length, strand, temporalFacts: temporalFacts.length });
      return { facts, strand, temporalFacts };
    } catch (error) {
      logger.warn('Fact extraction failed, using raw content', { error: String(error) });
      return { facts: [content], strand: 'general', temporalFacts: [] };
    }
  }
}
