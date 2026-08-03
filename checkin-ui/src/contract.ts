// Contract integration: read public ledger, deploy, and submit anonymous check-ins.

import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type {
  Binding,
  FinalizedTransaction,
  Proof,
  SignatureEnabled,
} from '@midnight-ntwrk/midnight-js-protocol/ledger';

// @ts-expect-error - generated JS module, types resolved at build time
import { Contract, ledger } from '@contract/contract/index.js';

import type { AppConfig } from './config';
import type { ConnectedWallet } from './lace';

const PRIVATE_STATE_ID = 'eventCheckinPrivateState';
const DEFAULT_EVENT_NAME = 'Anonymous Event Check-in';

export interface PublicState {
  eventName: string;
  checkInCount: bigint;
}

function zkAssetBase() {
  return `${window.location.origin}/managed/event-checkin`;
}

function compiledContract() {
  return CompiledContract.make('event-checkin', Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkAssetBase()),
  );
}

function resolveProverUri(prover: string): string {
  if (
    typeof window !== 'undefined' &&
    /proof-server\.(preprod|preview)\.midnight\.network/i.test(prover)
  ) {
    return `${window.location.origin}/proof-server`;
  }
  return prover;
}

function resolveUris(config: AppConfig, wallet: ConnectedWallet) {
  const prover = config.proverUri ?? wallet.uris.proverServerUri;
  return {
    indexer: config.indexerUri ?? wallet.uris.indexerUri,
    indexerWs: config.indexerWsUri ?? wallet.uris.indexerWsUri,
    prover: resolveProverUri(prover),
  };
}

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
  return {
    getCoinPublicKey: () => wallet.state.coinPublicKey,
    getEncryptionPublicKey: () => wallet.state.encryptionPublicKey ?? '',
    balanceTx: async (tx: unknown, newCoins: unknown[] = []) => {
      if (typeof wallet.api.balanceUnsealedTransaction === 'function') {
        const serialized =
          tx && typeof (tx as { serialize?: () => Uint8Array }).serialize === 'function'
            ? toHex((tx as { serialize: () => Uint8Array }).serialize())
            : typeof tx === 'string'
              ? tx
              : String(tx);
        const received = await wallet.api.balanceUnsealedTransaction(serialized, {
          payFees: true,
        });
        const raw = received.tx;
        if (typeof raw === 'string') {
          return Transaction.deserialize<SignatureEnabled, Proof, Binding>(
            'signature',
            'proof',
            'binding',
            fromHex(raw),
          );
        }
        return raw as FinalizedTransaction;
      }
      return wallet.api.balanceAndProveTransaction(tx, newCoins) as Promise<FinalizedTransaction>;
    },
    submitTx: async (tx: unknown) => {
      // Mirror CipherID: watchForTxData needs a TransactionOffset.identifier from
      // the finalized tx, not whatever the wallet RPC returns (hash / void / object).
      const finalized = tx as FinalizedTransaction & {
        identifiers?: () => string[];
        serialize?: () => Uint8Array;
      };
      const hex =
        typeof finalized.serialize === 'function'
          ? toHex(finalized.serialize())
          : typeof tx === 'string'
            ? tx
            : String(tx);
      await wallet.api.submitTransaction(hex);
      const ids =
        typeof finalized.identifiers === 'function' ? finalized.identifiers() : [];
      const identifier = ids[0];
      if (!identifier) {
        throw new Error(
          'Wallet submitted but no transaction identifier was available for indexer watch.',
        );
      }
      return identifier;
    },
  };
}

function buildProviders(config: AppConfig, wallet: ConnectedWallet) {
  setNetworkId(config.network as never);
  const uris = resolveUris(config, wallet);
  const zkConfigProvider = new FetchZkConfigProvider(zkAssetBase(), fetch.bind(window));
  const walletProvider = buildWalletProvider(wallet);

  return {
    uris,
    providers: {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: 'anonymous-event-checkin-state',
        accountId: wallet.state.address,
        privateStoragePasswordProvider: () => 'Local-Browser-Development-Placeholder-1',
      }),
      publicDataProvider: indexerPublicDataProvider(uris.indexer, uris.indexerWs),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(uris.prover, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    },
  };
}

export async function deployEventContract(
  config: AppConfig,
  wallet: ConnectedWallet,
  eventName = DEFAULT_EVENT_NAME,
): Promise<{ contractAddress: string }> {
  const { providers } = buildProviders(config, wallet);
  const deployed = await deployContract(providers as never, {
    compiledContract: compiledContract() as never,
    args: [eventName] as never,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  });
  const contractAddress = String(
    (deployed as { deployTxData: { public: { contractAddress: string } } }).deployTxData.public
      .contractAddress,
  );
  return { contractAddress };
}

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

  const { providers } = buildProviders(config, wallet);

  const deployed = await findDeployedContract(providers as never, {
    compiledContract: compiledContract() as never,
    contractAddress: config.contractAddress,
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
