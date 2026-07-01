#!/bin/zsh
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"

pause_on_error() {
  local exit_code=$?

  if [[ $exit_code -ne 0 && $exit_code -ne 130 && $exit_code -ne 143 && -t 0 ]]; then
    echo ""
    echo "Dew stopped with an error."
    echo "Fix the message above, then double-click Dew.command again."
    echo ""
    printf "Press Return to close this window..."
    read -r _
  fi

  exit "$exit_code"
}

trap pause_on_error EXIT

echo "Dew MediArchive"
echo "Starting local receiver and opening the library..."
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Dew needs Node.js before it can start."
  echo "Install Node.js, then double-click Dew.command again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Dew needs npm before it can build the local receiver."
  echo "Install Node.js with npm, then double-click Dew.command again."
  exit 1
fi

node scripts/start-dew.mjs --open
