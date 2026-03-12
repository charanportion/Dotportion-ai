import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function fetchWithAuth(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new APIError(
      res.status,
      data.error?.code ?? "UNKNOWN",
      data.error?.message ?? `HTTP ${res.status}`
    );
  }

  return res;
}

export function createAPIClient(token: string) {
  const req = <T>(path: string, options?: RequestInit): Promise<T> =>
    fetchWithAuth(path, token, options).then((r) => r.json() as Promise<T>);

  return {
    // Projects
    getProjects: () => req<{ projects: any[] }>("/projects"),
    getProject: (id: string) => req<any>(`/projects/${id}`),
    createProject: (data: { name: string; description?: string }) =>
      req<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
    deleteProject: (id: string) =>
      fetchWithAuth(`/projects/${id}`, token, { method: "DELETE" }),

    // Signals
    uploadSignals: (data: { projectId: string; signals: Array<{ content: string; source?: string }> }) =>
      req<{ count: number }>("/signals/upload", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getSignals: (projectId: string, page = 1) =>
      req<{ signals: any[]; total: number }>(`/projects/${projectId}/signals?page=${page}`),

    // Analysis
    runAnalysis: (projectId: string) =>
      req<{ analysisId: string; status: string }>("/analysis/run", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      }),
    getAnalysisStatus: (analysisId: string) =>
      req<{ status: string; progress: number; error?: string }>(
        `/analysis/${analysisId}/status`
      ),

    // Insights
    getProblems: (projectId: string) =>
      req<{ problems: any[] }>(`/projects/${projectId}/problems`),
    getFeatures: (projectId: string) =>
      req<{ features: any[] }>(`/projects/${projectId}/features`),
    getClusters: (projectId: string) =>
      req<{ clusters: any[] }>(`/projects/${projectId}/clusters`),

    // Features
    getFeature: (featureId: string) => req<any>(`/features/${featureId}`),
    generatePRD: (featureId: string) =>
      req<{ prd: any; tasks: any[] }>(`/features/${featureId}/prd`, {
        method: "POST",
        body: "{}",
      }),
    getPRD: (featureId: string) => req<any>(`/features/${featureId}/prd`),

    // Chat
    sendMessage: (data: { projectId: string; message: string }) =>
      req<{ response: string; toolCalls: any[] }>("/chat", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getChatHistory: (projectId: string) =>
      req<{ messages: any[] }>(`/chat/${projectId}/history`),
  };
}

export { APIError };
