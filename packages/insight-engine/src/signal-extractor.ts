import {
  callClaudeJSON,
  SIGNAL_EXTRACTOR_SYSTEM_PROMPT,
  SIGNAL_EXTRACTOR_PROMPT_V1,
  CLUSTER_NAMER_PROMPT_V1,
} from "@repo/ai";
import type { ExtractedSignal, RawCluster, NamedCluster } from "./types";

/**
 * Extract structured product signal from raw feedback text
 */
export async function extractSignal(text: string): Promise<ExtractedSignal> {
  const result = await callClaudeJSON<ExtractedSignal>(
    SIGNAL_EXTRACTOR_PROMPT_V1(text),
    { systemPrompt: SIGNAL_EXTRACTOR_SYSTEM_PROMPT, maxTokens: 1024 }
  );

  return {
    problem: result.problem ?? "unknown",
    featureArea: result.featureArea ?? "general",
    sentiment: result.sentiment ?? "neutral",
    severity: result.severity ?? "medium",
  };
}

/**
 * Extract signals from multiple feedback texts in parallel (batched)
 */
export async function extractSignalsBatch(
  texts: string[],
  concurrency = 5
): Promise<ExtractedSignal[]> {
  const results: ExtractedSignal[] = [];

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(extractSignal));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Name a cluster using Claude based on its signal contents
 */
export async function nameCluster(cluster: RawCluster): Promise<NamedCluster> {
  const contents = cluster.signals.map((s) => s.content);

  const result = await callClaudeJSON<{ clusterName: string }>(
    CLUSTER_NAMER_PROMPT_V1(contents),
    { maxTokens: 128 }
  );

  return {
    ...cluster,
    name: result.clusterName ?? "General Issues",
  };
}
