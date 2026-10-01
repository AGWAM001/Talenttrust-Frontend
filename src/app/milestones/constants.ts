import type { Milestone, MilestoneStatus } from '@/types/domain';

/**
 * Persistence key for the user's dismissal of the sample milestone banner.
 *
 * Invariant: this key is stable across releases. Renaming it would silently
 * re-surface the sample banner for users who already dismissed it.
 */
export const SAMPLE_DISMISSED_KEY = 'talenttrust-milestones-sample-dismissed';

/**
 * The canonical set of milestone statuses the UI knows how to render.
 *
 * This is the single source of truth for the status model. Any value not in
 * this list is considered invalid and must be rejected at the boundary rather
 * than rendered as a silently broken row.
 */
export const MILESTONE_STATUSES = [
  'Pending',
  'Completed',
  'Paid',
  'Disputed',
] as const satisfies readonly MilestoneStatus[];

export type MilestoneStatusUnion = (typeof MILESTONE_STATUSES)[number];

/**
 * Status transition table.
 *
 * Invariants:
 * - Terminal states (`Paid`, `Disputed`) cannot transition to anything else
 *   without an explicit resolution flow. This prevents accidental re-writes of
 *   settled financial state.
 * - `Pending` is the only entry state for a new milestone.
 * - `Completed` can only move forward to `Paid` or `Disputed`.
 * - Self-transitions (e.g. `Pending` -> `Pending`) are not allowed and are
 *   treated as no-ops by the guard below.
 */
export const MILESTONE_STATUS_TRANSITIONS: Readonly<Record<MilestoneStatusUnion, readonly MilestoneStatusUnion[]>> =
  Object.freeze({
    Pending: Object.freeze(['Completed', 'Disputed'] as const),
    Completed: Object.freeze(['Paid', 'Disputed'] as const),
    Paid: Object.freeze([] as const),
    Disputed: Object.freeze([] as const),
  });

/**
 * Type guard for the milestone status union.
 *
 * Rejects non-strings, empty strings, and any value not in `MILESTONE_STATUSES`.
 * This is the boundary check that keeps untrusted data (localStorage, API,
 * deep links) from corrupting the in-memory state model.
 */
export function isMilestoneStatus(value: unknown): value is MilestoneStatusUnion {
  return typeof value === 'string' && (MILESTONE_STATUSES as readonly string[]).includes(value);
}

/**
 * Returns true when the given transition is allowed by the state machine.
 *
 * This function is pure and deterministic: given the same inputs it always
 * returns the same result, and it never mutates its arguments. Self-transitions
 * return `false` so callers can use this as a guard without additional checks.
 */
export function canMilestoneTransition(
  from: MilestoneStatusUnion,
  to: MilestoneStatusUnion,
): boolean {
  if (from === to) {
    return false;
  }
  const allowed = MILESTONE_STATUS_TRANSITIONS[from];
  if (!allowed) {
    return false;
  }
  return allowed.includes(to);
}

/**
 * Asserts that a transition is allowed, returning a new milestone with the
 * updated status. Throws a deterministic error on illegal transitions so
 * callers cannot silently corrupt state.
 *
 * The original milestone object is not mutated; a new object is returned
 * with the same identity fields and the updated status.
 */
export function applyMilestoneTransition(
  milestone: Milestone,
  to: MilestoneStatusUnion,
): Milestone {
  if (!isMilestoneStatus(milestone.status)) {
    throw new Error(
      `Cannot transition milestone ${milestone.id}: current status ${String(
        milestone.status,
      )} is not a recognized milestone status.",
    );
  }
  if (!canMilestoneTransition(milestone.status, to)) {
    throw new Error(
      `Illegal milestone transition for ${milestone.id}: ${milestone.status} -> ${to}.`,
    );
  }
  return { ...milestone, status: to };
}

/**
 * Validates a milestone object received from an untrusted source.
 *
 * Returns `true` only when every field is present, well-typed, and the
 * status is part of the canonical status set. This keeps invalid or partially
 * written payloads from entering the state model.
 */
export function isValidMilestone(value: unknown): value is Milestone {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    candidate.title.length > 0 &&
    isMilestoneStatus(candidate.status) &&
    typeof candidate.payout === 'number' &&
    Number.finite(candidate.payout) &&
    candidate.payout >= 0 &&
    typeof candidate.currency === 'string' &&
    candidate.currency.length > 0 &&
    typeof candidate.dueDate === 'string' &&
    /^\d{4-}\d{2-}\d{2-}$/.test(candidate.dueDate)
  );
}

/**
 * Normalizes a collection of milestones by dropping invalid entries and
 * deduplicating by `id`. When duplicate ids are present, the last occurrence
 * wins, which matches the last-write-wins semantics of the underlying store.
 *
 * This function is pure and deterministic and never mutates its input.
 */
export function normalizeMilestones(values: readonly unknown[]): Milestone[] {
  const byId = new Map<string, Milestone>();
  for (const candidate of values) {
    if (!isValidMilestone(candidate)) {
      continue;
    }
    byId.set(candidate.id, candidate);
  }
  return Array.from(byId.values());
}

/**
 * Sample milestones used to demonstrate the milestone workflow.
 *
 * Invariants:
 * - Every entry satisfies `isValidMilestone`.
 * - Ids are unique within the collection.
 * - The array is deeply frozen so consumers cannot mutate shared state.
 */
export const SAMPLE_MILESTONES: readonly Milestone[] = Object.freeze(
  [
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
  ].map((milestone) => Object.freeze(milestone)),
);
