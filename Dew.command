#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"

echo "Dew MediArchive"
echo "Starting local receiver and opening the library..."
echo ""

node scripts/start-dew.mjs --open
