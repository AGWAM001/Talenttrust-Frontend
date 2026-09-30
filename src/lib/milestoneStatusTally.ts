import type { StatusType } from '@/components/StatusBadge';

export const STATUS_ORDER: StatusType[] = ['Active', 'Completed', 'Disputed', 'Pending', 'Paid'];

export interface StatusTally {
  status: StatusType;
  count: number;
}

export function milestoneStatusTally(
  milestones: { status: StatusType }[],
): StatusTally[] {
  const counts: Record<StatusType, number> = {
    Active: 0,
    Completed: 0,
    Disputed: 0,
    Pending: 0,
    Paid: 0,
  };

  // Invariant: tolerate malformed/empty input without throwing. Non-array
  // inputs and entries with unknown or missing statuses are ignored so that
  // callers relying on the previous public contract keep working.
  if (!Array.isArray(milestones)) {
    return [];
  }

  for (const m of milestones) {
    if (m == null) continue;
    const status = m.status;
    if (typeof status !== 'string') continue;
    if (!Object.prototype.hasOwnProperty.call(counts, status)) continue;
    counts[status as StatusType]++;
  }

  return STATUS_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => ({ status: s, count: counts[s] }));
}
