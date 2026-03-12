"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createAPIClient } from "@/lib/api";
import Link from "next/link";

export default function FeedbackUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploaded" | "error">("idle");
  const [uploadCount, setUploadCount] = useState(0);
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");

    // Parse pasted text — split by newlines and filter empty
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 3);

    if (lines.length === 0) {
      setError("No valid feedback found. Each line should be a separate feedback item.");
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const api = createAPIClient(token);

      // Upload in batches of 100
      let totalUploaded = 0;
      for (let i = 0; i < lines.length; i += 100) {
        const batch = lines.slice(i, i + 100);
        const result = await api.uploadSignals({
          projectId,
          signals: batch.map((content) => ({ content, source: "MANUAL" })),
        });
        totalUploaded += result.count;
      }

      setUploadCount(totalUploaded);
      setStatus("uploaded");
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAnalysis() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      await createAPIClient(token).runAnalysis(projectId);
      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to start analysis");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/projects/${projectId}`} className="text-sm text-zinc-400 hover:text-zinc-600">
            Project
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-2xl font-bold text-zinc-950">Upload feedback</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Paste feedback messages, one per line. Supports customer feedback, support tickets, reviews, interviews.
        </p>
      </div>

      {status === "uploaded" ? (
        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <div className="font-mono text-4xl font-bold text-zinc-950 mb-2">
            {uploadCount}
          </div>
          <p className="text-sm text-zinc-500 mb-6">
            feedback items uploaded successfully
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="bg-zinc-950 text-white text-sm px-5 py-2 rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Run AI analysis"}
            </button>
            <button
              onClick={() => { setStatus("idle"); setText(""); }}
              className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-md hover:bg-zinc-50"
            >
              Upload more
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">
              Paste feedback
              <span className="text-zinc-400 font-normal ml-1">(one item per line)</span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              placeholder={"CSV import is confusing\nExport takes too long\nCan't find the integration settings\nOnboarding is unclear\nApp crashes when uploading large files"}
              className="w-full border border-zinc-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-zinc-950 placeholder:text-zinc-300 resize-none"
            />
            <p className="text-xs text-zinc-400 mt-1.5">
              {text.split("\n").filter((l) => l.trim().length > 3).length} items detected
            </p>
          </div>

          {error && (
            <p className="text-sm border border-zinc-200 rounded p-3 bg-zinc-50 text-zinc-700">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={loading || !text.trim()}
              className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Uploading..." : "Upload feedback"}
            </button>
            <Link
              href={`/projects/${projectId}`}
              className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-md hover:bg-zinc-50"
            >
              Cancel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
