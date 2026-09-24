#!/usr/bin/env bash
#
# scripts/dev.sh — start the whole stack with one command.
#
# Purpose: runs the C# API (http://localhost:5100) and the Angular dev server
# (http://localhost:4200) together, and stops both when you press Ctrl+C.
#
# Usage:  ./scripts/dev.sh          (from the repository root, or any subfolder)
#
# Then open http://localhost:4200 in a browser.
#
# What it does:
#   1. switches to the Node version pinned in .nvmrc when nvm is installed,
#   2. installs the frontend dependencies if node_modules is missing,
#   3. starts the API and the Angular dev server in the background,
#   4. stops both again on Ctrl+C (or on any exit), so nothing is left holding a port.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
api_project="$repo_root/src/backend/AppointmentScheduler.Api"
web_dir="$repo_root/src/frontend"
api_port="5100"
web_port="4200"

# 1. Node version -----------------------------------------------------------------------------
# The Angular CLI needs the Node version from .nvmrc (22 LTS). nvm is optional: without it the
# script uses whatever `node` is on PATH.
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  cd "$repo_root" && nvm use --silent >/dev/null 2>&1 || true
  echo "node: $(node --version)"
fi

# 2. Frontend dependencies --------------------------------------------------------------------
if [ ! -d "$web_dir/node_modules" ]; then
  echo "Installing frontend dependencies (first run only)..."
  (cd "$web_dir" && npm install)
fi

# 3. Start both halves in the background ------------------------------------------------------
# Both run in the background and the script waits below. That matters: a foreground dev server
# would keep the shell busy, so a Ctrl+C would not be handled until it happened to exit.
echo "Starting the API on http://localhost:${api_port} ..."
dotnet run --project "$api_project" &
api_pid=$!

echo "Starting the web app on http://localhost:${web_port} ..."
cd "$web_dir"
npm start &
web_pid=$!

# 4. Stop both again, whatever happened ------------------------------------------------------
cleanup() {
  echo
  echo "Shutting down the API and the dev server..."
  pkill -P "$web_pid" 2>/dev/null || true
  kill "$web_pid" 2>/dev/null || true
  pkill -P "$api_pid" 2>/dev/null || true # the compiled app is a child of `dotnet run`
  kill "$api_pid" 2>/dev/null || true
  wait 2>/dev/null || true
  # Last resort: npm runs `ng serve` through a shell, so the process tree is not always what one
  # expects. Anything still listening on a dev port is stopped by port.
  for port in "$api_port" "$web_port"; do
    lsof -ti "tcp:$port" 2>/dev/null | xargs kill 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

wait "$web_pid"
