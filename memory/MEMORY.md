# Product Intelligence AI — Project Memory

## What This Project Is
Product Intelligence AI — "Cursor for Product Managers"

AI system that turns messy customer feedback into product decisions:
- Upload feedback → AI detects user problems → AI suggests features → AI generates PRDs → Chat explains insights

## Tech Stack
- Monorepo: Turborepo + pnpm
- Frontend: Next.js 14 App Router (apps/web)
- Backend: Fastify (apps/api)
- Workers: BullMQ (apps/worker)
- UI: shadcn/ui + Tailwind (BLACK/WHITE ONLY)
- DB: NeonDB PostgreSQL + pgvector (packages/db, Prisma)
- Auth: Clerk
- AI: Claude claude-sonnet-4-6 + OpenAI embeddings
- Queue: Redis + BullMQ

## Key Files
- `CLAUDE.md` — full reference doc (loaded by Claude each session)
- `docs/todo.md` — master checklist
- `packages/db/prisma/schema.prisma` — full DB schema
- `packages/insight-engine/src/pipeline.ts` — AI pipeline

## Design System
- ONLY black, white, zinc-* colors
- Spacing: multiples of 4px only
- No gradients, no colored shadows

## Current Status
Phase 0 complete (context files written).
Next: Phase 1 — Turborepo monorepo setup.
