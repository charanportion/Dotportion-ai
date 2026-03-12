import type { RawSlackMessage } from "../types";

export interface NormalizedSlackSignal {
  content: string;
  source: "SLACK";
  metadata: { channelId: string; userId: string; ts: string };
}

const PRODUCT_KEYWORDS = [
  "bug",
  "broken",
  "crash",
  "slow",
  "feature",
  "should",
  "wish",
  "need",
  "can't",
  "doesn't work",
  "problem",
  "issue",
  "idea",
  "want",
  "request",
  "improvement",
  "fix",
  "annoying",
  "confusing",
];

function isProductRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return PRODUCT_KEYWORDS.some((kw) => lower.includes(kw));
}

export function normalizeSlackMessages(
  messages: RawSlackMessage[]
): NormalizedSlackSignal[] {
  return messages
    .filter((m) => isProductRelevant(m.text))
    .map((m) => ({
      content: m.text,
      source: "SLACK" as const,
      metadata: { channelId: m.channelId, userId: m.userId, ts: m.ts },
    }));
}
