import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".routstr");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface RoutstrConfig {
  node_url?: string;
  token?: string;
}

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): RoutstrConfig {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as RoutstrConfig;
  } catch {
    return {};
  }
}

export function saveConfig(config: RoutstrConfig): void {
  ensureDir();
  writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

export function getToken(): string | null {
  return loadConfig().token ?? null;
}

export function getNodeUrl(): string | null {
  return loadConfig().node_url ?? null;
}

export function configPath(): string {
  return CONFIG_FILE;
}
