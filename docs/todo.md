# Master Implementation Todo

> Product Intelligence AI — "Cursor for Product Managers"
> Check items off as they are completed. This is the single source of truth.

---

## Phase 0: Context Files ✅

- [x] Write `CLAUDE.md`
- [x] Write `docs/todo.md`
- [x] Write `docs/architecture.md`
- [x] Write `docs/design-system.md`
- [x] Write `docs/database-schema.md`
- [x] Write `docs/api-reference.md`
- [x] Write `docs/ai-pipeline.md`
- [x] Write `memory/MEMORY.md`
- [x] Write `memory/project-context.md`

---

## Phase 1: Monorepo Foundation

### Root Setup
- [ ] Create `package.json` (pnpm workspaces: apps/*, packages/*)
- [ ] Create `turbo.json` (build, dev, lint pipelines)
- [ ] Create `.npmrc` (shameful-hoist=true)
- [ ] Create root `.gitignore`
- [ ] Create root `.env.example`

### packages/typescript-config
- [ ] Create `package.json`
- [ ] Create `base.json` (strict TypeScript config)
- [ ] Create `nextjs.json` (Next.js tsconfig)
- [ ] Create `node.json` (Node.js tsconfig for API/worker)

### packages/ui
- [ ] Create `package.json`
- [ ] Initialize Tailwind CSS config (black/white theme)
- [ ] Create `globals.css` (shadcn CSS variables, B&W only)
- [ ] Add shadcn/ui components: Button, Card, Input, Textarea, Badge, Dialog, Tabs, Progress, Separator
- [ ] Create `components.json` for shadcn
- [ ] Export all components from `src/index.ts`

### packages/db
- [ ] Create `package.json`
- [ ] Create `prisma/schema.prisma` (full schema — see database-schema.md)
- [ ] Enable pgvector extension in schema
- [ ] Create `src/index.ts` (Prisma client export)
- [ ] Run `prisma generate`
- [ ] Run `prisma migrate dev --name init`
- [ ] Verify NeonDB connection

---

## Phase 2: Backend API (apps/api)

### Foundation
- [ ] Create `package.json`
- [ ] Create `tsconfig.json`
- [ ] Install: fastify, @fastify/cors, @fastify/multipart, zod, @clerk/fastify
- [ ] Create `src/server.ts` (Fastify instance + register plugins)
- [ ] Create `src/index.ts` (start server)
- [ ] Create `src/env.ts` (Zod env validation)
- [ ] Create `src/middleware/auth.ts` (Clerk JWT verification)
- [ ] Create `src/lib/prisma.ts` (singleton Prisma client)
- [ ] Create `src/lib/redis.ts` (ioredis client)

### Services (Business Logic)
- [ ] `src/services/project.service.ts` — CRUD projects
- [ ] `src/services/signal.service.ts` — upload + query signals
- [ ] `src/services/analysis.service.ts` — enqueue analysis job
- [ ] `src/services/insight.service.ts` — query problems/features
- [ ] `src/services/prd.service.ts` — generate/fetch PRDs
- [ ] `src/services/chat.service.ts` — chat message + tool routing

### Routes
- [ ] `src/routes/projects.ts` — POST /projects, GET /projects, GET /projects/:id, DELETE /projects/:id
- [ ] `src/routes/signals.ts` — POST /signals/upload, GET /projects/:id/signals
- [ ] `src/routes/analysis.ts` — POST /analysis/run, GET /analysis/:jobId/status
- [ ] `src/routes/insights.ts` — GET /projects/:id/problems, GET /projects/:id/features
- [ ] `src/routes/features.ts` — GET /features/:id, POST /features/:id/prd
- [ ] `src/routes/chat.ts` — POST /chat
- [ ] `src/routes/health.ts` — GET /health

### Validation Schemas
- [ ] `src/schemas/project.schema.ts`
- [ ] `src/schemas/signal.schema.ts`
- [ ] `src/schemas/chat.schema.ts`

---

## Phase 3: Worker System (apps/worker)

### Foundation
- [ ] Create `package.json`
- [ ] Create `tsconfig.json`
- [ ] Install: bullmq, ioredis
- [ ] Create `src/index.ts` (start all workers)
- [ ] Create `src/lib/queue.ts` (queue definitions)
- [ ] Create `src/lib/redis.ts` (Redis connection)

### Workers
- [ ] `src/workers/signal-processor.ts` — extract signals + generate embeddings
- [ ] `src/workers/clustering.ts` — cluster signals by cosine similarity
- [ ] `src/workers/problem-detector.ts` — detect problems from clusters
- [ ] `src/workers/feature-generator.ts` — generate + score features

### Queue Jobs
- [ ] Define job types in `src/types/jobs.ts`
- [ ] Job chaining: signal-processor → clustering → problem-detector → feature-generator

---

## Phase 4: Insight Engine (packages/insight-engine)

### Foundation
- [ ] Create `package.json`
- [ ] Create `tsconfig.json`
- [ ] Create `src/types.ts` (all shared types)

### Pipeline Modules
- [ ] `src/signal-extractor.ts`
  - [ ] extractSignal(text) → { problem, feature_area, sentiment, severity }
  - [ ] extractBatch(texts[]) → Signal[]
- [ ] `src/embeddings.ts`
  - [ ] generateEmbedding(text) → number[]
  - [ ] generateEmbeddings(texts[]) → number[][]
  - [ ] storeEmbedding(signalId, vector) → void
- [ ] `src/cluster-engine.ts`
  - [ ] cosineSimilarity(a, b) → number
  - [ ] clusterSignals(signals) → Cluster[]
  - [ ] nameClusters(clusters) → Claude names each cluster
- [ ] `src/problem-detector.ts`
  - [ ] detectProblem(cluster) → { title, description, severity, reasoning }
  - [ ] detectProblems(clusters[]) → Problem[]
- [ ] `src/feature-generator.ts`
  - [ ] generateFeature(problem) → { name, description, expected_impact, implementation_idea }
  - [ ] generateFeatures(problems[]) → Feature[]
- [ ] `src/impact-scoring.ts`
  - [ ] scoreFeature(problem, feature) → { impact, confidence, effort, priority }
  - [ ] Formula: priority = (severity × evidenceCount × confidence) / effort
- [ ] `src/prd-generator.ts`
  - [ ] generatePRD(feature, problem) → PRD markdown string
  - [ ] parsePRDToTasks(prd) → Task[]
- [ ] `src/pipeline.ts`
  - [ ] runPipeline(projectId) → void (orchestrates all stages)
  - [ ] getPipelineStatus(projectId) → PipelineStatus

---

## Phase 5: AI Package (packages/ai)

### Foundation
- [ ] Create `package.json`
- [ ] Install: @anthropic-ai/sdk, openai, @langchain/langgraph

### Prompts (versioned)
- [ ] `src/prompts/signal-extractor.v1.ts`
- [ ] `src/prompts/problem-detector.v1.ts`
- [ ] `src/prompts/feature-generator.v1.ts`
- [ ] `src/prompts/impact-estimator.v1.ts`
- [ ] `src/prompts/prd-generator.v1.ts`
- [ ] `src/prompts/chat-agent.v1.ts`
- [ ] `src/prompts/cluster-namer.v1.ts`

### AI Clients
- [ ] `src/claude.ts` — Anthropic client singleton
- [ ] `src/openai.ts` — OpenAI client singleton

### Chat Agent (LangGraph)
- [ ] `src/agents/chat-agent.ts`
  - [ ] Define tools: getTopProblems, getFeatureSuggestions, generatePRD, getProblemEvidence
  - [ ] Build LangGraph workflow: message → intent → tool → response
  - [ ] Conversation history support (ChatMessage)

---

## Phase 6: Frontend (apps/web)

### Foundation
- [ ] Create `package.json`
- [ ] Create `next.config.js`
- [ ] Create `tsconfig.json`
- [ ] Create `tailwind.config.ts` (B&W theme, import from packages/ui)
- [ ] Create `src/app/globals.css` (shadcn CSS vars + B&W override)
- [ ] Install: @clerk/nextjs, swr, recharts, react-dropzone

### Layout + Auth
- [ ] `src/app/layout.tsx` — ClerkProvider + font + globals
- [ ] `src/app/(auth)/sign-in/page.tsx`
- [ ] `src/app/(auth)/sign-up/page.tsx`
- [ ] `src/middleware.ts` — Clerk auth middleware
- [ ] `src/components/layout/Sidebar.tsx` — nav (B&W)
- [ ] `src/components/layout/Header.tsx`

### Pages
- [ ] `src/app/(dashboard)/projects/page.tsx` — project list
- [ ] `src/app/(dashboard)/projects/new/page.tsx` — create project
- [ ] `src/app/(dashboard)/projects/[id]/page.tsx` — project overview
- [ ] `src/app/(dashboard)/projects/[id]/upload/page.tsx` — feedback upload
- [ ] `src/app/(dashboard)/projects/[id]/insights/page.tsx` — insight dashboard
- [ ] `src/app/(dashboard)/features/[id]/page.tsx` — feature detail + PRD
- [ ] `src/app/(dashboard)/assistant/page.tsx` — chat assistant

### Components
- [ ] `src/components/projects/ProjectCard.tsx`
- [ ] `src/components/projects/ProjectForm.tsx`
- [ ] `src/components/upload/FeedbackUpload.tsx` (CSV drag-drop + paste)
- [ ] `src/components/upload/UploadProgress.tsx`
- [ ] `src/components/insights/ProblemCard.tsx`
- [ ] `src/components/insights/FeatureCard.tsx`
- [ ] `src/components/insights/InsightsDashboard.tsx`
- [ ] `src/components/insights/AnalysisStatus.tsx` (polling)
- [ ] `src/components/features/FeatureDetail.tsx`
- [ ] `src/components/features/PRDViewer.tsx`
- [ ] `src/components/chat/ChatInterface.tsx`
- [ ] `src/components/chat/MessageBubble.tsx`

### API Client
- [ ] `src/lib/api.ts` — fetch wrapper with auth headers
- [ ] `src/hooks/useProjects.ts`
- [ ] `src/hooks/useInsights.ts`
- [ ] `src/hooks/useAnalysis.ts` (polling)

---

## Phase 7: Integration & Testing

- [ ] End-to-end test: create project → upload 50 feedbacks → run analysis → see insights
- [ ] Test chat: "What should we build next?" → correct tool call + response
- [ ] Test PRD generation end-to-end
- [ ] Fix any type errors across packages
- [ ] Add loading states everywhere
- [ ] Add error boundaries
- [ ] Verify B&W design throughout (no color leaks)
- [ ] Test on mobile viewport
- [ ] Record demo video with 200 feedback messages

---

## Backlog (Post-MVP)

- [ ] GitHub integration
- [ ] Slack integration
- [ ] PostHog integration
- [ ] Jira/Linear integration
- [ ] Figma integration
- [ ] Product roadmap auto-generation
- [ ] Multi-user team projects
- [ ] Export PRD as PDF
- [ ] Webhook for analysis completion
