# Anonymous Event Check-in — Preview status

## Target network

**Preview** via **1AM** (Rise-In July migration — Preprod down).

```bash
npm run proof-server:preview   # optional; Vite proxies remote Preview proof server
npm run dev:preview
```

## Contract address

**`b90200ad492044f33487a095966ab177dfef9bc957e3d185bae8d2126555006e`**

- Network: Preview  
- Deployed via **1AM** (browser Settings → Deploy)  
- Indexer: verified `ContractDeploy` with event name `Anonymous Event Check-in`  
- Explorer: https://preview.midnightexplorer.com/contracts/0xb90200ad492044f33487a095966ab177dfef9bc957e3d185bae8d2126555006e

## Quick verify

1. Unlock **1AM** → **Preview** → synced  
2. Open app → connect → **Check-in** with any invite secret  
3. Public ledger shows `checkInCount` increment  

Faucet: https://faucet.preview.midnight.network/
