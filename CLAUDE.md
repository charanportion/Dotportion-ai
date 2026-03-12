# Product Intelligence AI — CLAUDE.md

> "Cursor for Product Managers" — AI system that turns customer feedback into product decisions.

## Product Vision

Upload messy customer feedback → AI detects problems → AI suggests features → AI generates PRDs → Chat assistant explains insights.

Target users: Product Managers, Startup Founders, Indie Hackers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 14 App Router |
| UI | shadcn/ui + Tailwind CSS (**black/white only**) |
| Backend | Fastify + Zod validation |
| ORM | Prisma |
| Database | NeonDB (PostgreSQL) + pgvector extension |
| Queue | Redis + BullMQ |
| AI Reasoning | Anthropic Claude (`claude-sonnet-4-6`) |
| AI Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| AI Orchestration | LangGraph JS |
| Auth | Clerk |
| Charts | Recharts |

---

## Monorepo Structure

```
dotportion-new/
├── CLAUDE.md                        ← you are here
├── turbo.json
├── package.json                     ← root pnpm workspace
├── .npmrc
├── apps/
│   ├── web/                         ← Next.js 14 App Router
│   ├── api/                         ← Fastify backend
│   └── worker/                      ← BullMQ workers
├── packages/
│   ├── db/                          ← Prisma schema + client
│   ├── ai/                          ← Prompts + LangGraph agents
│   ├── insight-engine/              ← Core AI pipeline
│   ├── ui/                          ← Shared shadcn components
│   └── typescript-config/           ← tsconfig bases
└── docs/
    ├── todo.md                      ← MASTER TODO LIST
    ├── architecture.md
    ├── design-system.md
    ├── database-schema.md
    ├── api-reference.md
    └── ai-pipeline.md
```

---

## Design System (STRICT)

- **Colors**: ONLY `black`, `white`, `zinc-50` through `zinc-950`. NO other colors.
- **Status indicators**: `zinc-900` bg for active, `zinc-100` bg for inactive
- **Borders**: `border-zinc-200` (cards), `border-zinc-800` (dark elements)
- **Spacing**: 4px base unit — use multiples of 4 only (p-4, p-8, gap-4, etc.)
- **Font**: Inter (sans) for body, monospace for data/numbers/code
- **No gradients**. No colored shadows. `shadow-sm` only.
- **shadcn theme**: CSS variables overridden to black/white in `globals.css`

---

## Key File Paths

| File | Purpose |
|---|---|
| `packages/db/prisma/schema.prisma` | All database models |
| `packages/db/src/index.ts` | Prisma client export |
| `packages/insight-engine/src/pipeline.ts` | Main AI pipeline orchestrator |
| `packages/insight-engine/src/signal-extractor.ts` | Stage 1: Extract signals |
| `packages/insight-engine/src/embeddings.ts` | Stage 2: Generate vectors |
| `packages/insight-engine/src/cluster-engine.ts` | Stage 3: Cluster signals |
| `packages/insight-engine/src/problem-detector.ts` | Stage 4: Detect problems |
| `packages/insight-engine/src/feature-generator.ts` | Stage 5: Suggest features |
| `packages/insight-engine/src/impact-scoring.ts` | Stage 5b: Score features |
| `packages/insight-engine/src/prd-generator.ts` | Stage 6: Generate PRD |
| `packages/ai/src/prompts/` | All versioned LLM prompts |
| `packages/ai/src/agents/chat-agent.ts` | Chat agent with tool calling |
| `apps/api/src/server.ts` | Fastify entry point |
| `apps/api/src/routes/` | API route handlers |
| `apps/api/src/services/` | Business logic (SOLID) |
| `apps/api/src/middleware/auth.ts` | Clerk JWT middleware |
| `apps/worker/src/index.ts` | Worker entry point |
| `apps/worker/src/workers/` | BullMQ worker handlers |
| `apps/web/app/` | Next.js App Router pages |
| `packages/ui/src/components/` | Shared UI components |

---

## Data Flow

```
User uploads feedback (CSV/text)
    ↓
POST /api/signals/upload
    ↓
POST /api/analysis/run → BullMQ queue
    ↓
Worker: signal-processing
    ├─ extractSignals() → Claude
    └─ generateEmbeddings() → OpenAI
    ↓
Worker: clustering
    └─ clusterSignals() → cosine similarity
    ↓
Worker: problem-detection
    └─ detectProblems() → Claude
    ↓
Worker: feature-generation
    ├─ generateFeatures() → Claude
    └─ scoreFeatures() → RICE formula
    ↓
Stored in PostgreSQL (NeonDB)
    ↓
GET /api/projects/:id/insights
    ↓
Frontend dashboard shows: problems + features + scores
```

---

## Environment Variables

```
# Database
DATABASE_URL=postgresql://...@neon.tech/...

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Queue
REDIS_URL=redis://...

# App
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## SOLID Principles Applied

- **Single Responsibility**: Each insight-engine module does ONE thing
- **Open/Closed**: Pipeline stages are pluggable — add new stages without modifying existing
- **Interface Segregation**: Services expose minimal interfaces via TypeScript types
- **Dependency Inversion**: Pipeline modules receive AI clients as injected dependencies

---

## Security Rules

- All API routes require Clerk JWT verification (except health check)
- Never expose raw DB IDs in URLs — always validate ownership
- Zod validation on ALL API inputs
- Environment variables never in client bundle (no `NEXT_PUBLIC_` for secrets)
- Row-level ownership check: every query scoped to `userId`

---

## Reference Docs

- [Master Todo](docs/todo.md)
- [Architecture](docs/architecture.md)
- [Design System](docs/design-system.md)
- [Database Schema](docs/database-schema.md)
- [API Reference](docs/api-reference.md)
- [AI Pipeline](docs/ai-pipeline.md)
