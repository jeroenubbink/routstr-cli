import {
  authHeaders,
  fetchJson,
  nodeUrl,
  printError,
  printInfo,
  printSuccess,
  render,
  resolveToken,
} from "../client";
import type { BalanceResponse, NodeInfo } from "../types";

export async function walletBalanceCommand(opts: { key?: string }): Promise<void> {
  if (!opts.key) {
    printError("API key required. Use -k <api-key> or -k <cashu-token>");
    process.exit(1);
  }

  const headers = authHeaders(opts.key);

  const data = await fetchJson<BalanceResponse>("/v1/balance/info", { headers });
  if (!data) process.exit(1);

  render(data, (d) => {
    printInfo(`\x1b[1mBalance:\x1b[0m  ${d.balance} msats`);
    if (d.reserved) printInfo(`\x1b[1mReserved:\x1b[0m ${d.reserved} msats`);
  });
}

export async function walletSendCommand(
  amount: string,
  opts: { mint?: string; adminToken?: string },
): Promise<void> {
  const token = resolveToken(opts.adminToken);
  const mintUrl = opts.mint;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(token),
  };

  const url = `${nodeUrl()}/admin/withdraw`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount: Number(amount), ...(mintUrl ? { mint_url: mintUrl } : {}) }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!resp.ok) {
      const text = await resp.text();
      printError(`${resp.status}: ${text}`);
      process.exit(1);
    }
    const data = (await resp.json()) as { token?: string };
    render(data, (d) => {
      if (d.token) {
        printSuccess("Withdraw token:");
        printInfo(d.token);
      }
    });
  } catch (e: unknown) {
    printError(String(e));
    process.exit(1);
  }
}

export async function walletReceiveCommand(): Promise<void> {
  const info = await fetchJson<NodeInfo>("/v1/info");
  if (!info) process.exit(1);

  render(info, (d) => {
    printInfo(`\x1b[1mNode:\x1b[0m   ${d.name}`);
    if (d.mints?.length) {
      printInfo(`\x1b[1mMints:\x1b[0m  ${d.mints.join(", ")}`);
    } else {
      printInfo("\x1b[1mMints:\x1b[0m  none configured");
    }
    printInfo(
      "\nSend Cashu tokens from one of the above mints as a Bearer token in the Authorization header.",
    );
  });
}
