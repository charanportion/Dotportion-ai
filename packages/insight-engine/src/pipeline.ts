import { prisma } from "@repo/db";
import { generateEmbeddings } from "@repo/ai";
import { extractSignalsBatch } from "./signal-extractor";
import { clusterSignals } from "./cluster-engine";
import { detectProblems } from "./problem-detector";
import { generateFeatures } from "./feature-generator";
import { scoreAndRankFeatures } from "./impact-scoring";
import type { SignalWithEmbedding, PipelineResult } from "./types";

type RawSignal = { id: string; content: string };

/**
 * Main insight pipeline orchestrator
 *
 * Runs the full pipeline:
 * 1. Extract signals (Claude)
 * 2. Generate embeddings (OpenAI)
 * 3. Cluster signals (cosine similarity)
 * 4. Detect problems (Claude)
 * 5. Generate + score features (Claude + RICE)
 *
 * Updates Analysis status throughout.
 */
export async function runInsightPipeline(
  projectId: string,
  analysisId: string
): Promise<PipelineResult> {
  const updateStatus = async (status: string) => {
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: status as any, startedAt: new Date() },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "PROCESSING" },
    });
  };

  try {
    // ─── Stage 1: Extract Signals ─────────────────────────────────────────────
    await updateStatus("EXTRACTING_SIGNALS");

    // Load all signals for this project (gate for entire pipeline)
    const rawSignals: RawSignal[] = await prisma.$queryRawUnsafe<RawSignal[]>(
      `SELECT id, content FROM signals WHERE "projectId" = $1`,
      projectId
    );

    if (rawSignals.length === 0) {
      throw new Error("No signals to process");
    }

    // Only extract signals that haven't been classified yet
    const unextracted = await prisma.signal.findMany({
      where: { projectId, id: { in: rawSignals.map((s) => s.id) }, problem: null },
      select: { id: true },
    });

    if (unextracted.length > 0) {
      const unextractedSet = new Set(unextracted.map((s) => s.id));
      const signalsToExtract = rawSignals.filter((s) => unextractedSet.has(s.id));

      const extractedData = await extractSignalsBatch(
        signalsToExtract.map((s: RawSignal) => s.content)
      );

      await Promise.all(
        signalsToExtract.map((signal: RawSignal, i: number) => {
          const data = extractedData[i];
          if (!data) return Promise.resolve();
          return prisma.signal.update({
            where: { id: signal.id },
            data: {
              problem: data.problem,
              featureArea: data.featureArea,
              sentiment: data.sentiment === "positive" ? 1 : data.sentiment === "negative" ? -1 : 0,
              severity: data.severity,
            },
          });
        })
      );
    }

    // ─── Stage 2: Generate Embeddings ─────────────────────────────────────────
    // Only generate for signals that don't have embeddings yet (retry-safe)
    const signalsNeedingEmbeddings = await prisma.$queryRawUnsafe<RawSignal[]>(
      `SELECT id, content FROM signals WHERE "projectId" = $1 AND embedding IS NULL`,
      projectId
    );

    if (signalsNeedingEmbeddings.length > 0) {
      const newEmbeddings = await generateEmbeddings(
        signalsNeedingEmbeddings.map((s: RawSignal) => s.content)
      );
      await Promise.all(
        signalsNeedingEmbeddings.map((signal: RawSignal, i: number) => {
          const embedding = newEmbeddings[i];
          if (!embedding) return Promise.resolve();
          const vectorStr = `[${embedding.join(",")}]`;
          return prisma.$executeRawUnsafe(
            `UPDATE signals SET embedding = $1::vector WHERE id = $2`,
            vectorStr,
            signal.id
          );
        })
      );
    }

    // Fetch all embeddings from DB (covers both fresh and pre-existing from prior runs)
    type EmbeddingRow = { id: string; content: string; embedding: string };
    const embeddingRows = await prisma.$queryRawUnsafe<EmbeddingRow[]>(
      `SELECT id, content, embedding::text AS embedding FROM signals WHERE "projectId" = $1 AND embedding IS NOT NULL`,
      projectId
    );

    // ─── Stage 3: Cluster Signals ─────────────────────────────────────────────
    await updateStatus("CLUSTERING");

    const signalsWithEmbeddings: SignalWithEmbedding[] = embeddingRows.map(
      (row: EmbeddingRow) => ({
        id: row.id,
        content: row.content,
        // pgvector text format: "[0.1,0.2,...]"
        embedding: row.embedding.slice(1, -1).split(",").map(Number),
        projectId,
      })
    );

    const namedClusters = await clusterSignals(signalsWithEmbeddings);

    // Store clusters in DB
    const clusterRecords = await Promise.all(
      namedClusters.map(async (cluster) => {
        const record = await prisma.cluster.create({
          data: {
            name: cluster.name,
            signalCount: cluster.signals.length,
            projectId,
          },
        });

        // Update signals with clusterId
        await prisma.signal.updateMany({
          where: { id: { in: cluster.signals.map((s) => s.id) } },
          data: { clusterId: record.id },
        });

        return { cluster, record };
      })
    );

    // ─── Stage 4: Detect Problems ─────────────────────────────────────────────
    await updateStatus("DETECTING_PROBLEMS");

    const detectedProblems = await detectProblems(
      clusterRecords.map(({ cluster, record }) => ({
        cluster,
        clusterId: record.id,
      }))
    );

    // Store problems in DB
    const problemRecords = await Promise.all(
      detectedProblems.map((problem) =>
        prisma.problem.create({
          data: {
            title: problem.title,
            description: problem.description,
            severity: problem.severity,
            evidenceCount: problem.evidenceCount,
            reasoning: problem.reasoning,
            projectId,
            clusterId: problem.clusterId,
          },
        })
      )
    );

    // ─── Stage 5: Generate + Score Features ───────────────────────────────────
    await updateStatus("GENERATING_FEATURES");

    const generatedFeatures = await generateFeatures(
      problemRecords.map((record, i) => ({
        problem: detectedProblems[i]!,
        problemId: record.id,
      })),
      3,
      projectId
    );

    const problemMap = new Map(
      problemRecords.map((record, i) => [record.id, detectedProblems[i]!])
    );
    const scoredFeatures = await scoreAndRankFeatures(
      generatedFeatures
        .filter((feature) => problemMap.has(feature.problemId))
        .map((feature) => ({
          feature,
          problem: problemMap.get(feature.problemId)!,
        }))
    );

    // Store features in DB
    await Promise.all(
      scoredFeatures.map((feature) =>
        prisma.feature.create({
          data: {
            title: feature.title,
            description: feature.description,
            implementationIdea: feature.implementationIdea,
            expectedImpact: feature.expectedImpact,
            impactScore: feature.impactScore,
            confidenceScore: feature.confidenceScore,
            effortScore: feature.effortScore,
            priorityScore: feature.priorityScore,
            projectId,
            problemId: feature.problemId,
          },
        })
      )
    );

    // ─── Complete ─────────────────────────────────────────────────────────────
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "COMPLETE", completedAt: new Date() },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETE" },
    });

    return {
      projectId,
      signalsProcessed: rawSignals.length,
      clustersCreated: namedClusters.length,
      problemsDetected: detectedProblems.length,
      featuresGenerated: scoredFeatures.length,
      status: "COMPLETE",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "ERROR", error: errorMessage },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "ERROR" },
    });

    throw error;
  }
}
