export type NetworkId = 'undeployed' | 'preview' | 'preprod';

const NETWORK_IDS: readonly NetworkId[] = ['undeployed', 'preview', 'preprod'];
export const CONTRACT_OVERRIDE_KEY = 'aec:contract-address';

function isNetworkId(v: string): v is NetworkId {
  return (NETWORK_IDS as readonly string[]).includes(v);
}

export interface AppConfig {
  network: NetworkId;
  contractAddress: string | null;
  indexerUri: string | null;
  indexerWsUri: string | null;
  proverUri: string | null;
}

function orNull(v: string | undefined | null): string | null {
  const t = (v ?? '').trim();
  return t.length > 0 ? t : null;
}

function envConfig(): AppConfig {
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

function readOverride(): string | null {
  try {
    return orNull(localStorage.getItem(CONTRACT_OVERRIDE_KEY));
  } catch {
    return null;
  }
}

export function loadConfig(): AppConfig {
  const base = envConfig();
  return {
    ...base,
    contractAddress: readOverride() ?? base.contractAddress,
  };
}

export function saveContractAddressOverride(address: string | null) {
  const cleaned = orNull(address);
  if (cleaned) localStorage.setItem(CONTRACT_OVERRIDE_KEY, cleaned);
  else localStorage.removeItem(CONTRACT_OVERRIDE_KEY);
  window.dispatchEvent(new CustomEvent('aec:config'));
}

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
