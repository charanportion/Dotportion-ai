import { Queue } from "bullmq";
import { getRedisOptions } from "./redis";

export const ANALYSIS_QUEUE = "analysis";

let _analysisQueue: Queue | null = null;

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

export interface AnalysisJobData {
  projectId: string;
  analysisId: string;
  userId: string;
}
