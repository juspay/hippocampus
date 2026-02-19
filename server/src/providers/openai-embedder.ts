import OpenAI from 'openai';
import { EmbedderProvider } from '../types/provider.types.js';
import { logger } from '../utils/logger.js';

export class OpenAIEmbedder implements EmbedderProvider {
  private client: OpenAI;
  private model: string;
  readonly dimensions: number;
  readonly name = 'openai';

  constructor(apiKey?: string, model?: string, dimensions?: number) {
    this.client = new OpenAI({ apiKey: apiKey || undefined });
    this.model = model || 'text-embedding-3-small';
    this.dimensions = dimensions || 1536;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    logger.debug('Embedding batch', { count: texts.length, model: this.model });

    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });

    return response.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding);
  }
}
