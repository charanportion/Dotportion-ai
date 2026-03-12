"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";
import { createAPIClient } from "@/lib/api";
import { cn } from "@repo/ui";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

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

  // Build severity distribution for bar chart
  const severityBuckets = [
    { label: "1–3", min: 1, max: 3 },
    { label: "4–6", min: 4, max: 6 },
    { label: "7–8", min: 7, max: 8 },
    { label: "9–10", min: 9, max: 10 },
  ].map((bucket) => ({
    label: bucket.label,
    count: problems.filter(
      (p: any) => p.severity >= bucket.min && p.severity <= bucket.max
    ).length,
  }));

  const maxPriority = features.length > 0
    ? Math.max(...features.map((f: any) => f.priorityScore ?? 0))
    : 1;

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

      {/* Charts row */}
      {!problemsLoading && problems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Severity distribution */}
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Problem severity distribution
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={severityBuckets} barSize={32}>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#71717a", fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 6, fontSize: 12 }}
                  formatter={(value: number) => [value, "problems"]}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {severityBuckets.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.label === "9–10" ? "#09090b" : entry.label === "7–8" ? "#27272a" : "#a1a1aa"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary stats */}
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Problems", value: problems.length },
                { label: "Features", value: features.length },
                {
                  label: "Avg severity",
                  value: problems.length > 0
                    ? (problems.reduce((s: number, p: any) => s + p.severity, 0) / problems.length).toFixed(1)
                    : "–",
                },
                {
                  label: "Top priority",
                  value: features.length > 0
                    ? (maxPriority).toFixed(2)
                    : "–",
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-mono text-2xl font-bold text-zinc-950">{stat.value}</div>
                  <div className="text-xs text-zinc-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                <FeatureCard key={feature.id} feature={feature} rank={index + 1} projectId={projectId} maxPriority={maxPriority} />
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
  maxPriority,
}: {
  feature: any;
  rank: number;
  projectId: string;
  maxPriority: number;
}) {
  const pct = maxPriority > 0 ? Math.min(100, (feature.priorityScore / maxPriority) * 100) : 0;

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
        <div className="font-mono text-sm font-bold text-zinc-950 shrink-0 ml-2">
          {feature.priorityScore.toFixed(2)}
        </div>
      </div>

      <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{feature.description}</p>

      {/* Priority bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-zinc-100 rounded-full">
          <div
            className="h-1 bg-zinc-950 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-zinc-400 shrink-0">priority</span>
      </div>

      {feature.problem && (
        <div className="text-xs text-zinc-400 font-mono truncate">
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
