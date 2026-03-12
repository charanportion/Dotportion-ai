"use client";

import { useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import Link from "next/link";
import { createAPIClient } from "@/lib/api";
import { cn } from "@repo/ui";

const statusLabel: Record<string, string> = {
  IDLE: "No analysis",
  PROCESSING: "Processing",
  COMPLETE: "Ready",
  ERROR: "Error",
};

export default function ProjectsList() {
  const { getToken } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    "projects",
    async () => {
      const token = await getToken();
      if (!token) throw new Error("No token");
      return createAPIClient(token).getProjects();
    },
    { refreshInterval: 5000 }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="border border-zinc-200 rounded-lg p-6 animate-pulse"
          >
            <div className="h-5 bg-zinc-100 rounded w-2/3 mb-2" />
            <div className="h-4 bg-zinc-100 rounded w-full mb-4" />
            <div className="h-4 bg-zinc-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-zinc-200 rounded-lg p-8 text-center">
        <p className="text-sm text-zinc-500">Failed to load projects.</p>
      </div>
    );
  }

  const projects = data?.projects ?? [];

  if (projects.length === 0) {
    return (
      <div className="border border-zinc-200 rounded-lg p-12 text-center">
        <h3 className="font-semibold text-zinc-950 mb-2">No projects yet</h3>
        <p className="text-sm text-zinc-500 mb-6">
          Create a project to start analyzing customer feedback.
        </p>
        <Link
          href="/projects/new"
          className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800"
        >
          Create first project
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project: any) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="border border-zinc-200 rounded-lg p-6 hover:border-zinc-400 transition-colors block"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-zinc-950 text-sm leading-tight">
              {project.name}
            </h3>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded border",
                project.status === "COMPLETE"
                  ? "bg-zinc-950 text-white border-zinc-950"
                  : project.status === "PROCESSING"
                  ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                  : project.status === "ERROR"
                  ? "border-zinc-900 text-zinc-900"
                  : "border-zinc-200 text-zinc-500"
              )}
            >
              {statusLabel[project.status] ?? project.status}
            </span>
          </div>

          {project.description && (
            <p className="text-xs text-zinc-500 mb-4 line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
            <span>{project._count?.signals ?? 0} signals</span>
            <span>{project._count?.problems ?? 0} problems</span>
            <span>{project._count?.features ?? 0} features</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
