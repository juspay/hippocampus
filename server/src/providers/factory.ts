import { EmbedderProvider, CompletionProvider } from '../types/provider.types.js';
import { OpenAIEmbedder } from './openai-embedder.js';
import { OllamaEmbedder } from './ollama-embedder.js';
import { NativeEmbedder } from './native-embedder.js';
import { OpenAICompletion } from './openai-completion.js';
import { OllamaCompletion } from './ollama-completion.js';
import { NativeCompletion } from './native-completion.js';
import { getConfig } from '../config.js';
import type { EmbedderProviderType, CompletionProviderType } from '../config.js';

export type { EmbedderProviderType, CompletionProviderType };

export interface ProviderOptions {
  embedder: {
    provider: EmbedderProviderType;
    model?: string;
    dimensions?: number;
    apiKey?: string;
    baseUrl?: string;
  };
  completion: {
    provider: CompletionProviderType;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
  };
}

export class ProviderFactory {
  static createEmbedder(options: ProviderOptions['embedder']): EmbedderProvider {
    switch (options.provider) {
      case 'openai':
        return new OpenAIEmbedder(options.apiKey, options.model, options.dimensions);
      case 'ollama':
        return new OllamaEmbedder(options.model, options.dimensions, options.baseUrl);
      case 'native':
        return new NativeEmbedder(options.dimensions);
      default:
        throw new Error(`Unknown embedder provider: ${options.provider}`);
    }
  }

  static createCompletion(options: ProviderOptions['completion']): CompletionProvider {
    switch (options.provider) {
      case 'openai':
        return new OpenAICompletion(options.apiKey, options.model);
      case 'ollama':
        return new OllamaCompletion(options.model, options.baseUrl);
      case 'native':
        return new NativeCompletion();
      default:
        throw new Error(`Unknown completion provider: ${options.provider}`);
    }
  }

  static createFromConfig(): { embedder: EmbedderProvider; completion: CompletionProvider } {
    const cfg = getConfig();

    return {
      embedder: ProviderFactory.createEmbedder({
        provider: cfg.embedder.provider,
        model: cfg.embedder.model,
        dimensions: cfg.embedder.dimensions,
        apiKey: cfg.providerKeys.openaiApiKey,
        baseUrl: cfg.providerKeys.ollamaBaseUrl,
      }),
      completion: ProviderFactory.createCompletion({
        provider: cfg.completion.provider,
        model: cfg.completion.model,
        apiKey: cfg.providerKeys.openaiApiKey,
        baseUrl: cfg.providerKeys.ollamaBaseUrl,
      }),
    };
  }

  static createFromEnv(): { embedder: EmbedderProvider; completion: CompletionProvider } {
    return ProviderFactory.createFromConfig();
  }
}
