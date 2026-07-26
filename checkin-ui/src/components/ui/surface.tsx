import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius)] border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        tone === 'neutral' && 'border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]',
        tone === 'accent' &&
          'border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent-deep)]',
        tone === 'ok' && 'border-[var(--ok)]/25 bg-[var(--ok-soft)] text-[var(--ok)]',
        tone === 'warn' && 'border-[var(--warn)]/25 bg-[var(--warn-soft)] text-[var(--warn)]',
        tone === 'danger' &&
          'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger)]',
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  action,
  kicker = 'Console',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">
          {kicker}
        </p>
        <h1 className="font-display text-2xl text-[var(--ink)] sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Surface({
  className,
  children,
  accent = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; accent?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius)] border border-[var(--line)] bg-[var(--paper)] p-5',
        accent && 'border-l-[3px] border-l-[var(--accent)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
