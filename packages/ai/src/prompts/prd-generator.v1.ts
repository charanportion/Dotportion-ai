export const PRD_GENERATOR_SYSTEM_PROMPT = `You are a senior product manager writing a Product Requirements Document.
Write clear, actionable PRDs that engineers can implement from.`;

export const PRD_GENERATOR_PROMPT_V1 = (
  featureTitle: string,
  featureDescription: string,
  problemTitle: string,
  problemDescription: string,
  evidenceCount: number,
  sampleSignals: string[]
) => `
Create a Product Requirements Document (PRD) for this feature.

Feature: ${featureTitle}
Description: ${featureDescription}

Problem it solves: ${problemTitle}
${problemDescription}

Evidence: ${evidenceCount} user reports including:
${sampleSignals
  .slice(0, 5)
  .map((s) => `- ${s}`)
  .join("\n")}

Write the PRD in markdown format with these sections:

# ${featureTitle}

## Problem Statement
[Why this needs to be built — reference the user evidence]

## User Story
As a [user type], I want [goal] so that [outcome].

## Solution Overview
[What the feature does — clear, concise]

## User Flow
[Numbered steps of the user journey]

## Edge Cases
[Bullet list of edge cases to handle]

## Success Metrics
[2-3 measurable success criteria]

## Engineering Tasks
[Bullet list using - [ ] format, specific implementable tasks]
`;

export const TASK_EXTRACTION_PATTERN = /- \[ \] (.+)/g;

export function extractTasksFromPRD(prdContent: string): string[] {
  const tasks: string[] = [];
  const matches = prdContent.matchAll(TASK_EXTRACTION_PATTERN);
  for (const match of matches) {
    if (match[1]) tasks.push(match[1].trim());
  }
  return tasks;
}
