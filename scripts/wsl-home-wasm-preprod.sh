#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

cd "$HOME/midnight-projects/anonymous-event-checkin"

# Friend's working compile backend
export COMPACT_BACKEND=wasm

echo "PWD=$(pwd)"
echo "COMPACT_BACKEND=$COMPACT_BACKEND"
echo "Keeping funded state:"
test -f .midnight-state.json && python3 - <<'PY'
import json
d=json.load(open(".midnight-state.json"))
print("  activeNetwork:", d.get("activeNetwork"))
print("  preprod seed prefix:", d["wallets"]["preprod"]["seed"][:12]+"...")
print("  deployments:", d.get("deployments"))
PY

# Prefer non-sudo on native home; fall back only if needed
rm -rf contracts/managed/event-checkin || true
if [ -e contracts/managed/event-checkin ]; then
  echo "Need elevated remove for contracts/managed/event-checkin"
  sudo rm -rf contracts/managed/event-checkin
fi

npm run compile

docker compose up -d proof-server
npm run setup -- --network preprod
