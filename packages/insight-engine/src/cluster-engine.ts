import type { SignalWithEmbedding, RawCluster, NamedCluster } from "./types";
import { nameCluster } from "./signal-extractor";

const SIMILARITY_THRESHOLD = 0.78;

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    magA += (a[i] ?? 0) ** 2;
    magB += (b[i] ?? 0) ** 2;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Average multiple vectors into a centroid
 */
function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0]!.length;
  const sum = new Array(dim).fill(0) as number[];

  for (const vec of vectors) {
    for (let i = 0; i < dim; i++) {
      sum[i]! += vec[i] ?? 0;
    }
  }

  return sum.map((v) => v / vectors.length);
}

/**
 * Group signals into clusters using cosine similarity threshold
 * MVP approach: O(n²) — suitable for up to ~1000 signals
 */
export function groupSignalsBySimilarity(
  signals: SignalWithEmbedding[],
  threshold = SIMILARITY_THRESHOLD
): RawCluster[] {
  const clusters: RawCluster[] = [];

  for (const signal of signals) {
    let assigned = false;

    for (const cluster of clusters) {
      const sim = cosineSimilarity(signal.embedding, cluster.centroid);
      if (sim >= threshold) {
        cluster.signals.push(signal);
        // Update centroid as rolling average
        cluster.centroid = averageVectors(
          cluster.signals.map((s) => s.embedding)
        );
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.push({
        signals: [signal],
        centroid: [...signal.embedding],
      });
    }
  }

  // Filter out singleton clusters (single signal) — merge into nearest
  return clusters.filter((c) => c.signals.length >= 1);
}

/**
 * Cluster signals and assign Claude-generated names
 */
export async function clusterSignals(
  signals: SignalWithEmbedding[],
  threshold = SIMILARITY_THRESHOLD
): Promise<NamedCluster[]> {
  const rawClusters = groupSignalsBySimilarity(signals, threshold);

  // Name clusters in parallel
  const namedClusters = await Promise.all(
    rawClusters.map((cluster) => nameCluster(cluster))
  );

  return namedClusters;
}
