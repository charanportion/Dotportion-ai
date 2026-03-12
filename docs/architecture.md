# System Architecture

## Overview

Product Intelligence AI is a multi-layer system that processes user feedback through an AI pipeline to generate product insights.

```
┌─────────────────────────────────────────────────────┐
│                  Next.js Frontend                   │
│         /projects  /insights  /features  /chat      │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + Clerk JWT
┌──────────────────────▼──────────────────────────────┐
│                  Fastify API                        │
│         Routes → Services → Prisma Client           │
└──────┬───────────────────────────────┬──────────────┘
       │ Enqueue jobs                  │ Query results
┌──────▼──────┐               ┌────────▼───────────────┐
│  BullMQ     │               │  PostgreSQL (NeonDB)   │
│  + Redis    │               │  + pgvector extension  │
└──────┬──────┘               └────────────────────────┘
       │ Process jobs                  ▲
┌──────▼──────────────────────────────┴──────────────┐
│                BullMQ Workers                      │
│  signal-processor → clustering → problems → features│
└──────┬──────────────────────────────────────────────┘
       │ Uses
┌──────▼──────────────────────────────────────────────┐
│              packages/insight-engine                │
│  signalExtractor → embeddings → clusters → problems │
│  → features → impactScoring → prdGenerator          │
└──────┬──────────────────────────────────────────────┘
       │ Uses
┌──────▼──────────────────────────────────────────────┐
│                  packages/ai                        │
│  Claude (reasoning) + OpenAI (embeddings)           │
│  LangGraph (chat agent orchestration)               │
└─────────────────────────────────────────────────────┘
```

---

## App Responsibilities

### apps/web (Next.js 14)
- User interface: dashboard, upload, insights, chat
- Auth via Clerk (ClerkProvider)
- Calls apps/api via authenticated fetch
- SWR for data fetching + polling

### apps/api (Fastify)
- REST API for all frontend operations
- Validates inputs with Zod
- Authenticates with Clerk JWT
- Business logic in services/ (not routes)
- Enqueues analysis jobs to Redis/BullMQ
- Never runs AI processing directly

### apps/worker (BullMQ)
- Processes AI jobs asynchronously
- Imports from packages/insight-engine
- One worker per pipeline stage
- Updates DB with results as jobs complete

---

## Package Responsibilities

### packages/db
- Single source of truth for Prisma schema
- Exports typed Prisma client
- Handles all DB migrations
- No business logic — pure data layer

### packages/insight-engine
- Core AI processing logic
- Stateless functions — no direct DB writes (takes prisma client as dep)
- Each module exports pure functions
- Pipeline orchestrator calls them in sequence

### packages/ai
- AI client setup (Claude + OpenAI)
- All LLM prompts (versioned, tested)
- Chat agent with LangGraph
- No DB access

### packages/ui
- Shared shadcn/ui components
- Tailwind config (black/white theme)
- Used by apps/web only

### packages/typescript-config
- Shared tsconfig bases
- Used by all packages

---

## Data Flow: Feedback Upload

```
1. User pastes/uploads feedback
2. POST /api/signals/upload
   - Zod validation
   - Clerk auth check
   - Create Signal records in DB (content only, no embedding yet)
   - Return signalIds[]

3. POST /api/analysis/run
   - Enqueue job: { projectId, signalIds[] }
   - Return jobId

4. Worker: signal-processor
   FOR each signal:
   - extractSignal(content) → Claude → { problem, feature_area, sentiment, severity }
   - generateEmbedding(content) → OpenAI → vector[1536]
   - Update Signal record with extracted data + embedding

5. Worker: clustering
   - Load all signals with embeddings
   - Group by cosine similarity (threshold: 0.8)
   - Name each cluster via Claude
   - Create Cluster records + update Signal.clusterId

6. Worker: problem-detector
   FOR each cluster:
   - detectProblem(cluster.signals) → Claude → { title, description, severity }
   - Create Problem record linked to cluster

7. Worker: feature-generator
   FOR each problem:
   - generateFeature(problem) → Claude → { name, description, impact }
   - scoreFeature(problem, feature) → RICE formula → priorityScore
   - Create Feature record linked to problem

8. Analysis complete — frontend polling detects completion
```

---

## Data Flow: Chat

```
1. User sends message in /assistant
2. POST /api/chat { projectId, message }

3. Chat service:
   - Load chat history from DB
   - Pass to LangGraph chat agent

4. LangGraph agent:
   - Detects intent
   - Selects tool (getTopProblems / getFeatureSuggestions / generatePRD)
   - Executes tool against DB
   - Formats response with real data

5. Store ChatMessage (user + assistant) in DB
6. Return formatted response to frontend
```

---

## Queue Architecture

```
Queues (BullMQ + Redis):
├── signal-processing       priority: high
├── clustering              priority: medium
├── problem-detection       priority: medium
└── feature-generation      priority: low

Job chaining (each job triggers next):
signal-processing → (on complete) → clustering
clustering → (on complete) → problem-detection
problem-detection → (on complete) → feature-generation
```

---

## Security Architecture

```
Request lifecycle:
  HTTP Request
      ↓
  Fastify route
      ↓
  auth middleware (verifyClerkJWT)
      ↓
  Zod schema validation
      ↓
  Service layer (ownership check: userId matches)
      ↓
  Prisma query (scoped to userId)
      ↓
  Response
```

Rules:
- No unauthenticated routes (except GET /health)
- Every DB query includes `WHERE userId = authUserId`
- API keys only in environment variables
- No secrets in Next.js client bundle

---

## Deployment Targets

| App | Platform |
|---|---|
| apps/web | Vercel |
| apps/api | Google Cloud Run |
| apps/worker | Google Cloud Run |
| Database | NeonDB (serverless PostgreSQL) |
| Redis | Upstash Redis (serverless) |
