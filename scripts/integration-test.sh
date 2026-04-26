#!/usr/bin/env bash
# Integration smoke test: pack the CLI, install it globally, and exercise
# offline commands to confirm a fresh install actually works end-to-end.
#
# Required tools: bun (always); node + npm (only when INTEGRATION_RUNTIME=npm).
# Configure via env:
#   INTEGRATION_RUNTIME  bun | npm     (default: bun)

set -euo pipefail

RUNTIME="${INTEGRATION_RUNTIME:-bun}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t routstr-it)"
INSTALL_PREFIX="${WORK_DIR}/prefix"
PACK_DIR="${WORK_DIR}/pack"
mkdir -p "${INSTALL_PREFIX}" "${PACK_DIR}"

cleanup() {
  rm -rf "${WORK_DIR}" || true
}
trap cleanup EXIT

log() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31mFAIL:\033[0m %s\n' "$*" >&2; exit 1; }

cd "${REPO_ROOT}"

[ -f dist/index.js ] || fail "dist/index.js missing — run 'bun run build' first."

log "Packing CLI tarball"
# `npm pack` is available on both runtimes via the bun-shipped node, but we
# prefer the runtime under test so the tarball mirrors what users would publish.
case "${RUNTIME}" in
  bun)
    if ! command -v bun >/dev/null 2>&1; then fail "bun not on PATH"; fi
    ;;
  npm)
    if ! command -v npm >/dev/null 2>&1; then fail "npm not on PATH"; fi
    ;;
  *)
    fail "Unknown INTEGRATION_RUNTIME='${RUNTIME}' (use bun or npm)"
    ;;
esac

# npm pack is the lingua franca for tarball creation; both runtimes consume it.
TARBALL=$(cd "${PACK_DIR}" && npm pack "${REPO_ROOT}" --silent | tail -n 1)
TARBALL_PATH="${PACK_DIR}/${TARBALL}"
[ -f "${TARBALL_PATH}" ] || fail "Tarball not produced at ${TARBALL_PATH}"
log "Created tarball: ${TARBALL_PATH}"

log "Installing globally via ${RUNTIME}"
case "${RUNTIME}" in
  bun)
    # bun add -g installs into ~/.bun/install/global; override with BUN_INSTALL.
    export BUN_INSTALL="${INSTALL_PREFIX}"
    export PATH="${INSTALL_PREFIX}/bin:${PATH}"
    bun add -g "${TARBALL_PATH}"
    ;;
  npm)
    # npm honors --prefix for non-root global installs.
    export PATH="${INSTALL_PREFIX}/bin:${PATH}"
    npm install -g --prefix "${INSTALL_PREFIX}" "${TARBALL_PATH}"
    ;;
esac

command -v routstr >/dev/null 2>&1 || fail "'routstr' binary not on PATH after install"
log "Installed at: $(command -v routstr)"

run_check() {
  local name="$1"; shift
  log "Smoke: ${name}"
  if ! "$@" >/tmp/routstr-it.out 2>&1; then
    cat /tmp/routstr-it.out
    fail "command failed: ${name}"
  fi
}

assert_contains() {
  local needle="$1" file="$2"
  grep -q -- "${needle}" "${file}" || {
    cat "${file}"
    fail "expected output to contain: ${needle}"
  }
}

# --- Offline commands: do not require a running Routstr node. ---
# Use a fake HOME so the test cannot read or pollute real config.
export HOME="${WORK_DIR}/home"
mkdir -p "${HOME}"

run_check "routstr --version" routstr --version
assert_contains "0." /tmp/routstr-it.out

run_check "routstr --help" routstr --help
assert_contains "routstr" /tmp/routstr-it.out
assert_contains "instruct" /tmp/routstr-it.out

run_check "routstr schema" routstr schema
# schema dumps the Commander tree as JSON and must parse.
node -e "JSON.parse(require('fs').readFileSync('/tmp/routstr-it.out','utf8'))" \
  || fail "schema produced invalid JSON"
assert_contains "\"name\"" /tmp/routstr-it.out
assert_contains "schema" /tmp/routstr-it.out

# init --show with no config should report no config (offline, side-effect-free).
run_check "routstr init --show (empty)" routstr init --show
assert_contains "No config found" /tmp/routstr-it.out

# Write a config and read it back — exercises the local config round-trip.
run_check "routstr init --node-url --token" \
  routstr init --node-url "http://example.invalid:8000" --token "test-admin-token-123"
assert_contains "Config saved" /tmp/routstr-it.out
[ -f "${HOME}/.routstr/config.json" ] || fail "init did not write ${HOME}/.routstr/config.json"

run_check "routstr init --show (populated)" routstr init --show
assert_contains "http://example.invalid:8000" /tmp/routstr-it.out

log "All integration smoke checks passed (${RUNTIME})"
