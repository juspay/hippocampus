import { CompletionProvider } from '../types/provider.types';
import { Strand, STRANDS } from '../types/engram.types';
import { logger } from '../utils/logger';

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

const DEFAULT_EXTRACTION_PROMPT = `You are a fact extraction engine. Given a piece of text, extract facts, classify the memory type, and identify any temporal facts.

IMPORTANT RULES FOR FACT EXTRACTION:
1. Keep simple statements INTACT — do NOT split a single coherent idea into multiple facts
2. Only split when the input contains MULTIPLE DISTINCT topics or ideas
3. Preserve the original phrasing when possible
4. If the input is already a single clear fact, return it as-is in the facts array

Examples:
- "TypeScript is a typed superset of JavaScript" → ["TypeScript is a typed superset of JavaScript"] (one fact, don't split)
- "I use VS Code with dark mode" → ["I use VS Code with dark mode"] (one coherent preference)
- "Python is great for ML. I also like React for frontend." → ["Python is great for ML", "I like React for frontend"] (two distinct topics)

Strand classification: factual, experiential, procedural, preferential, relational, general

Temporal facts — entity-attribute-value relationships that may change:
- "I switched to iPhone" → entity: speaker, attribute: phone, value: iPhone
- "John lives in Berlin" → entity: John, attribute: city, value: Berlin
Only extract temporal facts when there's a CLEAR entity-attribute-value pattern.

Respond with JSON:
{
  "facts": ["fact1", "fact2", ...],
  "strand": "factual|experiential|procedural|preferential|relational|general",
  "temporalFacts": [
    { "entity": "entity_name", "attribute": "attribute_name", "value": "current_value" }
  ]
}`;

const EXTRACTION_SYSTEM_PROMPT = process.env.NS_EXTRACTION_PROMPT || DEFAULT_EXTRACTION_PROMPT;

export class FactExtractionService {
  constructor(private completion: CompletionProvider) {}

  async extract(content: string): Promise<ExtractionResult> {
    try {
      const result = await this.completion.completeJson<{
        facts: string[];
        strand: string;
        temporalFacts?: TemporalFact[];
      }>(EXTRACTION_SYSTEM_PROMPT, content);

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
