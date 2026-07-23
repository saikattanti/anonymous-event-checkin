#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

DST="$HOME/midnight-projects/anonymous-event-checkin"
cd "$DST"

# Fresh wallet only (keep backup)
if [ -f .midnight-state.json ]; then
  echo "ERROR: .midnight-state.json still present — refuse to overwrite. Move it first."
  exit 1
fi
rm -rf .midnight-wallet-state

echo "Starting local proof-server..."
docker compose up -d proof-server

echo "Launching Preprod setup (fresh wallet)..."
npm run setup -- --network preprod
