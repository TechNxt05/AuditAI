const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auditai_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auditai_token");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  getMe: () => request("/auth/me"),

  // Projects
  listProjects: () => request("/projects/"),
  createProject: (name: string) =>
    request("/projects/", { method: "POST", body: JSON.stringify({ name }) }),
  deleteProject: (id: string) =>
    request(`/projects/${id}`, { method: "DELETE" }),

  // Executions
  listExecutions: (projectId?: string) =>
    request(`/executions/${projectId ? `?project_id=${projectId}` : ""}`),
  getExecution: (id: string) => request(`/executions/${id}`),
  evaluate: (id: string) =>
    request(`/executions/${id}/evaluate`, { method: "POST" }),
  replay: (id: string, newModel: string) =>
    request(`/executions/${id}/replay`, {
      method: "POST",
      body: JSON.stringify({ new_model_name: newModel }),
    }),

  // Adversarial
  runAdversarial: (executionId: string) =>
    request(`/adversarial/${executionId}/run`, { method: "POST" }),
  getAdversarial: (executionId: string) =>
    request(`/adversarial/${executionId}`),

  // Dashboard
  getDashboard: () => request("/dashboard/stats"),
};
