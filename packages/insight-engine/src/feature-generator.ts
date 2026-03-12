import {
  callClaudeJSON,
  FEATURE_GENERATOR_SYSTEM_PROMPT,
  FEATURE_GENERATOR_PROMPT_V1,
} from "@repo/ai";
import { getCodeContext } from "@repo/context-engine";
import type { DetectedProblem, GeneratedFeature } from "./types";

interface FeatureGenerationResult {
  title: string;
  description: string;
  implementationIdea: string;
  expectedImpact: string;
}

/**
 * Generate a feature suggestion for a detected problem.
 * If projectId is provided, fetches code context to enrich the suggestion.
 */
export async function generateFeature(
  problem: DetectedProblem,
  problemId: string,
  projectId?: string
): Promise<GeneratedFeature> {
  // Fetch code context if a GitHub integration exists for this project
  let codeContext:
    | Array<{ moduleName: string; filePath: string; description: string }>
    | undefined;

  if (projectId) {
    try {
      const ctx = await getCodeContext(projectId, problem.description);
      if (ctx.modules.length > 0) {
        codeContext = ctx.modules;
      }
    } catch {
      // Non-fatal: proceed without code context if retrieval fails
    }
  }

  const result = await callClaudeJSON<FeatureGenerationResult>(
    FEATURE_GENERATOR_PROMPT_V1(
      problem.title,
      problem.description,
      problem.evidenceCount,
      problem.severity,
      problem.sampleSignals,
      codeContext
    ),
    {
      systemPrompt: FEATURE_GENERATOR_SYSTEM_PROMPT,
      maxTokens: 1024,
    }
  );

  return {
    title: result.title,
    description: result.description,
    implementationIdea: result.implementationIdea,
    expectedImpact: result.expectedImpact,
    problemId,
  };
}

/**
 * Generate features for all problems in parallel
 */
export async function generateFeatures(
  problems: Array<{ problem: DetectedProblem; problemId: string }>,
  concurrency = 3,
  projectId?: string
): Promise<GeneratedFeature[]> {
  const results: GeneratedFeature[] = [];

  for (let i = 0; i < problems.length; i += concurrency) {
    const batch = problems.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(({ problem, problemId }) =>
        generateFeature(problem, problemId, projectId)
      )
    );
    results.push(...batchResults);
  }

  return results;
}
