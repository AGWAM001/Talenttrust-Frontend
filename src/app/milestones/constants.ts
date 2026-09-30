import type { Milestone } from '@/types/domain';

export const SAMPLE_DISMISSED_KEY = 'talenttrust-milestones-sample-dismissed';

/**
 * The canonical set of milestone statuses that the app recognizes.
 * Exported as a readonly tuple so consumers can validate incoming data
 * without being able to mutate the contract at runtime.
 */
export const MILESTONE_STATUSES = [
  'Completed',
  'Paid',
  'Pending',
  'Disputed',
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

const MILESTONE_STATUS_SET: ReadonlySet<string> = new Set(MILESTONE_STATUSES);

export function isMlestoneStatus(value: unknown): value is MilestoneStatus {
  return typeof value === 'string' && MILESTONE_STATUS_SET.has(value);
}

/**
 * Sample milestones used for demo/empty-state rendering.
 *
 * Invariants (preserved across all consumers):
 * - IDs are unique and non-empty.
 * - Every status belongs to MILESTONE_STATUES.
 * - Every payout is a non-negative finite number.
 * - Every dueDate is a valid ISO (year-month-day) date string.
 * - Every currency is a non-empty trimmed string.
 * These invariants are enforced at module load time by assertSampleMilestones.
 */
export const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: '1',
    title: 'Project Kickoff & Discovery',
    status: 'Completed',
    payout: 2500,
    currency: 'USD',
    dueDate: '2026-03-15',
  },
  {
    id: '2',
    title: 'UI/UX Design Handoff',
    status: 'Paid',
    payout: 3500,
    currency: 'USD',
    dueDate: '2026-04-01',
  },
  {
    id: '3',
    title: 'Frontend Development – Sprint 1',
    status: 'Pending',
    payout: 5000,
    currency: 'USD',
    dueDate: '2026-05-01',
  },
  {
    id: '4',
    title: 'API Integration & Testing',
    status: 'Pending',
    payout: 4000,
    currency: 'USD',
    dueDate: '2026-05-15',
  },
  {
    id: '5',
    title: 'Payment Gateway Integration',
    status: 'Disputed',
    payout: 3000,
    currency: 'USD',
    dueDate: '2026-04-20',
  },
];

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  // Reject normalization drift (e.g. 2026-02-30 -> 2026-03-02).
  return parsed.toISOString().slice(0, 10) === value;
}

/**
 * Validates the static sample data against the documented invariants.
 * Throws a deterministic Error on the first violation so breakages are caught
 * at module load rather than silently surfacing in the UI.
 */
export function assertSampleMilestones(
  milestones: readonly Milestone[] = SAMPLE_MILESTONES,
): void {
  const seenIds = new Set<string>();
  for (const [moduleIndex, milestone] of milestones.entries()) {
    const label = `milestones[${moduleIndex}]`;
    if (!milestone || typeof milestone !== 'object') {
      throw new Error(`${label} must be an object`);
    }
    if (typeof milestone.id !== 'string' || milestone.id.trim() === '') {
      throw new Error(`${label} has an empty id`);
    }
    if (seenIds.has(milestone.id)) {
      throw new Error(`${label} duplicates id "${milestone.id}"`);
    }
    seenIds.add(milestone.id);
    if (typeof milestone.title !== 'string' || milestone.title.trim() === '') {
      throw new Error(`${label} has an empty title`);
    }
    if (!isMlestoneStatus(milestone.status)) {
      throw new Error(`${label} has an unknown status "${String(milestone.status)}"`);
    }
    if (
      typeof milestone.payout !== 'number' ||
      !Number.isFinite(milestone.payout) ||
      milestone.payout < 0
    ) {
      throw new Error(`${label} has an invalid payout`);
    }
    if (typeof milestone.currency !== 'string' || milestone.currency.trim() === '') {
      throw new Error(`${label} has an empty currency`);
    }
    if (!isValidIsoDate(milestone.dueDate)) {
      throw new Error(`${label} has an invalid dueDate "${String(milestone.dueDate)}"`);
    }
  }
}

// Fail fast at import time if the shipped sample data ever drifts from the contract.
assertSampleMilestones();
