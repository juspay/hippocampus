/**
 * Centralized configuration module for Hippocampus server.
 *
 * All environment variables are read ONCE via `loadConfig()` (called from index.ts
 * after dotenv has loaded) and exposed through getter functions with defaults.
 *
 * No other file should read `process.env` directly.
 */

import path from 'path';

// ── Types ───────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type EmbedderProviderType = 'openai' | 'ollama' | 'native';
export type CompletionProviderType = 'openai' | 'ollama' | 'native';

export interface ServerConfig {
  port: number;
  host: string;
  apiKey: string | undefined;
  logLevel: string;
}

export interface DatabaseEnvConfig {
  pgHost: string | undefined;
  databaseUrl: string | undefined;
  pgPort: number;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;
  pgSsl: boolean;
  sqlitePath: string;
}

export interface EmbedderConfig {
  provider: EmbedderProviderType;
  model: string | undefined;
  dimensions: number | undefined;
}

export interface CompletionConfig {
  provider: CompletionProviderType;
  model: string | undefined;
}

export interface ProviderKeysConfig {
  openaiApiKey: string | undefined;
  ollamaBaseUrl: string;
}

export interface ExtractionConfig {
  prompt: string;
}

export interface AppConfig {
  server: ServerConfig;
  database: DatabaseEnvConfig;
  embedder: EmbedderConfig;
  completion: CompletionConfig;
  providerKeys: ProviderKeysConfig;
  extraction: ExtractionConfig;
}

// ── Default extraction prompt ───────────────────────────

const DEFAULT_EXTRACTION_PROMPT = `Extract facts from the text below. Return JSON only.

Rules:
- "facts" must be an array of SHORT STRINGS (not objects). Each string is one fact.
- "strand" must be ONE of: factual, experiential, procedural, preferential, relational, general
- "temporalFacts" is for things that change over time (optional, can be empty array)
- If nothing worth remembering, return {"facts": [], "strand": "general", "temporalFacts": []}
- SKIP greetings, small talk, and data/numbers that change daily

Examples:

Input: "I use VS Code with dark mode"
Output: {"facts": ["User uses VS Code with dark mode"], "strand": "preferential", "temporalFacts": []}

Input: "Hi, how are you?"
Output: {"facts": [], "strand": "general", "temporalFacts": []}

Input: "I'm Priya from JewelCraft, we use Shopify"
Output: {"facts": ["Name is Priya", "Company is JewelCraft", "Platform is Shopify"], "strand": "factual", "temporalFacts": [{"entity": "merchant", "attribute": "name", "value": "Priya"}, {"entity": "merchant", "attribute": "company", "value": "JewelCraft"}, {"entity": "merchant", "attribute": "platform", "value": "Shopify"}]}

Input: "Our GMV is 15L and success rate is 96%"
Output: {"facts": [], "strand": "general", "temporalFacts": []}

IMPORTANT: facts must be STRINGS like "User likes apple", never objects.

Return only valid JSON:`;

// ── Singleton config ────────────────────────────────────

let _config: AppConfig | null = null;

/**
 * Load all environment variables into a typed config object.
 * Must be called ONCE after `dotenv.config()`, before any imports that need config.
 */
export function loadConfig(): AppConfig {
  const cfg: AppConfig = {
    server: {
      port: parseInt(process.env.HC_PORT || '4477', 10),
      host: process.env.HC_HOST || '0.0.0.0',
      apiKey: process.env.HC_API_KEY || undefined,
      logLevel: process.env.HC_LOG_LEVEL || 'off',
    },
    database: {
      pgHost: process.env.HC_PG_HOST || undefined,
      databaseUrl: process.env.HC_DATABASE_URL || undefined,
      pgPort: parseInt(process.env.HC_PG_PORT || '5432', 10),
      pgDatabase: process.env.HC_PG_DATABASE || 'hippocampus',
      pgUser: process.env.HC_PG_USER || 'postgres',
      pgPassword: process.env.HC_PG_PASSWORD || '',
      pgSsl: process.env.HC_PG_SSL === 'true',
      sqlitePath: process.env.HC_SQLITE_PATH || path.join(process.cwd(), 'data', 'hippocampus.sqlite'),
    },
    embedder: {
      provider: (process.env.HC_EMBEDDER_PROVIDER || 'native') as EmbedderProviderType,
      model: process.env.HC_EMBEDDER_MODEL || undefined,
      dimensions: process.env.HC_EMBEDDING_DIMENSIONS
        ? parseInt(process.env.HC_EMBEDDING_DIMENSIONS, 10)
        : undefined,
    },
    completion: {
      provider: (process.env.HC_COMPLETION_PROVIDER || 'native') as CompletionProviderType,
      model: process.env.HC_COMPLETION_MODEL || undefined,
    },
    providerKeys: {
      openaiApiKey: process.env.HC_OPENAI_API_KEY || undefined,
      ollamaBaseUrl: process.env.HC_OLLAMA_BASE_URL || 'http://localhost:11434',
    },
    extraction: {
      prompt: process.env.HC_EXTRACTION_PROMPT || DEFAULT_EXTRACTION_PROMPT,
    },
  };

  _config = cfg;
  return cfg;
}

/**
 * Get the loaded config. Throws if `loadConfig()` hasn't been called yet.
 * Every module should use this instead of reading `process.env` directly.
 */
export function getConfig(): AppConfig {
  if (!_config) {
    throw new Error(
      'Config not loaded. Call loadConfig() in index.ts after dotenv.config() and before importing other modules.',
    );
  }
  return _config;
}
