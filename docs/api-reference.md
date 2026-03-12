# API Reference

## Base URL
- Development: `http://localhost:3001`
- Production: `https://api.yourdomain.com`

## Authentication
All routes require Clerk JWT in Authorization header:
```
Authorization: Bearer <clerk_jwt>
```
Exception: `GET /health`

---

## Projects

### Create Project
```
POST /projects
```
Body:
```json
{
  "name": "My SaaS App",
  "description": "CRM for freelancers"
}
```
Response `201`:
```json
{
  "id": "clx...",
  "name": "My SaaS App",
  "description": "CRM for freelancers",
  "status": "IDLE",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### List Projects
```
GET /projects
```
Response `200`:
```json
{
  "projects": [
    {
      "id": "clx...",
      "name": "My SaaS App",
      "status": "COMPLETE",
      "_count": { "signals": 42, "problems": 3, "features": 5 }
    }
  ]
}
```

### Get Project
```
GET /projects/:id
```
Response `200`: Full project object with counts.

### Delete Project
```
DELETE /projects/:id
```
Response `204`: No content.

---

## Signals

### Upload Feedback
```
POST /signals/upload
```
Body:
```json
{
  "projectId": "clx...",
  "signals": [
    { "content": "CSV import is confusing", "source": "MANUAL" },
    { "content": "Export takes too long", "source": "SUPPORT_TICKET" }
  ]
}
```
Response `201`:
```json
{
  "signalIds": ["clx...", "clx..."],
  "count": 2
}
```

### Upload CSV
```
POST /signals/upload-csv
Content-Type: multipart/form-data
```
Form fields:
- `projectId`: string
- `file`: CSV file (column: `content`, optional: `source`)

Response `201`:
```json
{
  "signalIds": ["clx..."],
  "count": 150
}
```

### Get Signals
```
GET /projects/:id/signals?page=1&limit=50
```
Response `200`:
```json
{
  "signals": [
    {
      "id": "clx...",
      "content": "CSV import confusing",
      "source": "MANUAL",
      "sentiment": -0.8,
      "problem": "data import confusion",
      "featureArea": "onboarding",
      "severity": "high",
      "clusterId": "clx...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1
}
```

---

## Analysis

### Trigger Analysis
```
POST /analysis/run
```
Body:
```json
{
  "projectId": "clx..."
}
```
Response `202`:
```json
{
  "analysisId": "clx...",
  "jobId": "bull_123",
  "status": "PENDING"
}
```

### Get Analysis Status
```
GET /analysis/:analysisId/status
```
Response `200`:
```json
{
  "id": "clx...",
  "status": "CLUSTERING",
  "progress": 40,
  "startedAt": "2024-01-01T00:00:00Z",
  "completedAt": null,
  "error": null
}
```

Status values:
- `PENDING` — job queued
- `EXTRACTING_SIGNALS` — Claude extracting from raw text
- `CLUSTERING` — grouping by cosine similarity
- `DETECTING_PROBLEMS` — Claude identifying problems
- `GENERATING_FEATURES` — Claude suggesting features
- `COMPLETE` — pipeline done
- `ERROR` — failed (check `error` field)

---

## Insights

### Get Problems
```
GET /projects/:id/problems?orderBy=severity&limit=10
```
Response `200`:
```json
{
  "problems": [
    {
      "id": "clx...",
      "title": "CSV Import UX Confusing",
      "description": "Users struggle to understand how to upload data during onboarding",
      "severity": 8.5,
      "evidenceCount": 42,
      "reasoning": "Multiple users report confusion...",
      "features": [
        {
          "id": "clx...",
          "title": "Guided Import Wizard",
          "priorityScore": 2.67
        }
      ]
    }
  ]
}
```

### Get Features
```
GET /projects/:id/features?orderBy=priorityScore&limit=10
```
Response `200`:
```json
{
  "features": [
    {
      "id": "clx...",
      "title": "Guided CSV Import Wizard",
      "description": "Step-by-step wizard to help users upload and validate CSV files",
      "implementationIdea": "Multi-step UI with validation and preview",
      "expectedImpact": "Reduce onboarding friction by ~40%",
      "impactScore": 8.5,
      "confidenceScore": 7.2,
      "effortScore": 3.0,
      "priorityScore": 2.67,
      "problem": {
        "id": "clx...",
        "title": "CSV Import UX Confusing",
        "evidenceCount": 42
      }
    }
  ]
}
```

### Get Clusters
```
GET /projects/:id/clusters
```
Response `200`:
```json
{
  "clusters": [
    {
      "id": "clx...",
      "name": "Data Import Problems",
      "signalCount": 42
    }
  ]
}
```

---

## Features

### Get Feature Detail
```
GET /features/:id
```
Response `200`: Full feature object with problem, PRD, tasks.

### Generate PRD
```
POST /features/:id/prd
```
Body: `{}` (empty, uses feature data)

Response `200`:
```json
{
  "prd": {
    "id": "clx...",
    "content": "# Guided CSV Import Wizard\n\n## Problem\n...",
    "featureId": "clx...",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "tasks": [
    { "id": "clx...", "title": "Build wizard UI", "status": "PENDING" },
    { "id": "clx...", "title": "Add CSV parser", "status": "PENDING" }
  ]
}
```

### Get PRD
```
GET /features/:id/prd
```
Response `200`: PRD object or `404` if not generated yet.

---

## Chat

### Send Message
```
POST /chat
```
Body:
```json
{
  "projectId": "clx...",
  "message": "What should we build next?"
}
```
Response `200`:
```json
{
  "response": "Based on your product data, I recommend building the **Guided CSV Import Wizard**.\n\nReason: 42 users complained about import confusion, causing 63% onboarding drop.",
  "toolCalls": [
    {
      "tool": "getFeatureSuggestions",
      "args": { "projectId": "clx..." },
      "result": { "features": [...] }
    }
  ],
  "messageId": "clx..."
}
```

### Get Chat History
```
GET /chat/:projectId/history?limit=50
```
Response `200`:
```json
{
  "messages": [
    {
      "id": "clx...",
      "role": "USER",
      "content": "What should we build next?",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "clx...",
      "role": "ASSISTANT",
      "content": "Based on your product data...",
      "toolCalls": {...},
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Health

### Health Check
```
GET /health
```
Response `200`:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "ok",
    "redis": "ok"
  }
}
```

---

## Error Responses

All errors follow:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

Error codes:
- `UNAUTHORIZED` — 401: missing/invalid token
- `FORBIDDEN` — 403: accessing another user's resource
- `NOT_FOUND` — 404: resource doesn't exist
- `VALIDATION_ERROR` — 400: invalid request body (includes `details`)
- `ANALYSIS_IN_PROGRESS` — 409: analysis already running
- `INTERNAL_ERROR` — 500: unexpected server error
