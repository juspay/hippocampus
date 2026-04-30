# @juspay/hippocampus

Embedded memory SDK for AI applications. Maintains a condensed, per-user memory summary that persists across conversations using LLM-powered condensation.

Each user gets a single memory string (keyed by `ownerId`) that is progressively condensed as new information arrives. Old memory + new content are merged by an LLM into a tight summary within a configurable word limit.

## Installation

```bash
npm install @juspay/hippocampus
```

Peer dependencies:

```bash
# Required — LLM provider for memory condensation
npm install @juspay/neurolink

# Optional — only if using SQLite storage
npm install better-sqlite3
```

## Quick Start

```typescript
import { Hippocampus } from "@juspay/hippocampus";

const memory = new Hippocampus({
  storage: { type: "sqlite" },
  neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
  maxWords: 50,
});

// Store a conversation turn — LLM condenses it automatically
await memory.add("user-123", "User: My name is Alice\nAssistant: Nice to meet you, Alice!");

// Retrieve the condensed memory
const summary = await memory.get("user-123");
// → "User's name is Alice."

// Next conversation — old memory is merged with new content
await memory.add("user-123", "User: I run a Shopify store\nAssistant: Great, I can help with that!");
const updated = await memory.get("user-123");
// → "Alice runs a Shopify store."

// Cleanup
await memory.close();
```

## How It Works

```
memory.add(ownerId, newContent)
       │
       ▼
 ┌──────────────────┐
 │ storage.get()    │  ← Fetch existing condensed memory for this owner
 └───────┬──────────┘
         │
         ▼
 ┌──────────────────┐
 │ LLM condensation │  ← Merge old memory + new content into a summary
 └───────┬──────────┘     (via @juspay/neurolink)
         │
         ▼
 ┌──────────────────┐
 │ storage.set()    │  ← Persist the new condensed memory
 └──────────────────┘
```

The condensation prompt instructs the LLM to:
- Keep important facts: names, preferences, goals, decisions
- Drop greetings, filler, and redundant information
- Stay within the `maxWords` limit
- Return the old memory unchanged if there is nothing new worth remembering

## Storage Backends

Hippocampus supports 4 storage backends. Backend modules are dynamically imported at runtime — code paths for unused backends are never loaded. SQLite requires `better-sqlite3` as an optional peer dependency; Redis and S3 ship their clients bundled.

### SQLite (Default)

Good for local development and single-server deployments.

```typescript
const memory = new Hippocampus({
  storage: {
    type: "sqlite",
    path: "./data/hippocampus.sqlite", // optional, this is the default
  },
});
```

Requires the `better-sqlite3` peer dependency:

```bash
npm install better-sqlite3
```

Creates a `memories` table automatically with WAL journal mode.

### Redis

Good for distributed deployments where multiple servers share state.

```typescript
const memory = new Hippocampus({
  storage: {
    type: "redis",
    host: "localhost", // default, also reads REDIS_HOST env
    port: 6379, // default, also reads REDIS_PORT env
    password: undefined, // also reads REDIS_PASSWORD env
    db: 0, // also reads REDIS_DB env
    keyPrefix: "hippocampus:memory:", // default key prefix
    ttl: 0, // seconds, 0 = no expiry
  },
});
```

### S3

Good for production deployments on AWS. Each user's memory is stored as a single S3 object.

```typescript
const memory = new Hippocampus({
  storage: {
    type: "s3",
    bucket: "my-bucket", // required
    prefix: "hippocampus/memories/", // optional, default prefix
  },
});
```

Uses the default AWS SDK credential chain (`AWS_ACCESS_KEY_ID`, IAM role, etc.).

Storage path: `s3://{bucket}/{prefix}{ownerId}`

### Custom (Consumer-Managed)

Delegates storage entirely to your application via callbacks. Use this when you want to manage persistence yourself — call your own API, write to your own database, or integrate with any external system.

```typescript
const memory = new Hippocampus({
  storage: {
    type: "custom",
    onGet: async (ownerId) => {
      // Called when Hippocampus needs the existing memory
      return await myDB.getMemory(ownerId);
    },
    onSet: async (ownerId, memory) => {
      // Called when Hippocampus has a new condensed memory to persist
      await myDB.saveMemory(ownerId, memory);
    },
    onDelete: async (ownerId) => {
      // Called when memory.delete() is invoked
      await myDB.deleteMemory(ownerId);
    },
    onClose: async () => {
      // Optional — called on memory.close() for cleanup
      await myDB.disconnect();
    },
  },
});
```

| Callback   | Required | Signature                                             | Description                        |
| ---------- | -------- | ----------------------------------------------------- | ---------------------------------- |
| `onGet`    | Yes      | `(ownerId: string) => Promise<string \| null>`        | Retrieve stored memory for owner   |
| `onSet`    | Yes      | `(ownerId: string, memory: string) => Promise<void>`  | Persist condensed memory for owner |
| `onDelete` | Yes      | `(ownerId: string) => Promise<void>`                  | Delete memory for owner            |
| `onClose`  | No       | `() => Promise<void>`                                 | Cleanup on close                   |

Example — file-based custom storage:

```typescript
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";

const dir = "./data/memory";

const memory = new Hippocampus({
  storage: {
    type: "custom",
    onGet: async (ownerId) => {
      try {
        return await readFile(join(dir, `${ownerId}.txt`), "utf-8");
      } catch {
        return null;
      }
    },
    onSet: async (ownerId, memory) => {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${ownerId}.txt`), memory, "utf-8");
    },
    onDelete: async (ownerId) => {
      try {
        await unlink(join(dir, `${ownerId}.txt`));
      } catch {
        // file may not exist
      }
    },
  },
});
```

## API Reference

### `new Hippocampus(config?)`

Creates a new Hippocampus instance.

```typescript
interface HippocampusConfig {
  storage?: StorageConfig; // Default: { type: 'sqlite' }
  prompt?: string; // Custom condensation prompt
  neurolink?: {
    provider?: string; // LLM provider (e.g. 'google-ai', 'openai')
    model?: string; // Model name (e.g. 'gemini-2.5-flash')
    temperature?: number; // Default: 0.1
  };
  maxWords?: number; // Default: 50
}
```

### `memory.add(ownerId, content, options?): Promise<string>`

Fetches existing memory, condenses it with new content via LLM, and stores the result.

- **ownerId** — Unique identifier (user ID, session ID, etc.)
- **content** — New conversation content to incorporate
- **options.prompt** — Per-call condensation prompt override (must include `{{OLD_MEMORY}}`, `{{NEW_CONTENT}}`, `{{MAX_WORDS}}` placeholders)
- **options.maxWords** — Per-call max words override
- **Returns** — The condensed memory on success. Falls back to the previously stored memory if the LLM call fails. Returns empty string only when storage or NeuroLink cannot be initialized.

When `options` is omitted, the constructor-level `prompt` and `maxWords` are used.

### `memory.get(ownerId): Promise<string | null>`

Retrieves the stored condensed memory for an owner.

- **Returns** — The memory string, or `null` if none exists

### `memory.delete(ownerId): Promise<void>`

Deletes the stored memory for an owner.

### `memory.close(): Promise<void>`

Closes storage connections and releases resources.

## Custom Condensation Prompt

Override the default prompt using the `prompt` config field or the `HC_CONDENSATION_PROMPT` environment variable:

```typescript
const memory = new Hippocampus({
  prompt: `Merge the old memory with new facts. Maximum {{MAX_WORDS}} words.

OLD_MEMORY:
{{OLD_MEMORY}}

NEW_CONTENT:
{{NEW_CONTENT}}

Condensed memory:`,
  maxWords: 100,
});
```

Available placeholders:

| Placeholder       | Replaced With                                              |
| ----------------- | ---------------------------------------------------------- |
| `{{OLD_MEMORY}}`  | The user's existing condensed memory (or `"(none)"`)       |
| `{{NEW_CONTENT}}` | The new conversation content                               |
| `{{MAX_WORDS}}`   | The configured `maxWords` value                            |

### Per-Call Overrides

The `add()` method accepts an optional `options` parameter to override `prompt` and `maxWords` for a specific call. This is useful when a single Hippocampus instance manages different memory scopes that need different condensation strategies.

```typescript
// Personal user memory — uses constructor defaults
await memory.add("user-alice", conversation);

// Org-level policy memory — custom prompt, higher word limit
await memory.add("org-acme", conversation, {
  prompt: `Extract only compliance requirements, security policies, and org decisions.

OLD_MEMORY:
{{OLD_MEMORY}}

NEW_CONTENT:
{{NEW_CONTENT}}

Condensed memory (max {{MAX_WORDS}} words):`,
  maxWords: 100,
});

// Team context — just a higher word limit
await memory.add("team-payments", conversation, { maxWords: 75 });
```

## Usage with NeuroLink

When used through `@juspay/neurolink`, memory is automatically retrieved before each LLM call and stored after:

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    memory: {
      enabled: true,
      storage: {
        type: "custom",
        onGet: async (ownerId) => await myDB.getMemory(ownerId),
        onSet: async (ownerId, memory) => await myDB.saveMemory(ownerId, memory),
        onDelete: async (ownerId) => await myDB.deleteMemory(ownerId),
      },
      neurolink: { provider: "google-ai", model: "gemini-2.5-flash" },
      maxWords: 50,
    },
  },
});

// Memory is automatically managed on each call
const result = await neurolink.generate({
  input: { text: "My name is Alice" },
  context: { userId: "user-123" },
});
```

## Environment Variables

| Variable                 | Default | Description                                                  |
| ------------------------ | ------- | ------------------------------------------------------------ |
| `HC_LOG_LEVEL`           | `off`   | Logging level: `debug`, `info`, `warn`, `error`, or `off`   |
| `HC_CONDENSATION_PROMPT` | —       | Default condensation prompt (overridden by config `prompt`)  |
| `REDIS_HOST`             | —       | Redis host fallback (when not set in config)                 |
| `REDIS_PORT`             | —       | Redis port fallback                                          |
| `REDIS_PASSWORD`         | —       | Redis password fallback                                      |
| `REDIS_DB`               | —       | Redis database fallback                                      |

### Programmatic Log Control

In addition to `HC_LOG_LEVEL`, log levels can be set at runtime:

```typescript
import { logger } from "@juspay/hippocampus";

logger.setLevels(["debug", "info"]); // enable specific levels
logger.setLevels("off");             // disable all logging
```

## Error Handling

Hippocampus is designed to never crash the host application:

- Every public method is wrapped in try-catch
- Errors are logged and safe defaults are returned (`null` for `get()`, empty string for `add()`)
- Storage initialization errors result in the method returning gracefully
- The `CustomStorage` callback shape (`onGet`, `onSet`, `onDelete`) is enforced by TypeScript at compile time

## Type Exports

```typescript
import type {
  StorageType, // 'sqlite' | 'redis' | 's3' | 'custom'
  StorageBackend, // Interface: get, set, delete, close
  StorageConfig, // Union of all storage configs
  SqliteStorageConfig,
  RedisStorageConfig,
  S3StorageConfig,
  CustomStorageConfig,
  HippocampusConfig,
  AddOptions, // Per-call overrides for add(): { prompt?, maxWords? }
} from "@juspay/hippocampus";
```

## License

[MIT](./LICENSE)
