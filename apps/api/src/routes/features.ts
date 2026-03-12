import { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import { generatePRD } from "@repo/insight-engine";
import { requireAuth } from "../middleware/auth";

export async function featureRoutes(app: FastifyInstance) {
  // GET /features/:id
  app.get<{ Params: { id: string } }>(
    "/features/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const feature = await prisma.feature.findFirst({
        where: { id: request.params.id },
        include: {
          problem: true,
          prd: true,
          tasks: { orderBy: { createdAt: "asc" } },
          project: { select: { userId: true } },
        },
      });

      if (!feature || feature.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Feature not found" },
        });
      }

      return reply.send(feature);
    }
  );

  // POST /features/:id/prd — generate PRD
  app.post<{ Params: { id: string } }>(
    "/features/:id/prd",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const feature = await prisma.feature.findFirst({
        where: { id: request.params.id },
        include: {
          problem: {
            include: {
              cluster: { include: { signals: { take: 10, select: { content: true } } } },
            },
          },
          project: { select: { userId: true } },
        },
      });

      if (!feature || feature.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Feature not found" },
        });
      }

      // Return existing PRD if already generated
      const existingPRD = await prisma.pRD.findUnique({
        where: { featureId: feature.id },
      });

      if (existingPRD) {
        const tasks = await prisma.task.findMany({
          where: { featureId: feature.id },
        });
        return reply.send({ prd: existingPRD, tasks });
      }

      // Generate new PRD
      const sampleSignals = (feature.problem.cluster.signals as { content: string }[]).map(
        (s) => s.content
      );

      const { content, tasks: taskTitles } = await generatePRD(
        {
          title: feature.title,
          description: feature.description,
          implementationIdea: feature.implementationIdea ?? "",
          expectedImpact: feature.expectedImpact ?? "",
        },
        {
          title: feature.problem.title,
          description: feature.problem.description,
          evidenceCount: feature.problem.evidenceCount,
          sampleSignals,
        }
      );

      // Store PRD and tasks
      const prd = await prisma.pRD.create({
        data: { content, featureId: feature.id },
      });

      await prisma.task.createMany({
        data: taskTitles.map((title) => ({
          title,
          featureId: feature.id,
        })),
      });

      const allTasks = await prisma.task.findMany({
        where: { featureId: feature.id },
      });

      return reply.send({ prd, tasks: allTasks });
    }
  );

  // GET /features/:id/prd
  app.get<{ Params: { id: string } }>(
    "/features/:id/prd",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const feature = await prisma.feature.findFirst({
        where: { id: request.params.id },
        include: { project: { select: { userId: true } } },
      });

      if (!feature || feature.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Feature not found" },
        });
      }

      const prd = await prisma.pRD.findUnique({
        where: { featureId: feature.id },
      });

      if (!prd) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "PRD not generated yet" },
        });
      }

      return reply.send(prd);
    }
  );
}
