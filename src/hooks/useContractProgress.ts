import { useMemo } from 'react';
import { Milestone } from '@/components/MilestonesList';

export interface ContractProgressMetrics {
  /** Number of milestones with status "Completed" or "Paid". */
  completedCount: number;
  /** Total number of milestones. */
  totalCount: number;
  /** Sum of payouts for milestones with status "Completed" or "Paid". */
  paidAmount: number;
  /** Sum of payouts for all other milestones. */
  outstandingAmount: number;
  /** Completion percentage (0-100), rounded, derived from completedCount / totalCount. */
  progressPercent: number;
  /** Currency taken from the first milestone, falling back to "USD" when there are none. */
  currency: string;
}

/**
 * Derives escrow progress metrics from a milestone array.
 *
 * Calculates:
 * - `completedCount`: Number of milestones with status "Completed" or "Paid".
 * - `totalCount`: Total number of milestones.
 * - `paidAmount`: Sum of payouts for milestones with status "Completed" or "Paid".
 * - `outstandingAmount`: Sum of payouts for all other milestones.
 * - `progressPercent`: Completion percentage (0-100), rounded.
 * - `currency`: Currency from the first milestone, falling back to "USD".
 *
 * Guards against empty arrays and ensures safe integer arithmetic (no overflow risk
 * within JavaScript's Number.MAX_SAFE_INTEGER bounds for typical contract values).
 *
 * @param milestones - Array of milestone objects.
 * @returns Escrow progress metrics derived from the milestone array.
 */
export function calculateContractProgress(milestones: Milestone[]): ContractProgressMetrics {
  if (!milestones || milestones.length === 0) {
    return {
      completedCount: 0,
      totalCount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      progressPercent: 0,
      currency: 'USD',
    };
  }

  let completedCount = 0;
  let paidAmount = 0;
  let outstandingAmount = 0;

  for (const milestone of milestones) {
    const isCompleted = milestone.status === 'Completed' || milestone.status === 'Paid';

    if (isCompleted) {
      completedCount += 1;
      paidAmount += milestone.payout;
    } else {
      outstandingAmount += milestone.payout;
    }
  }

  // The empty-array early-return above guarantees totalCount > 0 here,
  // so a direct division is safe and avoids a dead `else` branch.
  const totalCount = milestones.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const currency = milestones[0].currency;

  return {
    completedCount,
    totalCount,
    paidAmount,
    outstandingAmount,
    progressPercent,
    currency,
  };
}

/**
 * React hook wrapper around {@link calculateContractProgress}, memoized on the
 * `milestones` array reference so consumers (e.g. `ContractProgress`, a contract
 * detail header, or a contracts-list summary) can share the same escrow math.
 *
 * @param milestones - Array of milestone objects.
 * @returns Escrow progress metrics derived from the milestone array.
 */
export function useContractProgress(milestones: Milestone[]): ContractProgressMetrics {
  return useMemo(() => calculateContractProgress(milestones), [milestones]);
}
