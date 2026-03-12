import {
  callClaudeJSON,
  PROBLEM_DETECTOR_SYSTEM_PROMPT,
  PROBLEM_DETECTOR_PROMPT_V1,
} from "@repo/ai";
import type { NamedCluster, DetectedProblem } from "./types";

interface ProblemDetectionResult {
  title: string;
  description: string;
  severity: number;
  reasoning: string;
}

/**
 * Detect the underlying product problem from a cluster of signals
 */
export async function detectProblem(
  cluster: NamedCluster,
  clusterId: string
): Promise<DetectedProblem> {
  const complaints = cluster.signals.map((s) => s.content);

  const result = await callClaudeJSON<ProblemDetectionResult>(
    PROBLEM_DETECTOR_PROMPT_V1(cluster.name, complaints, cluster.signals.length),
    {
      systemPrompt: PROBLEM_DETECTOR_SYSTEM_PROMPT,
      maxTokens: 1024,
    }
  );

  return {
    title: result.title,
    description: result.description,
    severity: Math.max(1, Math.min(10, result.severity)), // clamp 1-10
    reasoning: result.reasoning,
    evidenceCount: cluster.signals.length,
    clusterId,
    sampleSignals: complaints.slice(0, 5),
  };
}

/**
 * Detect problems from all clusters in parallel (with concurrency limit)
 */
export async function detectProblems(
  clusters: Array<{ cluster: NamedCluster; clusterId: string }>,
  concurrency = 3
): Promise<DetectedProblem[]> {
  const results: DetectedProblem[] = [];

  for (let i = 0; i < clusters.length; i += concurrency) {
    const batch = clusters.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(({ cluster, clusterId }) => detectProblem(cluster, clusterId))
    );
    results.push(...batchResults);
  }

  return results;
}
