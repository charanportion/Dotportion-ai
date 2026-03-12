import type { PostHogCredentials, RawPostHogEvent } from "../types";

const DEFAULT_HOST = "https://us.posthog.com";
const LOOKBACK_DAYS = 30;
const MAX_EVENTS = 20;

export async function fetchPostHogMetrics(
  credentials: PostHogCredentials
): Promise<RawPostHogEvent[]> {
  const host = credentials.host ?? DEFAULT_HOST;
  const dateTo = new Date().toISOString().split("T")[0]!;

  const query = `
    SELECT event, count() as total
    FROM events
    WHERE timestamp >= now() - interval ${LOOKBACK_DAYS} day
    GROUP BY event
    ORDER BY total DESC
    LIMIT ${MAX_EVENTS}
  `.trim();

  const url = `${host}/api/projects/${credentials.projectId}/query/`;
  console.log(`[PostHog] Querying HogQL: ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    console.error(`[PostHog] query ${response.status}: ${body}`);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `PostHog authentication failed (${response.status}): ${body}`
      );
    }
    return [];
  }

  const data = (await response.json()) as {
    results?: Array<[string, number]>;
  };

  console.log(`[PostHog] Got ${data.results?.length ?? 0} event types`);

  return (data.results ?? [])
    .filter(([name]) => Boolean(name))
    .map(([name, count]) => ({ name, count, date: dateTo }));
}
