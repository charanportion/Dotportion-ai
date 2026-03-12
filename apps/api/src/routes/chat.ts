import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@repo/db";
import { callClaude, CHAT_AGENT_SYSTEM_PROMPT } from "@repo/ai";
import { requireAuth } from "../middleware/auth";

const chatSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

// Tool implementations
async function getTopProblems(projectId: string, limit = 5) {
  return prisma.problem.findMany({
    where: { projectId },
    orderBy: { evidenceCount: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      evidenceCount: true,
    },
  });
}

async function getFeatureSuggestions(projectId: string, limit = 5) {
  return prisma.feature.findMany({
    where: { projectId },
    orderBy: { priorityScore: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      priorityScore: true,
      impactScore: true,
      expectedImpact: true,
      problem: { select: { title: true, evidenceCount: true } },
    },
  });
}

async function getProblemEvidence(problemId: string) {
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      cluster: {
        include: {
          signals: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: { content: true, source: true },
          },
        },
      },
    },
  });
  return problem;
}

async function getProjectSummary(projectId: string) {
  const [signalCount, problemCount, featureCount, topFeature] =
    await Promise.all([
      prisma.signal.count({ where: { projectId } }),
      prisma.problem.count({ where: { projectId } }),
      prisma.feature.count({ where: { projectId } }),
      prisma.feature.findFirst({
        where: { projectId },
        orderBy: { priorityScore: "desc" },
        select: { title: true, priorityScore: true },
      }),
    ]);

  return { signalCount, problemCount, featureCount, topFeature };
}

export async function chatRoutes(app: FastifyInstance) {
  // POST /chat
  app.post("/chat", { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const body = chatSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
    }

    const { projectId, message } = body.data;

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    // Load recent chat history
    const history = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { role: true, content: true },
    });
    const historyReversed = history.reverse();

    // Build context string from history
    const historyContext =
      historyReversed.length > 0
        ? `\n\nPrevious conversation:\n${historyReversed
            .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
            .join("\n")}`
        : "";

    // Simple tool-calling approach: detect intent and call appropriate tool
    const toolCallPrompt = `${CHAT_AGENT_SYSTEM_PROMPT}

Project ID: ${projectId}
${historyContext}

User message: "${message}"

First, determine which tool(s) to call to answer this question.
Then format your response as JSON:
{
  "toolsToCall": ["getTopProblems" | "getFeatureSuggestions" | "getProblemEvidence" | "getProjectSummary"],
  "reasoning": "why these tools are needed"
}

Only include tools that are actually needed. If the message is casual/greeting, return empty toolsToCall array.`;

    let toolResults: Record<string, unknown> = {};
    let toolCallsMeta: Array<{ tool: string; result: unknown }> = [];

    try {
      const toolPlanRaw = await callClaude(toolCallPrompt, { maxTokens: 512 });
      const cleaned = toolPlanRaw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const toolPlan = JSON.parse(cleaned) as {
        toolsToCall: string[];
        reasoning: string;
      };

      // Execute tools
      for (const tool of toolPlan.toolsToCall) {
        if (tool === "getTopProblems") {
          const result = await getTopProblems(projectId);
          toolResults["problems"] = result;
          toolCallsMeta.push({ tool, result });
        } else if (tool === "getFeatureSuggestions") {
          const result = await getFeatureSuggestions(projectId);
          toolResults["features"] = result;
          toolCallsMeta.push({ tool, result });
        } else if (tool === "getProjectSummary") {
          const result = await getProjectSummary(projectId);
          toolResults["summary"] = result;
          toolCallsMeta.push({ tool, result });
        }
      }
    } catch {
      // If tool planning fails, proceed without tools
    }

    // Generate final response with tool data
    const dataContext =
      Object.keys(toolResults).length > 0
        ? `\n\nData from your product analysis:\n${JSON.stringify(toolResults, null, 2)}`
        : "";

    const responsePrompt = `${CHAT_AGENT_SYSTEM_PROMPT}
${historyContext}
${dataContext}

User: ${message}

Respond helpfully based on the data above. Be specific and reference numbers.`;

    const response = await callClaude(responsePrompt, { maxTokens: 1500 });

    // Store messages
    await prisma.chatMessage.createMany({
      data: [
        { role: "USER", content: message, projectId, userId },
        {
          role: "ASSISTANT",
          content: response,
          toolCalls: toolCallsMeta.length > 0 ? (toolCallsMeta as any) : undefined,
          projectId,
          userId,
        },
      ],
    });

    return reply.send({
      response,
      toolCalls: toolCallsMeta,
      messageId: `msg_${Date.now()}`,
    });
  });

  // GET /chat/:projectId/history
  app.get<{ Params: { projectId: string }; Querystring: { limit?: string } }>(
    "/chat/:projectId/history",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const limit = Math.min(parseInt(request.query.limit ?? "50"), 100);

      const project = await prisma.project.findFirst({
        where: { id: request.params.projectId, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const messages = await prisma.chatMessage.findMany({
        where: { projectId: request.params.projectId },
        orderBy: { createdAt: "asc" },
        take: limit,
        select: {
          id: true,
          role: true,
          content: true,
          toolCalls: true,
          createdAt: true,
        },
      });

      return reply.send({ messages });
    }
  );
}
