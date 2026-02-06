import { EmbedderProvider } from '../types/provider.types';
import { logger } from '../utils/logger';

export class OllamaEmbedder implements EmbedderProvider {
  private baseUrl: string;
  private model: string;
  readonly dimensions: number;
  readonly name = 'ollama';

  constructor(model?: string, dimensions?: number, baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NS_OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = model || process.env.NS_EMBEDDER_MODEL || 'nomic-embed-text';
    this.dimensions = dimensions || parseInt(process.env.NS_EMBEDDING_DIMENSIONS || '768', 10);
  }

  async embed(text: string): Promise<number[]> {
    logger.debug('Ollama embedding', { model: this.model });

    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't support batch embeddings natively; sequential fallback
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.embed(text));
    }
    return results;
  }
}
