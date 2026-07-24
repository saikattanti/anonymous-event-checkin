import type { ConnectedWallet } from '../lace';
import { LACE_STORE_URL } from '../lace';

interface Props {
  wallet: ConnectedWallet | null;
  connecting: boolean;
  laceInstalled: boolean;
  error: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

function shortAddress(addr: string): string {
  if (addr.length <= 18) return addr;
  return `${addr.slice(0, 12)}…${addr.slice(-6)}`;
}

export function WalletPanel({
  wallet,
  connecting,
  laceInstalled,
  error,
  onConnect,
  onDisconnect,
}: Props) {
  const connected = wallet !== null;

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Wallet</h2>
        <span className={`status-dot ${connected ? 'status-dot--on' : 'status-dot--off'}`} />
        <span className="status-label">{connected ? 'Connected' : 'Disconnected'}</span>
      </header>

      {!laceInstalled && (
        <p className="hint hint--warn">
          Midnight wallet not detected. Install the main{' '}
          <a href={LACE_STORE_URL} target="_blank" rel="noreferrer">
            Lace
          </a>{' '}
          extension (Midnight Preview is deprecated), open Midnight in Lace, then reload.
        </p>
      )}

      {connected ? (
        <div className="wallet-info">
          <div className="kv">
            <span className="kv__key">Address</span>
            <code className="kv__val" title={wallet!.state.address}>
              {shortAddress(wallet!.state.address)}
            </code>
          </div>
          {wallet!.walletName && (
            <div className="kv">
              <span className="kv__key">Wallet</span>
              <span className="kv__val">{wallet!.walletName}</span>
            </div>
          )}
          <button className="btn btn--ghost" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      ) : (
        <button className="btn" onClick={onConnect} disabled={connecting || !laceInstalled}>
          {connecting ? 'Connecting…' : 'Connect Lace'}
        </button>
      )}

      {error && <p className="hint hint--error">{error}</p>}
    </section>
  );
}
