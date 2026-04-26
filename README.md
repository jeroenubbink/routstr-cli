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

## What the CLI can do

### Inspect the node

| Command                                       | Purpose                                   |
| --------------------------------------------- | ----------------------------------------- |
| `routstr status`                              | Health check, version, npub               |
| `routstr config show`                         | Full settings (sensitive values redacted) |
| `routstr config get <key>`                    | Single setting                            |
| `routstr config set <key> <value> -t <admin>` | Update a setting                          |

### Discover models (public)

| Command                                 | Purpose                                    |
| --------------------------------------- | ------------------------------------------ |
| `routstr models list`                   | All enabled models with USD + sats pricing |
| `routstr models list --provider <name>` | Filter by provider name or id              |

### Manage upstream providers (admin)

| Command                                                                    | Purpose                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `routstr providers list -t <admin>`                                        | All upstream providers                                                               |
| `routstr providers show <id> -t <admin>`                                   | Full provider record                                                                 |
| `routstr providers add <type> --base-url <url> --api-key <key> -t <admin>` | Add a new upstream                                                                   |
| `routstr providers update <id> [...flags] -t <admin>`                      | Patch any of: `--type --base-url --api-key --api-version --enabled --fee --settings` |
| `routstr providers enable <id> -t <admin>` / `disable`                     | Toggle availability                                                                  |
| `routstr providers remove <id> -t <admin>`                                 | Delete                                                                               |
| `routstr providers test <id> -t <admin>`                                   | Health-check upstream                                                                |

### Manage models per provider (admin)

| Command                                                                     | Purpose                                                              |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `routstr providers models list <pid> [--source all\|db\|remote] -t <admin>` | DB models + remote-discovered models                                 |
| `routstr providers models show <pid> <model_id> -t <admin>`                 | Full model details                                                   |
| `routstr providers models update <pid> <model_id> [...flags] -t <admin>`    | Patch `--forwarded-model-id`, `--enabled`, `--name`, `--description` |

**Batch update example** — change `forwarded_model_id` to the bare id for every DB model under provider 2:

```bash
routstr providers models list 2 --source db -o json \
  | jq -r '.db_models[].id' \
  | xargs -I{} routstr providers models update 2 {} --forwarded-model-id {}
```

### Wallet & payments

| Command                                                 | Purpose                        |
| ------------------------------------------------------- | ------------------------------ |
| `routstr wallet balance -k <api_key>`                   | Current balance for an API key |
| `routstr wallet send <amount> -m <mint_url> -t <admin>` | Withdraw as Cashu token        |
| `routstr wallet receive`                                | List supported mints           |

### Operate the node

| Command                                                           | Purpose                                          |
| ----------------------------------------------------------------- | ------------------------------------------------ |
| `routstr serve [-h <host>] [-p <port>] [-w <workers>] [--reload]` | Start FastAPI server                             |
| `routstr monitor [-r <secs>]`                                     | Live TUI dashboard (providers, models, requests) |

### Discovery for agents

| Command                                          | Purpose                             |
| ------------------------------------------------ | ----------------------------------- |
| `routstr instruct [--format text\|json\|openai]` | Canonical agent guide for this node |
| `routstr schema`                                 | Full command tree as JSON           |
| `routstr <cmd> --help`                           | Per-command flags and usage         |

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
