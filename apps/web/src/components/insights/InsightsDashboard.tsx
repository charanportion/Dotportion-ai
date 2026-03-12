"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";
import { createAPIClient } from "@/lib/api";
import { cn } from "@repo/ui";

export default function InsightsDashboard({ projectId }: { projectId: string }) {
  const { getToken } = useAuth();

  const { data: problemsData, isLoading: problemsLoading } = useSWR(
    `problems-${projectId}`,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return createAPIClient(token).getProblems(projectId);
    }
  );

  const { data: featuresData, isLoading: featuresLoading } = useSWR(
    `features-${projectId}`,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return createAPIClient(token).getFeatures(projectId);
    }
  );

  const problems = problemsData?.problems ?? [];
  const features = featuresData?.features ?? [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Link href={`/projects/${projectId}`} className="text-sm text-zinc-400 hover:text-zinc-600">
          Project
        </Link>
        <span className="text-zinc-300">/</span>
        <h1 className="text-2xl font-bold text-zinc-950">Insights</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Problems */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Top Problems
          </h2>

          {problemsLoading ? (
            <LoadingCards />
          ) : problems.length === 0 ? (
            <EmptyState message="No problems detected yet" />
          ) : (
            <div className="space-y-3">
              {problems.map((problem: any, index: number) => (
                <ProblemCard key={problem.id} problem={problem} rank={index + 1} />
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wider mb-4">
            Feature Suggestions
          </h2>

          {featuresLoading ? (
            <LoadingCards />
          ) : features.length === 0 ? (
            <EmptyState message="No features generated yet" />
          ) : (
            <div className="space-y-3">
              {features.map((feature: any, index: number) => (
                <FeatureCard key={feature.id} feature={feature} rank={index + 1} projectId={projectId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProblemCard({ problem, rank }: { problem: any; rank: number }) {
  const maxEvidence = 100;
  const pct = Math.min(100, (problem.evidenceCount / maxEvidence) * 100);
  const topFeature = problem.features?.[0];

  return (
    <div className="border border-zinc-200 rounded-lg p-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-400">{rank}</span>
          <h3 className="text-sm font-semibold text-zinc-950">{problem.title}</h3>
        </div>
        <span className="font-mono text-xs text-zinc-500 shrink-0 ml-2">
          {problem.evidenceCount} reports
        </span>
      </div>

      <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{problem.description}</p>

      {/* Severity bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-zinc-100 rounded-full">
          <div
            className="h-1 bg-zinc-950 rounded-full"
            style={{ width: `${(problem.severity / 10) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs text-zinc-400">
          {problem.severity.toFixed(1)}/10
        </span>
      </div>

      {/* Suggested fix */}
      {topFeature && (
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Suggested fix</div>
          <Link
            href={`/features/${topFeature.id}`}
            className="flex items-center justify-between hover:opacity-70 transition-opacity"
          >
            <span className="text-xs font-medium text-zinc-700 line-clamp-1">{topFeature.title}</span>
            <span className="font-mono text-xs text-zinc-400 shrink-0 ml-2">
              {topFeature.priorityScore.toFixed(2)}
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

function FeatureCard({
  feature,
  rank,
  projectId,
}: {
  feature: any;
  rank: number;
  projectId: string;
}) {
  return (
    <Link
      href={`/features/${feature.id}`}
      className="border border-zinc-200 rounded-lg p-5 block hover:border-zinc-400 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-zinc-400">{rank}</span>
          <h3 className="text-sm font-semibold text-zinc-950">{feature.title}</h3>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="font-mono text-sm font-bold text-zinc-950">
            {feature.priorityScore.toFixed(2)}
          </div>
          <div className="font-mono text-xs text-zinc-400">priority</div>
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{feature.description}</p>

      {feature.problem && (
        <div className="text-xs text-zinc-400 font-mono">
          ← {feature.problem.title} ({feature.problem.evidenceCount} reports)
        </div>
      )}
    </Link>
  );
}

function LoadingCards() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-zinc-200 rounded-lg p-5 animate-pulse">
          <div className="h-4 bg-zinc-100 rounded w-3/4 mb-2" />
          <div className="h-3 bg-zinc-100 rounded w-full mb-2" />
          <div className="h-1 bg-zinc-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-zinc-200 rounded-lg p-8 text-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
