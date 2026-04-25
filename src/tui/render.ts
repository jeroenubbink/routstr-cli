import type { Model } from "../types";
import { type MonitorState, TABS } from "./state";
import { COLORS, clearScreen, getTermSize, padRight, writeAt } from "./terminal";

const { reset, bold, dim, cyan, green, red, yellow, bgBlue } = COLORS;

export function renderScreen(state: MonitorState): void {
  clearScreen();
  const { rows, cols } = getTermSize();

  renderHeader(state, cols);
  renderTabBar(state, cols);

  const contentStart = 4;
  const contentEnd = rows - 2;

  switch (state.activeTab) {
    case 0:
      renderOverview(state, contentStart);
      break;
    case 1:
      renderModels(state, contentStart, contentEnd);
      break;
    case 2:
      renderProviders(state, contentStart, contentEnd);
      break;
  }

  renderStatusBar(state, rows, cols);
}

function renderHeader(state: MonitorState, cols: number): void {
  const name = state.info?.name ?? "Routstr Node";
  const version = state.info?.version ?? "?";
  const auth = state.authed ? `${green}authed${reset}` : `${yellow}no token${reset}`;
  const title = ` ${bold}${name}${reset} v${version}  ${auth}`;
  writeAt(1, 1, padRight(title, cols));
}

function renderTabBar(state: MonitorState, cols: number): void {
  let bar = " ";
  for (let i = 0; i < TABS.length; i++) {
    const label = ` ${i + 1}:${TABS[i]} `;
    if (i === state.activeTab) {
      bar += `${bgBlue}${bold}${label}${reset} `;
    } else {
      bar += `${dim}${label}${reset} `;
    }
  }
  writeAt(2, 1, padRight(bar, cols));
  writeAt(3, 1, dim + "─".repeat(cols) + reset);
}

function renderOverview(state: MonitorState, startRow: number): void {
  const info = state.info;
  let row = startRow;

  const enabledProviders = state.providers.filter((p) => p.enabled).length;
  const totalProviders = state.providers.length;
  const status = state.error ? `${red}${state.error}${reset}` : `${green}connected${reset}`;

  writeAt(row++, 3, `${bold}Node Overview${reset}`);
  row++;

  const cards: Array<[string, string]> = [
    ["Status", status],
    ["Models", String(state.models.length)],
    [
      "Providers",
      totalProviders > 0
        ? `${enabledProviders}/${totalProviders} enabled`
        : state.authed
          ? "none configured"
          : `${dim}admin token required${reset}`,
    ],
    ["NPUB", info?.npub ? `${info.npub.slice(0, 20)}...` : "not set"],
  ];

  for (const [label, value] of cards) {
    writeAt(row++, 3, `${cyan}${padRight(`${label}:`, 12)}${reset} ${value}`);
  }

  if (info?.mints?.length) {
    row++;
    writeAt(row++, 3, `${bold}Mints${reset}`);
    for (const mint of info.mints) {
      writeAt(row++, 5, `${dim}•${reset} ${mint}`);
    }
  }
}

function providerLabelFor(state: MonitorState, m: Model): string {
  if (m.owned_by) return m.owned_by;
  const pid =
    typeof m.upstream_provider_id === "string"
      ? Number.parseInt(m.upstream_provider_id, 10)
      : m.upstream_provider_id;
  if (pid == null || !Number.isFinite(pid)) return "—";
  const p = state.providers.find((x) => x.id === pid);
  return p ? p.provider_type : `#${pid}`;
}

function formatPerK(perToken: number | undefined): string {
  if (perToken == null || !Number.isFinite(perToken)) return "—";
  const per1k = perToken * 1000;
  if (per1k === 0) return "0";
  if (per1k >= 0.01) return per1k.toFixed(4);
  if (per1k >= 0.0001) return per1k.toFixed(6);
  return per1k.toExponential(2);
}

function renderModels(state: MonitorState, startRow: number, endRow: number): void {
  const headers = ["Model", "Provider", "In $/1K", "Out $/1K", "In sat/1K", "Out sat/1K"];
  const widths = [36, 14, 10, 10, 12, 12];
  let row = startRow;

  writeAt(row++, 3, `${bold}Models (${state.models.length})${reset}`);
  row++;

  const headerLine = headers.map((h, i) => padRight(h, widths[i])).join("");
  writeAt(row++, 3, `${cyan}${headerLine}${reset}`);
  writeAt(row++, 3, dim + "─".repeat(widths.reduce((a, b) => a + b, 0)) + reset);

  const visible = state.models.slice(state.scrollOffset, state.scrollOffset + (endRow - row));
  for (const m of visible) {
    const cols = [
      m.id,
      providerLabelFor(state, m),
      formatPerK(m.pricing?.prompt),
      formatPerK(m.pricing?.completion),
      formatPerK(m.sats_pricing?.prompt),
      formatPerK(m.sats_pricing?.completion),
    ];
    const line = cols.map((c, i) => padRight(truncate(c, widths[i]), widths[i])).join("");
    writeAt(row++, 3, line);
    if (row >= endRow) break;
  }
}

function renderProviders(state: MonitorState, startRow: number, endRow: number): void {
  const headers = ["ID", "Type", "URL", "Enabled", "Fee", "Models"];
  const widths = [5, 14, 40, 9, 8, 8];
  let row = startRow;

  writeAt(row++, 3, `${bold}Providers (${state.providers.length})${reset}`);

  if (!state.authed) {
    writeAt(
      row++,
      3,
      `${yellow}Admin token required.${reset} ${dim}Run 'routstr init --token <token>'.${reset}`,
    );
    return;
  }
  row++;

  if (!state.providers.length) {
    writeAt(row, 3, `${dim}No upstream providers configured.${reset}`);
    return;
  }

  const headerLine = headers.map((h, i) => padRight(h, widths[i])).join("");
  writeAt(row++, 3, `${cyan}${headerLine}${reset}`);
  writeAt(row++, 3, dim + "─".repeat(widths.reduce((a, b) => a + b, 0)) + reset);

  const visible = state.providers.slice(state.scrollOffset, state.scrollOffset + (endRow - row));
  for (const p of visible) {
    const enabled = p.enabled ? `${green}yes${reset}` : `${red}no${reset}`;
    const modelCount = state.modelsByProvider.get(p.id) ?? 0;
    const cols = [
      String(p.id),
      p.provider_type,
      truncate(p.base_url, widths[2]),
      enabled,
      p.provider_fee.toFixed(3),
      String(modelCount),
    ];
    // Don't pad the colored 'enabled' cell by visible width alone — padRight handles ANSI stripping
    const line = cols.map((c, i) => padRight(c, widths[i])).join("");
    writeAt(row++, 3, line);
    if (row >= endRow) break;
  }
}

function truncate(s: string, len: number): string {
  if (s.length <= len - 1) return s;
  return `${s.slice(0, len - 2)}…`;
}

function renderStatusBar(state: MonitorState, row: number, cols: number): void {
  const refresh = state.autoRefresh ? `${green}AUTO${reset}` : `${red}PAUSED${reset}`;
  const bar = ` Refresh: ${refresh}  |  Updated: ${state.lastUpdate}  |  ${dim}q${reset} quit  ${dim}1-${TABS.length}${reset} tabs  ${dim}j/k${reset} scroll  ${dim}R${reset} refresh  ${dim}A${reset} auto`;
  writeAt(row, 1, padRight(bar, cols));
}
