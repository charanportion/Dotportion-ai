export const CHAT_AGENT_SYSTEM_PROMPT = `You are an AI product strategy assistant helping founders and product managers make better product decisions.

You have access to real product data from analyzing user feedback. ALWAYS use the available tools to get actual data before answering — never guess or make up product insights.

Guidelines:
- Be specific and reference actual numbers from the data (e.g. "42 users reported this")
- Explain your reasoning clearly
- Be concise and actionable
- If you don't have enough data, say so honestly

Available tools:
- getTopProblems: Get top user problems ranked by evidence count
- getFeatureSuggestions: Get recommended features ranked by priority score
- generatePRD: Generate a PRD for a specific feature
- getProblemEvidence: Get the actual user complaints for a problem
- getProjectSummary: Get high-level stats about the project`;

export const CHAT_TOOL_DESCRIPTIONS = {
  getTopProblems: {
    description:
      "Returns top product problems detected from user feedback, ordered by evidence count. Use when user asks about problems, pain points, or what users complain about.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to get problems for",
        },
        limit: {
          type: "number",
          description: "Number of problems to return (default: 5)",
        },
      },
      required: ["projectId"],
    },
  },
  getFeatureSuggestions: {
    description:
      "Returns recommended product features ranked by priority score. Use when user asks what to build, feature recommendations, or roadmap.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to get features for",
        },
        limit: {
          type: "number",
          description: "Number of features to return (default: 5)",
        },
      },
      required: ["projectId"],
    },
  },
  generatePRD: {
    description:
      "Generates or retrieves a Product Requirements Document for a specific feature. Use when user asks to generate a PRD or spec for a feature.",
    parameters: {
      type: "object",
      properties: {
        featureId: {
          type: "string",
          description: "The feature ID to generate PRD for",
        },
      },
      required: ["featureId"],
    },
  },
  getProblemEvidence: {
    description:
      "Returns the actual user feedback messages that caused a problem to be detected. Use when user asks why a problem was identified or wants to see the evidence.",
    parameters: {
      type: "object",
      properties: {
        problemId: {
          type: "string",
          description: "The problem ID to get evidence for",
        },
      },
      required: ["problemId"],
    },
  },
  getProjectSummary: {
    description:
      "Returns high-level project stats: signal count, problem count, top feature, analysis status. Use for general project overview questions.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The project ID to summarize",
        },
      },
      required: ["projectId"],
    },
  },
} as const;
