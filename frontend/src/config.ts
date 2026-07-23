// Runtime configuration, sourced entirely from Vite env vars so the same
// build can target local devnet, Preview, or Preprod without code changes.

export type NetworkId = 'undeployed' | 'preview' | 'preprod';

const NETWORK_IDS: readonly NetworkId[] = ['undeployed', 'preview', 'preprod'];

function isNetworkId(v: string): v is NetworkId {
  return (NETWORK_IDS as readonly string[]).includes(v);
}

export interface AppConfig {
  network: NetworkId;
  contractAddress: string | null;
  /** Optional endpoint overrides; when null, the Lace serviceUriConfig() is used. */
  indexerUri: string | null;
  indexerWsUri: string | null;
  proverUri: string | null;
}

function orNull(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
}

export function loadConfig(): AppConfig {
  const rawNetwork = (import.meta.env.VITE_MIDNIGHT_NETWORK ?? 'undeployed').trim();
  const network: NetworkId = isNetworkId(rawNetwork) ? rawNetwork : 'undeployed';

  return {
    network,
    contractAddress: orNull(import.meta.env.VITE_CONTRACT_ADDRESS),
    indexerUri: orNull(import.meta.env.VITE_INDEXER_URI),
    indexerWsUri: orNull(import.meta.env.VITE_INDEXER_WS_URI),
    proverUri: orNull(import.meta.env.VITE_PROVER_URI),
  };
}

/** Human-readable label for the active network. */
export function networkLabel(n: NetworkId): string {
  switch (n) {
    case 'undeployed':
      return 'Local devnet';
    case 'preview':
      return 'Preview testnet';
    case 'preprod':
      return 'Preprod testnet';
  }
}
