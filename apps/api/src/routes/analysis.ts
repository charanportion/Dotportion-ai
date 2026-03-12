import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import { getAnalysisQueue, type AnalysisJobData } from "../lib/queue";

const runAnalysisSchema = z.object({
  projectId: z.string().min(1),
});

export async function analysisRoutes(app: FastifyInstance) {
  // POST /analysis/run
  app.post("/analysis/run", { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const body = runAnalysisSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      });
    }

    const project = await prisma.project.findFirst({
      where: { id: body.data.projectId, userId },
      include: { _count: { select: { signals: true } } },
    });

    if (!project) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Project not found" },
      });
    }

    if (project._count.signals === 0) {
      return reply.status(400).send({
        error: {
          code: "NO_SIGNALS",
          message: "Upload feedback signals before running analysis",
        },
      });
    }

    // Check for in-progress analysis
    const inProgress = await prisma.analysis.findFirst({
      where: {
        projectId: body.data.projectId,
        status: {
          in: [
            "PENDING",
            "EXTRACTING_SIGNALS",
            "CLUSTERING",
            "DETECTING_PROBLEMS",
            "GENERATING_FEATURES",
          ],
        },
      },
    });

    if (inProgress) {
      return reply.status(409).send({
        error: {
          code: "ANALYSIS_IN_PROGRESS",
          message: "Analysis is already running for this project",
        },
      });
    }

    // Create analysis record
    const analysis = await prisma.analysis.create({
      data: { projectId: body.data.projectId, status: "PENDING" },
    });

    // Enqueue job
    const jobData: AnalysisJobData = {
      projectId: body.data.projectId,
      analysisId: analysis.id,
      userId,
    };

    const job = await getAnalysisQueue().add("run-analysis", jobData);

    await prisma.analysis.update({
      where: { id: analysis.id },
      data: { jobId: job.id?.toString() },
    });

    return reply.status(202).send({
      analysisId: analysis.id,
      jobId: job.id,
      status: "PENDING",
    });
  });

  // GET /analysis/:id/status
  app.get<{ Params: { id: string } }>(
    "/analysis/:id/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const analysis = await prisma.analysis.findFirst({
        where: { id: request.params.id },
        include: { project: { select: { userId: true } } },
      });

      if (!analysis || analysis.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Analysis not found" },
        });
      }

      const statusToProgress: Record<string, number> = {
        PENDING: 0,
        EXTRACTING_SIGNALS: 20,
        CLUSTERING: 40,
        DETECTING_PROBLEMS: 60,
        GENERATING_FEATURES: 80,
        COMPLETE: 100,
        ERROR: 0,
      };

      return reply.send({
        id: analysis.id,
        status: analysis.status,
        progress: statusToProgress[analysis.status] ?? 0,
        startedAt: analysis.startedAt,
        completedAt: analysis.completedAt,
        error: analysis.error,
      });
    }
  );
}
