# NeuroStore

A self-hosted memory engine for AI agents and applications. Store, search, and recall memories with semantic understanding, temporal awareness, and associative linking.

## Features

- **Hybrid Search** — Combines vector similarity, BM25 keyword matching, recency, and signal boosting
- **Temporal Facts** — Track facts that change over time with automatic expiration and time-travel queries
- **Associative Memory** — Synapses link related memories for contextual recall
- **Multi-tenant** — Owner-based isolation for multiple users or agents
- **Pluggable Embeddings** — Native (zero deps), OpenAI, or Ollama
- **Dual Database Support** — PostgreSQL + pgvector for production, SQLite for development

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector (production) or SQLite (development)

### Installation

```bash
git clone https://github.com/your-org/neurostore.git
cd neurostore/memory-server
npm install
```

### Run with SQLite (zero config)

```bash
npm run dev
```

Server starts at `http://localhost:3000`. Data stored in `./data/neurostore.sqlite`.

### Run with PostgreSQL + pgvector

```bash
# Set environment variables
export NS_PG_HOST=localhost
export NS_PG_PORT=5432
export NS_PG_USER=postgres
export NS_PG_PASSWORD=yourpassword
export NS_PG_DATABASE=neurostore

npm run dev
```

### Verify

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"sqlite","timestamp":"..."}
```

## Usage

### Store a Memory

```bash
curl -X POST http://localhost:3000/api/engrams \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-123",
    "content": "I prefer dark mode in VS Code with the GitHub Dark theme",
    "tags": ["preference", "editor"]
  }'
```

### Search Memories

```bash
curl -X POST http://localhost:3000/api/engrams/search \
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
curl -X POST http://localhost:3000/api/chronicles \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "user-123",
    "entity": "user-123",
    "attribute": "phone",
    "value": "iPhone 16 Pro"
  }'

# Query current fact
curl "http://localhost:3000/api/chronicles/current?ownerId=user-123&entity=user-123&attribute=phone"

# View full timeline
curl "http://localhost:3000/api/chronicles/timeline?ownerId=user-123&entity=user-123"
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NS_PORT` | `3000` | Server port |
| `NS_HOST` | `0.0.0.0` | Server host |
| `NS_API_KEY` | (none) | API key for authentication (optional) |
| `NS_PG_HOST` | (none) | PostgreSQL host (enables Postgres mode) |
| `NS_PG_PORT` | `5432` | PostgreSQL port |
| `NS_PG_DATABASE` | `neurostore` | PostgreSQL database name |
| `NS_PG_USER` | `postgres` | PostgreSQL user |
| `NS_PG_PASSWORD` | (none) | PostgreSQL password |
| `NS_SQLITE_PATH` | `./data/neurostore.sqlite` | SQLite file path |
| `NS_EMBEDDER_PROVIDER` | `native` | Embedding provider: `native`, `openai`, `ollama` |
| `NS_OPENAI_API_KEY` | (none) | OpenAI API key (if using openai provider) |
| `NS_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |

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

See [docs/database-schema.md](docs/database-schema.md) for complete schema documentation.

## Search Algorithm

NeuroStore uses a multi-signal retrieval pipeline:

```
finalScore = (0.30 × vectorScore)      // semantic similarity
           + (0.30 × keywordScore)     // BM25 keyword match
           + (0.10 × recencyBoost)     // recent access bonus
           + (0.15 × signalBoost)      // importance score
           + (0.15 × synapseBoost)     // associative connections
```

1. **Vector Search** — Find semantically similar memories using cosine similarity
2. **BM25 Keyword Search** — Score candidates by exact word matches
3. **Normalize** — Min-max normalize both score sets to [0, 1]
4. **Synapse Expansion** — BFS traversal from top seeds, depth 2, weight decay 0.8×
5. **Combine Scores** — Weighted sum of all signals
6. **Post-Retrieval** — Reinforce accessed memories and synapse paths

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api      # API integration tests
npm run test:temporal # Chronicle/temporal tests
npm run test:sdk      # SDK integration tests
```

## Docker

```bash
# Build
docker build -t neurostore .

# Run with SQLite
docker run -p 3000:3000 neurostore

# Run with PostgreSQL
docker run -p 3000:3000 \
  -e NS_PG_HOST=host.docker.internal \
  -e NS_PG_DATABASE=neurostore \
  -e NS_PG_USER=postgres \
  -e NS_PG_PASSWORD=yourpassword \
  neurostore
```

## SDK

A TypeScript SDK is available at `../memory-sdk`:

```typescript
import { NeuroStoreClient } from '@neurostore/sdk';

const client = new NeuroStoreClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'your-api-key'  // optional
});

// Store memory
await client.addMemory({
  ownerId: 'user-123',
  content: 'TypeScript is a typed superset of JavaScript'
});

// Search
const results = await client.search({
  ownerId: 'user-123',
  query: 'programming languages',
  limit: 10
});
```

## Project Structure

```
memory-server/
├── src/
│   ├── api/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth, validation, errors
│   │   └── routes/         # Route definitions
│   ├── db/
│   │   ├── postgres.store.ts
│   │   ├── sqlite.store.ts
│   │   └── resolve.ts      # Auto-detect database
│   ├── providers/
│   │   ├── native-embedder.ts
│   │   ├── openai-embedder.ts
│   │   └── ollama-embedder.ts
│   ├── retrieval/
│   │   ├── bm25.ts         # Keyword scoring
│   │   └── pipeline.ts     # Search orchestration
│   ├── services/
│   │   ├── memory.service.ts
│   │   ├── temporal.service.ts
│   │   ├── decay.service.ts
│   │   └── association.service.ts
│   ├── schemas/            # Zod validation
│   ├── types/              # TypeScript interfaces
│   ├── utils/              # Helpers
│   └── index.ts            # Entry point
├── tests/
├── docs/
├── scripts/
└── package.json
```

## License

MIT
