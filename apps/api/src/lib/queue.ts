import { Queue } from "bullmq";
import { getRedisOptions } from "./redis";

export const ANALYSIS_QUEUE = "analysis";
export const CONTEXT_SYNC_QUEUE = "context-sync";

let _analysisQueue: Queue | null = null;
let _contextSyncQueue: Queue | null = null;

export function getAnalysisQueue(): Queue {
  if (!_analysisQueue) {
    _analysisQueue = new Queue(ANALYSIS_QUEUE, {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return _analysisQueue;
}

export function getContextSyncQueue(): Queue {
  if (!_contextSyncQueue) {
    _contextSyncQueue = new Queue(CONTEXT_SYNC_QUEUE, {
      connection: getRedisOptions(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 25,
      },
    });
  }
  return _contextSyncQueue;
}

export interface AnalysisJobData {
  projectId: string;
  analysisId: string;
  userId: string;
}

export interface ContextSyncJobData {
  projectId: string;
  integrationType: "GITHUB" | "POSTHOG" | "SLACK";
}
