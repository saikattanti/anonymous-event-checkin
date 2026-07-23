#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

cd "$HOME/midnight-projects/anonymous-event-checkin"

echo "Reusing funded Preprod seed (will not regenerate):"
python3 - <<'PY'
import json
p=".midnight-state.json"
d=json.load(open(p))
w=d["wallets"]["preprod"]
print("  createdAt:", w["createdAt"])
print("  seed prefix:", w["seed"][:12]+"...")
PY

docker compose up -d proof-server
npm run setup -- --network preprod
