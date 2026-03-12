import type { RawPostHogEvent } from "../types";

export interface NormalizedMetric {
  metricName: string;
  metricType: "count" | "rate";
  value: number;
  periodDate: string;
  metadata: Record<string, unknown>;
}

const EVENT_NAME_MAP: Record<string, string> = {
  $pageview: "page_views",
  user_signed_up: "signups",
  feature_used: "feature_usage",
  session_start: "sessions",
  checkout_completed: "conversions",
};

export function normalizePostHogEvents(
  events: RawPostHogEvent[]
): NormalizedMetric[] {
  return events.map((event) => ({
    metricName: EVENT_NAME_MAP[event.name] ?? event.name,
    metricType: "count",
    value: event.count,
    periodDate: event.date,
    metadata: { originalEventName: event.name },
  }));
}
