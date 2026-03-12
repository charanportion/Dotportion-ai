"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createAPIClient } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value;

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const project = await createAPIClient(token).createProject({
        name,
        description: description || undefined,
      });

      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create project");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-950">New project</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Create a project to analyze customer feedback.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Project name
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="My SaaS App"
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Description{" "}
            <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="CRM for freelancers..."
            className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-400 resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-zinc-700 border border-zinc-200 rounded p-3 bg-zinc-50">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create project"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-md hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
