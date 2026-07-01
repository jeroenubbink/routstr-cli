import {
  authHeaders,
  fetchJson,
  nodeUrl,
  printError,
  printInfo,
  printSuccess,
  printTable,
  render,
  resolveToken,
} from "../client";
import type { Provider } from "../types";

export async function providersListCommand(opts: { adminToken?: string }): Promise<void> {
  const token = resolveToken(opts.adminToken);
  // Try admin endpoint first if token available, otherwise try public discovery
  if (token) {
    const headers = authHeaders(token);
    const resp = await fetchJson<
      Array<{
        id: number;
        slug?: string | null;
        provider_type: string;
        base_url: string;
        enabled: boolean;
        provider_fee: number;
      }>
    >("/admin/api/upstream-providers", { headers });
    if (!resp) process.exit(1);

    render(resp, (items) => {
      if (!items.length) {
        printInfo("No upstream providers configured.");
        return;
      }
      const rows = items.map((p) => [
        String(p.id),
        p.slug ?? "—",
        p.provider_type,
        p.base_url,
        p.enabled ? "yes" : "no",
        String(p.provider_fee),
      ]);
      printTable(
        `Upstream Providers (${items.length})`,
        ["ID", "Slug", "Type", "URL", "Enabled", "Fee"],
        rows,
      );
    });
    return;
  }

  // Public Nostr discovery endpoint
  const resp = await fetchJson<Provider[] | { providers: Provider[] }>("/v1/providers/");
  if (!resp) {
    printInfo(
      "Tip: Provider discovery may be disabled. Use --admin-token or run 'routstr init --token <token>'.",
    );
    process.exit(1);
  }

  const providers: Provider[] = Array.isArray(resp)
    ? resp
    : ((resp as { providers: Provider[] }).providers ?? []);

  render(providers, (items) => {
    if (!items.length) {
      printInfo("No providers discovered.");
      return;
    }
    const rows = items.map((p) => [
      p.name ?? p.id ?? "?",
      p.base_url ?? p.url ?? "?",
      String(p.model_count ?? "?"),
    ]);
    printTable(`Providers (${items.length})`, ["Name", "URL", "Models"], rows);
  });
}

export async function providersAddCommand(
  name: string,
  opts: { apiKey?: string; baseUrl?: string; adminToken?: string; slug?: string },
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const url = `${nodeUrl()}/admin/api/upstream-providers`;
  const body: Record<string, unknown> = {
    provider_type: name,
    base_url: opts.baseUrl ?? "",
    api_key: opts.apiKey ?? "",
  };
  if (opts.slug !== undefined) body.slug = opts.slug;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      printError(`${resp.status}: ${text}`);
      process.exit(1);
    }
    const data = await resp.json();
    render(data, () => printSuccess(`Provider "${name}" added.`));
  } catch (e: unknown) {
    printError(String(e));
    process.exit(1);
  }
}

export async function providersRemoveCommand(
  id: string,
  opts: { adminToken?: string },
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const url = `${nodeUrl()}/admin/api/upstream-providers/${encodeURIComponent(id)}`;
  const headers = authHeaders(token);

  try {
    const resp = await fetch(url, {
      method: "DELETE",
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      printError(`${resp.status}: ${text}`);
      process.exit(1);
    }
    render({ removed: id }, () => printSuccess(`Provider "${id}" removed.`));
  } catch (e: unknown) {
    printError(String(e));
    process.exit(1);
  }
}

export async function providersTestCommand(
  id: string,
  opts: { adminToken?: string },
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const headers = authHeaders(token);

  const data = await fetchJson<{ ok: boolean; balance_data: unknown }>(
    `/admin/api/upstream-providers/${encodeURIComponent(id)}/balance`,
    { headers },
  );
  if (!data) process.exit(1);

  render(data, (d) => {
    if (d.ok) {
      printSuccess(`Provider "${id}" is reachable (balance: ${d.balance_data})`);
    } else {
      printError(`Provider "${id}" check failed`);
    }
  });
}

interface UpstreamProviderDetail {
  id: number;
  slug?: string | null;
  provider_type: string;
  base_url: string;
  api_key: string;
  api_version: string | null;
  enabled: boolean;
  provider_fee: number;
  provider_settings: Record<string, unknown> | null;
}

export async function providersShowCommand(
  id: string,
  opts: { adminToken?: string },
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const headers = authHeaders(token);

  const data = await fetchJson<UpstreamProviderDetail>(
    `/admin/api/upstream-providers/${encodeURIComponent(id)}`,
    { headers },
  );
  if (!data) process.exit(1);

  render(data, (p) => {
    printInfo(`\x1b[1mProvider #${p.id}\x1b[0m`);
    if (p.slug) printInfo(`  Slug:        ${p.slug}`);
    printInfo(`  Type:        ${p.provider_type}`);
    printInfo(`  Base URL:    ${p.base_url}`);
    printInfo(`  API key:     ${p.api_key || "(none)"}`);
    if (p.api_version) printInfo(`  API version: ${p.api_version}`);
    printInfo(`  Enabled:     ${p.enabled ? "yes" : "no"}`);
    printInfo(`  Fee:         ${p.provider_fee}`);
    if (p.provider_settings) {
      printInfo(`  Settings:    ${JSON.stringify(p.provider_settings)}`);
    }
  });
}

interface UpdateProviderOptions {
  adminToken?: string;
  type?: string;
  baseUrl?: string;
  apiKey?: string;
  apiVersion?: string;
  enabled?: string;
  fee?: string;
  settings?: string;
  slug?: string;
}

function parseBool(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  throw new Error(`Invalid boolean: ${value} (use true/false)`);
}

export async function providersUpdateCommand(
  id: string,
  opts: UpdateProviderOptions,
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const body: Record<string, unknown> = {};

  if (opts.type !== undefined) body.provider_type = opts.type;
  if (opts.baseUrl !== undefined) body.base_url = opts.baseUrl;
  if (opts.apiKey !== undefined) body.api_key = opts.apiKey;
  if (opts.apiVersion !== undefined) body.api_version = opts.apiVersion;
  if (opts.enabled !== undefined) {
    try {
      body.enabled = parseBool(opts.enabled);
    } catch (e: unknown) {
      printError(String(e));
      process.exit(1);
    }
  }
  if (opts.fee !== undefined) {
    const f = Number(opts.fee);
    if (!Number.isFinite(f)) {
      printError(`Invalid fee: ${opts.fee} (must be a number, e.g. 1.01 for 1%)`);
      process.exit(1);
    }
    body.provider_fee = f;
  }
  if (opts.settings !== undefined) {
    try {
      body.provider_settings = JSON.parse(opts.settings);
    } catch {
      printError(`Invalid JSON for --settings: ${opts.settings}`);
      process.exit(1);
    }
  }
  if (opts.slug !== undefined) body.slug = opts.slug;

  if (Object.keys(body).length === 0) {
    printError(
      "No fields to update. Pass one of: --type, --base-url, --api-key, --api-version, --enabled, --fee, --settings, --slug.",
    );
    process.exit(1);
  }

  await patchProvider(id, body, token);
}

export async function providersEnableCommand(
  id: string,
  opts: { adminToken?: string },
): Promise<void> {
  await patchProvider(
    id,
    { enabled: true },
    resolveToken(opts.adminToken),
    `Provider "${id}" enabled.`,
  );
}

export async function providersDisableCommand(
  id: string,
  opts: { adminToken?: string },
): Promise<void> {
  await patchProvider(
    id,
    { enabled: false },
    resolveToken(opts.adminToken),
    `Provider "${id}" disabled.`,
  );
}

async function patchProvider(
  id: string,
  body: Record<string, unknown>,
  token: string | null,
  successMsg?: string,
): Promise<void> {
  const url = `${nodeUrl()}/admin/api/upstream-providers/${encodeURIComponent(id)}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };

  try {
    const resp = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      printError(`${resp.status}: ${text}`);
      process.exit(1);
    }
    const data = await resp.json();
    render(data, () => printSuccess(successMsg ?? `Provider "${id}" updated.`));
  } catch (e: unknown) {
    printError(String(e));
    process.exit(1);
  }
}
