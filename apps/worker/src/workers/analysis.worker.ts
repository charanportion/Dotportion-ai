import { Worker, Job } from "bullmq";
import { runInsightPipeline } from "@repo/insight-engine";
import { getRedisOptions } from "../lib/redis";

export const ANALYSIS_QUEUE = "analysis";

export interface AnalysisJobData {
  projectId: string;
  analysisId: string;
  userId: string;
}

export function startAnalysisWorker() {
  const worker = new Worker<AnalysisJobData>(
    ANALYSIS_QUEUE,
    async (job: Job<AnalysisJobData>) => {
      const { projectId, analysisId } = job.data;

      console.log(`[Worker] Starting analysis for project ${projectId}`);

      const result = await runInsightPipeline(projectId, analysisId);

      console.log(`[Worker] Analysis complete:`, {
        projectId,
        signalsProcessed: result.signalsProcessed,
        problemsDetected: result.problemsDetected,
        featuresGenerated: result.featuresGenerated,
      });

      return result;
    },
    {
      connection: getRedisOptions(),
      concurrency: 2, // process 2 jobs at once
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error) => {
    console.error("[Worker] Worker error:", error);
  });

  console.log("[Worker] Analysis worker started");
  return worker;
}
