import { FormEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PageHeader, Surface, Badge } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/wallet-context';
import { pushActivity } from '@/lib/activity';

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; txId: string; blockHeight: number }
  | { kind: 'error'; message: string };

async function contractApi() {
  return import('@/contract');
}

export function CheckInPage() {
  const { config, wallet, connect, connecting, publicState, refreshPublicState } = useWallet();
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setStatus({ kind: 'submitting' });
    pushActivity('checkin_attempt', 'Anonymous check-in submitted');
    try {
      const { submitCheckIn } = await contractApi();
      const { txId, blockHeight } = await submitCheckIn(config, wallet, secret);
      setStatus({ kind: 'success', txId, blockHeight });
      setSecret('');
      pushActivity('checkin_success', 'Checked in on-chain', `tx ${txId}`);
      void refreshPublicState();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message });
      pushActivity('checkin_error', 'Check-in failed', message);
    }
  };

  const disabled = wallet === null || !config.contractAddress || status.kind === 'submitting';

  return (
    <div>
      <PageHeader
        kicker="Door"
        title="Check in anonymously"
        description="Prove invite possession without revealing who you are."
      />

      <Surface className="!p-0 overflow-hidden">
        <div className="grid lg:grid-cols-[1.4fr_0.9fr]">
          <div className="border-b border-[var(--line)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl">Invite proof</h2>
              <Badge tone={wallet ? 'ok' : 'warn'}>
                {wallet ? 'Wallet live' : 'Wallet needed'}
              </Badge>
            </div>

            {!wallet ? (
              <div className="mb-4 border border-dashed border-[var(--line)] bg-[var(--surface)]/60 p-4 text-sm text-[var(--ink-muted)]">
                Connect Lace to prove and submit the check-in circuit.
                <div className="mt-3">
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => void connect()}
                    disabled={connecting}
                  >
                    {connecting ? 'Connecting…' : 'Connect Lace'}
                  </Button>
                </div>
              </div>
            ) : null}

            <form onSubmit={(e) => void handleCheckIn(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="secret"
                  className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]"
                >
                  Invite secret
                </label>
                <div className="flex gap-2">
                  <Input
                    id="secret"
                    type={showSecret ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="badge-code-…"
                    autoComplete="off"
                    disabled={status.kind === 'submitting'}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" variant="accent" disabled={disabled || !secret.trim()}>
                {status.kind === 'submitting' ? 'Proving…' : 'Submit check-in'}
              </Button>
            </form>

            {!config.contractAddress ? (
              <p className="mt-4 text-sm text-[var(--warn)]">
                Contract address missing — set it under Config.
              </p>
            ) : null}
            {status.kind === 'success' ? (
              <p className="mt-4 font-mono text-sm text-[var(--ok)]">
                OK · tx {status.txId.slice(0, 16)}… · block {status.blockHeight}
              </p>
            ) : null}
            {status.kind === 'error' ? (
              <p className="mt-4 text-sm text-[var(--danger)]">{status.message}</p>
            ) : null}
          </div>

          <div className="bg-[var(--ink)] p-5 text-white sm:p-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
              Public ledger
            </p>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Event
                </dt>
                <dd className="mt-1 font-display text-2xl">{publicState?.eventName ?? '—'}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">
                  Count
                </dt>
                <dd className="mt-1 font-display text-5xl tabular-nums">
                  {publicState ? publicState.checkInCount.toString() : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-8 border-t border-white/15 pt-4 text-sm text-white/60">
              <p className="font-semibold text-white">Never public</p>
              <p className="mt-1">Invite secret · Attendee identity</p>
            </div>
          </div>
        </div>
      </Surface>
    </div>
  );
}
