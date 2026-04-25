import { getToken } from "../config";
import type { Model, ModelsResponse, NodeInfo } from "../types";
import type { AdminProvider, MonitorState } from "./state";

async function safeJson<T>(url: string, headers?: Record<string, string>): Promise<T | null> {
  try {
    const resp = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchAllData(nodeUrl: string, state: MonitorState): Promise<void> {
  const base = nodeUrl.replace(/\/+$/, "");
  const token = getToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  state.authed = Boolean(token);
  state.error = null;

  const [info, modelsResp, providersResp] = await Promise.all([
    safeJson<NodeInfo>(`${base}/v1/info`),
    safeJson<ModelsResponse | Model[]>(`${base}/v1/models`),
    token
      ? safeJson<AdminProvider[]>(`${base}/admin/api/upstream-providers`, authHeaders)
      : Promise.resolve(null),
  ]);

  if (info) {
    state.info = info;
  } else {
    state.error = "Cannot connect to node";
  }

  if (modelsResp) {
    state.models = Array.isArray(modelsResp)
      ? modelsResp
      : ((modelsResp as ModelsResponse).data ?? []);
  }

  if (providersResp) {
    state.providers = providersResp;
  } else {
    state.providers = [];
    if (!token) {
      state.error = "No admin token — run 'routstr init --token <token>' for provider data";
    }
  }

  // Aggregate model counts per provider from models list
  const counts = new Map<number, number>();
  for (const m of state.models) {
    const pid =
      typeof m.upstream_provider_id === "string"
        ? Number.parseInt(m.upstream_provider_id, 10)
        : m.upstream_provider_id;
    if (pid != null && Number.isFinite(pid)) {
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }
  state.modelsByProvider = counts;

  state.lastUpdate = new Date().toLocaleTimeString("en-GB", { hour12: false });
}
