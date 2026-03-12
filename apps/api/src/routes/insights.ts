import { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import { requireAuth } from "../middleware/auth";

export async function insightRoutes(app: FastifyInstance) {
  // GET /projects/:id/problems
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/projects/:id/problems",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const limit = Math.min(parseInt(request.query.limit ?? "10"), 20);

      const project = await prisma.project.findFirst({
        where: { id: request.params.id, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const problems = await prisma.problem.findMany({
        where: { projectId: request.params.id },
        orderBy: { evidenceCount: "desc" },
        take: limit,
        include: {
          features: {
            select: { id: true, title: true, priorityScore: true },
            orderBy: { priorityScore: "desc" },
            take: 1,
          },
        },
      });

      return reply.send({ problems });
    }
  );

  // GET /projects/:id/features
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/projects/:id/features",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const limit = Math.min(parseInt(request.query.limit ?? "10"), 20);

      const project = await prisma.project.findFirst({
        where: { id: request.params.id, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const features = await prisma.feature.findMany({
        where: { projectId: request.params.id },
        orderBy: { priorityScore: "desc" },
        take: limit,
        include: {
          problem: {
            select: { id: true, title: true, evidenceCount: true },
          },
        },
      });

      return reply.send({ features });
    }
  );

  // GET /projects/:id/clusters
  app.get<{ Params: { id: string } }>(
    "/projects/:id/clusters",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const project = await prisma.project.findFirst({
        where: { id: request.params.id, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const clusters = await prisma.cluster.findMany({
        where: { projectId: request.params.id },
        orderBy: { signalCount: "desc" },
      });

      return reply.send({ clusters });
    }
  );
}
