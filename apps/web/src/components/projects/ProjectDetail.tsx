"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";
import { createAPIClient } from "@/lib/api";

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const { getToken } = useAuth();

  const { data, isLoading } = useSWR(
    `project-${projectId}`,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      const api = createAPIClient(token);
      return api.getProject(projectId);
    },
    { refreshInterval: 3000 }
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-7 bg-zinc-100 rounded w-48 mb-2 animate-pulse" />
        <div className="h-5 bg-zinc-100 rounded w-64 animate-pulse" />
      </div>
    );
  }

  const project = data;
  if (!project) return null;

  const latestAnalysis = project.analyses?.[0];
  const hasInsights = project.status === "COMPLETE";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/projects" className="text-sm text-zinc-400 hover:text-zinc-600">
              Projects
            </Link>
            <span className="text-zinc-300">/</span>
            <h1 className="text-2xl font-bold text-zinc-950">{project.name}</h1>
          </div>
          {project.description && (
            <p className="text-sm text-zinc-500">{project.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Signals", value: project._count?.signals ?? 0 },
          { label: "Problems", value: project._count?.problems ?? 0 },
          { label: "Features", value: project._count?.features ?? 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border border-zinc-200 rounded-lg p-6"
          >
            <div className="font-mono text-3xl font-bold text-zinc-950 mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-zinc-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/projects/${projectId}/upload`}
          className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800"
        >
          Upload feedback
        </Link>

        {hasInsights && (
          <Link
            href={`/projects/${projectId}/insights`}
            className="border border-zinc-200 text-zinc-700 text-sm px-4 py-2 rounded-md hover:bg-zinc-50"
          >
            View insights
          </Link>
        )}

        {latestAnalysis?.status && (
          <span className="text-xs text-zinc-500 font-mono">
            Analysis: {latestAnalysis.status}
          </span>
        )}
      </div>

      {/* Analysis status */}
      {project.status === "PROCESSING" && latestAnalysis && (
        <AnalysisProgress
          projectId={projectId}
          analysisId={latestAnalysis.id}
        />
      )}
    </div>
  );
}

function AnalysisProgress({
  projectId,
  analysisId,
}: {
  projectId: string;
  analysisId: string;
}) {
  const { getToken } = useAuth();

  const { data } = useSWR(
    `analysis-${analysisId}`,
    async () => {
      const token = await getToken();
      if (!token) return null;
      return createAPIClient(token).getAnalysisStatus(analysisId);
    },
    { refreshInterval: 2000 }
  );

  if (!data) return null;

  const statusLabels: Record<string, string> = {
    PENDING: "Queued...",
    EXTRACTING_SIGNALS: "Extracting signals...",
    CLUSTERING: "Clustering feedback...",
    DETECTING_PROBLEMS: "Detecting problems...",
    GENERATING_FEATURES: "Generating features...",
    COMPLETE: "Complete",
  };

  return (
    <div className="mt-6 border border-zinc-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-700">
          {statusLabels[data.status] ?? data.status}
        </span>
        <span className="font-mono text-sm text-zinc-500">
          {data.progress}%
        </span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full">
        <div
          className="h-1.5 bg-zinc-950 rounded-full transition-all duration-500"
          style={{ width: `${data.progress}%` }}
        />
      </div>
    </div>
  );
}
