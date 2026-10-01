import type { StatusType } from '@/components/StatusBadge';

export const STATUS_ORDER: StatusType[] = ['Active', 'Completed', 'Disputed', 'Pending', 'Paid'];

export interface StatusTally {
  status: StatusType;
  count: number;
}

const KNOWN_STATUSES: ReadonlySet<StatusType> = new Set(STATUS_ORDER);

/**
 * Invariants enforced by this tally:
 * - Deterministic: output order always follows STATUS_ORDER.
 * - Total: every known status is counted exactly once; unknown statuses are
 *   ignored rather than corrupting the tally (defensive against malformed
 *   or untrusted input).
 * - Non-negative: counts are derived from a fresh accumulator, so repeated
 *   or concurrent calls cannot leak state between invocations.
 * - Pure: no mutation of the input array or its elements.
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

  if (!Array.isArray(milestones)) {
    return [];
  }

  for (const m of milestones) {
    if (m == null) {
      continue;
    }
    const status = m.status;
    if (!KNOWN_STATUSES.has(status)) {
      continue;
    }
    counts[status]++;
  }

  return STATUS_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => ({ status: s, count: counts[s] }));
}
