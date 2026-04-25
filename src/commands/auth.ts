import { printInfo, printSuccess } from "../client";
import { configPath, loadConfig, saveConfig } from "../config";

export function initCommand(opts: { nodeUrl?: string; token?: string }): void {
  const cfg = loadConfig();
  if (opts.nodeUrl) cfg.node_url = opts.nodeUrl;
  if (opts.token) cfg.token = opts.token;
  saveConfig(cfg);

  printSuccess("Config saved.");
  printInfo(`  File:  ${configPath()}`);
  if (cfg.node_url) printInfo(`  Node:  ${cfg.node_url}`);
  if (cfg.token) printInfo(`  Token: ${cfg.token.slice(0, 12)}...`);
}

export function showInitCommand(): void {
  const cfg = loadConfig();
  if (!cfg.node_url && !cfg.token) {
    printInfo("No config found. Run: routstr init --node-url <url> --token <token>");
    return;
  }
  printInfo(`Config: ${configPath()}`);
  if (cfg.node_url) printInfo(`  Node:  ${cfg.node_url}`);
  if (cfg.token) printInfo(`  Token: ${cfg.token.slice(0, 12)}...`);
}
