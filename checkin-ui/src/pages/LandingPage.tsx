import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/wallet-context';
import { networkLabel } from '@/config';
import { shortAddr } from '@/lib/utils';

export function LandingPage() {
  const { wallet, connecting, laceInstalled, laceReady, connect, config } = useWallet();

  return (
    <div className="min-h-screen text-white">
      <section className="hero-mesh relative flex min-h-screen flex-col">
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="scan-lines pointer-events-none absolute inset-0 opacity-30" aria-hidden />

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <p className="font-display text-xl tracking-tight">
            AEC<span className="text-[var(--accent)]">.</span>
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            {wallet ? (
              <span className="hidden font-mono text-[11px] text-white/55 sm:inline">
                {shortAddr(wallet.state.address)}
              </span>
            ) : laceReady && laceInstalled ? (
              <Button
                variant="ghost"
                size="sm"
                className="!text-white/75 hover:!bg-white/10 hover:!text-white"
                onClick={() => void connect()}
                disabled={connecting}
              >
                {connecting ? 'Connecting…' : 'Connect Lace'}
              </Button>
            ) : null}
            <Link
              to="/dashboard"
              className="inline-flex h-9 items-center rounded-[var(--radius)] bg-white px-3.5 text-xs font-semibold text-[var(--ink)] hover:bg-cyan-50"
            >
              Enter console
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-5 py-10 sm:px-8 sm:py-14">
          <div className="grid w-full items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="slide-up">
              <p className="font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-[0.92] tracking-tight">
                Anonymous
                <br />
                Event Check-in
              </p>
              <h1 className="mt-5 max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
                Door proof without identity. Invite stays private; hosts only see the count.
              </h1>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/check-in"
                  className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-deep)]"
                >
                  Open door check-in
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex h-11 items-center rounded-[var(--radius)] border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Overview
                </Link>
              </div>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
                Midnight ZK · {networkLabel(config.network)}
                {wallet ? ' · Lace live' : connecting ? ' · Connecting…' : ''}
              </p>
            </div>

            <div
              className="slide-up border border-white/15 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8"
              style={{ animationDelay: '0.1s' }}
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                Public ledger preview
              </p>
              <div className="mt-8 space-y-6">
                <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-5">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                      Event
                    </p>
                    <p className="mt-2 font-display text-2xl sm:text-3xl">Door attendance</p>
                  </div>
                  <span className="font-mono text-[10px] text-white/35">on-chain</span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                      Check-ins
                    </p>
                    <p className="mt-2 font-display text-5xl tabular-nums sm:text-6xl">0</p>
                  </div>
                  <p className="max-w-[9rem] text-right text-xs leading-relaxed text-white/45">
                    Identity and invite secret never appear here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--paper)] text-[var(--ink)]">
        <div className="mx-auto grid max-w-6xl md:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Private invite',
              body: 'Badge code is a circuit witness — never written to the public ledger.',
            },
            {
              step: '02',
              title: 'Sealed identity',
              body: 'Observers learn a valid check-in happened, not who or which code.',
            },
            {
              step: '03',
              title: 'Public headcount',
              body: 'Event name and anonymous count stay public for hosts and auditors.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="border-b border-[var(--line)] px-5 py-10 md:border-b-0 md:border-r md:px-8 md:py-14 md:last:border-r-0"
            >
              <p className="font-mono text-[11px] font-semibold text-[var(--accent)]">{item.step}</p>
              <h2 className="mt-3 font-display text-xl sm:text-2xl">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--line)] bg-[var(--paper)] px-5 py-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
        Anonymous Event Check-in · Compact ZK · Lace
      </footer>
    </div>
  );
}
