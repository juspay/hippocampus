# Hippocampus

A self-hosted memory engine for AI agents and applications. Store, search, and recall memories with semantic understanding, temporal awareness, and associative linking.

## Features

- **Hybrid Search** — Combines vector similarity, BM25 keyword matching, recency, and signal boosting
- **Temporal Facts** — Track facts that change over time with automatic expiration and time-travel queries
- **Associative Memory** — Synapses link related memories for contextual recall
- **Multi-tenant** — Owner-based isolation for multiple users or agents
- **Pluggable Embeddings** — Native (zero deps), OpenAI, or Ollama
- **Dual Database Support** — PostgreSQL + pgvector for production, SQLite for development

## Packages

| Package | Description |
|---------|-------------|
| [server](./server) | Self-hosted backend memory engine (Express + TypeScript) |
| [sdk](./sdk) | TypeScript client SDK (zero runtime deps) — `@juspay/hippocampus` on npm |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10+
- PostgreSQL 14+ with pgvector (production) or SQLite (development)

### Server Installation

```bash
git clone https://github.com/juspay/hippocampus.git
cd hippocampus/server
pnpm install
```

### Run with SQLite (zero config)

```bash
pnpm run dev
```

Server starts at `http://localhost:4477`. Data stored in `./data/hippocampus.sqlite`.

### Run with PostgreSQL + pgvector

```bash
export HC_PG_HOST=localhost
export HC_PG_PORT=5432
export HC_PG_USER=postgres
export HC_PG_PASSWORD=yourpassword
export HC_PG_DATABASE=hippocampus

pnpm run dev
```

### Verify

```bash
curl http://localhost:4477/api/health
# {"status":"ok","database":"sqlite","timestamp":"..."}
```

## SDK Installation

```bash
pnpm add @juspay/hippocampus
```

### Usage

```typescript
import { Hippocampus } from '@juspay/hippocampus';

const hippocampus = new Hippocampus({
  baseUrl: 'http://localhost:4477',
  apiKey: 'your-api-key'  // optional
});

// Store memory
await hippocampus.addMemory({
  ownerId: 'user-123',
  content: 'TypeScript is a typed superset of JavaScript'
});

// Search
const results = await hippocampus.search({
  ownerId: 'user-123',
  query: 'programming languages',
  limit: 10
});

// Record temporal fact
await hippocampus.recordChronicle({
  ownerId: 'user-123',
  entity: 'user-123',
  attribute: 'phone',
  value: 'iPhone 16 Pro'
});

// Get current fact
const fact = await hippocampus.getCurrentFact('user-123', 'user-123', 'phone');
```

### Logging

The SDK includes built-in logging controlled via the `HC_LOG_LEVEL` environment variable. Logging is **off by default**.

```bash
# Enable all log levels
HC_LOG_LEVEL=debug,info,warn,error

# Enable only errors and warnings
HC_LOG_LEVEL=warn,error

# Disable logging (default)
HC_LOG_LEVEL=off
```

You can also control logging programmatically:

```typescript
import { logger } from '@juspay/hippocampus';

// Enable specific levels
logger.setLevels(['info', 'error']);

// Disable all logging
logger.setLevels('off');
```

Log output format:
```
[2025-01-15T10:30:00.000Z] [HIPPOCAMPUS@0.1.0] [INFO] Adding memory {"ownerId":"user-123","strand":"general"}
[2025-01-15T10:30:00.050Z] [HIPPOCAMPUS@0.1.0] [INFO] Memory added {"count":1}
```

## REST API

### Store a Memory

```bash
curl -X POST http://localhost:4477/api/engrams \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-123",
    "content": "I prefer dark mode in VS Code with the GitHub Dark theme",
    "tags": ["preference", "editor"]
  }'
```

### Search Memories

```bash
curl -X POST http://localhost:4477/api/engrams/search \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-123",
    "query": "what editor theme do I use",
    "limit": 5
  }'
```

Response includes retrieval traces showing how each result was scored:

```json
{
  "hits": [
    {
      "engram": {
        "id": "...",
        "content": "I prefer dark mode in VS Code with the GitHub Dark theme",
        "signal": 0.85
      },
      "trace": {
        "vectorScore": 0.82,
        "keywordScore": 0.65,
        "recencyBoost": 0.10,
        "signalBoost": 0.13,
        "synapseBoost": 0,
        "finalScore": 0.71
      }
    }
  ],
  "total": 1,
  "took": 12
}
```

### Record Temporal Facts

```bash
# Record current phone
curl -X POST http://localhost:4477/api/chronicles \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-123",
    "entity": "user-123",
    "attribute": "phone",
    "value": "iPhone 16 Pro"
  }'

# Query current fact
curl "http://localhost:4477/api/chronicles/current?ownerId=user-123&entity=user-123&attribute=phone"

# View full timeline
curl "http://localhost:4477/api/chronicles/timeline?ownerId=user-123&entity=user-123"
```

## Configuration

Copy `.env.example` to `.env` in the server directory:

```bash
cd server
cp .env.example .env
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HC_PORT` | `4477` | Server port |
| `HC_HOST` | `0.0.0.0` | Server host |
| `HC_API_KEY` | (none) | API key for authentication (optional) |
| `HC_PG_HOST` | (none) | PostgreSQL host (enables Postgres mode) |
| `HC_PG_PORT` | `5432` | PostgreSQL port |
| `HC_PG_DATABASE` | `hippocampus` | PostgreSQL database name |
| `HC_PG_USER` | `postgres` | PostgreSQL user |
| `HC_PG_PASSWORD` | (none) | PostgreSQL password |
| `HC_SQLITE_PATH` | `./data/hippocampus.sqlite` | SQLite file path |
| `HC_EMBEDDER_PROVIDER` | `native` | Embedding provider: `native`, `openai`, `ollama` |
| `HC_OPENAI_API_KEY` | (none) | OpenAI API key (if using openai provider) |
| `HC_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `HC_LOG_LEVEL` | `off` | SDK/Server log levels: `debug,info,warn,error` or `off` |

### Embedding Providers

| Provider | Dimensions | Semantic Quality | Dependencies |
|----------|------------|------------------|--------------|
| `native` | 384 | None (hash-based) | Zero |
| `openai` | 1536 | High | OpenAI API key |
| `ollama` | 768 | Good | Local Ollama server |

The native embedder is suitable for development and testing. Use OpenAI or Ollama for production semantic search.

## API Reference

### Engrams (Memories)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/engrams` | Create memory |
| `GET` | `/api/engrams` | List memories |
| `GET` | `/api/engrams/:id` | Get memory |
| `PATCH` | `/api/engrams/:id` | Update memory |
| `DELETE` | `/api/engrams/:id` | Delete memory |
| `POST` | `/api/engrams/search` | Hybrid search |
| `POST` | `/api/engrams/:id/reinforce` | Boost signal |

### Chronicles (Temporal Facts)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chronicles` | Record fact |
| `GET` | `/api/chronicles` | Query facts |
| `GET` | `/api/chronicles/current` | Get current fact |
| `GET` | `/api/chronicles/timeline` | Entity timeline |
| `GET` | `/api/chronicles/:id` | Get fact |
| `PATCH` | `/api/chronicles/:id` | Update certainty |
| `DELETE` | `/api/chronicles/:id` | Expire fact |
| `GET` | `/api/chronicles/:id/related` | Get related facts |

### Nexuses (Fact Relationships)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/nexuses` | Link chronicles |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/status` | System stats |
| `POST` | `/api/decay/run` | Trigger decay cycle |

## Data Model

Hippocampus uses four core data structures:

### Engrams

Core memory units with semantic embeddings, importance signals, and decay rates.

```typescript
{
  id: string;
  ownerId: string;
  content: string;
  strand: 'factual' | 'experiential' | 'procedural' | 'preferential' | 'relational' | 'general';
  tags: string[];
  signal: number;      // 0-1, importance score
  pulseRate: number;   // 0-1, decay speed
  accessCount: number;
}
```

### Chronicles

Temporal facts with validity periods, supporting time-travel queries.

```typescript
{
  id: string;
  ownerId: string;
  entity: string;      // what the fact is about
  attribute: string;   // which property
  value: string;       // the value
  certainty: number;   // 0-1, confidence level
  effectiveFrom: Date;
  effectiveUntil: Date | null;  // null = current
}
```

### Synapses

Weighted associations between engrams for associative recall.

### Nexuses

Relationships between chronicles (superseded_by, caused_by, related_to).

See [server/docs/database-schema.md](./server/docs/database-schema.md) for complete schema documentation.

## Search Algorithm

Hippocampus uses a multi-signal retrieval pipeline:

```
finalScore = (0.30 x vectorScore)      // semantic similarity
           + (0.30 x keywordScore)     // BM25 keyword match
           + (0.10 x recencyBoost)     // recent access bonus
           + (0.15 x signalBoost)      // importance score
           + (0.15 x synapseBoost)     // associative connections
```

1. **Vector Search** — Find semantically similar memories using cosine similarity
2. **BM25 Keyword Search** — Score candidates by exact word matches
3. **Normalize** — Min-max normalize both score sets to [0, 1]
4. **Synapse Expansion** — BFS traversal from top seeds, depth 2, weight decay 0.8x
5. **Combine Scores** — Weighted sum of all signals
6. **Post-Retrieval** — Reinforce accessed memories and synapse paths

## Testing

```bash
cd server

# Run all tests
pnpm test

# Run specific test suites
pnpm run test:api      # API integration tests
pnpm run test:temporal # Chronicle/temporal tests
pnpm run test:sdk      # SDK integration tests
```

## Docker

```bash
cd server

# Build
docker build -t hippocampus .

# Run with SQLite
docker run -p 4477:4477 hippocampus

# Run with PostgreSQL
docker run -p 4477:4477 \
  -e HC_PG_HOST=host.docker.internal \
  -e HC_PG_DATABASE=hippocampus \
  -e HC_PG_USER=postgres \
  -e HC_PG_PASSWORD=yourpassword \
  hippocampus
```

## Project Structure

```
hippocampus/
├── server/                  # Backend server
│   ├── src/
│   │   ├── api/             # Controllers, middleware, routes
│   │   ├── db/              # Postgres + SQLite stores
│   │   ├── providers/       # Embedding providers
│   │   ├── retrieval/       # Search pipeline, BM25
│   │   ├── services/        # Business logic
│   │   ├── schemas/         # Zod validation
│   │   ├── types/           # TypeScript interfaces
│   │   └── utils/           # Helpers (logger, crypto, math, text)
│   ├── tests/
│   ├── docs/
│   └── package.json
│
├── sdk/                     # TypeScript client SDK (@juspay/hippocampus)
│   ├── src/
│   │   ├── client.ts        # Hippocampus class
│   │   ├── types.ts         # Request/response types
│   │   ├── errors.ts        # HippocampusError
│   │   └── logger.ts        # Configurable logger
│   └── package.json
│
└── README.md
```

## License

MIT
