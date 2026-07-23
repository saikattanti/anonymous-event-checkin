// Thin wrapper around the Midnight DApp connector API that the Lace wallet
// injects at `window.midnight.mnLace`. We type only the pieces we use so the
// app has no hard dependency on the connector package.

export interface ServiceUriConfig {
  indexerUri: string;
  indexerWsUri: string;
  proverServerUri: string;
  substrateNodeUri: string;
}

export interface WalletState {
  address: string;
  coinPublicKey: string;
  encryptionPublicKey?: string;
}

// The wallet API returned by enable(). It also exposes tx balancing/proving
// and submission, consumed by the midnight-js providers in contract.ts.
export interface DAppConnectorWalletAPI {
  state(): Promise<WalletState>;
  balanceAndProveTransaction(tx: unknown, newCoins?: unknown[]): Promise<unknown>;
  submitTransaction(tx: unknown): Promise<string>;
  balanceTransaction?(tx: unknown, newCoins?: unknown[]): Promise<unknown>;
  proveTransaction?(tx: unknown): Promise<unknown>;
}

export interface DAppConnectorAPI {
  apiVersion: string;
  name?: string;
  enable(): Promise<DAppConnectorWalletAPI>;
  isEnabled(): Promise<boolean>;
  serviceUriConfig(): Promise<ServiceUriConfig>;
}

declare global {
  interface Window {
    midnight?: {
      mnLace?: DAppConnectorAPI;
    };
  }
}

export function getConnector(): DAppConnectorAPI | null {
  return window.midnight?.mnLace ?? null;
}

export function isLaceInstalled(): boolean {
  return getConnector() !== null;
}

export interface ConnectedWallet {
  api: DAppConnectorWalletAPI;
  state: WalletState;
  uris: ServiceUriConfig;
}

/**
 * Enable the wallet (prompts the user in Lace on first connect) and return the
 * wallet API, its current state, and the wallet-provided service URIs.
 */
export async function connectLace(): Promise<ConnectedWallet> {
  const connector = getConnector();
  if (!connector) {
    throw new Error('Lace wallet not found. Install the Lace (Midnight) browser extension.');
  }
  const api = await connector.enable();
  const [state, uris] = await Promise.all([api.state(), connector.serviceUriConfig()]);
  return { api, state, uris };
}

/**
 * There is no standard programmatic "disconnect" in the connector API; a DApp
 * disconnects by forgetting the wallet handle locally. This helper exists so
 * the UI has a single, documented place to do that.
 */
export function forgetWallet(): void {
  // Intentionally a no-op at the wallet level. State is dropped in React.
}
