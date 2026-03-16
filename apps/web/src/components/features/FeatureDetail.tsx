"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { useState } from "react";
import Link from "next/link";
import { createAPIClient } from "@/lib/api";

function MarkdownPRD({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-lg font-bold text-zinc-950 mt-6 mb-2 first:mt-0">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-base font-semibold text-zinc-950 mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-sm font-semibold text-zinc-700 mt-4 mb-1.5">{line.slice(4)}</h3>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1 mb-3">
          {items.map((item, j) => <li key={j} className="text-sm text-zinc-700">{renderInline(item)}</li>)}
        </ul>
      );
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal pl-5 space-y-1 mb-3">
          {items.map((item, j) => <li key={j} className="text-sm text-zinc-700">{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(<hr key={i} className="border-zinc-200 my-4" />);
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="text-sm text-zinc-700 mb-2 leading-relaxed">{renderInline(line)}</p>);
    }
    i++;
  }

  return <div className="prose-zinc">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-zinc-950">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="font-mono text-xs bg-zinc-100 px-1 py-0.5 rounded">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function FeatureDetail({ featureId }: { featureId: string }) {
  const { getToken } = useAuth();
  const [generatingPRD, setGeneratingPRD] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    `feature-${featureId}`,
    async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return createAPIClient(token).getFeature(featureId);
    }
  );

  const feature = data;

  async function handleGeneratePRD() {
    setGeneratingPRD(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
      await createAPIClient(token).generatePRD(featureId);
      mutate();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingPRD(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-7 bg-zinc-100 rounded w-64 mb-4 animate-pulse" />
        <div className="h-5 bg-zinc-100 rounded w-full mb-2 animate-pulse" />
        <div className="h-5 bg-zinc-100 rounded w-3/4 animate-pulse" />
      </div>
    );
  }

  if (!feature) return null;

  const projectId = feature.project?.id ?? feature.projectId;

  return (
    <div className="p-8 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm text-zinc-400">
        <Link href="/projects" className="hover:text-zinc-600">Projects</Link>
        <span>/</span>
        {projectId && (
          <>
            <Link href={`/projects/${projectId}/insights`} className="hover:text-zinc-600">
              Insights
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-zinc-700 font-medium truncate max-w-xs">{feature.title}</span>
      </div>

      {/* Feature header */}
      <h1 className="text-2xl font-bold text-zinc-950 mb-2">{feature.title}</h1>
      <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{feature.description}</p>

      {/* Scores */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Priority", value: feature.priorityScore?.toFixed(2) },
          { label: "Impact", value: feature.impactScore?.toFixed(1) },
          { label: "Confidence", value: feature.confidenceScore?.toFixed(1) },
          { label: "Effort", value: `${feature.effortScore?.toFixed(1)}/10` },
        ].map((s) => (
          <div key={s.label} className="border border-zinc-200 rounded-lg p-4">
            <div className="font-mono text-xl font-bold text-zinc-950">{s.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Problem */}
      {feature.problem && (
        <div className="border border-zinc-200 rounded-lg p-5 mb-8">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Solves problem
          </h3>
          <p className="text-sm font-semibold text-zinc-950">{feature.problem.title}</p>
          <p className="text-xs text-zinc-500 mt-1">{feature.problem.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs font-mono text-zinc-400">
            <span>{feature.problem.evidenceCount} reports</span>
            <span>severity {feature.problem.severity?.toFixed(1)}/10</span>
          </div>
        </div>
      )}

      {/* Implementation */}
      {feature.implementationIdea && (
        <div className="border border-zinc-200 rounded-lg p-5 mb-8">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Implementation idea
          </h3>
          <p className="text-sm text-zinc-700">{feature.implementationIdea}</p>
        </div>
      )}

      {/* PRD Section */}
      <div className="border border-zinc-200 rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200">
          <h3 className="text-sm font-semibold text-zinc-950">Product Requirements Document</h3>
          <div className="flex items-center gap-2">
            {feature.prd && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(feature.prd.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="border border-zinc-200 text-zinc-600 text-xs px-3 py-1.5 rounded-md hover:bg-zinc-50"
              >
                {copied ? "Copied!" : "Copy markdown"}
              </button>
            )}
            {!feature.prd && (
              <button
                onClick={handleGeneratePRD}
                disabled={generatingPRD}
                className="bg-zinc-950 text-white text-xs px-3 py-1.5 rounded-md hover:bg-zinc-800 disabled:opacity-50"
              >
                {generatingPRD ? "Generating..." : "Generate PRD"}
              </button>
            )}
          </div>
        </div>

        {feature.prd ? (
          <div className="p-6">
            <MarkdownPRD content={feature.prd.content} />
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-zinc-500 mb-4">
              No PRD generated yet. Click "Generate PRD" to create a full product requirements document.
            </p>
          </div>
        )}
      </div>

      {/* Tasks */}
      {feature.tasks && feature.tasks.length > 0 && (
        <div className="mt-6 border border-zinc-200 rounded-lg">
          <div className="p-5 border-b border-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-950">
              Engineering tasks
            </h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {feature.tasks.map((task: any) => (
              <div key={task.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-4 h-4 rounded border border-zinc-300 shrink-0" />
                <span className="text-sm text-zinc-700">{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
