import { FormEvent, useEffect, useState } from 'react';
import { PageHeader, Surface, Badge } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/wallet-context';
import { loadConfig, networkLabel } from '@/config';
import { shortAddr } from '@/lib/utils';
import { clearActivity, pushActivity } from '@/lib/activity';
import { LACE_STORE_URL } from '@/lace';

export function SettingsPage() {
  const {
    config,
    wallet,
    connecting,
    laceInstalled,
    connect,
    disconnect,
    walletError,
    refreshPublicState,
    setContractAddress,
    clearContractAddressOverride,
  } = useWallet();

  const [addressDraft, setAddressDraft] = useState(config.contractAddress ?? '');

  useEffect(() => {
    setAddressDraft(config.contractAddress ?? '');
  }, [config.contractAddress]);

  const onSaveContract = (e: FormEvent) => {
    e.preventDefault();
    setContractAddress(addressDraft);
    void refreshPublicState();
  };

  return (
    <div>
      <PageHeader
        kicker="Config"
        title="Workspace setup"
        description="Contract, network endpoints, and Lace for this browser."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Surface accent>
          <h2 className="font-display text-2xl">Contract address</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Paste the deployed address. Stored locally and applied immediately.
          </p>
          <form onSubmit={onSaveContract} className="mt-5 space-y-3">
            <div>
              <label
                htmlFor="contract"
                className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]"
              >
                Deployed address
              </label>
              <Input
                id="contract"
                value={addressDraft}
                onChange={(e) => setAddressDraft(e.target.value)}
                placeholder="64-char hex contract address"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="accent">
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  clearContractAddressOverride();
                  setAddressDraft(loadConfig().contractAddress ?? '');
                }}
              >
                Reset
              </Button>
            </div>
          </form>
          <p className="mt-4 break-all font-mono text-[11px] text-[var(--ink-faint)]">
            Active: {config.contractAddress ?? 'not set'}
          </p>
        </Surface>

        <Surface>
          <h2 className="font-display text-2xl">Environment</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Network
              </dt>
              <dd className="text-right font-semibold">{networkLabel(config.network)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Indexer
              </dt>
              <dd className="max-w-[60%] break-all text-right font-mono text-xs">
                {config.indexerUri ?? wallet?.uris.indexerUri ?? '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Prover
              </dt>
              <dd className="max-w-[60%] break-all text-right font-mono text-xs">
                {config.proverUri ?? '—'}
              </dd>
            </div>
          </dl>
        </Surface>

        <Surface>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl">Lace</h2>
            <Badge tone={wallet ? 'ok' : laceInstalled ? 'warn' : 'danger'}>
              {wallet ? 'Live' : laceInstalled ? 'Detected' : 'Missing'}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Auto-connects on localhost when Lace is available. Disconnect disables auto-connect until
            you connect again.
          </p>
          {wallet ? (
            <div className="mt-5 space-y-3">
              <p className="break-all font-mono text-xs">{shortAddr(wallet.state.address, 18, 10)}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={disconnect}>
                  Disconnect
                </Button>
                <Button variant="ghost" onClick={() => void refreshPublicState()}>
                  Sync ledger
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {laceInstalled ? (
                <Button variant="accent" onClick={() => void connect()} disabled={connecting}>
                  {connecting ? 'Connecting…' : 'Connect Lace'}
                </Button>
              ) : (
                <a
                  href={LACE_STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center rounded-[var(--radius)] bg-[var(--accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
                >
                  Install Lace
                </a>
              )}
            </div>
          )}
          {walletError ? <p className="mt-3 text-sm text-[var(--danger)]">{walletError}</p> : null}
        </Surface>

        <Surface>
          <h2 className="font-display text-2xl">Local data</h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Activity log lives in this browser only.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => {
              clearActivity();
              pushActivity('settings_update', 'Activity log cleared from config');
            }}
          >
            Clear activity log
          </Button>
        </Surface>
      </div>
    </div>
  );
}
