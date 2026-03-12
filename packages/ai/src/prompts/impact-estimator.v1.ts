export const IMPACT_ESTIMATOR_SYSTEM_PROMPT = `You are a senior engineering lead estimating feature complexity.
Your job is to estimate the engineering effort required to build a feature.
IMPORTANT: Respond with ONLY valid JSON. No markdown, no code blocks, no explanation.`;

export const IMPACT_ESTIMATOR_PROMPT_V1 = (
  featureTitle: string,
  featureDescription: string,
  implementationIdea: string
) => `
Estimate the engineering effort to build this feature.

Feature: ${featureTitle}
Description: ${featureDescription}
Implementation approach: ${implementationIdea}

Consider: UI changes, backend changes, database changes, third-party integrations.

Return JSON:
{
  "effortScore": <number 1-10, where 1=trivial (few hours), 5=medium (1-2 weeks), 10=massive (months)>,
  "confidenceScore": <number 1-10, where 10=very confident this feature will solve the problem>,
  "reasoning": "brief explanation of effort and confidence"
}
`;
