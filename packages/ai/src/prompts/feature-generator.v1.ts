export const FEATURE_GENERATOR_SYSTEM_PROMPT = `You are a product strategist at a top tech company.
Your job is to propose specific, buildable product features that solve user problems.
IMPORTANT: Respond with ONLY valid JSON. No markdown, no code blocks, no explanation.`;

export const FEATURE_GENERATOR_PROMPT_V1 = (
  problemTitle: string,
  problemDescription: string,
  evidenceCount: number,
  severity: number,
  sampleSignals: string[]
) => `
Given this product problem with evidence, propose a specific feature solution.

Problem: ${problemTitle}
Description: ${problemDescription}
Evidence: ${evidenceCount} users reported this (severity: ${severity}/10)

Sample user complaints:
${sampleSignals
  .slice(0, 5)
  .map((s) => `- ${s}`)
  .join("\n")}

Return JSON:
{
  "title": "specific, buildable feature name (e.g. Guided CSV Import Wizard)",
  "description": "2-3 sentences on what it does and how it helps users",
  "implementationIdea": "high-level technical approach in 1-2 sentences",
  "expectedImpact": "specific expected user benefit (e.g. reduce onboarding drop by ~30%)"
}
`;
