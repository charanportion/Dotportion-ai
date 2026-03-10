# 1. MVP Goal

The MVP should prove **one powerful thing**:

> AI can turn messy customer feedback into clear product decisions.

The MVP should allow a founder to:

upload feedback  
↓  
see top user problems  
↓  
get feature suggestions  
↓  
generate a PRD  
↓  
ask questions via chat

If that works, your product already demonstrates YC's idea of **“Cursor for Product Managers.”**

---

# 2. MVP Core Features

Only build these **5 features**.

### 1️⃣ Project Creation

User creates a project.

Example:

Project: My SaaS App  
Description: CRM for freelancers

---

### 2️⃣ Feedback Upload

User uploads signals.

Sources:

paste feedback  
upload CSV  
upload text

Example:

Importing CSV is confusing  
Export takes too long  
I can't find integrations

---

### 3️⃣ Insight Engine

System processes signals and generates:

Top Problems  
Problem Clusters  
Frequency  
Severity

Example output:

Top Problems  
  
1. CSV import confusion (42 mentions)  
2. Export slow (19 mentions)  
3. Missing integrations (15 mentions)

---

### 4️⃣ Feature Suggestions

System suggests solutions.

Example:

Feature: Guided CSV Import Wizard  
  
Impact:  
High  
  
Reason:  
42 complaints  
Onboarding drop 60%

---

### 5️⃣ PRD Generator

Generate a simple PRD.

Example:

Problem  
User story  
Solution  
Engineering tasks

---

# 3. Chat in MVP (Light Version)

Yes include chat, but **use tools**.

The chat can answer questions like:

What problems do users complain about most?  
What feature should we build next?  
Generate a PRD for problem #1

Chat internally calls APIs like:

get_top_problems()  
get_feature_suggestions()  
generate_prd()

So chat is just a **natural language interface to your system**.

---

# 4. MVP System Architecture

Your architecture stays simple.

Next.js frontend  
↓  
Fastify API  
↓  
Redis queue  
↓  
BullMQ workers  
↓  
Insight Engine  
↓  
Postgres + pgvector

AI models:

Claude → reasoning  
OpenAI → embeddings

Infra:

Vercel → frontend  
Google Cloud → workers

---

# 5. MVP Database Schema

You only need **6 tables** initially.

### users

id  
email  
created_at

---

### projects

id  
user_id  
name  
created_at

---

### signals

id  
project_id  
content  
embedding  
sentiment  
created_at

---

### problems

id  
project_id  
title  
description  
frequency  
severity

---

### features

id  
problem_id  
title  
description  
priority_score

---

### prds

id  
feature_id  
content

---

# 6. MVP API Endpoints

### Create Project

POST /projects

---

### Upload Feedback

POST /signals/upload

Body:

project_id  
signals[]

---

### Run Insight Engine

POST /analysis/run

This triggers **BullMQ pipeline**.

---

### Get Problems

GET /projects/:id/problems

---

### Get Features

GET /projects/:id/features

---

### Generate PRD

POST /features/:id/prd

---

### Chat Endpoint

POST /chat

Chat uses tool routing.

---

# 7. Worker Pipeline

AI processing runs asynchronously.

Pipeline:

Upload signals  
↓  
Generate embeddings  
↓  
Cluster signals  
↓  
Detect problems  
↓  
Generate features  
↓  
Rank features

Workers:

signal-worker  
clustering-worker  
problem-worker  
feature-worker

---

# 8. Insight Engine Modules

Inside `packages/insight-engine`.

signalExtractor.ts  
embeddingService.ts  
clusterEngine.ts  
problemDetector.ts  
featureGenerator.ts  
impactScorer.ts  
prdGenerator.ts

---

# 9. Chat Agent Tools

Chat agent must use **structured tools**.

Tools:

getTopProblems(projectId)  
getFeatureSuggestions(projectId)  
generatePRD(featureId)  
getProblemEvidence(problemId)

Example chat:

User:

What should we build next?

System:

Recommended Feature: Guided Import Wizard  
  
Reason:  
42 complaints  
Onboarding drop 63%

---

# 10. Frontend Pages

Next.js pages:

### Projects

/projects

---

### Upload Feedback

/projects/:id/upload

---

### Insights Dashboard

/projects/:id/insights

Shows:

top problems  
problem clusters  
feature suggestions

---

### Feature Page

/features/:id

---

### Chat Assistant

/assistant

---

# 11. MVP UI Layout

Example dashboard:

--------------------------------  
  
Top Problems  
  
1. Import confusion (42 mentions)  
2. Export slow (19 mentions)  
  
--------------------------------  
  
Suggested Features  
  
1. Guided Import Wizard  
Impact: High  
  
2. Export optimization  
Impact: Medium  
  
--------------------------------

---

# 12. 4-Week Build Plan

### Week 1

Core infrastructure.

Build:

Next.js frontend  
Fastify API  
Postgres schema  
project creation  
feedback upload

---

### Week 2

Insight engine basics.

Build:

signal extraction  
embeddings  
vector storage  
clustering

---

### Week 3

Problem detection + features.

Build:

problem detection  
feature generation  
impact scoring

---

### Week 4

Product output.

Build:

PRD generator  
insight dashboard  
chat interface  
beta testing

---

# 13. What the MVP User Journey Looks Like

User flow:

Create project  
↓  
Upload feedback  
↓  
Run analysis  
↓  
See problems  
↓  
See feature suggestions  
↓  
Generate PRD  
↓  
Ask questions in chat

---

# 14. What YC Will Like About This MVP

Your MVP demonstrates:

AI → product insight  
AI → feature suggestion  
AI → product decision

This directly answers YC’s question:

"What should we build next?"

---

# 15. After MVP (Next Version)

After users start using it:

Add integrations:

GitHub  
Slack  
PostHog  
Jira  
Figma

Then your system evolves into a **complete product intelligence platform**.

---

# Final Advice

Your MVP should be:

simple  
fast  
focused

Avoid building:

complex agents  
too many integrations  
too many AI features

Instead focus on:

feedback → problems → features → PRD

Plus a **lightweight chat assistant**.
