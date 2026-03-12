import { prisma } from "@repo/db";
import type { IntegrationType } from "@repo/db";
import { fetchGitHubFiles } from "./adapters/github-adapter";
import { fetchPostHogMetrics } from "./adapters/posthog-adapter";
import { fetchSlackMessages } from "./adapters/slack-adapter";
import { normalizeGitHubFiles } from "./normalizers/github-normalizer";
import { normalizePostHogEvents } from "./normalizers/posthog-normalizer";
import { normalizeSlackMessages } from "./normalizers/slack-normalizer";
import type {
  GitHubCredentials,
  PostHogCredentials,
  SlackCredentials,
  SyncResult,
} from "./types";

export async function runContextSync(
  projectId: string,
  type: IntegrationType
): Promise<SyncResult> {
  const result: SyncResult = {
    integrationType: type,
    itemsSynced: 0,
    errors: [],
  };

  const config = await prisma.integrationConfig.findUnique({
    where: { projectId_type: { projectId, type } },
  });

  if (!config || !config.isActive) {
    result.errors.push(`No active integration config found for type ${type}`);
    return result;
  }

  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: {
      projectId,
      integrationType: type,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    if (type === "GITHUB") {
      result.itemsSynced = await syncGitHub(
        projectId,
        config.credentials as unknown as GitHubCredentials,
        result.errors
      );
    } else if (type === "POSTHOG") {
      result.itemsSynced = await syncPostHog(
        projectId,
        config.credentials as unknown as PostHogCredentials,
        result.errors
      );
    } else if (type === "SLACK") {
      result.itemsSynced = await syncSlack(
        projectId,
        config.credentials as unknown as SlackCredentials,
        result.errors
      );
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "COMPLETE",
        itemsSynced: result.itemsSynced,
        completedAt: new Date(),
      },
    });

    await prisma.integrationConfig.update({
      where: { projectId_type: { projectId, type } },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[${type}] Sync threw error:`, errorMessage);
    result.errors.push(errorMessage);

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "ERROR",
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    await prisma.integrationConfig.update({
      where: { projectId_type: { projectId, type } },
      data: { lastSyncError: errorMessage },
    });
  }

  return result;
}

async function syncGitHub(
  projectId: string,
  credentials: GitHubCredentials,
  errors: string[]
): Promise<number> {
  const files = await fetchGitHubFiles(credentials);
  console.log(`[GitHub] Fetched ${files.length} files from repo`);
  const modules = await normalizeGitHubFiles(files, errors);
  console.log(`[GitHub] Normalized ${modules.length}/${files.length} modules`);

  // Delete existing modules for this project before inserting fresh ones
  await prisma.codeModule.deleteMany({ where: { projectId } });

  let synced = 0;
  for (const mod of modules) {
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO code_modules (id, module_name, file_path, module_type, description, raw_content, embedding, synced_at, "createdAt", "projectId")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6::vector, NOW(), NOW(), $7)`,
        mod.moduleName,
        mod.filePath,
        mod.moduleType,
        mod.description,
        mod.rawContent,
        `[${mod.embedding.join(",")}]`,
        projectId
      );
      synced++;
    } catch (err) {
      errors.push(
        `Failed to insert module ${mod.filePath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return synced;
}

async function syncPostHog(
  projectId: string,
  credentials: PostHogCredentials,
  _errors: string[]
): Promise<number> {
  const events = await fetchPostHogMetrics(credentials);
  const metrics = normalizePostHogEvents(events);

  if (metrics.length === 0) return 0;

  // Delete today's metrics and re-insert fresh data
  const today = new Date().toISOString().split("T")[0]!;
  await prisma.productMetric.deleteMany({
    where: { projectId, periodDate: today },
  });

  await prisma.productMetric.createMany({
    data: metrics.map((m) => ({
      projectId,
      metricName: m.metricName,
      metricType: m.metricType,
      value: m.value,
      periodDate: m.periodDate,
      metadata: m.metadata,
    })),
  });

  return metrics.length;
}

async function syncSlack(
  projectId: string,
  credentials: SlackCredentials,
  _errors: string[]
): Promise<number> {
  const messages = await fetchSlackMessages(credentials);
  const signals = normalizeSlackMessages(messages);

  // Check for duplicates by content hash — only insert new signals
  const existing = await prisma.signal.findMany({
    where: { projectId, source: "SLACK" },
    select: { content: true },
  });
  const existingSet = new Set(existing.map((s) => s.content));

  const newSignals = signals.filter((s) => !existingSet.has(s.content));

  if (newSignals.length > 0) {
    await prisma.signal.createMany({
      data: newSignals.map((s) => ({
        projectId,
        content: s.content,
        source: "SLACK" as const,
      })),
    });
  }

  return newSignals.length;
}
