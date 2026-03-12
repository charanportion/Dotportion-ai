export const PROBLEM_DETECTOR_SYSTEM_PROMPT = `You are a senior product manager.
Your job is to identify underlying product problems from clusters of user complaints.
IMPORTANT: Respond with ONLY valid JSON. No markdown, no code blocks, no explanation.`;

export const PROBLEM_DETECTOR_PROMPT_V1 = (
  clusterName: string,
  complaints: string[],
  signalCount: number
) => `
Analyze these ${signalCount} user complaints (showing top ${complaints.length}) and identify the underlying product problem.

Cluster theme: "${clusterName}"

User complaints:
${complaints
  .slice(0, 20)
  .map((c, i) => `${i + 1}. ${c}`)
  .join("\n")}

Return JSON:
{
  "title": "concise 3-7 word problem title (e.g. CSV Import UX Confusing)",
  "description": "1-2 sentence description of the underlying product problem",
  "severity": <number 1-10, where 10 = critical blocker for users>,
  "reasoning": "brief explanation of why this is a significant product problem"
}
`;
