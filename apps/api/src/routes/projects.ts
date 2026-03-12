import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@repo/db";
import { requireAuth } from "../middleware/auth";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function projectRoutes(app: FastifyInstance) {
  // POST /projects
  app.post("/projects", { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;
    const body = createProjectSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body",
          details: body.error.flatten(),
        },
      });
    }

    const project = await prisma.project.create({
      data: {
        name: body.data.name,
        description: body.data.description,
        userId,
      },
    });

    return reply.status(201).send(project);
  });

  // GET /projects
  app.get("/projects", { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId as string;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { signals: true, problems: true, features: true },
        },
      },
    });

    return reply.send({ projects });
  });

  // GET /projects/:id
  app.get<{ Params: { id: string } }>(
    "/projects/:id",
    { preHandler: requireAuth },
    async (request, reply) => {
      const userId = (request as any).userId as string;

      const project = await prisma.project.findFirst({
        where: { id: request.params.id, userId },
        include: {
          _count: {
            select: { signals: true, problems: true, features: true },
          },
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (!project) {
        return reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Project not found" },
        });
      }

      return reply.send(project);
    }
  );

  // DELETE /projects/:id
  app.delete<{ Params: { id: string } }>(
    "/projects/:id",
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

      await prisma.project.delete({ where: { id: project.id } });
      return reply.status(204).send();
    }
  );
}
