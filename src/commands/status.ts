import { fetchJson, printInfo, render } from "../client";
import type { NodeInfo } from "../types";

export async function statusCommand(): Promise<void> {
  const info = await fetchJson<NodeInfo>("/v1/info");
  if (!info) process.exit(1);

  render(info, (d) => {
    printInfo(`\x1b[1m${d.name}\x1b[0m`);
    printInfo(`  ${d.description}`);
    printInfo(`  Version:  ${d.version}`);
    printInfo(`  NPUB:     ${d.npub || "not set"}`);
    if (d.http_url) printInfo(`  HTTP:     ${d.http_url}`);
    if (d.onion_url) printInfo(`  Onion:    ${d.onion_url}`);
    if (d.mints?.length) printInfo(`  Mints:    ${d.mints.join(", ")}`);
  });
}
