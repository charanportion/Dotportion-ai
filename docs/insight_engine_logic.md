# 1. Insight Engine Folder Structure

Inside your monorepo:

packages  
 └ insight-engine  
     ├ signal-extractor.ts  
     ├ embeddings.ts  
     ├ cluster-engine.ts  
     ├ problem-detector.ts  
     ├ feature-generator.ts  
     ├ impact-scoring.ts  
     ├ prd-generator.ts  
     └ insight-pipeline.ts

`insight-pipeline.ts` orchestrates everything.

---

# 2. Signal Extractor

Purpose:

Convert raw feedback into **structured signals**.

Example input:

"Importing CSV is confusing"

Output:

{  
 problem: "CSV import confusing",  
 feature_area: "onboarding",  
 sentiment: "negative"  
}

Example code:

export async function extractSignals(text: string) {  
  const prompt = `  
Extract product signals from the message.  
  
Return JSON with:  
problem  
feature_area  
sentiment  
`;  
  
  const response = await llm.invoke({  
    prompt: prompt + text  
  });  
  
  return JSON.parse(response);  
}

The LLM reasoning can be powered by models from Anthropic.

---

# 3. Embedding Service

Purpose:

Convert signals into vectors for similarity search.

Vectors will be stored in **pgvector**.

Example code:

export async function generateEmbedding(text: string) {  
  const embedding = await openai.embeddings.create({  
    model: "text-embedding-3-small",  
    input: text  
  });  
  
  return embedding.data[0].embedding;  
}

Embeddings come from models provided by OpenAI.

---

# 4. Cluster Engine

Purpose:

Group similar feedback signals.

Example signals:

CSV import confusing  
Import failed  
Upload unclear

Cluster:

Import problems

Simple MVP clustering:

export async function clusterSignals(signals) {  
  const clusters = [];  
  
  for (const signal of signals) {  
    let assigned = false;  
  
    for (const cluster of clusters) {  
      if (similarity(signal.embedding, cluster.embedding) > 0.8) {  
        cluster.signals.push(signal);  
        assigned = true;  
        break;  
      }  
    }  
  
    if (!assigned) {  
      clusters.push({  
        signals: [signal],  
        embedding: signal.embedding  
      });  
    }  
  }  
  
  return clusters;  
}

Later you can upgrade to **HDBSCAN clustering**.

---

# 5. Problem Detector

Purpose:

Turn clusters into **actual product problems**.

Example cluster:

Import failed  
CSV confusing  
Upload unclear

Detected problem:

Data import UX confusing

Example code:

export async function detectProblem(cluster) {  
  const prompt = `  
You are a product manager.  
  
Based on these user complaints,  
identify the underlying product problem.  
  
Complaints:  
${cluster.signals.map(s => s.content).join("\n")}  
`;  
  
  const result = await llm.invoke(prompt);  
  
  return {  
    title: result  
  };  
}

---

# 6. Feature Generator

Purpose:

Suggest features to solve problems.

Example:

Problem:

Import UX confusing

Feature:

Guided CSV Import Wizard

Example code:

export async function generateFeature(problem) {  
  const prompt = `  
Given this product problem:  
  
${problem.title}  
  
Suggest a feature to solve it.  
  
Return:  
feature_name  
description  
expected_impact  
`;  
  
  const response = await llm.invoke(prompt);  
  
  return response;  
}

---

# 7. Impact Scoring

Purpose:

Rank features by priority.

Formula:

Priority = (Severity × Reach × Confidence) / Effort

Example code:

export function scoreFeature(problem, feature) {  
  const severity = problem.severity;  
  const reach = problem.evidenceCount;  
  const confidence = feature.confidence;  
  const effort = feature.effort;  
  
  return (severity * reach * confidence) / effort;  
}

This gives you **automatic feature prioritization**.

---

# 8. PRD Generator

Purpose:

Generate product specification.

Example output:

Problem  
User Story  
Solution  
Engineering Tasks

Example code:

export async function generatePRD(feature) {  
  const prompt = `  
Create a PRD for this feature.  
  
Feature:  
${feature.title}  
  
Include:  
Problem  
User Story  
Solution  
Engineering Tasks  
`;  
  
  return await llm.invoke(prompt);  
}

---

# 9. Insight Pipeline

This orchestrates all modules.

Example:

export async function runInsightPipeline(projectId) {  
  const signals = await getSignals(projectId);  
  
  const clusters = await clusterSignals(signals);  
  
  const problems = [];  
  
  for (const cluster of clusters) {  
    const problem = await detectProblem(cluster);  
    problems.push(problem);  
  }  
  
  const features = [];  
  
  for (const problem of problems) {  
    const feature = await generateFeature(problem);  
    features.push(feature);  
  }  
  
  return features;  
}

---

# 10. Worker Integration

This pipeline should run inside **BullMQ workers**.

Worker:

apps/worker/src/analysis-worker.ts

Example:

analysisQueue.process(async job => {  
  const { projectId } = job.data;  
  
  await runInsightPipeline(projectId);  
});

Queues handled with **BullMQ**.

---

# 11. Chat Integration

The chat assistant should call **Insight Engine tools**.

Example tools:

getTopProblems()  
getFeatureSuggestions()  
generatePRD()

Chat agent can be built with:

- LangGraph
    

---

# 12. Final Insight Engine Architecture

Your final AI architecture becomes:

Feedback Upload  
↓  
Signal Extraction  
↓  
Embedding Generation  
↓  
Vector Storage  
↓  
Clustering  
↓  
Problem Detection  
↓  
Feature Generation  
↓  
Impact Scoring  
↓  
PRD Generation

This pipeline produces **product decisions automatically**.

---

# 13. What You've Built Conceptually

Charan, what you're building is essentially:

AI Product Brain

It turns:

user feedback  
↓  
product insight  
↓  
feature decision  
↓  
engineering spec

That’s exactly what the **“Cursor for PMs”** idea is about.