#!/usr/bin/env bash
set -euo pipefail

# Ensure nvm/node from interactive profile
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.local/bin:$PATH"

DST="$HOME/midnight-projects/anonymous-event-checkin"
cd "$DST"

echo "PWD=$(pwd)"
echo "node=$(command -v node) $(node -v)"
echo "npm=$(command -v npm) $(npm -v)"
echo "compact=$(command -v compact || true)"

rm -rf node_modules
npm install
npm run compile
echo READY
