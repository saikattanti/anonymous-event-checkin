// Midnight wallet connector helpers.
//
// Official guidance (2026): do NOT hardcode `window.midnight.mnLace`.
// Lace (and other Midnight wallets) inject under `window.midnight` keyed by a
// UUID. Enumerate with Object.values(). Lace Midnight Preview is deprecated;
// Midnight lives in the main Lace extension.
//
// We support both connector shapes still seen in the wild:
//   legacy: enable() + serviceUriConfig() + wallet.state()
//   current: connect(networkId) + getConfiguration() + getShieldedAddresses()

export interface ServiceUriConfig {
  indexerUri: string;
  indexerWsUri: string;
  proverServerUri: string;
  substrateNodeUri: string;
  networkId?: string;
}

export interface WalletState {
  address: string;
  coinPublicKey: string;
  encryptionPublicKey?: string;
}

/** Wallet API surface consumed by midnight-js providers in contract.ts. */
export interface DAppConnectorWalletAPI {
  state(): Promise<WalletState>;
  balanceAndProveTransaction(tx: unknown, newCoins?: unknown[]): Promise<unknown>;
  submitTransaction(tx: unknown): Promise<string>;
  balanceTransaction?(tx: unknown, newCoins?: unknown[]): Promise<unknown>;
  proveTransaction?(tx: unknown): Promise<unknown>;
  balanceUnsealedTransaction?(
    tx: unknown,
    opts?: { payFees?: boolean },
  ): Promise<{ tx: unknown }>;
}

export interface InjectedWallet {
  apiVersion: string;
  name?: string;
  icon?: string;
  rdns?: string;
  // Legacy connector (Lace Midnight Preview / older Lace)
  enable?: () => Promise<DAppConnectorWalletAPI>;
  isEnabled?: () => Promise<boolean>;
  serviceUriConfig?: () => Promise<ServiceUriConfig>;
  // Current connector (main Lace + DApp Connector API)
  connect?: (networkId?: string) => Promise<ConnectedWalletAPI>;
}

export interface ConnectedWalletAPI {
  getConfiguration(): Promise<ServiceUriConfig>;
  getConnectionStatus?(): Promise<{ status: string; networkId?: string }>;
  getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey?: string;
  }>;
  getUnshieldedAddress?(): Promise<{ unshieldedAddress: string }>;
  balanceAndProveTransaction?(tx: unknown, newCoins?: unknown[]): Promise<unknown>;
  balanceUnsealedTransaction?(
    tx: unknown,
    opts?: { payFees?: boolean },
  ): Promise<{ tx: unknown }>;
  submitTransaction(tx: unknown): Promise<string>;
}

declare global {
  interface Window {
    midnight?: Record<string, InjectedWallet | undefined>;
  }
}

/** Official main Lace extension (Midnight is built in; Preview is deprecated). */
export const LACE_STORE_URL =
  'https://chromewebstore.google.com/detail/lace/gafhhkghbfjjkeiendhlofajokpaflmk';

/** @deprecated Use LACE_STORE_URL — kept so older UI imports keep compiling. */
export const LACE_MIDNIGHT_STORE_URL = LACE_STORE_URL;

function looksLikeWallet(value: unknown): value is InjectedWallet {
  if (!value || typeof value !== 'object') return false;
  const w = value as InjectedWallet;
  if (typeof w.apiVersion !== 'string') return false;
  return typeof w.enable === 'function' || typeof w.connect === 'function';
}

/** All Midnight wallets currently injected into the page. */
export function listWallets(): InjectedWallet[] {
  const injected = window.midnight;
  if (!injected) return [];
  return Object.values(injected).filter(looksLikeWallet);
}

/**
 * Prefer Lace when several wallets are present; otherwise the first injected
 * connector. Official docs say to let the user choose when there are many —
 * for this submission UI we keep a single-button flow.
 */
export function selectWallet(): InjectedWallet | null {
  const wallets = listWallets();
  if (wallets.length === 0) return null;
  const lace = wallets.find((w) => {
    const label = `${w.name ?? ''} ${w.rdns ?? ''}`.toLowerCase();
    return label.includes('lace');
  });
  return lace ?? wallets[0] ?? null;
}

export function getConnector(): InjectedWallet | null {
  // Backward-compatible: still honor mnLace if present, else enumerate.
  const named = window.midnight?.mnLace;
  if (looksLikeWallet(named)) return named;
  return selectWallet();
}

export function isLaceInstalled(): boolean {
  return listWallets().length > 0;
}

/**
 * Extensions often inject `window.midnight` a moment after page load.
 * Poll briefly so a correct install is not reported as "not detected".
 */
export function waitForLace(timeoutMs = 5000, intervalMs = 200): Promise<boolean> {
  if (isLaceInstalled()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (isLaceInstalled()) {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, intervalMs);
  });
}

export interface ConnectedWallet {
  api: DAppConnectorWalletAPI;
  state: WalletState;
  uris: ServiceUriConfig;
  walletName?: string;
}

function adaptConnectedApi(connected: ConnectedWalletAPI, state: WalletState): DAppConnectorWalletAPI {
  return {
    state: async () => state,
    balanceAndProveTransaction: async (tx, newCoins = []) => {
      if (typeof connected.balanceAndProveTransaction === 'function') {
        return connected.balanceAndProveTransaction(tx, newCoins);
      }
      // Fallback for wallets that only expose the newer unsealed balancer.
      if (typeof connected.balanceUnsealedTransaction === 'function') {
        const result = await connected.balanceUnsealedTransaction(tx, { payFees: true });
        return result.tx;
      }
      throw new Error(
        'Connected wallet cannot balance/prove transactions (missing balanceAndProveTransaction).',
      );
    },
    submitTransaction: (tx) => connected.submitTransaction(tx),
    balanceUnsealedTransaction: connected.balanceUnsealedTransaction?.bind(connected),
  };
}

/**
 * Enable/connect the wallet (prompts the user in Lace) and return the wallet
 * API, current state, and service URIs. Pass the DApp's configured network so
 * `connect(networkId)` targets undeployed / preview / preprod correctly.
 */
export async function connectLace(networkId: string = 'undeployed'): Promise<ConnectedWallet> {
  const connector = getConnector();
  if (!connector) {
    throw new Error(
      'No Midnight wallet found. Install the main Lace extension and enable Midnight, then reload.',
    );
  }

  // Current DApp Connector API (main Lace)
  if (typeof connector.connect === 'function') {
    const connected = await connector.connect(networkId);
    const status = await connected.getConnectionStatus?.();
    if (status && status.status !== 'connected') {
      throw new Error(`Wallet connection status: ${status.status}`);
    }
    const [uris, shielded] = await Promise.all([
      connected.getConfiguration(),
      connected.getShieldedAddresses(),
    ]);
    const state: WalletState = {
      address: shielded.shieldedAddress,
      coinPublicKey: shielded.shieldedCoinPublicKey,
      encryptionPublicKey: shielded.shieldedEncryptionPublicKey,
    };
    return {
      api: adaptConnectedApi(connected, state),
      state,
      uris,
      walletName: connector.name,
    };
  }

  // Legacy connector (enable + serviceUriConfig)
  if (typeof connector.enable === 'function') {
    const api = await connector.enable();
    const uris =
      typeof connector.serviceUriConfig === 'function'
        ? await connector.serviceUriConfig()
        : {
            indexerUri: '',
            indexerWsUri: '',
            proverServerUri: '',
            substrateNodeUri: '',
          };
    const state = await api.state();
    return { api, state, uris, walletName: connector.name };
  }

  throw new Error('Injected Midnight wallet does not support connect() or enable().');
}

/**
 * There is no standard programmatic "disconnect" in the connector API; a DApp
 * disconnects by forgetting the wallet handle locally.
 */
export function forgetWallet(): void {
  // Intentionally a no-op at the wallet level. State is dropped in React.
}
