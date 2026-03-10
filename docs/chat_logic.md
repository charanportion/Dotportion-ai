# 1. Why Chat Needs Tools

If chat only sends the user message directly to an LLM, it will:

- hallucinate
    
- not use your data
    
- not trigger your pipeline
    

Instead, the chat must **call backend tools**.

Example:

User asks:

What problems do users complain about most?

Chat agent should call:

getTopProblems(projectId)

Then generate a response based on **real data**.

---

# 2. Chat Agent Architecture

Your chat system sits between the **user interface and the Insight Engine**.

Architecture:

User Chat UI  
↓  
Fastify Chat API  
↓  
LangGraph Chat Agent  
↓  
Tool Router  
↓  
Insight Engine APIs  
↓  
Database  
↓  
LLM Response

---

# 3. Chat Tools

Define **backend functions that the AI can call**.

Core tools:

getTopProblems(projectId)  
getFeatureSuggestions(projectId)  
generatePRD(featureId)  
getProblemEvidence(problemId)  
getSignals(projectId)

These tools will live in:

apps/api/src/services/chat-tools.ts

---

# 4. Example Tool: Get Top Problems

Example implementation:

export async function getTopProblems(projectId: string) {  
  return prisma.problem.findMany({  
    where: { projectId },  
    orderBy: { evidenceCount: "desc" },  
    take: 5  
  });  
}

Returns:

[  
 { title: "Import confusion", evidenceCount: 42 },  
 { title: "Export slow", evidenceCount: 19 }  
]

---

# 5. Example Tool: Get Feature Suggestions

export async function getFeatureSuggestions(projectId: string) {  
  return prisma.feature.findMany({  
    where: { projectId },  
    orderBy: { priorityScore: "desc" },  
    take: 5  
  });  
}

---

# 6. Example Tool: Generate PRD

export async function generatePRD(featureId: string) {  
  const feature = await prisma.feature.findUnique({  
    where: { id: featureId }  
  });  
  
  return generatePRDFromFeature(feature);  
}

---

# 7. Tool Definitions for AI

The chat agent must know **what tools exist**.

Example tool definition:

const tools = [  
 {  
  name: "getTopProblems",  
  description: "Returns top product problems detected from feedback",  
 },  
 {  
  name: "getFeatureSuggestions",  
  description: "Returns recommended product features"  
 }  
];

These tools are passed to the LLM.

---

# 8. LangGraph Chat Workflow

Using **LangGraph**, define the workflow:

User message  
↓  
Intent detection  
↓  
Tool selection  
↓  
Execute tool  
↓  
LLM reasoning  
↓  
Final response

Example flow:

User: What should we build next?  
↓  
Agent chooses tool  
getFeatureSuggestions  
↓  
Fetch features  
↓  
LLM explains recommendation

---

# 9. Chat Agent Code Skeleton

Example:

async function chatAgent(message, projectId) {  
  
  const intent = await detectIntent(message);  
  
  if (intent === "top_problems") {  
    const problems = await getTopProblems(projectId);  
    return formatProblems(problems);  
  }  
  
  if (intent === "feature_suggestions") {  
    const features = await getFeatureSuggestions(projectId);  
    return formatFeatures(features);  
  }  
  
}

Later you can replace `detectIntent` with **LLM tool calling**.

---

# 10. Chat API Endpoint

Fastify endpoint:

POST /chat

Example body:

{  
 "projectId": "123",  
 "message": "What should we build next?"  
}

Response:

{  
 "response": "Top recommended feature: Guided Import Wizard..."  
}

---

# 11. Chat Message Storage

Store chat history.

Prisma model already created:

ChatMessage

Example record:

role: user  
content: What problems do users complain about most?

And:

role: assistant  
content: Top problems detected...

This enables **conversation memory**.

---

# 12. Chat UI

Frontend page:

/assistant

UI layout:

--------------------------------  
  
AI Product Assistant  
  
User: What should we build next?  
  
AI:  
Top recommended feature:  
Guided Import Wizard  
  
Reason:  
42 complaints  
63% onboarding drop  
  
--------------------------------

---

# 13. Chat UX Features

Nice features you can add quickly:

### Problem references

User:

Generate PRD for problem #1

AI understands the context.

---

### Follow-up questions

User:

Why is this problem important?

AI pulls evidence.

---

### Product roadmap

User:

Create roadmap for next 3 features

AI ranks features.

---

# 14. Chat vs Dashboard

Your product must support both.

Dashboard shows:

Top problems  
Feature suggestions  
Impact scores

Chat allows:

custom questions  
deep explanations  
PRD generation

Together they create a **powerful workflow**.

---

# 15. Final System Architecture

Complete MVP architecture:

Next.js Dashboard + Chat UI  
↓  
Fastify API  
↓  
Redis Queue  
↓  
BullMQ Workers  
↓  
Insight Engine  
↓  
PostgreSQL + pgvector  
↓  
LLM (Claude reasoning)

AI orchestration uses **LangGraph**.

---

# 16. What Your MVP Now Includes

Your MVP now has:

feedback upload  
AI insight engine  
problem detection  
feature suggestions  
PRD generation  
product dashboard  
AI chat assistant

This is already **a very strong YC-level prototype**.

---

# 17. Final Reality Check

If you build just this MVP and show it to founders, the demo will look like:

Upload 200 support tickets  
↓  
AI detects product problems  
↓  
AI suggests features  
↓  
AI generates PRD  
↓  
Ask questions in chat

That is exactly the kind of **AI-native product workflow** YC is asking for.