import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadConfig, networkLabel } from './config';
import { connectLace, isLaceInstalled, type ConnectedWallet } from './lace';
import { getPublicState, submitCheckIn, type PublicState } from './contract';
import { WalletPanel } from './components/WalletPanel';
import { CheckInPanel, type CheckInStatus } from './components/CheckInPanel';
import { PublicStatePanel } from './components/PublicStatePanel';

export default function App() {
  const config = useMemo(() => loadConfig(), []);
  const laceInstalled = useMemo(() => isLaceInstalled(), []);

  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const [publicState, setPublicState] = useState<PublicState | null>(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  const [checkInStatus, setCheckInStatus] = useState<CheckInStatus>({ kind: 'idle' });

  const refreshPublicState = useCallback(async () => {
    if (!config.contractAddress) {
      setStateError('No contract address configured (set VITE_CONTRACT_ADDRESS).');
      return;
    }
    // For a read we prefer explicit overrides, then the connected wallet URIs.
    const indexer = config.indexerUri ?? wallet?.uris.indexerUri;
    const indexerWs = config.indexerWsUri ?? wallet?.uris.indexerWsUri;
    if (!indexer || !indexerWs) {
      setStateError('No indexer URI. Connect Lace or set VITE_INDEXER_URI / VITE_INDEXER_WS_URI.');
      return;
    }
    setStateLoading(true);
    setStateError(null);
    try {
      const s = await getPublicState(config, indexer, indexerWs);
      setPublicState(s);
    } catch (err) {
      setStateError(err instanceof Error ? err.message : String(err));
    } finally {
      setStateLoading(false);
    }
  }, [config, wallet]);

  // Auto-load public state once we have enough config (endpoint overrides) or a wallet.
  useEffect(() => {
    const haveIndexer = config.indexerUri !== null || wallet !== null;
    if (config.contractAddress && haveIndexer) {
      void refreshPublicState();
    }
  }, [config.contractAddress, config.indexerUri, wallet, refreshPublicState]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setWalletError(null);
    try {
      const w = await connectLace();
      setWallet(w);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWallet(null);
    setCheckInStatus({ kind: 'idle' });
  }, []);

  const handleCheckIn = useCallback(
    async (inviteSecret: string) => {
      if (!wallet) return;
      setCheckInStatus({ kind: 'submitting' });
      try {
        const { txId, blockHeight } = await submitCheckIn(config, wallet, inviteSecret);
        setCheckInStatus({ kind: 'success', txId, blockHeight });
        void refreshPublicState();
      } catch (err) {
        setCheckInStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [config, wallet, refreshPublicState],
  );

  const checkInDisabled = wallet === null || !config.contractAddress;
  const disabledReason = !config.contractAddress
    ? 'Set VITE_CONTRACT_ADDRESS to the deployed contract, then reload.'
    : wallet === null
      ? 'Connect your Lace wallet to check in.'
      : null;

  return (
    <main className="app">
      <header className="app__header">
        <h1>Anonymous Event Check-in</h1>
        <p className="app__subtitle">
          Prove you belong — without revealing who you are.
        </p>
        <div className="app__meta">
          <span className="badge">{networkLabel(config.network)}</span>
          <span className="badge badge--muted">
            {config.contractAddress
              ? `Contract ${config.contractAddress.slice(0, 10)}…`
              : 'No contract configured'}
          </span>
        </div>
      </header>

      <div className="grid">
        <WalletPanel
          wallet={wallet}
          connecting={connecting}
          laceInstalled={laceInstalled}
          error={walletError}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
        <CheckInPanel
          disabled={checkInDisabled}
          disabledReason={disabledReason}
          status={checkInStatus}
          onCheckIn={handleCheckIn}
        />
        <PublicStatePanel
          state={publicState}
          loading={stateLoading}
          error={stateError}
          onRefresh={() => void refreshPublicState()}
        />
      </div>

      <footer className="app__footer">
        <p>
          Public ledger reveals only <code>eventName</code> and{' '}
          <code>checkInCount</code>. The invite secret is a private witness and
          never leaves your device in the clear.
        </p>
      </footer>
    </main>
  );
}
