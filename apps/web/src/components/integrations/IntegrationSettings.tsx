"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { createAPIClient } from "@/lib/api";

interface Integration {
  id: string;
  type: "GITHUB" | "POSTHOG" | "SLACK";
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  credentials: Record<string, unknown>;
}

interface SyncStatus {
  latestSync: {
    status: "PENDING" | "RUNNING" | "COMPLETE" | "ERROR";
    itemsSynced: number;
    error?: string | null;
    completedAt?: string | null;
  } | null;
}

const INTEGRATION_META = {
  GITHUB: {
    label: "GitHub",
    description: "Sync your repository to give AI code context for better feature suggestions.",
    fields: [
      { key: "accessToken", label: "Personal Access Token", type: "password", placeholder: "ghp_..." },
      { key: "repoOwner", label: "Repository Owner", type: "text", placeholder: "acme-corp" },
      { key: "repoName", label: "Repository Name", type: "text", placeholder: "my-app" },
      { key: "branch", label: "Branch (optional)", type: "text", placeholder: "main" },
    ],
  },
  POSTHOG: {
    label: "PostHog",
    description: "Pull analytics data (DAU, retention, feature usage) to enrich AI insights.",
    fields: [
      { key: "apiKey", label: "Personal API Key", type: "password", placeholder: "phx_..." },
      { key: "projectId", label: "PostHog Project ID", type: "text", placeholder: "12345" },
      { key: "host", label: "Host (optional)", type: "text", placeholder: "https://app.posthog.com" },
    ],
  },
  SLACK: {
    label: "Slack",
    description: "Monitor product-related team discussions and surface them as feedback signals.",
    fields: [
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "xoxb-..." },
      { key: "channelIds", label: "Channel IDs (comma-separated)", type: "text", placeholder: "C012AB3CD, C098ZY7WX" },
    ],
  },
} as const;

type IntegrationType = keyof typeof INTEGRATION_META;
type ApiClient = ReturnType<typeof createAPIClient>;

function IntegrationCard({
  type,
  projectId,
  existing,
  getApi,
  onSaved,
}: {
  type: IntegrationType;
  projectId: string;
  existing?: Integration;
  getApi: () => Promise<ApiClient>;
  onSaved: () => void;
}) {
  const meta = INTEGRATION_META[type];
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isConnected = !!existing?.isActive;

  const pollSyncStatus = useCallback(async (integrationId: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      if (attempts >= maxAttempts) return;
      attempts++;

      try {
        const api = await getApi();
        const status = await api.getSyncStatus(integrationId);
        setSyncStatus(status);

        if (
          status.latestSync?.status === "RUNNING" ||
          status.latestSync?.status === "PENDING"
        ) {
          setTimeout(poll, 2000);
        } else {
          setSyncing(false);
          onSaved();
        }
      } catch {
        setSyncing(false);
      }
    };

    poll();
  }, [getApi, onSaved]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const credentials: Record<string, unknown> = { ...form };

      // Parse channelIds as array for Slack
      if (type === "SLACK" && typeof credentials.channelIds === "string") {
        credentials.channelIds = (credentials.channelIds as string)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const api = await getApi();
      await api.createIntegration({ projectId, type, credentials });
      setExpanded(false);
      setForm({});
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!existing) return;
    setError(null);
    try {
      const api = await getApi();
      await api.deleteIntegration(existing.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    }
  };

  const handleSync = async () => {
    if (!existing) return;
    setError(null);
    setSyncing(true);
    try {
      const api = await getApi();
      await api.syncIntegration(existing.id);
      pollSyncStatus(existing.id);
    } catch (err) {
      setSyncing(false);
      setError(err instanceof Error ? err.message : "Failed to start sync");
    }
  };

  const syncLabel = () => {
    if (syncing) return "Syncing...";
    const s = syncStatus?.latestSync;
    if (!s) return existing?.lastSyncAt ? `Last sync: ${new Date(existing.lastSyncAt).toLocaleString()}` : "Never synced";
    if (s.status === "COMPLETE") return `Synced ${s.itemsSynced} items`;
    if (s.status === "ERROR") return `Sync error: ${s.error}`;
    return "Syncing...";
  };

  return (
    <div className="border border-zinc-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium text-sm">{meta.label}</span>
            <span
              className={`text-xs px-2 py-0.5 font-mono ${
                isConnected
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {isConnected ? "Connected" : "Not configured"}
            </span>
          </div>
          <p className="text-sm text-zinc-500">{meta.description}</p>
          {isConnected && (
            <p className="text-xs text-zinc-400 mt-1 font-mono">{syncLabel()}</p>
          )}
          {(existing?.lastSyncError || error) && (
            <p className="text-xs text-zinc-900 mt-1 font-mono border-l-2 border-zinc-900 pl-2">
              {existing?.lastSyncError ?? error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4 shrink-0">
          {isConnected && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-xs px-3 py-1.5 border border-zinc-200 hover:border-zinc-900 disabled:opacity-50 transition-colors"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="text-xs px-3 py-1.5 border border-zinc-200 hover:border-zinc-900 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {expanded && !isConnected && (
        <div className="mt-4 border-t border-zinc-100 pt-4 space-y-3">
          {meta.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                {field.label}
              </label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={form[field.key] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                className="w-full text-sm border border-zinc-200 px-3 py-2 font-mono focus:outline-none focus:border-zinc-900"
              />
            </div>
          ))}

          {error && (
            <p className="text-xs text-zinc-900 font-mono border-l-2 border-zinc-900 pl-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs px-4 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setExpanded(false);
                setForm({});
                setError(null);
              }}
              className="text-xs px-4 py-1.5 border border-zinc-200 hover:border-zinc-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntegrationSettings({
  projectId,
}: {
  projectId: string;
}) {
  const { getToken } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const getApi = useCallback(async (): Promise<ApiClient> => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return createAPIClient(token);
  }, [getToken]);

  const fetchIntegrations = useCallback(async () => {
    try {
      const api = await getApi();
      const data = await api.getIntegrations(projectId);
      setIntegrations(data);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, [getApi, projectId]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const getExisting = (type: IntegrationType) =>
    integrations.find((i) => i.type === type);

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-4 w-32 bg-zinc-100 animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-zinc-50 border border-zinc-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-6">
        <Link href={`/projects/${projectId}`} className="hover:text-zinc-900 transition-colors">
          Project
        </Link>
        <span>/</span>
        <span className="text-zinc-900">Integrations</span>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-medium mb-1">Integrations</h1>
        <p className="text-sm text-zinc-500">
          Connect your tools to give AI richer context for better suggestions.
        </p>
      </div>

      <div className="space-y-4">
        {(["GITHUB", "POSTHOG", "SLACK"] as IntegrationType[]).map((type) => (
          <IntegrationCard
            key={type}
            type={type}
            projectId={projectId}
            existing={getExisting(type)}
            getApi={getApi}
            onSaved={fetchIntegrations}
          />
        ))}
      </div>
    </div>
  );
}
