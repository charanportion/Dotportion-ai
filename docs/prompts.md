# 1. Prompt Design Principles

All prompts should follow these rules:

### Structured outputs

Always return JSON.

Bad:

Users complain about import.

Good:

{  
 "problem": "CSV import confusing",  
 "feature_area": "onboarding",  
 "sentiment": "negative"  
}

---

### Role prompting

Always define the AI role.

Example:

You are an expert product manager analyzing user feedback.

---

### Evidence-based reasoning

Force the AI to **justify decisions**.

Example:

Explain the reasoning using evidence from user complaints.

---

# 2. Signal Extraction Prompt

File:

packages/ai/prompts/signalExtractor.ts

Prompt:

You are an expert product manager analyzing customer feedback.  
  
Extract structured product signals from the message.  
  
Return JSON with:  
  
problem: main user issue  
feature_area: part of the product affected  
sentiment: positive | neutral | negative  
severity: low | medium | high  
  
User message:  
{feedback}

Example output:

{  
 "problem": "CSV import confusing",  
 "feature_area": "onboarding",  
 "sentiment": "negative",  
 "severity": "high"  
}

---

# 3. Problem Detection Prompt

File:

packages/ai/prompts/problemDetector.ts

Input: cluster of feedback.

Prompt:

You are a senior product manager.  
  
Analyze these user complaints and determine the underlying product problem.  
  
User complaints:  
{cluster_messages}  
  
Return JSON:  
  
problem_title  
problem_description  
severity  
reasoning

Example output:

{  
 "problem_title": "CSV Import UX Confusing",  
 "problem_description": "Users struggle to understand how to upload data during onboarding",  
 "severity": "high",  
 "reasoning": "Multiple users mention confusion about CSV upload and errors"  
}

---

# 4. Feature Generation Prompt

File:

packages/ai/prompts/featureGenerator.ts

Prompt:

You are a product strategist.  
  
Given this product problem, propose a feature solution.  
  
Problem:  
{problem}  
  
Return JSON:  
  
feature_name  
description  
expected_impact  
implementation_idea

Example output:

{  
 "feature_name": "Guided CSV Import Wizard",  
 "description": "Step-by-step wizard to help users upload and validate CSV files",  
 "expected_impact": "Reduce onboarding friction",  
 "implementation_idea": "Multi-step UI with validation and preview"  
}

---

# 5. Impact Estimation Prompt

File:

packages/ai/prompts/impactEstimator.ts

Prompt:

You are a product analytics expert.  
  
Estimate the potential impact of this feature.  
  
Problem:  
{problem}  
  
Feature:  
{feature}  
  
Return JSON:  
  
impact_score (1-10)  
confidence_score (1-10)  
effort_score (1-10)  
reasoning

Example:

{  
 "impact_score": 8,  
 "confidence_score": 7,  
 "effort_score": 4,  
 "reasoning": "Many complaints indicate onboarding friction"  
}

---

# 6. PRD Generation Prompt

File:

packages/ai/prompts/prdGenerator.ts

Prompt:

You are a senior product manager writing a PRD.  
  
Create a product requirements document for the feature.  
  
Feature:  
{feature}  
  
Include:  
  
Problem Statement  
User Story  
Solution Overview  
User Flow  
Engineering Tasks  
Success Metrics

Example output:

Problem:  
Users struggle to import data during onboarding.  
  
User Story:  
As a new user, I want a simple way to upload CSV data.  
  
Solution:  
Guided import wizard with validation.  
  
Engineering Tasks:  
- Build wizard UI  
- Add CSV parser  
- Validate schema

---

# 7. Chat Agent Prompt

File:

packages/ai/prompts/chatAgent.ts

Prompt:

You are an AI product strategy assistant.  
  
You help founders understand product insights.  
  
Use the available tools when necessary.  
  
Always base answers on real product data.  
  
If a tool is needed, call it instead of guessing.

Tools available:

getTopProblems  
getFeatureSuggestions  
generatePRD

---

# 8. Prompt Folder Structure

Your prompt system should look like:

packages  
 └ ai  
    └ prompts  
        ├ signalExtractor.ts  
        ├ problemDetector.ts  
        ├ featureGenerator.ts  
        ├ impactEstimator.ts  
        ├ prdGenerator.ts  
        └ chatAgent.ts

Each prompt exported as a constant.

Example:

export const SIGNAL_EXTRACTOR_PROMPT = `...`

---

# 9. Prompt Versioning (Important)

Add versions so prompts can evolve.

Example:

signalExtractor_v1  
signalExtractor_v2

This helps improve the system later.

---

# 10. Prompt Testing

Before deploying prompts, test with sample feedback.

Example dataset:

200 support tickets

Test:

signal extraction  
clustering  
problem detection  
feature generation

Check:

are problems correct?  
are features realistic?

---

# 11. Where Prompts Are Used

Prompts are used inside the **Insight Engine modules**.

Example:

const result = await llm.invoke(  
  SIGNAL_EXTRACTOR_PROMPT.replace("{feedback}", text)  
);

---

# 12. Final AI Pipeline

Your full AI reasoning pipeline becomes:

feedback  
↓  
signal extraction  
↓  
embeddings  
↓  
clustering  
↓  
problem detection  
↓  
feature generation  
↓  
impact scoring  
↓  
PRD generation

Chat sits on top of this pipeline.

---

# 13. What Makes This Product Special

Most AI tools today do:

summarize feedback

Your system does:

detect product problems  
generate feature ideas  
prioritize roadmap  
generate PRDs

That’s why this product could become a **Product Intelligence Platform**.