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
    // Present so the map satisfies `Record<StatusType, number>`; Archived is
    // intentionally excluded from STATUS_ORDER and therefore never emitted.
    Archived: 0,
  };

  for (const m of milestones) {
    counts[m.status]++;
  }

  return STATUS_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => ({ status: s, count: counts[s] }));
}
