import type { PublicState } from '../contract';

interface Props {
  state: PublicState | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export function PublicStatePanel({ state, loading, error, onRefresh }: Props) {
  return (
    <section className="panel">
      <header className="panel__header">
        <h2>Public event state</h2>
        <button className="btn btn--ghost btn--sm" onClick={onRefresh} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </header>

      <p className="hint">
        This is everything an on-chain observer can see. Attendee identities and
        invite secrets are never here.
      </p>

      {error ? (
        <p className="hint hint--error">{error}</p>
      ) : state ? (
        <div className="stats">
          <div className="stat">
            <span className="stat__label">Event</span>
            <span className="stat__value">{state.eventName || '—'}</span>
          </div>
          <div className="stat">
            <span className="stat__label">Anonymous check-ins</span>
            <span className="stat__value">{state.checkInCount.toString()}</span>
          </div>
        </div>
      ) : (
        <p className="hint">{loading ? 'Reading ledger…' : 'No state yet.'}</p>
      )}
    </section>
  );
}
