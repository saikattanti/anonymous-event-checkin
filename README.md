# Anonymous Event Check-in

A **Midnight** DApp where attendees prove they hold a valid invite/check-in secret **without revealing their identity or the secret**. The public ledger shows only the **event name** and a running **anonymous check-in count**.

Built with Compact **0.31.1**. Contract source lives at `contract/src/event-checkin.compact`.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=flat-square&logo=vercel)](https://anonymous-event-checkin.vercel.app/)
[![Demo Video](https://img.shields.io/badge/Demo_Video-YouTube-FF0000?style=flat-square&logo=youtube)](https://youtu.be/gnPuRBhZtxc)
[![Compact](https://img.shields.io/badge/Compact-0.31.1-06b6d4?style=flat-square)](https://docs.midnight.network)
[![Node.js](https://img.shields.io/badge/Node.js-22+-10b981?style=flat-square)](https://nodejs.org)

- **Level 1** — Compact contract + local deploy + CLI ✅
- **Level 2** — Web frontend with Lace wallet connect + `checkIn` circuit call ✅
- **Level 3** — Tests, CI, privacy model, product proposal, submission checklist ✅

## Links

| Resource | URL |
| --- | --- |
| **Live demo** | [https://anonymous-event-checkin.vercel.app/](https://anonymous-event-checkin.vercel.app/) |
| **Demo video** | [https://youtu.be/gnPuRBhZtxc](https://youtu.be/gnPuRBhZtxc) |
| **GitHub** | [saikattanti/anonymous-event-checkin](https://github.com/saikattanti/anonymous-event-checkin) |
| **CI** | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |

### Screenshots
![Landing Page](checkin-ui/public/landing.png)
![App Dashboard](checkin-ui/public/app.png)

---

## Product Proposal

**Category: Private Allowlist Access**

> An attendee proves they know a valid invite/check-in secret without revealing the secret publicly. The app only reveals that *an* anonymous eligible attendee checked in, and updates the public count.

Event hosts often need a verifiable headcount without collecting wallets, emails, or QR identities on-chain. Guests receive an invite secret out-of-band (DM, badge code, printed pass). At the door — or remotely — they submit a Midnight transaction that **witnesses** that secret inside a zero-knowledge circuit. The chain only learns that "someone who knew a valid secret checked in," and the public counter increments.

This is a reusable building block for **private allowlist access**: gated conferences, DAO-member events, invite-only drops, and any flow where *eligibility* must be provable but *identity* must stay private.

---

## Privacy Model

What an on-chain observer (indexer, explorer, validator) **can** and **cannot** learn:

| An observer CAN see | An observer CANNOT see |
| --- | --- |
| The `eventName` (set publicly at deploy) | The invite/attendee secret |
| The total `checkInCount` | Who checked in (no address is written to the ledger) |
| That a check-in transaction occurred | Any link between a check-in and a specific person |
| The ZK proof is valid | The witness data used to build the proof |

How it is enforced in `contract/src/event-checkin.compact`:

- `eventName` is written with `disclose(name)` — it is **intentionally** public.
- `inviteSecret` is an `Opaque<"string">` **circuit input** used only inside the `checkIn` proof. It is **never** passed to `disclose()` and is **never** stored in a ledger field, so it cannot appear on-chain.
- `checkInCount` is a `Counter`; `checkIn` only calls `checkInCount.increment(1)`, revealing an aggregate — not an identity.

> Note on unlinkability: like any transaction, a check-in is submitted from a wallet that pays fees, so network-level metadata still exists. The **contract** reveals nothing about identity or the secret; the privacy guarantee is at the ledger/state level.

---

## Public state vs private witness

| Layer | What | Visibility |
| --- | --- | --- |
| **Public ledger** | `eventName`, `checkInCount` | Anyone can read via the indexer |
| **Private witness** | `inviteSecret` (`Opaque<"string">` circuit input) | Used only inside the `checkIn` proof; never disclosed, never stored |

---

## Requirements

- Node **22+**
- Docker (Compose v2) — for the local devnet + proof server
- Compact compiler **0.31.1**

Install the Compact toolchain and select 0.31.1:

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
# restart your shell, then:
compact update 0.31.1
```

> On WSL, work from the native Linux filesystem (e.g. `~/midnight-projects/...`) rather than `/mnt/c` or `/mnt/d`. Windows-mounted paths cause `chmod`/permission errors during compile and unreliable wallet sync. If compile complains about `chmod`, `export COMPACT_BACKEND=wasm` before `npm run compile`.

## Install

```bash
npm install            # backend (contract, deploy, CLI, tests)
npm install                 # all workspaces (contract, api, cli, ui)
```

## Compile

```bash
npm run compile
```

Runs `compact compile contract/src/event-checkin.compact contract/src/managed/event-checkin`. Output lands in `contract/src/managed/event-checkin/` (JS bindings, ZKIR, keys, circuit metadata).

## Test

```bash
npm test
```

Runs the Node test suite in `tests/` (network resolution, state round-trip, and compiled-artifact privacy invariants). Requires `npm run compile` first for the contract-artifact tests.

## Local deploy

One-shot (starts local node + indexer + proof-server, compiles, deploys):

```bash
npm run setup
```

Or step by step:

```bash
docker compose up -d --wait
npm run compile
npm run deploy
```

Deploy writes the contract address to `.midnight-state.json` under `deployments.undeployed`. Interact via the CLI:

```bash
npm run cli
```

- **Option 1** — submit an anonymous check-in with a private invite secret
- **Option 2** — read public `eventName` and `checkInCount`

Smoke-test the deployment:

```bash
npm run test:e2e
```

### Local devnet ports

| Service | Port | Role |
| --- | --- | --- |
| node | 9944 | Midnight `dev` chain |
| indexer | 8088 | GraphQL public state |
| proof-server | 6300 | ZK proof generation |

Tear down: `docker compose down -v`.

### Local seed warning

Local deploy uses the well-known genesis seed (`0000…0001`). **Do not** use it on Preprod, Preview, or mainnet.

---

## UI (Level 2)

Live demo: **[anonymous-event-checkin.vercel.app](https://anonymous-event-checkin.vercel.app/)** · Walkthrough: **[YouTube](https://youtu.be/gnPuRBhZtxc)**

A Vite + React + TypeScript console in [`checkin-ui/`](./checkin-ui) that connects **Lace (Midnight)** and calls the `checkIn` circuit.

Features:
- Lace auto-connect on load (disconnect disables auto-connect until you reconnect)
- Top-nav console: Overview · Door check-in · Activity · Config
- Network + contract address from env, with in-browser contract override in **Config**
- Invite-secret input (private witness) → anonymous `checkIn`
- Public ledger panel: `eventName` + `checkInCount`
- Local activity log; loading / success (tx + block) / error states

### App routes

| Route | Purpose |
| --- | --- |
| `/` | Landing |
| `/dashboard` | Event desk overview |
| `/check-in` | Private invite → `checkIn` + public ledger |
| `/logs` | Local activity log |
| `/settings` | Contract address, Lace, env |

### Run the UI locally

1. Deploy the contract (local devnet) and note the address:

   ```bash
   npm run setup
   # address printed, and saved to .midnight-state.json -> deployments.undeployed
   ```

2. Configure the UI:

   ```bash
   cd checkin-ui
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   ```env
   VITE_MIDNIGHT_NETWORK=undeployed
   VITE_CONTRACT_ADDRESS=<address from .midnight-state.json>
   # Local devnet services (Lace may not know your localhost endpoints):
   VITE_INDEXER_URI=http://127.0.0.1:8088/api/v4/graphql
   VITE_INDEXER_WS_URI=ws://127.0.0.1:8088/api/v4/graphql/ws
   VITE_PROVER_URI=http://127.0.0.1:6300
   ```

3. Start it:

   ```bash
   npm install       # first time only
   npm run dev       # http://localhost:5173
   ```

   (From the project root you can also run `npm run dev` / `npm run build`, which delegate to `checkin-ui/`.)

Open [http://localhost:5173](http://localhost:5173) or the [live demo](https://anonymous-event-checkin.vercel.app/).

The compiled contract's ZK assets are copied into `checkin-ui/public/managed/` automatically before `dev`/`build` (see `checkin-ui/scripts/copy-contract-assets.mjs`). Managed artifacts under `contract/src/managed/event-checkin/` are committed so Vercel builds without a Compact install.

### Switch from local devnet to Preprod

Once a Preprod contract address is available, only the UI env changes — **no code edits**:

```env
VITE_MIDNIGHT_NETWORK=preprod
VITE_CONTRACT_ADDRESS=<preprod contract address>
# Leave the endpoint overrides blank to use Lace's own Preprod URIs, or set:
VITE_INDEXER_URI=https://indexer.preprod.midnight.network/api/v4/graphql
VITE_INDEXER_WS_URI=wss://indexer.preprod.midnight.network/api/v4/graphql/ws
# VITE_PROVER_URI= (leave blank to use the wallet's prover)
```

Point Lace at Preprod, reconnect, and the same UI now targets Preprod.

---

## Contract overview

Compact source: `contract/src/event-checkin.compact`

- **Constructor** `name` → sets public `eventName` via `disclose(name)`
- **Circuit** `checkIn(inviteSecret)` → private opaque secret; increments public `checkInCount`

## Networks

| Network | Use |
| --- | --- |
| `undeployed` | Local docker-compose devnet (default) |
| `preview` | Public preview testnet |
| `preprod` | Public preprod testnet |

```bash
npm run network undeployed
npm run setup -- --network preview
npm run setup -- --network preprod
```

Public networks need faucet funding (URLs printed by setup). Wallet seeds for preview/preprod live in `.midnight-state.json` (gitignored) — **back them up** if you fund them.

## Continuous Integration (Level 3)

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push and pull request:

1. Install Node 22 + dependencies.
2. Install the Compact toolchain and select 0.31.1.
3. `npm run compile` — compile the contract.
4. `npm test` — run the test suite.
5. Type-check the backend, then type-check & build the UI.

## Preprod Deployment Status

The Compact contract compiles and deploys/executes end-to-end on the **local devnet** (compile → deploy → CLI check-in → read-back). Preprod deployment has been attempted with a **funded** wallet, but is currently blocked during **wallet synchronization**: endpoints are reachable, yet the Midnight wallet SDK does not finish sync and surfaces `Wallet.Sync` errors from the shielded/unshielded packages.

| Item | Status |
| --- | --- |
| Compact compile (0.31.1) | ✅ Succeeds (`checkIn` circuit) |
| Local (`undeployed`) deploy + CLI | ✅ Verified |
| Tests + CI | ✅ Passing |
| Frontend (Lace connect + `checkIn`) | ✅ Live on Vercel |
| Demo video | ✅ [YouTube](https://youtu.be/gnPuRBhZtxc) |
| Preprod wallet + faucet funding | ✅ Wallet funded (seed kept in `.midnight-state.json`) |
| Preprod wallet sync / deploy | ⏳ Blocked / waived — SDK `Wallet.Sync` hang |

### Mentor guidance (Preprod)

> If you're unable to deploy, just build the full-stack dApp and submit it. Skip the deployment part for now.

Submission includes local undeployed deploy, live full-stack UI, tests, CI, and demo video.

---

## Submission Checklist

### Level 1 — Contract & local deploy
- [x] Compact contract compiles (0.31.1)
- [x] Public ledger: `eventName`, `checkInCount`
- [x] `checkIn` circuit takes a private `Opaque` invite secret
- [x] `disclose()` used only for the intentionally public event name
- [x] Local deploy works (`npm run setup`)
- [x] CLI can call `checkIn` and read public state (`npm run cli`)
- [x] Product idea documented

### Level 2 — Frontend & wallet
- [x] Web UI (`checkin-ui/`) — venue console (Overview / Door / Activity / Config)
- [x] Lace wallet auto-connect / disconnect + status
- [x] Network + contract address from environment variables (+ Config override)
- [x] Invite-secret input
- [x] Anonymous check-in button calls `checkIn`
- [x] Public state panel (`eventName`, `checkInCount`)
- [x] Loading / success / error states
- [x] Docs: run UI locally + switch local → Preprod
- [x] Live demo on Vercel
- [x] Demo video on YouTube

### Level 3 — Tests, CI, polish
- [x] ≥ 3 automated tests (`npm test` — 10 tests)
- [x] GitHub Actions CI (compile + tests + typecheck + UI build)
- [x] Privacy Model section
- [x] Product Proposal (category: Private Allowlist Access)
- [x] This submission checklist
- [x] Existing contract / deploy / CLI still work
- [x] Preprod deploy blocked/waived (wallet sync) — full-stack submitted first (mentor guidance)

---

## Available scripts

| Script | Description |
| --- | --- |
| `npm run compile` | Compile Compact → `contract/src/managed/event-checkin/` |
| `npm test` | Run the test suite in `tests/` |
| `npm run typecheck` | Type-check the backend (non-blocking) |
| `npm run setup` | Start proof stack (and local node if undeployed), compile, deploy |
| `npm run deploy` | Deploy the compiled contract |
| `npm run cli` | Check in / read public state |
| `npm run check-balance` | NIGHT / DUST balances |
| `npm run test:e2e` | Read-back smoke check |
| `npm run clean` | Remove `contract/src/managed/` (does **not** touch `.midnight-state.json`) |
| `npm install` | Install all workspace dependencies |
| `npm run dev` | Run the UI dev server |
| `npm run build` | Build the UI |

## Project structure

```
anonymous-event-checkin/
├── contract/                     # Compact + managed ZK artifacts
│   └── src/
│       ├── event-checkin.compact
│       ├── witnesses.ts
│       ├── index.ts
│       └── managed/event-checkin/
├── api/                          # Shared types/utils for CLI + UI
├── checkin-cli/                  # Deploy, CLI, wallet, network
│   └── src/
├── checkin-ui/                   # Vite + React venue console
│   └── src/
├── tests/
├── scripts/
├── .github/workflows/ci.yml
├── docker-compose.yml
├── vercel.json                   # Vercel → checkin-ui/dist
├── package.json                  # npm workspaces root
└── README.md
``