import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { CHAT_AGENT_SYSTEM_PROMPT } from "../prompts/chat-agent.v1";

// Tool result types
export interface ProblemResult {
  id: string;
  title: string;
  description: string;
  severity: number;
  evidenceCount: number;
}

export interface FeatureResult {
  id: string;
  title: string;
  description: string;
  priorityScore: number;
  impactScore: number;
  expectedImpact: string;
  problem?: { title: string; evidenceCount: number } | null;
}

export interface ProjectSummaryResult {
  signalCount: number;
  problemCount: number;
  featureCount: number;
  topFeature?: { title: string; priorityScore: number } | null;
}

export interface CodeContextResult {
  modules: Array<{
    moduleName: string;
    filePath: string;
    moduleType: string;
    description: string;
    relevanceScore: number;
  }>;
}

export interface MetricsContextResult {
  metrics: Array<{
    metricName: string;
    metricType: string;
    value: number;
    periodDate: string;
    metadata?: Record<string, unknown>;
  }>;
}

// Tool implementations injected from API layer (keeps packages/ai free of @repo/db)
export interface ChatToolImplementations {
  getTopProblems: (projectId: string, limit: number) => Promise<ProblemResult[]>;
  getFeatureSuggestions: (projectId: string, limit: number) => Promise<FeatureResult[]>;
  getProblemEvidence: (problemId: string) => Promise<unknown>;
  getProjectSummary: (projectId: string) => Promise<ProjectSummaryResult>;
  getCodeContext: (projectId: string, query: string) => Promise<CodeContextResult>;
  getProductMetrics: (projectId: string) => Promise<MetricsContextResult>;
}

export interface ChatHistoryMessage {
  role: string;
  content: string;
}

export interface RunChatAgentParams {
  projectId: string;
  message: string;
  history: ChatHistoryMessage[];
  tools: ChatToolImplementations;
}

export interface ChatAgentResult {
  response: string;
  toolCalls: Array<{ tool: string; result: unknown }>;
}

function buildLangChainHistory(history: ChatHistoryMessage[]): BaseMessage[] {
  return history.map((m) =>
    m.role === "USER"
      ? new HumanMessage(m.content)
      : new AIMessage(m.content)
  );
}

export async function runChatAgent(params: RunChatAgentParams): Promise<ChatAgentResult> {
  const { projectId, message, history, tools } = params;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is required");

  const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey,
    temperature: 0.7,
    maxOutputTokens: 2048,
  });

  const toolCalls: Array<{ tool: string; result: unknown }> = [];

  // Define LangChain tools with Zod schemas
  const getTopProblemsTool = tool(
    async ({ limit = 5 }: { limit?: number }) => {
      const result = await tools.getTopProblems(projectId, limit);
      toolCalls.push({ tool: "getTopProblems", result });
      return JSON.stringify(result);
    },
    {
      name: "getTopProblems",
      description:
        "Returns top product problems detected from user feedback, ordered by evidence count. Use when user asks about problems, pain points, or what users complain about.",
      schema: z.object({
        limit: z.number().optional().describe("Number of problems to return (default: 5)"),
      }),
    }
  );

  const getFeatureSuggestionsTool = tool(
    async ({ limit = 5 }: { limit?: number }) => {
      const result = await tools.getFeatureSuggestions(projectId, limit);
      toolCalls.push({ tool: "getFeatureSuggestions", result });
      return JSON.stringify(result);
    },
    {
      name: "getFeatureSuggestions",
      description:
        "Returns recommended product features ranked by priority score. Use when user asks what to build, feature recommendations, or roadmap.",
      schema: z.object({
        limit: z.number().optional().describe("Number of features to return (default: 5)"),
      }),
    }
  );

  const getProblemEvidenceTool = tool(
    async ({ problemId }: { problemId: string }) => {
      const result = await tools.getProblemEvidence(problemId);
      toolCalls.push({ tool: "getProblemEvidence", result });
      return JSON.stringify(result);
    },
    {
      name: "getProblemEvidence",
      description:
        "Returns the actual user feedback messages that caused a problem to be detected. Use when user asks why a problem was identified or wants to see the evidence.",
      schema: z.object({
        problemId: z.string().describe("The problem ID to get evidence for"),
      }),
    }
  );

  const getProjectSummaryTool = tool(
    async () => {
      const result = await tools.getProjectSummary(projectId);
      toolCalls.push({ tool: "getProjectSummary", result });
      return JSON.stringify(result);
    },
    {
      name: "getProjectSummary",
      description:
        "Returns high-level project stats: signal count, problem count, top feature, analysis status. Use for general project overview questions.",
      schema: z.object({}),
    }
  );

  const getCodeContextTool = tool(
    async ({ query }: { query: string }) => {
      const result = await tools.getCodeContext(projectId, query);
      toolCalls.push({ tool: "getCodeContext", result });
      return JSON.stringify(result);
    },
    {
      name: "getCodeContext",
      description:
        "Returns relevant code modules (files, services, components) from the connected GitHub repository that relate to a query. Use when discussing feature implementation, asking which code areas are affected, or understanding the technical side of a problem.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "Search query describing the feature, problem, or technical area to look up"
          ),
      }),
    }
  );

  const getProductMetricsTool = tool(
    async () => {
      const result = await tools.getProductMetrics(projectId);
      toolCalls.push({ tool: "getProductMetrics", result });
      return JSON.stringify(result);
    },
    {
      name: "getProductMetrics",
      description:
        "Returns product usage metrics from PostHog (page views, signups, sessions, feature usage, conversions) for the last 30 days. Use when user asks about product usage, analytics, drop rates, user behavior, or business impact.",
      schema: z.object({}),
    }
  );

  const agent = createReactAgent({
    llm,
    tools: [
      getTopProblemsTool,
      getFeatureSuggestionsTool,
      getProblemEvidenceTool,
      getProjectSummaryTool,
      getCodeContextTool,
      getProductMetricsTool,
    ],
    prompt: CHAT_AGENT_SYSTEM_PROMPT,
  });

  const langChainHistory = buildLangChainHistory(history);

  const result = await agent.invoke({
    messages: [
      ...langChainHistory,
      new HumanMessage(message),
    ],
  });

  // Extract final AI response from messages
  const messages = result.messages as BaseMessage[];
  const lastAI = [...messages].reverse().find(
    (m) => m._getType() === "ai" && typeof m.content === "string" && m.content.trim()
  );

  const response = lastAI
    ? (lastAI.content as string)
    : "I couldn't generate a response. Please try again.";

  return { response, toolCalls };
}
