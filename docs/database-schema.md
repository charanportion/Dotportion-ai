# Database Schema

## Technology Stack
- PostgreSQL on NeonDB (serverless)
- pgvector extension for embeddings
- Prisma ORM for type-safe queries
- Schema location: `packages/db/prisma/schema.prisma`

---

## Full Prisma Schema

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

// ─────────────────────────────────────
// USER
// ─────────────────────────────────────
model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique          // Clerk user ID
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projects     Project[]
  chatMessages ChatMessage[]

  @@index([clerkId])
}

// ─────────────────────────────────────
// PROJECT
// ─────────────────────────────────────
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(IDLE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  signals      Signal[]
  clusters     Cluster[]
  problems     Problem[]
  features     Feature[]
  chatMessages ChatMessage[]
  analyses     Analysis[]

  @@index([userId])
}

enum ProjectStatus {
  IDLE
  PROCESSING
  COMPLETE
  ERROR
}

// ─────────────────────────────────────
// ANALYSIS JOB (tracks pipeline runs)
// ─────────────────────────────────────
model Analysis {
  id        String         @id @default(cuid())
  status    AnalysisStatus @default(PENDING)
  jobId     String?        // BullMQ job ID
  error     String?
  startedAt DateTime?
  completedAt DateTime?
  createdAt DateTime @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([status])
}

enum AnalysisStatus {
  PENDING
  EXTRACTING_SIGNALS
  CLUSTERING
  DETECTING_PROBLEMS
  GENERATING_FEATURES
  COMPLETE
  ERROR
}

// ─────────────────────────────────────
// SIGNAL (raw feedback)
// ─────────────────────────────────────
model Signal {
  id          String      @id @default(cuid())
  content     String      // raw feedback text
  source      SignalSource @default(MANUAL)
  sentiment   Float?      // -1 to 1
  problem     String?     // extracted by AI
  featureArea String?     // extracted by AI
  severity    String?     // low | medium | high
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  clusterId String?
  cluster   Cluster? @relation(fields: [clusterId], references: [id])

  @@index([projectId])
  @@index([clusterId])
}

enum SignalSource {
  MANUAL
  CSV
  SUPPORT_TICKET
  INTERVIEW
  REVIEW
  SLACK
}

// ─────────────────────────────────────
// CLUSTER (grouped signals)
// ─────────────────────────────────────
model Cluster {
  id          String   @id @default(cuid())
  name        String   // Claude-generated cluster name
  signalCount Int      @default(0)
  createdAt   DateTime @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  signals  Signal[]
  problems Problem[]

  @@index([projectId])
}

// ─────────────────────────────────────
// PROBLEM (detected from clusters)
// ─────────────────────────────────────
model Problem {
  id            String   @id @default(cuid())
  title         String
  description   String
  severity      Float    // 0-10 score
  evidenceCount Int      // number of signals
  reasoning     String   // AI reasoning
  createdAt     DateTime @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  clusterId String
  cluster   Cluster @relation(fields: [clusterId], references: [id])

  features Feature[]

  @@index([projectId])
  @@index([clusterId])
}

// ─────────────────────────────────────
// FEATURE (AI-suggested solution)
// ─────────────────────────────────────
model Feature {
  id              String   @id @default(cuid())
  title           String
  description     String
  implementationIdea String?
  expectedImpact  String?

  // Impact scoring (RICE-based)
  impactScore     Float    @default(0)   // 0-10: based on evidenceCount × severity
  confidenceScore Float    @default(0)   // 0-10: certainty of recommendation
  effortScore     Float    @default(0)   // 1-10: engineering effort (higher = more effort)
  priorityScore   Float    @default(0)   // (impact × confidence) / effort

  createdAt DateTime @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  problemId String
  problem   Problem @relation(fields: [problemId], references: [id])

  tasks Task[]
  prd   PRD?

  @@index([projectId])
  @@index([problemId])
  @@index([priorityScore])
}

// ─────────────────────────────────────
// PRD (generated product document)
// ─────────────────────────────────────
model PRD {
  id        String   @id @default(cuid())
  content   String   // full markdown PRD
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  featureId String  @unique
  feature   Feature @relation(fields: [featureId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────
// TASK (engineering tasks from PRD)
// ─────────────────────────────────────
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  createdAt   DateTime   @default(now())

  featureId String
  feature   Feature @relation(fields: [featureId], references: [id], onDelete: Cascade)

  @@index([featureId])
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  DONE
}

// ─────────────────────────────────────
// CHAT MESSAGE
// ─────────────────────────────────────
model ChatMessage {
  id        String      @id @default(cuid())
  role      MessageRole
  content   String
  toolCalls Json?       // stores tool call metadata
  createdAt DateTime    @default(now())

  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId String
  user   User   @relation(fields: [userId], references: [id])

  @@index([projectId])
  @@index([userId])
}

enum MessageRole {
  USER
  ASSISTANT
  TOOL
}
```

---

## pgvector Setup

Run in NeonDB SQL editor before first migration:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Or use Prisma preview feature (configured in schema above).

---

## Key Relationships

```
User
 └── Projects (1:many)
      ├── Signals (1:many)
      │    └── Cluster (many:1)
      ├── Clusters (1:many)
      │    └── Problems (1:many)
      ├── Problems (1:many)
      │    └── Features (1:many)
      │         ├── PRD (1:1)
      │         └── Tasks (1:many)
      ├── ChatMessages (1:many)
      └── Analyses (1:many)
```

---

## Indexes for Performance

Critical indexes (already in schema):
- `Signal.projectId` — most frequent query
- `Signal.clusterId` — clustering joins
- `Problem.projectId` — dashboard queries
- `Feature.priorityScore` — sorted feature lists
- `Analysis.status` — polling queries
- `User.clerkId` — auth lookup on every request

---

## pgvector Queries

### Semantic similarity search
```sql
SELECT id, content, 1 - (embedding <=> $1::vector) as similarity
FROM signals
WHERE project_id = $2
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

### Cosine similarity in Prisma (raw query)
```typescript
const similar = await prisma.$queryRaw`
  SELECT id, content, 1 - (embedding <=> ${vector}::vector) as similarity
  FROM signals
  WHERE project_id = ${projectId}
    AND 1 - (embedding <=> ${vector}::vector) > 0.8
  ORDER BY similarity DESC
  LIMIT 50
`
```
