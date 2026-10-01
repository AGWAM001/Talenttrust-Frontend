import type { StatusType } from '@/components/StatusBadge';

export const STATUS_ORDER: StatusType[] = ['Active', 'Completed', 'Disputed', 'Pending', 'Paid'];

export interface StatusTally {
  status: StatusType;
  count: number;
}

/**
 * Canonical set of status values that the tally may report.
 * Used to guard against unknown/stale status values at the boundary.
 */
const KNOWN_STATUSES: ReadonlySet<StatusType> = new Set(STATUS_ORDER);

function isKnownStatus(value: unknown): value is StatusType {
  return typeof value === 'string' && KNOWN_STATUSES.has(value as StatusType);
}

/**
 * Compute a deterministic tally of milestone statuses.
 *
 * Invariants:
 - The result is a pure function of the input array; repeated or concurrent
 *   calls with the same input always produce the same output (no shared mutable
 *   state, no time-dependent behavior).
 * - Output order is deterministic and follows STATUS_ORDER, independent of input
 *   ordering.
 * - Only known status values are counted; unknown/stale values are ignored rather
 *   than corrupting the tally or throwing. This keeps the function totally
 *   safe under concurrent execution and partial failure of upstream data.
 * - Zero-count statuses are omitted from the output to preserve the existing
 *   public contract.
 */
export function milestoneStatusTally(
  milestones: readonly { status: StatusType }[],
): StatusTally[] {
  const counts: Record<StatusType, number> = {
    Active: 0,
    Completed: 0,
    Disputed: 0,
    Pending: 0,
    Paid: 0,
  };

  if (Array.isArray(milestones)) {
    for (const m of milestones) {
      // Guard at the boundary: only count values we know about. This prevents
      // stale or unknown status values from silently corrupting the tally.
      if (isKnownStatus(m.status)) {
        counts[m.status]++;
      }
    }
  }

  return STATUS_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => ({ status: s, count: counts[s] }));
}
