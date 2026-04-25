import { fetchJson, printInfo, printTable, render } from "../client";
import type { Model, ModelsResponse } from "../types";

function formatPerK(perToken: number | undefined): string {
  if (perToken == null || !Number.isFinite(perToken)) return "—";
  const per1k = perToken * 1000;
  if (per1k === 0) return "0";
  if (per1k >= 0.01) return per1k.toFixed(4);
  if (per1k >= 0.0001) return per1k.toFixed(6);
  return per1k.toExponential(2);
}

function providerLabel(m: Model): string {
  if (m.owned_by) return m.owned_by;
  const pid =
    typeof m.upstream_provider_id === "string"
      ? Number.parseInt(m.upstream_provider_id, 10)
      : m.upstream_provider_id;
  if (pid == null || !Number.isFinite(pid)) return "—";
  return `#${pid}`;
}

export async function modelsListCommand(opts: { provider?: string }): Promise<void> {
  const resp = await fetchJson<ModelsResponse>("/v1/models");
  if (!resp) process.exit(1);

  let models = resp.data ?? [];
  if (opts.provider) {
    const p = opts.provider.toLowerCase();
    models = models.filter(
      (m) =>
        (m.owned_by ?? "").toLowerCase().includes(p) ||
        String(m.upstream_provider_id ?? "")
          .toLowerCase()
          .includes(p),
    );
  }

  render(models, (items) => {
    if (!items.length) {
      printInfo("No models available.");
      return;
    }
    const rows = items.map((m) => [
      m.id,
      providerLabel(m),
      formatPerK(m.pricing?.prompt),
      formatPerK(m.pricing?.completion),
      formatPerK(m.sats_pricing?.prompt),
      formatPerK(m.sats_pricing?.completion),
    ]);
    printTable(
      `Models (${items.length})`,
      ["Model", "Provider", "In $/1K", "Out $/1K", "In sat/1K", "Out sat/1K"],
      rows,
    );
  });
}
