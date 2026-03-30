# Hippocampus

A memory system for AI agents and applications, available as two independent packages:

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [server](./server) | `@juspay/hippocampus-server` | Self-hosted memory engine with hybrid search, temporal facts, and associative linking |
| [sdk](./sdk) | `@juspay/hippocampus` | Embedded memory SDK — LLM-powered condensed key-value memory |

These are **independent packages**. The SDK does not call the server — it is a standalone embedded memory engine that uses `@juspay/neurolink` for LLM condensation.

---

## Server

A self-hosted backend memory engine (Express + TypeScript) with:

- **Hybrid Search** — Combines vector similarity, BM25 keyword matching, recency, and signal boosting
- **Temporal Facts** — Track facts that change over time with automatic expiration and time-travel queries
- **Associative Memory** — Synapses link related memories for contextual recall
- **Multi-tenant** — Owner-based isolation for multiple users or agents
- **Pluggable Embeddings** — Native (zero deps), OpenAI, or Ollama
- **Dual Database Support** — PostgreSQL + pgvector for production, SQLite for development

### Quick Start

```bash
cd server
pnpm install
pnpm run dev
```

Server starts at `http://localhost:4477`. Data stored in `./data/hippocampus.sqlite`.

```bash
curl http://localhost:4477/api/health
# {"status":"ok","database":"sqlite","timestamp":"..."}
```

### PostgreSQL + pgvector

```bash
export HC_PG_HOST=localhost
export HC_PG_PORT=5432
export HC_PG_USER=postgres
export HC_PG_PASSWORD=yourpassword
export HC_PG_DATABASE=hippocampus

pnpm run dev
```

### REST API

```bash
# Store a memory
curl -X POST http://localhost:4477/api/engrams \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "user-123", "content": "I prefer dark mode", "tags": ["preference"]}'

# Search memories
curl -X POST http://localhost:4477/api/engrams/search \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "user-123", "query": "what theme do I use", "limit": 5}'

# Record a temporal fact
curl -X POST http://localhost:4477/api/chronicles \
  -H "Content-Type: application/json" \
  -d '{"ownerId": "user-123", "entity": "user-123", "attribute": "phone", "value": "iPhone 16 Pro"}'
```

### API Endpoints

| Group | Endpoints | Description |
|-------|-----------|-------------|
| **Engrams** | `POST/GET/PATCH/DELETE /api/engrams`, `POST /api/engrams/search` | Memory storage and hybrid search |
| **Chronicles** | `POST/GET /api/chronicles`, `GET /api/chronicles/current`, `GET /api/chronicles/timeline` | Temporal facts with time-travel |
| **Nexuses** | `POST /api/nexuses` | Chronicle relationships |
| **System** | `GET /api/health`, `GET /api/status`, `POST /api/decay/run` | Health, stats, and maintenance |

### Search Algorithm

```
finalScore = (0.30 x vectorScore)      // semantic similarity
           + (0.30 x keywordScore)     // BM25 keyword match
           + (0.10 x recencyBoost)     // recent access bonus
           + (0.15 x signalBoost)      // importance score
           + (0.15 x synapseBoost)     // associative connections
```

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HC_PORT` | `4477` | Server port |
| `HC_HOST` | `0.0.0.0` | Server host |
| `HC_API_KEY` | (none) | API key for authentication |
| `HC_PG_HOST` | (none) | PostgreSQL host (enables Postgres mode) |
| `HC_PG_DATABASE` | `hippocampus` | PostgreSQL database name |
| `HC_SQLITE_PATH` | `./data/hippocampus.sqlite` | SQLite file path |
| `HC_EMBEDDER_PROVIDER` | `native` | Embedding provider: `native`, `openai`, `ollama` |
| `HC_LOG_LEVEL` | `off` | Log levels: `debug,info,warn,error` or `off` |

### Docker

```bash
cd server
docker build -t hippocampus .
docker run -p 4477:4477 hippocampus
```

---

## SDK

An embedded memory SDK (`@juspay/hippocampus`) that maintains a condensed, per-user memory summary using LLM-powered condensation. No server required — storage is pluggable (SQLite, Redis, S3, or custom).

### Quick Start

```bash
pnpm add @juspay/hippocampus
```

```typescript
import { Hippocampus } from '@juspay/hippocampus';

const memory = new Hippocampus({
  storage: { type: 'sqlite' },
  neurolink: { provider: 'google-ai', model: 'gemini-2.5-flash' },
  maxWords: 50,
});

// Add memory — LLM condenses old + new automatically
await memory.add('user-123', 'User: My name is Alice\nAssistant: Nice to meet you!');

// Retrieve
const summary = await memory.get('user-123');
// => "User's name is Alice."

// Per-call prompt override for different memory scopes
await memory.add('org-acme', conversation, {
  prompt: 'Extract only compliance policies...\n{{OLD_MEMORY}}\n{{NEW_CONTENT}}',
  maxWords: 100,
});

await memory.close();
```

See [sdk/README.md](./sdk/README.md) for full documentation including storage backends, API reference, and NeuroLink integration.

---

## Project Structure

```
hippocampus/
├── server/                  # Self-hosted memory engine
│   ├── src/
│   │   ├── api/             # Controllers, middleware, routes
│   │   ├── db/              # Postgres + SQLite stores
│   │   ├── providers/       # Embedding providers
│   │   ├── retrieval/       # Search pipeline, BM25
│   │   ├── services/        # Business logic
│   │   ├── schemas/         # Zod validation
│   │   └── types/           # TypeScript interfaces
│   ├── tests/
│   └── docs/
│
├── sdk/                     # Embedded memory SDK (@juspay/hippocampus)
│   ├── src/
│   │   ├── client.ts        # Hippocampus class
│   │   ├── types.ts         # Type definitions
│   │   ├── errors.ts        # HippocampusError
│   │   ├── logger.ts        # Configurable logger
│   │   └── storage/         # Storage backends (SQLite, Redis, S3, Custom)
│   └── package.json
│
└── README.md
```

## Testing

```bash
cd server
pnpm test              # all tests
pnpm run test:api      # API integration tests
pnpm run test:temporal # Chronicle/temporal tests
```

## License

MIT
