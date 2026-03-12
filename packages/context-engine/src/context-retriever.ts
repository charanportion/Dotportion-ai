import { prisma } from "@repo/db";
import { generateEmbedding } from "@repo/ai";
import type { CodeContextResult, MetricsContextResult } from "./types";

const TOP_K = 5;

export async function getCodeContext(
  projectId: string,
  query: string
): Promise<CodeContextResult> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  // Cosine similarity search using pgvector
  const rows = await prisma.$queryRaw<
    Array<{
      module_name: string;
      file_path: string;
      module_type: string;
      description: string;
      similarity: number;
    }>
  >`
    SELECT
      module_name,
      file_path,
      module_type,
      description,
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM code_modules
    WHERE "projectId" = ${projectId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${TOP_K}
  `;

  return {
    modules: rows.map((row) => ({
      moduleName: row.module_name,
      filePath: row.file_path,
      moduleType: row.module_type,
      description: row.description,
      relevanceScore: Number(row.similarity),
    })),
  };
}

export async function getProductMetrics(
  projectId: string
): Promise<MetricsContextResult> {
  // Return last 30 days of metrics, one row per metric (most recent)
  const metrics = await prisma.productMetric.findMany({
    where: { projectId },
    orderBy: [{ metricName: "asc" }, { periodDate: "desc" }],
    distinct: ["metricName"],
    take: 20,
  });

  return {
    metrics: metrics.map((m) => ({
      metricName: m.metricName,
      metricType: m.metricType,
      value: m.value,
      periodDate: m.periodDate,
      metadata: (m.metadata as Record<string, unknown>) ?? undefined,
    })),
  };
}
