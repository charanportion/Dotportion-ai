import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@repo/db";
import { runChatAgent, ChatToolImplementations } from "@repo/ai";
import { getCodeContext, getProductMetrics } from "@repo/context-engine";
import { requireAuth } from "../middleware/auth";

const chatSchema = z.object({
  projectId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

function buildToolImplementations(): ChatToolImplementations {
  return {
    async getTopProblems(projectId, limit) {
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
    },

    async getFeatureSuggestions(projectId, limit) {
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
    },

    async getProblemEvidence(problemId) {
      return prisma.problem.findUnique({
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
    },

    async getProjectSummary(projectId) {
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
    },

    async getCodeContext(projectId, query) {
      return getCodeContext(projectId, query);
    },

    async getProductMetrics(projectId) {
      return getProductMetrics(projectId);
    },
  };
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

    try {
      const { response, toolCalls } = await runChatAgent({
        projectId,
        message,
        history: history.reverse().map((m) => ({ role: m.role, content: m.content })),
        tools: buildToolImplementations(),
      });

      // Store messages
      await prisma.chatMessage.createMany({
        data: [
          { role: "USER", content: message, projectId, userId },
          {
            role: "ASSISTANT",
            content: response,
            toolCalls: toolCalls.length > 0 ? (toolCalls as any) : undefined,
            projectId,
            userId,
          },
        ],
      });

      return reply.send({
        response,
        toolCalls,
        messageId: `msg_${Date.now()}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return reply.status(500).send({
        error: { code: "INTERNAL_ERROR", message: `Chat agent failed: ${errorMessage}` },
      });
    }
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
