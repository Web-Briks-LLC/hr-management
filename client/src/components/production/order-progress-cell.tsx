import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ISanitizedProductionOrder } from '@/types/production.type';

type Stats = ISanitizedProductionOrder['imageStats'];

const SEGMENTS = [
  { key: 'approved', label: 'Approved', dot: 'bg-emerald-500' },
  { key: 'review', label: 'In review', dot: 'bg-indigo-500' },
  { key: 'editing', label: 'Being edited', dot: 'bg-sky-500' },
  { key: 'sentBack', label: 'Sent back', dot: 'bg-amber-500' },
] as const;

export const ORDER_STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending: { label: 'Not started', className: 'border-border bg-muted text-muted-foreground' },
  in_progress: { label: 'Being edited', className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400' },
  quality_check: { label: 'Quality check', className: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400' },
  revision: { label: 'Sent back', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  completed: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const style = ORDER_STATUS_STYLE[status] || {
    label: status.replaceAll('_', ' '),
    className: 'border-border bg-muted text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap font-medium', style.className)}>
      {style.label}
    </Badge>
  );
}

/** One readable block: a stacked bar plus a legend with every count. */
export function OrderProgressCell({
  stats,
  total,
}: {
  stats: Stats;
  total: number;
}) {
  const values = {
    approved: stats.completedCount,
    review: stats.pendingQcCount,
    editing: stats.inProgressCount,
    sentBack: stats.revisionCount,
  };
  const percent = (n: number) => (total > 0 ? Math.min(100, (n / total) * 100) : 0);
  const approvedPercent = Math.round(percent(values.approved));
  return (
    <div className="min-w-64 space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          <strong className="text-sm font-semibold text-foreground">
            {stats.totalRegistered}
          </strong>{' '}
          of {total} images started
        </span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          {approvedPercent}% approved
        </span>
      </div>
      <div
        role="img"
        aria-label={`${values.approved} approved, ${values.review} in review, ${values.editing} being edited, ${values.sentBack} sent back, out of ${total} images`}
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        {SEGMENTS.map((segment) => (
          <span
            key={segment.key}
            className={cn(segment.dot, 'h-full transition-all')}
            style={{ width: `${percent(values[segment.key])}%` }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {SEGMENTS.map((segment) => (
          <li
            key={segment.key}
            className={cn(
              'flex items-center gap-1.5',
              values[segment.key] === 0 && 'text-muted-foreground/70',
            )}
          >
            <span className={cn('size-2 shrink-0 rounded-full', segment.dot)} />
            <span className="font-semibold tabular-nums">{values[segment.key]}</span>
            <span className="text-muted-foreground">{segment.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
