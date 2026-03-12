// ─────────────────────────────────────────────────────────────────────────────
// CREDENTIALS
// ─────────────────────────────────────────────────────────────────────────────

export interface GitHubCredentials {
  accessToken: string;
  repoOwner: string;
  repoName: string;
  branch?: string;
}

export interface PostHogCredentials {
  apiKey: string;
  projectId: string;
  host?: string;
}

export interface SlackCredentials {
  botToken: string;
  channelIds: string[];
}

export type IntegrationCredentials =
  | GitHubCredentials
  | PostHogCredentials
  | SlackCredentials;

// ─────────────────────────────────────────────────────────────────────────────
// RAW ADAPTER OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

export interface RawGitHubFile {
  path: string;
  content: string;
  sha: string;
}

export interface RawPostHogEvent {
  name: string;
  count: number;
  date: string;
}

export interface RawSlackMessage {
  ts: string;
  text: string;
  channelId: string;
  userId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC RESULT
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncResult {
  integrationType: "GITHUB" | "POSTHOG" | "SLACK";
  itemsSynced: number;
  errors: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT RETRIEVAL RESULTS (used by chat agent + feature-generator)
// ─────────────────────────────────────────────────────────────────────────────

export interface CodeContextModule {
  moduleName: string;
  filePath: string;
  moduleType: string;
  description: string;
  relevanceScore: number;
}

export interface CodeContextResult {
  modules: CodeContextModule[];
}

export interface MetricsContextMetric {
  metricName: string;
  metricType: string;
  value: number;
  periodDate: string;
  metadata?: Record<string, unknown>;
}

export interface MetricsContextResult {
  metrics: MetricsContextMetric[];
}
