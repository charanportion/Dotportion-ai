export const SIGNAL_EXTRACTOR_SYSTEM_PROMPT = `You are an expert product manager analyzing customer feedback.
Your job is to extract structured product signals from user messages.
IMPORTANT: Respond with ONLY valid JSON. No markdown, no code blocks, no explanation.`;

export const SIGNAL_EXTRACTOR_PROMPT_V1 = (feedback: string) => `
Extract structured product signals from this user feedback.

Return JSON with these exact fields:
{
  "problem": "the main user issue in 3-8 words",
  "featureArea": "which part of the product (e.g. onboarding, dashboard, export, import, navigation, performance, billing)",
  "sentiment": "positive" | "neutral" | "negative",
  "severity": "low" | "medium" | "high"
}

User feedback:
${feedback}
`;

export const CLUSTER_NAMER_PROMPT_V1 = (complaints: string[]) => `
Given these user complaints, create a short 2-5 word cluster name that captures the common theme.

Complaints:
${complaints.slice(0, 10).map((c, i) => `${i + 1}. ${c}`).join("\n")}

Return JSON:
{
  "clusterName": "short theme name"
}
`;
