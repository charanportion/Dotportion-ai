import { config } from "dotenv";
import { resolve } from "path";
// Load root .env first, then app-level .env (app-level overrides root)
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });
import { prisma } from "@repo/db";
import { startAnalysisWorker } from "./workers/analysis.worker";

async function main() {
  console.log("[Worker] Starting workers...");

  // Test DB connection
  await prisma.$connect();
  console.log("[Worker] Database connected");

  // Start workers
  const analysisWorker = startAnalysisWorker();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Worker] Shutting down...");
    await analysisWorker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  console.log("[Worker] All workers running. Waiting for jobs...");
}

main().catch((error) => {
  console.error("[Worker] Fatal error:", error);
  process.exit(1);
});
