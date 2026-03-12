import {
  callClaudeJSON,
  IMPACT_ESTIMATOR_SYSTEM_PROMPT,
  IMPACT_ESTIMATOR_PROMPT_V1,
} from "@repo/ai";
import type { DetectedProblem, GeneratedFeature, ScoredFeature } from "./types";

interface EffortEstimate {
  effortScore: number;
  confidenceScore: number;
  reasoning: string;
}

/**
 * Get effort + confidence estimate from Claude
 */
async function estimateEffort(
  feature: GeneratedFeature
): Promise<EffortEstimate> {
  const result = await callClaudeJSON<EffortEstimate>(
    IMPACT_ESTIMATOR_PROMPT_V1(
      feature.title,
      feature.description,
      feature.implementationIdea
    ),
    {
      systemPrompt: IMPACT_ESTIMATOR_SYSTEM_PROMPT,
      maxTokens: 512,
    }
  );

  return {
    effortScore: Math.max(1, Math.min(10, result.effortScore)),
    confidenceScore: Math.max(1, Math.min(10, result.confidenceScore)),
    reasoning: result.reasoning,
  };
}

/**
 * Calculate RICE-based priority score
 *
 * Formula: priority = (severity × normalizedEvidence × confidence) / effort
 * where normalizedEvidence = evidenceCount / 100 (capped at 1.0)
 */
function calculatePriorityScore(
  severity: number,
  evidenceCount: number,
  confidenceScore: number,
  effortScore: number
): number {
  const normalizedEvidence = Math.min(1.0, evidenceCount / 100);
  const priority =
    (severity * normalizedEvidence * confidenceScore) / effortScore;
  return Math.round(priority * 100) / 100; // round to 2 decimal places
}

/**
 * Score a single feature using Claude effort estimation + RICE formula
 */
export async function scoreFeature(
  feature: GeneratedFeature,
  problem: DetectedProblem
): Promise<ScoredFeature> {
  const { effortScore, confidenceScore } = await estimateEffort(feature);

  const impactScore = problem.severity * Math.min(1.0, problem.evidenceCount / 100);
  const priorityScore = calculatePriorityScore(
    problem.severity,
    problem.evidenceCount,
    confidenceScore,
    effortScore
  );

  return {
    ...feature,
    impactScore: Math.round(impactScore * 10) / 10,
    confidenceScore,
    effortScore,
    priorityScore,
  };
}

/**
 * Score all features and sort by priority
 */
export async function scoreAndRankFeatures(
  featureProblems: Array<{
    feature: GeneratedFeature;
    problem: DetectedProblem;
  }>,
  concurrency = 3
): Promise<ScoredFeature[]> {
  const scored: ScoredFeature[] = [];

  for (let i = 0; i < featureProblems.length; i += concurrency) {
    const batch = featureProblems.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(({ feature, problem }) => scoreFeature(feature, problem))
    );
    scored.push(...batchResults);
  }

  // Sort by priority score descending
  return scored.sort((a, b) => b.priorityScore - a.priorityScore);
}
