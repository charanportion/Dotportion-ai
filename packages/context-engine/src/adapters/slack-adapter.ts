import type { SlackCredentials, RawSlackMessage } from "../types";

const SLACK_API = "https://slack.com/api";
const MESSAGES_PER_CHANNEL = 200;
const LOOKBACK_DAYS = 7;

async function slackFetch<T>(
  endpoint: string,
  token: string,
  params: Record<string, string> = {}
): Promise<T> {
  const url = new URL(`${SLACK_API}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await response.json()) as { ok: boolean; error?: string } & T;
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data;
}

export async function fetchSlackMessages(
  credentials: SlackCredentials
): Promise<RawSlackMessage[]> {
  const oldest = String(
    Math.floor((Date.now() - LOOKBACK_DAYS * 86400000) / 1000)
  );

  const allMessages: RawSlackMessage[] = [];

  for (const channelId of credentials.channelIds) {
    try {
      const data = await slackFetch<{
        messages: Array<{ ts: string; text: string; user: string }>;
      }>("conversations.history", credentials.botToken, {
        channel: channelId,
        limit: String(MESSAGES_PER_CHANNEL),
        oldest,
      });

      const messages = (data.messages ?? [])
        .filter((m) => m.text?.length > 20)
        .map((m) => ({
          ts: m.ts,
          text: m.text,
          channelId,
          userId: m.user,
        }));

      allMessages.push(...messages);
    } catch {
      // Non-fatal: skip channels with revoked access
    }
  }

  return allMessages;
}
