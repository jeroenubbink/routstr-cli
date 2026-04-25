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
import type { NodeInfo } from "../types";

export async function configShowCommand(): Promise<void> {
  const info = await fetchJson<NodeInfo>("/v1/info");
  if (!info) process.exit(1);

  render(info, (d) => {
    const rows = Object.entries(d).map(([k, v]) => [k, String(v)]);
    printTable("Node Configuration", ["Key", "Value"], rows);
  });
}

export async function configGetCommand(key: string): Promise<void> {
  const info = await fetchJson<Record<string, unknown>>("/v1/info");
  if (!info) process.exit(1);

  if (!(key in info)) {
    printError(`Unknown config key: ${key}`);
    process.exit(1);
  }

  render({ [key]: info[key] }, (d) => printInfo(String(d[key])));
}

export async function configSetCommand(
  key: string,
  value: string,
  opts: { adminToken?: string },
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const url = `${nodeUrl()}/admin/api/settings`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };

  try {
    const resp = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ __root__: { [key]: value } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      printError(`${resp.status}: ${text}`);
      process.exit(1);
    }
    const data = await resp.json();
    render(data, () => printSuccess(`Set ${key} = ${value}`));
  } catch (e: unknown) {
    printError(String(e));
    process.exit(1);
  }
}
