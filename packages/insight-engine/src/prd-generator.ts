import {
  callClaude,
  PRD_GENERATOR_SYSTEM_PROMPT,
  PRD_GENERATOR_PROMPT_V1,
  extractTasksFromPRD,
} from "@repo/ai";
import type { ScoredFeature, DetectedProblem } from "./types";

export interface GeneratedPRD {
  content: string;
  tasks: string[];
}

/**
 * Generate a full PRD markdown document for a feature
 */
export async function generatePRD(
  feature: ScoredFeature | { title: string; description: string; implementationIdea: string; expectedImpact: string },
  problem: DetectedProblem | { title: string; description: string; evidenceCount: number; sampleSignals: string[] }
): Promise<GeneratedPRD> {
  const content = await callClaude(
    PRD_GENERATOR_PROMPT_V1(
      feature.title,
      feature.description,
      problem.title,
      problem.description,
      problem.evidenceCount,
      problem.sampleSignals
    ),
    {
      systemPrompt: PRD_GENERATOR_SYSTEM_PROMPT,
      maxTokens: 3000,
    }
  );

  const tasks = extractTasksFromPRD(content);

  return { content, tasks };
}
