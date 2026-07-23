#!/usr/bin/env bash
set -euo pipefail

SRC=/mnt/d/Projects/Rise-In/MidNight/anonymous-event-checkin
DST="$HOME/midnight-projects/anonymous-event-checkin"

mkdir -p "$HOME/midnight-projects"

# Backup funded seed on the Windows path (keep original + backup)
if [ -f "$SRC/.midnight-state.json" ]; then
  cp -n "$SRC/.midnight-state.json" "$SRC/.midnight-state.backup.json" || true
  echo "Backed up Windows-path state:"
  ls -la "$SRC/.midnight-state.json" "$SRC/.midnight-state.backup.json"
fi

# Fresh copy into native Linux FS (exclude heavy/local junk)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude node_modules \
    --exclude midnight-level-db \
    --exclude .midnight-wallet-state \
    --exclude contracts/managed \
    "$SRC/" "$DST/"
else
  mkdir -p "$DST"
  cp -a "$SRC/." "$DST/"
  rm -rf "$DST/node_modules" "$DST/midnight-level-db" "$DST/.midnight-wallet-state" "$DST/contracts/managed"
fi

# Fresh Preprod wallet in the WSL copy
if [ -f "$DST/.midnight-state.json" ]; then
  cp "$DST/.midnight-state.json" "$DST/.midnight-state.backup.json"
  rm -f "$DST/.midnight-state.json"
  echo "WSL copy: moved active state -> .midnight-state.backup.json (new seed will be generated)"
fi
rm -rf "$DST/.midnight-wallet-state"

cd "$DST"
echo "Working dir: $(pwd)"
npm install
npm run compile
echo "READY"
