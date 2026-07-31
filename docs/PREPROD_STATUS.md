# Anonymous Event Check-in — Preprod status

## Target network

**Preprod** via **1AM** + local proof server `:6300` (same path as CipherID / PulseBoard).

```bash
npm run proof-server:preprod
npm run dev:preprod
```

## Contract address

**`Pending`**

App is submission-ready (Deploy UI + check-in wired). Replace this when a Preprod deploy completes.

## Notes

- Prefers **1AM** over Lace when both are installed
- Deploy once; do not double-click (wallet “Duplicate request”)
- Wallet sync / proving can stall — not a blocker for GitHub submission with Pending
