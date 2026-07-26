// Contract integration: read public ledger state and submit anonymous
// check-ins through the connected Lace wallet.
//
// Read path  (getPublicState): indexer -> compiled `ledger()` decoder.
// Write path (submitCheckIn):  midnight-js providers backed by the Lace
//                              wallet -> deployed contract -> callTx.checkIn.
//
// The invite secret passed to checkIn is a *private witness*: it is used to
// build the ZK proof but is never written to the public ledger.

import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// Generated from `contract/src/event-checkin.compact` by the Compact compiler.
// Aliased in vite.config.ts. `Contract` is the contract class; `ledger`
// decodes raw on-chain state into { eventName, checkInCount }.
// @ts-expect-error - generated JS module, types resolved at build time
import { Contract, ledger } from '@contract/contract/index.js';

import type { AppConfig } from './config';
import type { ConnectedWallet } from './lace';

// Must match the privateStateId used by deploy.ts / cli.ts so we reconnect to
// the same (empty) private state. checkIn declares no witnesses.
const PRIVATE_STATE_ID = 'eventCheckinPrivateState';

export interface PublicState {
  eventName: string;
  checkInCount: bigint;
}

function resolveUris(config: AppConfig, wallet: ConnectedWallet) {
  return {
    indexer: config.indexerUri ?? wallet.uris.indexerUri,
    indexerWs: config.indexerWsUri ?? wallet.uris.indexerWsUri,
    prover: config.proverUri ?? wallet.uris.proverServerUri,
  };
}

/**
 * Read the public ledger. Only needs the indexer + the compiled decoder — no
 * wallet, no proofs. Returns null if the contract has no state yet.
 */
export async function getPublicState(
  config: AppConfig,
  indexerUri: string,
  indexerWsUri: string,
): Promise<PublicState | null> {
  if (!config.contractAddress) {
    throw new Error('No contract address configured (set VITE_CONTRACT_ADDRESS).');
  }
  const publicDataProvider = indexerPublicDataProvider(indexerUri, indexerWsUri);
  const contractState = await publicDataProvider.queryContractState(config.contractAddress);
  if (!contractState) return null;

  const state = ledger(contractState.data);
  const eventName =
    typeof state.eventName === 'string'
      ? state.eventName
      : new TextDecoder().decode(state.eventName as Uint8Array);
  return { eventName, checkInCount: state.checkInCount as bigint };
}

function buildWalletProvider(wallet: ConnectedWallet) {
  // Bridges the Lace connector API to the midnight-js WalletProvider /
  // MidnightProvider interfaces used by findDeployedContract.
  return {
    getCoinPublicKey: () => wallet.state.coinPublicKey,
    getEncryptionPublicKey: () => wallet.state.encryptionPublicKey ?? '',
    balanceTx: (tx: unknown, newCoins: unknown[] = []) =>
      wallet.api.balanceAndProveTransaction(tx, newCoins),
    submitTx: (tx: unknown) => wallet.api.submitTransaction(tx),
  };
}

/**
 * Submit one anonymous check-in. `inviteSecret` is the private witness; it is
 * consumed by the proof and never disclosed on-chain.
 */
export async function submitCheckIn(
  config: AppConfig,
  wallet: ConnectedWallet,
  inviteSecret: string,
): Promise<{ txId: string; blockHeight: number }> {
  if (!config.contractAddress) {
    throw new Error('No contract address configured (set VITE_CONTRACT_ADDRESS).');
  }
  if (inviteSecret.trim().length === 0) {
    throw new Error('Invite secret is required.');
  }

  // setNetworkId expects the SDK's NetworkId enum. Our config uses the string
  // union; cast is safe because the runtime accepts the network name.
  setNetworkId(config.network as never);
  const uris = resolveUris(config, wallet);

  const zkConfigProvider = new FetchZkConfigProvider(
    // Serve the compiled `managed/event-checkin` zk assets from the app origin.
    `${window.location.origin}/managed/event-checkin`,
    fetch.bind(window),
  );
  const walletProvider = buildWalletProvider(wallet);

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'anonymous-event-checkin-state',
      accountId: wallet.state.address,
      // Browser-local private state; checkIn has no witnesses so this is empty.
      privateStoragePasswordProvider: () => 'Local-Browser-Development-Placeholder-1',
    }),
    publicDataProvider: indexerPublicDataProvider(uris.indexer, uris.indexerWs),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(uris.prover, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };

  const deployed = await findDeployedContract(providers as never, {
    contractAddress: config.contractAddress,
    contract: new Contract({}),
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  } as never);

  const tx = await (
    deployed as unknown as {
      callTx: { checkIn(secret: string): Promise<{ public: { txId: string; blockHeight: number } }> };
    }
  ).callTx.checkIn(inviteSecret);

  return { txId: tx.public.txId, blockHeight: tx.public.blockHeight };
}
