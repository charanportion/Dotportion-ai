import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@repo/db";
import { requireAuth } from "../middleware/auth";
import {
  getContextSyncQueue,
  type ContextSyncJobData,
} from "../lib/queue";

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

const githubCredentialsSchema = z.object({
  accessToken: z.string().min(1),
  repoOwner: z.string().min(1),
  repoName: z.string().min(1),
  branch: z.string().optional(),
});

const posthogCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  projectId: z.string().min(1),
  host: z.string().url().optional(),
});

const slackCredentialsSchema = z.object({
  botToken: z.string().min(1),
  channelIds: z.array(z.string().min(1)).min(1),
});

const createIntegrationSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(["GITHUB", "POSTHOG", "SLACK"]),
  credentials: z.union([
    githubCredentialsSchema,
    posthogCredentialsSchema,
    slackCredentialsSchema,
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function maskCredentials(
  type: string,
  credentials: Record<string, unknown>
): Record<string, unknown> {
  const mask = (value: unknown) =>
    typeof value === "string" && value.length > 4
      ? `${value.slice(0, 4)}${"*".repeat(8)}`
      : "****";

  if (type === "GITHUB") {
    return {
      ...credentials,
      accessToken: mask(credentials.accessToken),
    };
  }
  if (type === "POSTHOG") {
    return {
      ...credentials,
      apiKey: mask(credentials.apiKey),
    };
  }
  if (type === "SLACK") {
    return {
      ...credentials,
      botToken: mask(credentials.botToken),
    };
  }
  return credentials;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

export async function integrationRoutes(app: FastifyInstance) {
  // POST /integrations — create or update integration
  app.post(
    "/integrations",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;
      const body = createIntegrationSchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({
          error: { code: "VALIDATION_ERROR", message: body.error.issues[0]?.message ?? "Invalid request body" },
        });
      }

      const { projectId, type, credentials } = body.data;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const config = await prisma.integrationConfig.upsert({
        where: { projectId_type: { projectId, type } },
        update: {
          credentials: credentials as any,
          isActive: true,
          lastSyncError: null,
        },
        create: {
          projectId,
          type,
          credentials: credentials as any,
        },
      });

      return reply.status(201).send({
        id: config.id,
        type: config.type,
        isActive: config.isActive,
        lastSyncAt: config.lastSyncAt,
        credentials: maskCredentials(type, credentials as Record<string, unknown>),
      });
    }
  );

  // GET /integrations/:projectId — list all integrations for a project
  app.get<{ Params: { projectId: string } }>(
    "/integrations/:projectId",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const project = await prisma.project.findFirst({
        where: { id: request.params.projectId, userId },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      const configs = await prisma.integrationConfig.findMany({
        where: { projectId: request.params.projectId },
        orderBy: { createdAt: "asc" },
      });

      return reply.send(
        configs.map((config) => ({
          id: config.id,
          type: config.type,
          isActive: config.isActive,
          lastSyncAt: config.lastSyncAt,
          lastSyncError: config.lastSyncError,
          credentials: maskCredentials(
            config.type,
            config.credentials as Record<string, unknown>
          ),
        }))
      );
    }
  );

  // DELETE /integrations/:id — remove integration
  app.delete<{ Params: { id: string } }>(
    "/integrations/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const config = await prisma.integrationConfig.findFirst({
        where: { id: request.params.id },
        include: { project: { select: { userId: true } } },
      });

      if (!config || config.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Integration not found" },
        });
      }

      await prisma.integrationConfig.delete({ where: { id: request.params.id } });

      return reply.status(204).send();
    }
  );

  // POST /integrations/:id/sync — enqueue a sync job
  app.post<{ Params: { id: string } }>(
    "/integrations/:id/sync",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const config = await prisma.integrationConfig.findFirst({
        where: { id: request.params.id },
        include: { project: { select: { userId: true, id: true } } },
      });

      if (!config || config.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Integration not found" },
        });
      }

      if (!config.isActive) {
        return reply.status(400).send({
          error: { code: "INACTIVE", message: "Integration is disabled" },
        });
      }

      const jobData: ContextSyncJobData = {
        projectId: config.project.id,
        integrationType: config.type,
      };

      const job = await getContextSyncQueue().add("context-sync", jobData);

      return reply.status(202).send({
        jobId: job.id,
        status: "PENDING",
        integrationType: config.type,
      });
    }
  );

  // GET /integrations/:id/sync/status — poll latest sync status
  app.get<{ Params: { id: string } }>(
    "/integrations/:id/sync/status",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const config = await prisma.integrationConfig.findFirst({
        where: { id: request.params.id },
        include: { project: { select: { userId: true, id: true } } },
      });

      if (!config || config.project.userId !== userId) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Integration not found" },
        });
      }

      const latestSync = await prisma.syncLog.findFirst({
        where: {
          projectId: config.project.id,
          integrationType: config.type,
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send({
        integrationId: config.id,
        type: config.type,
        lastSyncAt: config.lastSyncAt,
        lastSyncError: config.lastSyncError,
        latestSync: latestSync
          ? {
              id: latestSync.id,
              status: latestSync.status,
              itemsSynced: latestSync.itemsSynced,
              error: latestSync.error,
              startedAt: latestSync.startedAt,
              completedAt: latestSync.completedAt,
            }
          : null,
      });
    }
  );
}
