# AI Pipeline

## Overview

The Insight Engine transforms raw feedback into product decisions through 6 sequential stages.

```
Raw Feedback
    ↓
Stage 1: Signal Extraction     (Claude)
    ↓
Stage 2: Embedding Generation  (OpenAI)
    ↓
Stage 3: Semantic Clustering   (cosine similarity)
    ↓
Stage 4: Problem Detection     (Claude)
    ↓
Stage 5: Feature Generation    (Claude) + Impact Scoring
    ↓
Stage 6: PRD Generation        (Claude)
    ↓
Product Insights Dashboard
```

---

## Stage 1: Signal Extraction

**File:** `packages/insight-engine/src/signal-extractor.ts`
**Model:** Claude (`claude-sonnet-4-6`)
**Prompt:** `packages/ai/src/prompts/signal-extractor.v1.ts`

Input: Raw feedback text string
Output: Structured signal JSON

```typescript
interface ExtractedSignal {
  problem: string        // "CSV import confusing"
  featureArea: string   // "onboarding"
  sentiment: "positive" | "neutral" | "negative"
  severity: "low" | "medium" | "high"
}
```

Prompt template:
```
You are an expert product manager analyzing customer feedback.

Extract structured product signals from this message.

Return JSON with these exact fields:
- problem: the main user issue in 3-8 words
- featureArea: which part of the product (onboarding, dashboard, export, etc.)
- sentiment: positive | neutral | negative
- severity: low | medium | high

User message:
{feedback}
```

---

## Stage 2: Embedding Generation

**File:** `packages/insight-engine/src/embeddings.ts`
**Model:** OpenAI `text-embedding-3-small`
**Dimensions:** 1536

Input: Signal content string
Output: `number[]` of length 1536

Stored in: `Signal.embedding` (pgvector column)

```typescript
async function generateEmbedding(text: string): Promise<number[]>
async function generateEmbeddings(texts: string[]): Promise<number[][]>  // batched
```

---

## Stage 3: Semantic Clustering

**File:** `packages/insight-engine/src/cluster-engine.ts`
**Algorithm:** Cosine similarity grouping (MVP) → HDBSCAN (v2)

Input: Signal[] with embeddings
Output: Cluster[] with signal assignments

### Cosine Similarity
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  return dot / (magA * magB)
}
```

### Clustering Algorithm
```typescript
function clusterSignals(signals: SignalWithEmbedding[]): RawCluster[] {
  const clusters: RawCluster[] = []
  const THRESHOLD = 0.80  // similarity threshold

  for (const signal of signals) {
    let assigned = false
    for (const cluster of clusters) {
      const sim = cosineSimilarity(signal.embedding, cluster.centroid)
      if (sim >= THRESHOLD) {
        cluster.signals.push(signal)
        cluster.centroid = averageVectors([cluster.centroid, signal.embedding])
        assigned = true
        break
      }
    }
    if (!assigned) {
      clusters.push({
        signals: [signal],
        centroid: signal.embedding
      })
    }
  }
  return clusters
}
```

### Cluster Naming (Claude)
```typescript
async function nameCluster(signalContents: string[]): Promise<string>
```
Prompt: "Given these user complaints, give a short 2-4 word cluster name: {complaints}"

---

## Stage 4: Problem Detection

**File:** `packages/insight-engine/src/problem-detector.ts`
**Model:** Claude (`claude-sonnet-4-6`)
**Prompt:** `packages/ai/src/prompts/problem-detector.v1.ts`

Input: Cluster (name + signal contents)
Output: Detected problem

```typescript
interface DetectedProblem {
  title: string        // "CSV Import UX Confusing"
  description: string  // "Users struggle to understand how to upload data during onboarding"
  severity: number     // 0-10 numeric score
  reasoning: string    // AI's justification
}
```

Severity calculation:
```
severity = min(10, log10(evidenceCount + 1) * 3) + sentimentPenalty
```

Prompt template:
```
You are a senior product manager.

Analyze these user complaints and identify the underlying product problem.

User complaints:
{cluster_messages}

Return JSON:
- problem_title: concise 3-7 word title
- problem_description: 1-2 sentence description
- severity: number 1-10 (10 = critical)
- reasoning: why this is important based on the evidence
```

---

## Stage 5a: Feature Generation

**File:** `packages/insight-engine/src/feature-generator.ts`
**Model:** Claude (`claude-sonnet-4-6`)
**Prompt:** `packages/ai/src/prompts/feature-generator.v1.ts`

Input: Problem
Output: Feature suggestion

```typescript
interface GeneratedFeature {
  name: string              // "Guided CSV Import Wizard"
  description: string
  implementationIdea: string
  expectedImpact: string
}
```

Prompt template:
```
You are a product strategist.

Given this product problem with evidence, propose a specific feature solution.

Problem: {problem_title}
Description: {problem_description}
Evidence: {evidence_count} user reports, severity: {severity}/10

Return JSON:
- feature_name: specific, buildable feature name
- description: 2-3 sentences on what it does
- implementation_idea: high-level technical approach
- expected_impact: specific user benefit (e.g. "reduce onboarding drop by ~30%")
```

---

## Stage 5b: Impact Scoring

**File:** `packages/insight-engine/src/impact-scoring.ts`
**Model:** Claude (`claude-sonnet-4-6`) for effort estimation
**Prompt:** `packages/ai/src/prompts/impact-estimator.v1.ts`

### RICE-Based Formula
```
Priority Score = (Severity × EvidenceCount × Confidence) / Effort

Where:
  Severity      = problem.severity (0-10)
  EvidenceCount = problem.evidenceCount (normalized: /100)
  Confidence    = confidence score (0-10)
  Effort        = effort score (1-10, higher = more effort)
```

### Confidence Score
Based on:
- Cluster size (more signals = more confident)
- Sentiment consistency (all negative = high confidence)
- Multiple signal sources (support + interviews = higher)

### Effort Score (Claude-estimated)
```typescript
interface EffortEstimate {
  effortScore: number  // 1-10
  reasoning: string
}
```

Prompt: "Estimate engineering effort (1=trivial, 10=major refactor) for: {feature_description}"

---

## Stage 6: PRD Generation

**File:** `packages/insight-engine/src/prd-generator.ts`
**Model:** Claude (`claude-sonnet-4-6`)
**Prompt:** `packages/ai/src/prompts/prd-generator.v1.ts`

Input: Feature + Problem
Output: Markdown PRD string

PRD structure:
```markdown
# [Feature Name]

## Problem Statement
[Why this needs to be built]

## User Story
As a [user type], I want [goal] so that [outcome].

## Solution Overview
[What the feature does]

## User Flow
1. User does X
2. System shows Y
3. User completes Z

## Edge Cases
- [edge case 1]
- [edge case 2]

## Success Metrics
- [metric 1]
- [metric 2]

## Engineering Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
```

Task parsing: After PRD generation, regex-extract `- [ ] Task` lines to create Task records.

---

## Chat Agent (LangGraph)

**File:** `packages/ai/src/agents/chat-agent.ts`

### Tools Available to Chat Agent

```typescript
const chatTools = [
  {
    name: "getTopProblems",
    description: "Returns top product problems detected from user feedback, ordered by evidence count",
    parameters: { projectId: "string" }
  },
  {
    name: "getFeatureSuggestions",
    description: "Returns recommended product features ranked by priority score",
    parameters: { projectId: "string", limit: "number?" }
  },
  {
    name: "generatePRD",
    description: "Generates a Product Requirements Document for a specific feature",
    parameters: { featureId: "string" }
  },
  {
    name: "getProblemEvidence",
    description: "Returns user feedback messages that caused a specific problem to be detected",
    parameters: { problemId: "string" }
  },
  {
    name: "getProjectSummary",
    description: "Returns a high-level summary: signal count, problem count, top feature",
    parameters: { projectId: "string" }
  }
]
```

### LangGraph Workflow

```
User message
    ↓
Load chat history
    ↓
Claude (with tools) → may call tools
    ↓
If tool called → execute tool → return result to Claude
    ↓
Claude formats final response
    ↓
Store user + assistant messages
    ↓
Return response
```

### System Prompt
```
You are an AI product strategy assistant helping founders make better product decisions.

You have access to real product data from user feedback analysis. Always use tools to get actual data before answering — never guess or hallucinate product insights.

When answering:
- Be specific and reference actual numbers from the data
- Explain the reasoning behind recommendations
- Be concise and actionable

Available tools: getTopProblems, getFeatureSuggestions, generatePRD, getProblemEvidence, getProjectSummary
```

---

## Error Handling in Pipeline

Each stage wraps in try/catch:
```typescript
try {
  const result = await stage.execute(input)
  await db.updateAnalysisStatus(analysisId, NEXT_STATUS)
  return result
} catch (error) {
  await db.updateAnalysis(analysisId, { status: 'ERROR', error: error.message })
  throw error
}
```

On failure: Analysis record gets `status: ERROR`, worker logs the stage that failed.

---

## Performance Considerations

- **Batching**: Embed all signals in batches of 100 (OpenAI rate limits)
- **Concurrency**: Problem detection runs in parallel (Promise.all) per cluster
- **Caching**: Embeddings are stored — never re-embed the same content
- **Timeout**: Each LLM call has a 30s timeout with 2 retries
