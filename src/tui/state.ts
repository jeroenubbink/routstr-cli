import type { Model, NodeInfo } from "../types";

export interface AdminProvider {
  id: number;
  provider_type: string;
  base_url: string;
  api_key: string;
  api_version: string | null;
  enabled: boolean;
  provider_fee: number;
  provider_settings: Record<string, unknown> | null;
}

export interface MonitorState {
  activeTab: number;
  scrollOffset: number;
  autoRefresh: boolean;
  lastUpdate: string;
  error: string | null;
  authed: boolean;

  // Data
  info: NodeInfo | null;
  models: Model[];
  providers: AdminProvider[];
  modelsByProvider: Map<number, number>;
}

export const TABS = ["Overview", "Models", "Providers"] as const;

export function createInitialState(): MonitorState {
  return {
    activeTab: 0,
    scrollOffset: 0,
    autoRefresh: true,
    lastUpdate: "—",
    error: null,
    authed: false,
    info: null,
    models: [],
    providers: [],
    modelsByProvider: new Map(),
  };
}
