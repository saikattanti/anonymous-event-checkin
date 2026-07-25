import { Link } from 'react-router-dom';
import { RefreshCw, ArrowUpRight } from 'lucide-react';
import { PageHeader, Surface, Badge } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/wallet-context';
import { networkLabel } from '@/config';
import { shortAddr } from '@/lib/utils';

export function DashboardPage() {
  const {
    config,
    wallet,
    connecting,
    publicState,
    stateLoading,
    stateError,
    refreshPublicState,
    laceInstalled,
  } = useWallet();

  const walletLabel = wallet ? 'Live' : connecting ? 'Connecting' : 'Offline';
  const walletHint = wallet
    ? shortAddr(wallet.state.address, 12, 6)
    : laceInstalled
      ? 'Lace detected'
      : 'Lace missing';

  return (
    <div>
      <PageHeader
        kicker="Overview"
        title="Event desk"
        description="Live status for anonymous door check-ins."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshPublicState()}
            disabled={stateLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${stateLoading ? 'animate-spin' : ''}`} />
            Sync ledger
          </Button>
        }
      />

      <Surface className="!p-0 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] border-b border-[var(--line)] lg:grid-cols-4">
          {[
            { label: 'Network', value: networkLabel(config.network) },
            { label: 'Wallet', value: walletLabel, hint: walletHint },
            { label: 'Event', value: publicState?.eventName ?? '—' },
            {
              label: 'Check-ins',
              value: publicState ? publicState.checkInCount.toString() : '—',
            },
          ].map((item) => (
            <div key={item.label} className="px-4 py-4 sm:px-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {item.label}
              </p>
              <p className="mt-1.5 truncate font-display text-xl text-[var(--ink)] sm:text-2xl">
                {item.value}
              </p>
              {'hint' in item && item.hint ? (
                <p className="mt-1 truncate font-mono text-[11px] text-[var(--ink-muted)]">
                  {item.hint}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {stateError ? (
          <p className="border-b border-[var(--line)] px-5 py-3 text-sm text-[var(--danger)]">
            {stateError}
          </p>
        ) : null}

        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-[var(--line)]">
          <div className="border-b border-[var(--line)] p-5 lg:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl">Door check-in</h2>
              <Badge tone="accent">Circuit</Badge>
            </div>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-muted)]">
              Submit an invite secret. ZK proves attendance; only the public count changes.
            </p>
            <Link
              to="/check-in"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-deep)] hover:underline"
            >
              Go to door <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-5">
            <h2 className="font-display text-xl">Contract</h2>
            <dl className="mt-3 space-y-3">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  Address
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-[var(--ink)]">
                  {config.contractAddress ?? 'Not set — open Config'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  Prover
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-[var(--ink)]">
                  {config.proverUri ?? 'Wallet default'}
                </dd>
              </div>
            </dl>
            <Link
              to="/settings"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-deep)] hover:underline"
            >
              Open config <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </Surface>
    </div>
  );
}
