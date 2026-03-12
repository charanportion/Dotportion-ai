import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@repo/db";
import { requireAuth } from "../middleware/auth";

const uploadSignalsSchema = z.object({
  projectId: z.string().min(1),
  signals: z
    .array(
      z.object({
        content: z.string().min(1).max(5000),
        source: z
          .enum(["MANUAL", "CSV", "SUPPORT_TICKET", "INTERVIEW", "REVIEW", "SLACK"])
          .default("MANUAL"),
      })
    )
    .min(1)
    .max(500),
});

export async function signalRoutes(app: FastifyInstance) {
  // POST /signals/upload
  app.post("/signals/upload", { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const body = uploadSignalsSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: body.error.flatten(),
        },
      });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: body.data.projectId, userId },
    });

    if (!project) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    const signals = await prisma.signal.createMany({
      data: body.data.signals.map((s) => ({
        content: s.content,
        source: s.source,
        projectId: body.data.projectId,
      })),
    });

    return reply.status(201).send({
      count: signals.count,
    });
  });

  // GET /projects/:id/signals
  app.get<{ Params: { id: string }; Querystring: { page?: string; limit?: string } }>(
    "/projects/:id/signals",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const page = parseInt(request.query.page ?? "1");
      const limit = Math.min(parseInt(request.query.limit ?? "50"), 100);
      const skip = (page - 1) * limit;

      const project = await prisma.project.findFirst({
        where: { id: request.params.id, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const [signals, total] = await Promise.all([
        prisma.signal.findMany({
          where: { projectId: request.params.id },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          select: { id: true, content: true, source: true, sentiment: true, problem: true, featureArea: true, severity: true, createdAt: true, projectId: true, clusterId: true }, // omit embedding
        }),
        prisma.signal.count({ where: { projectId: request.params.id } }),
      ]);

      return reply.send({ signals, total, page });
    }
  );
}
