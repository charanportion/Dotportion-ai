// ─────────────────────────────────────────────────────────────────────────────
// Input / Output types for each pipeline stage
// ─────────────────────────────────────────────────────────────────────────────

export interface RawSignalInput {
  id: string;
  content: string;
  projectId: string;
}

export interface ExtractedSignal {
  problem: string;
  featureArea: string;
  sentiment: "positive" | "neutral" | "negative";
  severity: "low" | "medium" | "high";
}

export interface SignalWithEmbedding {
  id: string;
  content: string;
  problem?: string | null;
  featureArea?: string | null;
  sentiment?: string | null;
  severity?: string | null;
  embedding: number[];
  projectId: string;
}

export interface RawCluster {
  signals: SignalWithEmbedding[];
  centroid: number[];
}

export interface NamedCluster extends RawCluster {
  name: string;
}

export interface DetectedProblem {
  title: string;
  description: string;
  severity: number; // 0-10
  reasoning: string;
  evidenceCount: number;
  clusterId: string;
  sampleSignals: string[];
}

export interface GeneratedFeature {
  title: string;
  description: string;
  implementationIdea: string;
  expectedImpact: string;
  problemId: string;
}

export interface ScoredFeature extends GeneratedFeature {
  impactScore: number;     // 0-10
  confidenceScore: number; // 0-10
  effortScore: number;     // 1-10 (higher = more effort)
  priorityScore: number;   // (severity × evidenceCount × confidence) / effort
}

export type PipelineStatus =
  | "PENDING"
  | "EXTRACTING_SIGNALS"
  | "CLUSTERING"
  | "DETECTING_PROBLEMS"
  | "GENERATING_FEATURES"
  | "COMPLETE"
  | "ERROR";

export interface PipelineResult {
  projectId: string;
  signalsProcessed: number;
  clustersCreated: number;
  problemsDetected: number;
  featuresGenerated: number;
  status: PipelineStatus;
}
