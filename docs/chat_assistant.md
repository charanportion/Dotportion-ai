# Day 1 — Monorepo Setup

Create the repository and structure.

product-intelligence-ai  
apps/  
  web  
  api  
  worker  
packages/  
  db  
  insight-engine  
  ai

Install core tooling.

Tasks:

initialize git repo  
setup package manager  
create monorepo structure  
install turborepo (optional)

Goal:

empty project structure ready

---

# Day 2 — Database Setup

Setup PostgreSQL and Prisma.

Tasks:

install prisma  
create schema.prisma  
create User model  
create Project model  
create Signal model

Run:

prisma migrate dev

Goal:

database connected and working

---

# Day 3 — Fastify Backend

Create the backend API.

Inside:

apps/api

Tasks:

setup fastify server  
create project routes  
create signals routes  
connect prisma client

Endpoints:

POST /projects  
POST /signals/upload  
GET /projects

Goal:

backend can store projects and signals

---

# Day 4 — Feedback Upload UI

Build the frontend upload interface.

Inside:

apps/web

Pages:

/projects  
/projects/:id/upload

Features:

paste feedback  
upload CSV  
submit signals

Goal:

user can upload feedback

---

# Day 5 — Embedding Pipeline

Start the Insight Engine.

Create:

packages/insight-engine/embeddings.ts

Tasks:

generate embeddings  
store vectors in postgres

Using embeddings from:

- OpenAI
    

Goal:

signals now have embeddings

---

# Day 6 — Signal Extraction

Create:

signal-extractor.ts

Tasks:

send feedback to LLM  
extract problem  
extract sentiment  
store structured signal

Example output:

problem: import confusion  
sentiment: negative

Goal:

raw feedback → structured signals

---

# Day 7 — Clustering Engine

Create:

cluster-engine.ts

Tasks:

semantic similarity  
group signals into clusters  
store clusters

Example:

cluster: Import Problems  
signals: 42

Goal:

similar feedback grouped

---

# Day 8 — Problem Detection

Create:

problem-detector.ts

Tasks:

convert clusters → product problems  
generate title  
generate description  
calculate severity

Example:

Problem:  
Import UX confusing

Goal:

clusters become product problems

---

# Day 9 — Feature Generator

Create:

feature-generator.ts

Tasks:

generate features from problems  
add impact estimation  
store features

Example output:

Feature:  
Guided Import Wizard

Goal:

problems → features

---

# Day 10 — Impact Scoring

Create:

impact-scoring.ts

Formula:

priority = (severity × reach × confidence) / effort

Tasks:

calculate scores  
rank features

Goal:

features prioritized

---

# Day 11 — PRD Generator

Create:

prd-generator.ts

Output format:

Problem  
User Story  
Solution  
Engineering Tasks

Tasks:

generate PRD from feature  
store in database

Goal:

PRD generation works

---

# Day 12 — Insight Dashboard

Create frontend page:

/projects/:id/insights

Show:

top problems  
feature suggestions  
priority scores

Use charts from:

- Recharts
    

Goal:

visual insight dashboard

---

# Day 13 — Chat Assistant

Create page:

/assistant

Backend endpoint:

POST /chat

Chat tools:

getTopProblems  
getFeatureSuggestions  
generatePRD

Chat agent built with:

- LangGraph
    

Goal:

chat can answer product questions

Example:

User: What should we build next?  
  
AI:  
Guided Import Wizard  
Reason: 42 complaints

---

# Day 14 — Demo & Polish

Final tasks:

improve UI  
fix bugs  
test insight pipeline  
record demo video

Test scenario:

upload 200 feedback messages  
AI detects problems  
AI suggests features  
AI generates PRD  
chat explains decisions

Goal:

demo-ready MVP

---

# What You Will Have After 14 Days

Your product will allow:

upload feedback  
↓  
AI detects problems  
↓  
AI suggests features  
↓  
AI ranks them  
↓  
AI generates PRDs  
↓  
chat explains insights

That is already a **very powerful prototype**.