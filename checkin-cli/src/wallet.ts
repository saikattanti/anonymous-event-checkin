// Wallet construction + sync-state restore.
//
// Mirrors network.ts in structure. The on-disk format and pure I/O live in
// wallet-state.ts (unit-tested from the scaffolder workspace, no SDK deps);
// this file is the glue between that format and the wallet SDK.

import { Buffer } from 'buffer';

// Ledger types now come from the midnight-js-protocol barrel, which re-exports
// ledger-v8 (8.1.0) under a stable subpath instead of depending on it directly.
import * as ledger from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
// As of Midnight.js 4.1.x / ledger-v8 8.1.0 the wallet SDK is consolidated behind
// the single @midnight-ntwrk/wallet-sdk barrel, which re-exports the former
// wallet-sdk-facade / -hd / -shielded / -dust-wallet / -unshielded-wallet packages.
import {
  WalletFacade,
  DustWallet,
  HDWallet,
  Roles,
  ShieldedWallet,
  createKeystore,
  NoOpTransactionHistoryStorage,
  PublicKey,
  UnshieldedWallet,
} from '@midnight-ntwrk/wallet-sdk';

import type { NetworkConfig, NetworkId } from './network';
import {
  CHILD_KINDS,
  loadWalletState,
  saveWalletState,
  type ChildKind,
  type PersistedWalletState,
} from './wallet-state';

export { unshieldedToken };
export type { PersistedWalletState };
export {
  loadWalletState,
  saveWalletState,
  clearWalletState,
  WALLET_STATE_DIR,
  WALLET_STATE_VERSION,
} from './wallet-state';

function deriveKeys(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid seed');
  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();
  return result.keys;
}

export interface WalletContext {
  wallet: Awaited<ReturnType<typeof WalletFacade.init>>;
  shieldedSecretKeys: ReturnType<typeof ledger.ZswapSecretKeys.fromSeed>;
  dustSecretKey: ReturnType<typeof ledger.DustSecretKey.fromSeed>;
  unshieldedKeystore: ReturnType<typeof createKeystore>;
  restored: { shielded: boolean; unshielded: boolean; dust: boolean };
}

export interface CreateWalletOptions {
  network: NetworkId;
  networkConfig: NetworkConfig;
  seed: string;
  /**
   * Whether to attempt to restore each child wallet from saved state.
   * Defaults to true. Pass false to force a from-seed sync (used by tests).
   */
  restore?: boolean;
  cwd?: string;
}

function warnRestoreFailure(kind: ChildKind, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`  ⚠ Could not restore ${kind} wallet state (${msg}); falling back to fresh sync.\n`);
}

/**
 * Build the wallet facade, restoring each child from saved state when
 * available and falling back to a from-seed start when not (or when restore
 * throws, e.g. after an SDK upgrade with an incompatible state format).
 *
 * Caller is responsible for `await wallet.waitForSyncedState()` afterwards.
 */
export async function createWallet(opts: CreateWalletOptions): Promise<WalletContext> {
  setNetworkId(opts.networkConfig.networkId);

  const keys = deriveKeys(opts.seed);
  const networkId = getNetworkId();
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], networkId);

  const saved: PersistedWalletState = opts.restore === false
    ? {}
    : loadWalletState(opts.network, { cwd: opts.cwd });

  const restored = { shielded: false, unshielded: false, dust: false };

  const walletConfig = {
    networkId,
    indexerClientConnection: {
      indexerHttpUrl: opts.networkConfig.indexer,
      indexerWsUrl: opts.networkConfig.indexerWS,
    },
    provingServerUrl: new URL(opts.networkConfig.proofServer),
    relayURL: new URL(opts.networkConfig.node.replace(/^http/, 'ws')),
    txHistoryStorage: new NoOpTransactionHistoryStorage(),
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  };

  const wallet = await WalletFacade.init({
    configuration: walletConfig,
    shielded: async (config) => {
      const cls = ShieldedWallet(config);
      if (saved.shielded !== undefined) {
        try {
          const restoredWallet = await (cls as any).restore(saved.shielded);
          restored.shielded = true;
          return restoredWallet;
        } catch (err) {
          warnRestoreFailure('shielded', err);
        }
      }
      return cls.startWithSecretKeys(shieldedSecretKeys);
    },
    unshielded: async (config) => {
      const cls = UnshieldedWallet(config);
      if (saved.unshielded !== undefined) {
        try {
          const restoredWallet = await (cls as any).restore(saved.unshielded);
          restored.unshielded = true;
          return restoredWallet;
        } catch (err) {
          warnRestoreFailure('unshielded', err);
        }
      }
      return cls.startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
    },
    dust: async (config) => {
      const cls = DustWallet(config);
      if (saved.dust !== undefined) {
        try {
          const restoredWallet = await (cls as any).restore(saved.dust);
          restored.dust = true;
          return restoredWallet;
        } catch (err) {
          warnRestoreFailure('dust', err);
        }
      }
      return cls.startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust);
    },
  });

  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore, restored };
}

/**
 * Serialize each child wallet's current state and persist it for the next run.
 * Safe to call multiple times. Logs but does not throw on individual failures —
 * losing one child's state means the next run re-syncs that child only.
 */
export async function persistWalletState(
  network: NetworkId,
  ctx: WalletContext,
  cwd?: string,
): Promise<void> {
  const next: PersistedWalletState = {};

  for (const kind of CHILD_KINDS) {
    try {
      const child = (ctx.wallet as unknown as Record<ChildKind, { serializeState: () => Promise<unknown> }>)[kind];
      const serialized = await child.serializeState();
      if (kind === 'dust') {
        next.dust = serialized as string;
      } else {
        next[kind] = serialized;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`  ⚠ Could not serialize ${kind} wallet state (${msg}); next run will re-sync.\n`);
    }
  }

  saveWalletState(network, next, { cwd });
}

/** Default sync budget for local undeployed (finishes in seconds). */
export const DEFAULT_SYNC_TIMEOUT_MS = 10 * 60 * 1000;

/** Longer budget for public networks — first Preprod sync can exceed 10 minutes. */
export const PUBLIC_NETWORK_SYNC_TIMEOUT_MS = 45 * 60 * 1000;

export interface WaitForWalletSyncOptions {
  network: NetworkId;
  networkConfig: NetworkConfig;
  /** Override sync timeout. Defaults by network; env MIDNIGHT_SYNC_TIMEOUT_MS wins. */
  timeoutMs?: number;
}

function resolveSyncTimeoutMs(network: NetworkId, override?: number): number {
  const fromEnv = Number(process.env.MIDNIGHT_SYNC_TIMEOUT_MS);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  if (override !== undefined) return override;
  return network === 'undeployed' ? DEFAULT_SYNC_TIMEOUT_MS : PUBLIC_NETWORK_SYNC_TIMEOUT_MS;
}

/**
 * Log connection details, then wait for wallet sync with a hard timeout.
 * Does not read, write, delete, or regenerate `.midnight-state.json`.
 */
export async function waitForWalletSync(
  ctx: WalletContext,
  opts: WaitForWalletSyncOptions,
): Promise<Awaited<ReturnType<WalletContext['wallet']['waitForSyncedState']>>> {
  const { network, networkConfig } = opts;
  const timeoutMs = resolveSyncTimeoutMs(network, opts.timeoutMs);
  const address = ctx.unshieldedKeystore.getBech32Address().toString();

  console.log(`  Wallet Address: ${address}`);
  console.log(`  Network:        ${network}`);
  console.log(`  Node URL:       ${networkConfig.node}`);
  console.log(`  Indexer URL:    ${networkConfig.indexer}`);
  console.log(`  Indexer WS URL: ${networkConfig.indexerWS}`);
  console.log(`  Sync timeout:   ${Math.round(timeoutMs / 60_000)} min\n`);

  console.log('  Syncing with network...');
  console.log('  ℹ  This may take several minutes depending on network size.');
  console.log('     RPC disconnection messages during sync are normal and can be safely ignored.\n');

  const syncStart = Date.now();
  const syncInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - syncStart) / 1000);
    process.stdout.write(`\r  ⏳ Still syncing... (${elapsed}s elapsed)   `);
  }, 5000);

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  try {
    const state = await Promise.race([
      ctx.wallet.waitForSyncedState(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const label = network === 'preprod' ? 'Preprod' : network;
          reject(
            new Error(
              `${label} wallet sync did not complete within ${Math.round(timeoutMs / 60_000)} minutes. ` +
                'Endpoints may be reachable, but the Midnight wallet SDK did not finish syncing ' +
                `(Wallet.Sync / shielded+unshielded). Your funded seed in .midnight-state.json was not modified.`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
    process.stdout.write('\r  ✓ Synced with network.                                      \n');
    return state;
  } finally {
    clearInterval(syncInterval);
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
