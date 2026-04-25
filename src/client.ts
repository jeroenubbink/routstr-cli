import { getToken } from "./config";
import type { GlobalOptions } from "./types";

let _opts: GlobalOptions = {
  node: "http://localhost:8000",
  output: "text",
  verbose: false,
  quiet: false,
  noInput: false,
};

export function setGlobalOptions(opts: GlobalOptions): void {
  _opts = opts;
}

export function getOpts(): GlobalOptions {
  return _opts;
}

export function nodeUrl(): string {
  return _opts.node.replace(/\/+$/, "");
}

export function isJson(): boolean {
  return _opts.output === "json";
}

export function isQuiet(): boolean {
  return _opts.quiet;
}

export async function fetchJson<T = unknown>(path: string, init?: RequestInit): Promise<T | null> {
  const url = `${nodeUrl()}${path}`;
  try {
    const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    if (!resp.ok) {
      const text = await resp.text();
      printError(`${resp.status}: ${text}`);
      return null;
    }
    return (await resp.json()) as T;
  } catch (e: unknown) {
    if (e instanceof TypeError && String(e).includes("fetch")) {
      printError(`Cannot connect to node at ${nodeUrl()}`);
    } else {
      printError(String(e));
    }
    return null;
  }
}

// ── Output helpers ──

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printError(msg: string): void {
  console.error(`\x1b[31mError:\x1b[0m ${msg}`);
}

export function printInfo(msg: string): void {
  if (!isQuiet()) console.log(msg);
}

export function printSuccess(msg: string): void {
  if (!isQuiet()) console.log(`\x1b[32m${msg}\x1b[0m`);
}

export function printTable(title: string, headers: string[], rows: string[][]): void {
  if (isQuiet()) return;

  console.log(`\n\x1b[1m${title}\x1b[0m`);

  // Calculate column widths
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));

  // Header
  const headerLine = headers.map((h, i) => h.padEnd(widths[i])).join("  ");
  console.log(`  \x1b[36m${headerLine}\x1b[0m`);
  console.log(`  ${widths.map((w) => "─".repeat(w)).join("──")}`);

  // Rows
  for (const row of rows) {
    const line = row.map((cell, i) => (cell ?? "").padEnd(widths[i])).join("  ");
    console.log(`  ${line}`);
  }
  console.log();
}

export function render<T>(data: T, textFn?: (data: T) => void): void {
  if (isJson()) {
    printJson(data);
  } else if (textFn) {
    textFn(data);
  } else {
    printJson(data);
  }
}

/** Resolve token: explicit flag > ~/.routstr/config.json > null */
export function resolveToken(explicit?: string): string | null {
  return explicit ?? getToken();
}

/** Build auth headers from a resolved token */
export function authHeaders(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
