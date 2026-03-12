import { Worker, Job } from "bullmq";
import { runContextSync } from "@repo/context-engine";
import type { IntegrationType } from "@repo/db";
import { getRedisOptions } from "../lib/redis";

export const CONTEXT_SYNC_QUEUE = "context-sync";

export interface ContextSyncJobData {
  projectId: string;
  integrationType: IntegrationType;
}

export function startContextSyncWorker() {
  const worker = new Worker<ContextSyncJobData>(
    CONTEXT_SYNC_QUEUE,
    async (job: Job<ContextSyncJobData>) => {
      const { projectId, integrationType } = job.data;

      console.log(
        `[ContextSync] Starting ${integrationType} sync for project ${projectId}`
      );

      const result = await runContextSync(projectId, integrationType);

      console.log(`[ContextSync] Sync complete:`, {
        projectId,
        integrationType,
        itemsSynced: result.itemsSynced,
        errors: result.errors.length,
      });

      if (result.errors.length > 0) {
        console.error(`[ContextSync] ${integrationType} sync errors:`, result.errors);
      }

      return result;
    },
    {
      connection: getRedisOptions(),
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[ContextSync] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[ContextSync] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("[ContextSync] Worker error:", error);
  });

  console.log("[ContextSync] Context sync worker started");
  return worker;
}
