# Routstr CLI

CLI for inspecting, configuring, and operating a Routstr node — the
payment proxy for permissionless AI inference using Cashu and Lightning.

> **For agents:** run `routstr instruct` (human-readable) or `routstr schema`
> (machine-readable) for the canonical, always-up-to-date command list. This
> README mirrors that output for humans.

---

## Install

Requires [Bun](https://bun.sh).

```bash
cd cli
bun install
```

Run the CLI in one of three ways:

```bash
# 1) Direct (no install)
bun run src/index.ts <command>

# 2) Dev alias
alias routstr="bun run $(pwd)/cli/src/index.ts"

# 3) Compile to a binary
bun build src/index.ts --outdir dist --target bun
node dist/index.js <command>
```

## Configure

Save the node URL and an admin token so commands don't need flags every call:

```bash
routstr init --node-url http://localhost:8000 --token <admin-session-token>
```

- **Admin tokens** come from the node admin UI's CLI Tokens panel, or from
  `POST /admin/api/login` with `ADMIN_PASSWORD`.
- Stored at `~/.routstr/config.json`.
- Override per-call with `-n <url>` and `-t <token>` flags.

## Global flags (every command)

| Flag                 | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `-n, --node <url>`   | Override node URL                             |
| `-o, --output <fmt>` | `text` (default) or `json` for piping/parsing |
| `-q, --quiet`        | Suppress non-essential output                 |
| `-v, --verbose`      | Verbose logs                                  |
| `--no-input`         | Agent mode — never prompt                     |
| `-V, --version`      | Print CLI version                             |

---

## Discover what the CLI can do

The CLI is self-describing — don't memorize commands, ask the binary:

```bash
routstr --help               # top-level commands and global flags
routstr <command> --help     # flags for a specific command (e.g. routstr providers --help)
routstr schema               # full command tree as JSON (machine-readable, for agents)
routstr instruct             # canonical agent guide for the connected node
```

`schema` and `instruct` are the source of truth and are updated automatically whenever the CLI changes — this README intentionally does not duplicate them.

---

## Conventions

- **Exit codes:** non-zero on any error (auth, network, validation).
- **Output:** human-readable tables by default; pass `-o json` for structured
  output suitable for `jq` and shell pipelines.
- **Auth:** admin commands accept `-t <token>` or fall back to
  `~/.routstr/config.json`. Both short-lived `admin_sessions` and long-lived
  `CliToken` Bearer tokens are valid.
- **HTTP fallback:** for inference (chat completions, balance, models) you can
  hit the node directly without the CLI — see `routstr instruct`.

## Development

```bash
bun run lint         # biome lint
bun run check        # biome lint + format check
bun run typecheck    # tsc --noEmit
bun run check:fix    # auto-apply safe fixes
```

See `../docs/cli-usage.md` for the full Python + TypeScript usage doc and
`../docs/cli-plan.md` for architecture notes.
