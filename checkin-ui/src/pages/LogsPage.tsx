import { useEffect, useState } from 'react';
import { PageHeader, Surface, Badge } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import {
  clearActivity,
  listActivity,
  type ActivityEvent,
  type ActivityKind,
} from '@/lib/activity';

function toneFor(kind: ActivityKind): 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' {
  if (kind.includes('success') || kind === 'wallet_connect') return 'ok';
  if (kind.includes('error')) return 'danger';
  if (kind === 'wallet_disconnect') return 'warn';
  if (kind.startsWith('checkin') || kind.startsWith('deploy')) return 'accent';
  return 'neutral';
}

export function LogsPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  const reload = () => setEvents(listActivity());

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('aec:activity', onChange);
    return () => window.removeEventListener('aec:activity', onChange);
  }, []);

  return (
    <div>
      <PageHeader
        kicker="Activity"
        title="Session log"
        description="Local trail of wallet sessions and check-in proofs."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearActivity();
              reload();
            }}
          >
            Clear
          </Button>
        }
      />

      <Surface className="!p-0 overflow-hidden">
        {events.length === 0 ? (
          <p className="p-5 text-sm text-[var(--ink-muted)]">No events yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneFor(event.kind)}>{event.kind.replaceAll('_', ' ')}</Badge>
                    <p className="font-semibold">{event.title}</p>
                  </div>
                  {event.detail ? (
                    <p className="mt-1 break-all font-mono text-xs text-[var(--ink-muted)]">
                      {event.detail}
                    </p>
                  ) : null}
                </div>
                <time className="shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-faint)]">
                  {new Date(event.at).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
