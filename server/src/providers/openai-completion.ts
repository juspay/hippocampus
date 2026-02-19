import OpenAI from 'openai';
import { CompletionProvider } from '../types/provider.types.js';
import { logger } from '../utils/logger.js';

export class OpenAICompletion implements CompletionProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI({ apiKey: apiKey || undefined });
    this.model = model || 'gpt-4-turbo';
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    logger.debug('OpenAI completion', { model: this.model });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
    });

    return response.choices[0]?.message?.content || '';
  }

  async completeJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    logger.debug('OpenAI JSON completion', { model: this.model });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content) as T;
  }
}
