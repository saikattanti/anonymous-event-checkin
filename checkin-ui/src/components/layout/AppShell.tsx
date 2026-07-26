import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn, shortAddr } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/surface';
import { useWallet } from '@/wallet-context';
import { networkLabel } from '@/config';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/check-in', label: 'Door check-in' },
  { href: '/logs', label: 'Activity' },
  { href: '/settings', label: 'Config' },
] as const;

function WalletChip() {
  const {
    wallet,
    connecting,
    laceInstalled,
    laceReady,
    connect,
    disconnect,
    walletError,
    laceStoreUrl,
  } = useWallet();

  if (!laceReady) {
    return <Badge tone="neutral">Detecting…</Badge>;
  }

  if (!laceInstalled) {
    return (
      <a
        href={laceStoreUrl}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-[var(--accent-deep)] underline-offset-2 hover:underline"
      >
        Install Lace
      </a>
    );
  }

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="ok">Live</Badge>
        <code className="hidden max-w-[130px] truncate font-mono text-[11px] text-[var(--ink-muted)] sm:inline">
          {shortAddr(wallet.state.address)}
        </code>
        <Button variant="ghost" size="sm" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="accent" onClick={() => void connect()} disabled={connecting}>
        {connecting ? 'Connecting…' : 'Connect Lace'}
      </Button>
      {walletError ? (
        <span className="hidden max-w-[160px] truncate text-xs text-[var(--danger)] lg:inline">
          {walletError}
        </span>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { config } = useWallet();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="scan-lines pointer-events-none fixed inset-0 opacity-60" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0 font-display text-lg text-[var(--ink)]">
            AEC<span className="text-[var(--accent)]">.</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'rounded-[var(--radius)] px-3 py-1.5 text-sm font-semibold transition-colors',
                    isActive
                      ? 'bg-[var(--ink)] text-white'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Badge tone="accent" className="hidden sm:inline-flex">
              ZK
            </Badge>
            <WalletChip />
            <button
              className="rounded-[var(--radius)] p-2 text-[var(--ink-muted)] hover:bg-[var(--surface)] md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <nav className="border-t border-[var(--line)] px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-[var(--radius)] px-3 py-2.5 text-sm font-semibold',
                      isActive
                        ? 'bg-[var(--ink)] text-white'
                        : 'text-[var(--ink-muted)] hover:bg-[var(--surface)]',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}

        <div className="border-t border-[var(--line)] bg-[var(--ink)] text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] sm:px-6">
            <span className="text-white/55">Network</span>
            <span>{networkLabel(config.network)}</span>
            <span className="text-white/25">|</span>
            <span className="text-white/55">Contract</span>
            <span className="truncate">
              {config.contractAddress
                ? `${config.contractAddress.slice(0, 10)}…${config.contractAddress.slice(-6)}`
                : 'unset'}
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-7">{children}</main>
    </div>
  );
}
