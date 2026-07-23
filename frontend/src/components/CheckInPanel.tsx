import { useState, type FormEvent } from 'react';

export type CheckInStatus =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; txId: string; blockHeight: number }
  | { kind: 'error'; message: string };

interface Props {
  disabled: boolean;
  disabledReason: string | null;
  status: CheckInStatus;
  onCheckIn: (inviteSecret: string) => void;
}

export function CheckInPanel({ disabled, disabledReason, status, onCheckIn }: Props) {
  const [secret, setSecret] = useState('');
  const submitting = status.kind === 'submitting';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onCheckIn(secret);
  };

  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Anonymous check-in</h2>
      </header>

      <p className="hint">
        Enter the invite/attendee secret you were given. It stays on your device
        as a private witness — only the check-in count changes on-chain.
      </p>

      <form onSubmit={handleSubmit} className="checkin-form">
        <label className="field">
          <span className="field__label">Invite secret (private)</span>
          <input
            type="password"
            className="field__input"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="e.g. badge-code-4F9K2"
            autoComplete="off"
            disabled={disabled || submitting}
          />
        </label>

        <button className="btn" type="submit" disabled={disabled || submitting || secret.trim() === ''}>
          {submitting ? 'Proving & submitting…' : 'Anonymous check-in'}
        </button>
      </form>

      {disabled && disabledReason && <p className="hint hint--warn">{disabledReason}</p>}

      {status.kind === 'success' && (
        <div className="result result--ok">
          <strong>✅ Checked in anonymously.</strong>
          <div className="kv">
            <span className="kv__key">Tx</span>
            <code className="kv__val">{status.txId}</code>
          </div>
          <div className="kv">
            <span className="kv__key">Block</span>
            <span className="kv__val">{status.blockHeight}</span>
          </div>
        </div>
      )}

      {status.kind === 'error' && (
        <div className="result result--err">
          <strong>❌ Check-in failed.</strong>
          <p>{status.message}</p>
        </div>
      )}
    </section>
  );
}
