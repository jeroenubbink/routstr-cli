export interface GlobalOptions {
  node: string;
  output: "text" | "json";
  verbose: boolean;
  quiet: boolean;
  noInput: boolean;
}

export interface NodeInfo {
  name: string;
  description: string;
  version: string;
  npub: string;
  mints: string[];
  http_url: string;
  onion_url: string;
  child_key_cost_msats: number;
}

export interface Pricing {
  prompt?: number;
  completion?: number;
  request?: number;
  image?: number;
  web_search?: number;
  internal_reasoning?: number;
  input_cache_read?: number;
  input_cache_write?: number;
  max_prompt_cost?: number;
  max_completion_cost?: number;
  max_cost?: number;
}

export interface Model {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: Pricing;
  sats_pricing?: Pricing | null;
  enabled?: boolean;
  upstream_provider_id?: number | string | null;
  owned_by?: string;
}

export interface ModelsResponse {
  data: Model[];
}

export interface Provider {
  name?: string;
  id?: string;
  slug?: string | null;
  base_url?: string;
  url?: string;
  model_count?: number;
}

export interface BalanceResponse {
  api_key: string;
  balance: number;
  reserved: number;
  is_child: boolean;
}

export interface UsageEntry {
  timestamp: string;
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_msats: number;
  client: string;
}
