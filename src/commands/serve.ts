import { printInfo } from "../client";

interface ServeOptions {
  host: string;
  port: string;
  workers: string;
  reload: boolean;
}

export function serveCommand(opts: ServeOptions): void {
  const args = [
    "run",
    "uvicorn",
    "routstr.core.main:app",
    "--host",
    opts.host,
    "--port",
    opts.port,
    "--workers",
    opts.workers,
  ];
  if (opts.reload) args.push("--reload");

  printInfo(`Starting Routstr node on ${opts.host}:${opts.port}...`);

  const proc = Bun.spawn(args, {
    stdio: ["inherit", "inherit", "inherit"],
  });

  process.on("SIGINT", () => proc.kill());
  process.on("SIGTERM", () => proc.kill());
}
