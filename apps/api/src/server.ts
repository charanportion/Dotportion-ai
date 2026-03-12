import Fastify from "fastify";
import cors from "@fastify/cors";
import { healthRoutes } from "./routes/health";
import { projectRoutes } from "./routes/projects";
import { signalRoutes } from "./routes/signals";
import { analysisRoutes } from "./routes/analysis";
import { insightRoutes } from "./routes/insights";
import { featureRoutes } from "./routes/features";
import { chatRoutes } from "./routes/chat";
import { integrationRoutes } from "./routes/integrations";

export function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "warn" : "info",
    },
  });

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  app.register(cors, {
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL ?? false
        : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // ─── Routes ──────────────────────────────────────────────────────────────────
  app.register(healthRoutes);
  app.register(projectRoutes);
  app.register(signalRoutes);
  app.register(analysisRoutes);
  app.register(insightRoutes);
  app.register(featureRoutes);
  app.register(chatRoutes);
  app.register(integrationRoutes);

  // ─── Global error handler ─────────────────────────────────────────────────────
  app.setErrorHandler((error: Error, _, reply) => {
    app.log.error(error);
    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error.message,
      },
    });
  });

  return app;
}
