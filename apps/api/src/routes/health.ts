import { FastifyInstance } from "fastify";
import { prisma } from "@repo/db";
import { getRedis } from "../lib/redis";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_, reply) => {
    const dbStatus = await prisma.$queryRaw`SELECT 1`
      .then(() => "ok")
      .catch(() => "error");

    const redisStatus = await getRedis()
      .ping()
      .then(() => "ok")
      .catch(() => "error");

    const status = dbStatus === "ok" && redisStatus === "ok" ? "ok" : "degraded";

    return reply.status(status === "ok" ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      services: { database: dbStatus, redis: redisStatus },
    });
  });
}
