"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { createAPIClient } from "@/lib/api";
import Link from "next/link";

type UploadMode = "text" | "csv";
type UploadStatus = "idle" | "uploaded" | "analyzing" | "error";

const ANALYSIS_STAGES: Record<string, { label: string; step: number }> = {
  PENDING:             { label: "Queued", step: 0 },
  EXTRACTING_SIGNALS:  { label: "Extracting signals", step: 1 },
  CLUSTERING:          { label: "Clustering feedback", step: 2 },
  DETECTING_PROBLEMS:  { label: "Detecting problems", step: 3 },
  GENERATING_FEATURES: { label: "Generating features", step: 4 },
  COMPLETE:            { label: "Complete", step: 5 },
};

const STAGE_LABELS = [
  "Queued",
  "Extracting signals",
  "Clustering feedback",
  "Detecting problems",
  "Generating features",
];

function parseCSV(text: string): string[] {
  return text
    .split("\n")
    .map((line) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      return cols[0] ?? "";
    })
    .filter((line) => line.length > 5);
}

export default function FeedbackUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [mode, setMode] = useState<UploadMode>("text");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [text, setText] = useState("");
  const [csvRows, setCsvRows] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState("PENDING");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [error, setError] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (!analysisId) return;

    async function poll() {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await createAPIClient(token).getAnalysisStatus(analysisId!);
        setAnalysisStage(data.status);
        setAnalysisProgress(data.progress);

        if (data.status === "COMPLETE") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          router.push(`/projects/${projectId}/insights`);
        } else if (data.status === "ERROR") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError(data.error ?? "Analysis failed. Please try again.");
          setStatus("error");
        }
      } catch {
        // Keep polling on transient network errors
      }
    }

    poll();
    pollingRef.current = setInterval(poll, 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [analysisId, projectId, router, getToken]);

  function handleCSVFile(file: File) {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rows = parseCSV(e.target?.result as string);
      setCsvRows(rows);
      setCsvPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function handleUpload() {
    const lines =
      mode === "csv"
        ? csvRows
        : text
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 3);

    if (lines.length === 0) {
      setError("No valid feedback found.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const api = createAPIClient(token);
      const source = mode === "csv" ? "CSV" : "MANUAL";

      let totalUploaded = 0;
      for (let i = 0; i < lines.length; i += 100) {
        const batch = lines.slice(i, i + 100);
        const result = await api.uploadSignals({
          projectId,
          signals: batch.map((content) => ({ content, source })),
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
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const result = await createAPIClient(token).runAnalysis(projectId);
      setAnalysisId(result.analysisId);
      setAnalysisStage("PENDING");
      setAnalysisProgress(0);
      setStatus("analyzing");
    } catch (err: any) {
      setError(err.message ?? "Failed to start analysis");
    } finally {
      setLoading(false);
    }
  }

  const currentStep = ANALYSIS_STAGES[analysisStage]?.step ?? 0;

  // — Analyzing state —
  if (status === "analyzing") {
    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-950 mb-1">Analyzing feedback</h1>
          <p className="text-sm text-zinc-500">AI is processing your feedback. This usually takes 20–60 seconds.</p>
        </div>

        <div className="border border-zinc-200 rounded-lg p-8">
          <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-8">
            <div
              className="bg-zinc-950 h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>

          <div className="space-y-3">
            {STAGE_LABELS.map((label, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div key={label} className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-mono ${
                      done
                        ? "bg-zinc-950 text-white"
                        : active
                        ? "border-2 border-zinc-950 text-zinc-950"
                        : "border border-zinc-200 text-zinc-300"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className={`text-sm ${
                      done
                        ? "text-zinc-400 line-through"
                        : active
                        ? "text-zinc-950 font-medium"
                        : "text-zinc-300"
                    }`}
                  >
                    {label}
                    {active && <span className="ml-1 text-zinc-400">...</span>}
                  </span>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-6 text-sm border border-zinc-200 rounded p-3 bg-zinc-50 text-zinc-700">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // — Uploaded state —
  if (status === "uploaded") {
    return (
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-950 mb-1">Ready to analyze</h1>
          <p className="text-sm text-zinc-500">Your feedback has been uploaded successfully.</p>
        </div>

        <div className="border border-zinc-200 rounded-lg p-8 text-center">
          <div className="font-mono text-4xl font-bold text-zinc-950 mb-2">{uploadCount}</div>
          <p className="text-sm text-zinc-500 mb-6">feedback items uploaded</p>

          {error && (
            <p className="text-sm border border-zinc-200 rounded p-3 bg-zinc-50 text-zinc-700 mb-4">{error}</p>
          )}

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRunAnalysis}
              disabled={loading}
              className="bg-zinc-950 text-white text-sm px-5 py-2 rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Starting..." : "Run AI analysis"}
            </button>
            <button
              onClick={() => { setStatus("idle"); setText(""); setCsvRows([]); setCsvPreview([]); setCsvFileName(""); }}
              className="border border-zinc-200 text-zinc-600 text-sm px-4 py-2 rounded-md hover:bg-zinc-50"
            >
              Upload more
            </button>
          </div>
        </div>
      </div>
    );
  }

  // — Idle / upload form —
  const textLineCount = text.split("\n").filter((l) => l.trim().length > 3).length;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Link href={`/projects/${projectId}`} className="text-sm text-zinc-400 hover:text-zinc-600">
            Project
          </Link>
          <span className="text-zinc-300">/</span>
          <h1 className="text-2xl font-bold text-zinc-950">Upload feedback</h1>
        </div>
        <p className="text-sm text-zinc-500">
          Paste feedback messages or upload a CSV file. Each row becomes a signal.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-zinc-200 mb-6">
        {(["text", "csv"] as UploadMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(""); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              mode === m
                ? "border-zinc-950 text-zinc-950"
                : "border-transparent text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {m === "text" ? "Paste text" : "Upload CSV"}
          </button>
        ))}
      </div>

      {mode === "text" ? (
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
            <p className="text-xs text-zinc-400 mt-1.5">{textLineCount} items detected</p>
          </div>

          {error && (
            <p className="text-sm border border-zinc-200 rounded p-3 bg-zinc-50 text-zinc-700">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={loading || textLineCount === 0}
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
      ) : (
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-200 rounded-lg cursor-pointer hover:border-zinc-400 transition-colors">
            <p className="text-sm font-medium text-zinc-700 mb-1">
              {csvFileName || "Click to select a CSV file"}
            </p>
            <p className="text-xs text-zinc-400">
              {csvRows.length > 0 ? `${csvRows.length} rows detected` : "First column used as feedback content"}
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCSVFile(file);
              }}
            />
          </label>

          {csvPreview.length > 0 && (
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Preview — first {csvPreview.length} rows
                </p>
              </div>
              <div className="divide-y divide-zinc-100">
                {csvPreview.map((row, i) => (
                  <p key={i} className="px-4 py-2 text-sm text-zinc-700 font-mono truncate">
                    {row}
                  </p>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm border border-zinc-200 rounded p-3 bg-zinc-50 text-zinc-700">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={loading || csvRows.length === 0}
              className="bg-zinc-950 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Uploading..." : csvRows.length > 0 ? `Upload ${csvRows.length} rows` : "Upload CSV"}
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
