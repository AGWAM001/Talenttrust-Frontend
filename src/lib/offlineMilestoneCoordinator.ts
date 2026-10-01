/**
 * @file offlineMilestoneCoordinator.ts
 *
 * Thin coordination layer between the milestones page and the persistent
 * {@link offlineMilestoneQueue}. It owns the decision of how a board mutation
 * is handled based on connectivity, and reports back a snapshot that the page
 * uses to keep its UI (and reconcile with authoritative repository state).
 *
 * - **Online**  → `applyImmediate` writes straight to the repository exactly as
 *   the pre-existing page handlers did (behaviour unchanged).
 * - **Offline** → `enqueue` captures the mutation into the persistent queue
 *   (the store is left untouched).
 * - **Reconnect** → `flushPending` pushes the queue to the store in order,
 *   deduplicated via the queue module's flush lock, then sets `reconciled` so
 *   the page re-reads authoritative state.
 */

import {
  saveMilestone,
  updateMilestone,
  deleteMilestones,
  bulkUpdateMilestoneStatus,
} from '@/lib/repository';
import {
  enqueueMutation,
  flushQueue,
  loadPendingQueue,
  createMutationId,
  pendingMutationCount,
  type QueuedMilestoneMutation,
} from '@/lib/offlineMilestoneQueue';
import type { Milestone } from '@/components/MilestonesList';
import type { StatusType } from '@/components/StatusBadge';
import type { MilestoneMutationError } from '@/lib/offlineMilestoneQueue';

/**
 * A snapshot of the board after a coordinator operation. The page consumes
 * `pending`, `failed`, `accepted`, and `reconciled` to drive UI feedback and
 * reconciliation.
 */
export interface OfflineMilestoneSnapshot {
  /** Mutations still waiting in the offline queue, in insertion order. */
  pending: QueuedMilestoneMutation[];
  /** Mutations applied to the store during the most recent flush. */
  flushed: QueuedMilestoneMutation[];
  /** Failures from the most recent flush (the mutation stayed queued). */
  failed: MilestoneMutationError[];
  /** Number of mutations accepted (applied online, or enqueued offline). */
  enqueued: number;
  /** Whether the authoritative store was re-read into the UI. */
  reconciled: boolean;
  /** True when the operation was accepted (applied or queued). */
  accepted: boolean;
  /** Safe, user-facing message describing the last operation (may be empty). */
  userMessage: string;
}

export type MutateInput =
  | { kind: 'create'; milestone: Milestone }
  | {
      kind: 'update';
      targetId: string;
      patch: Partial<Milestone>;
      /**
       * Repository version the offline edit was based on. On replay, if the
       * authoritative store holds a *newer* version than this, the write is
       * rejected as a `MUTATION_CONFLICT`. Callers record `current.version`
       * at edit time so stale offline edits are surfaced rather than silently
       * overwriting another tab's changes.
       */
      baseVersion?: number;
    }
  | { kind: 'delete'; ids: string[] }
  | { kind: 'status'; ids: string[]; status: StatusType };

const emptySnapshot = (overrides: Partial<OfflineMilestoneSnapshot>): OfflineMilestoneSnapshot => ({
  pending: [],
  flushed: [],
  failed: [],
  enqueued: 0,
  reconciled: false,
  accepted: false,
  userMessage: '',
  ...overrides,
});

/**
 * Applies a mutation immediately to the authoritative store (online path) using
 * the exact same repository operations the page used before, so existing online
 * behaviour is preserved.
 */
export function applyImmediate(input: MutateInput): OfflineMilestoneSnapshot {
  let ok = false;
  try {
    switch (input.kind) {
      case 'create':
        ok = saveMilestone(input.milestone);
        break;
      case 'update':
        ok = updateMilestone(input.targetId, input.patch);
        break;
      case 'delete':
        ok = deleteMilestones(input.ids) > 0 || input.ids.length === 0;
        break;
      case 'status':
        ok = true;
        bulkUpdateMilestoneStatus(input.ids, input.status);
        break;
    }
  } catch {
    ok = false;
  }

  return emptySnapshot({
    pending: loadPendingQueue(),
    enqueued: ok ? 1 : 0,
    reconciled: ok,
    accepted: ok,
    userMessage: ok ? '' : 'Your change could not be saved. Please try again.',
  });
}

/**
 * Enqueues a mutation (offline path) into the persistent queue. The
 * authoritative store is left untouched.
 */
export function enqueue(input: MutateInput): OfflineMilestoneSnapshot {
  const mutation = toQueuedMutation(input);
  const rejected = enqueueMutation(mutation);
  const accepted = rejected === null;

  return emptySnapshot({
    pending: loadPendingQueue(),
    enqueued: accepted ? 1 : 0,
    accepted,
    reconciled: false,
    userMessage: accepted
      ? 'Saved offline — will synchronize when you are back online.'
      : rejected?.message ?? 'Your change could not be saved offline. Please try again.',
  });
}

/**
 * Flushes the pending queue to the authoritative store in order, then reports
 * `reconciled: true` when the store changed so the page re-reads authoritative
 * state. The queue module's flush lock prevents duplicate/reconnect flushes.
 */
export function flushPending(): OfflineMilestoneSnapshot {
  const result = flushQueue();

  return emptySnapshot({
    pending: loadPendingQueue(),
    flushed: result.applied,
    enqueued: 0,
    accepted: result.flushed > 0,
    // Reconcile (re-read authoritative state) only when the flush actually ran
    // against a non-empty queue. An empty flush means nothing changed, so the
    // caller must keep its current optimistic/sample UI untouched.
    reconciled: !result.wasEmpty,
    failed: result.failed,
    userMessage: describeFlush(result),
  });
}

function describeFlush(result: {
  flushed: number;
  failed: MilestoneMutationError[];
}): string {
  if (result.failed.length > 0) {
    return result.failed.some((f) => f.code === 'MUTATION_CONFLICT')
      ? 'One of your offline changes conflicts with newer data. Review your milestones.'
      : 'Some offline changes could not be synchronized. Review the affected milestones.';
  }
  if (result.flushed > 0) {
    return 'Your offline changes were synchronized.';
  }
  return '';
}

/** Alias so callers can report how many mutations are still queued. */
export function currentPendingCount(): number {
  return pendingMutationCount();
}

/** Maps a MutateInput to a stable, queued mutation record. */
function toQueuedMutation(input: MutateInput): QueuedMilestoneMutation {
  const { id, createdAt } = { id: createMutationId(), createdAt: Date.now() };
  switch (input.kind) {
    case 'create':
      return { id, kind: 'create', milestone: input.milestone, createdAt };
    case 'update':
      return {
        id,
        kind: 'update',
        targetId: input.targetId,
        patch: input.patch,
        baseVersion: input.baseVersion,
        createdAt,
      };
    case 'delete':
      return { id, kind: 'delete', ids: input.ids, createdAt };
    case 'status':
      return { id, kind: 'status', ids: input.ids, status: input.status, createdAt };
  }
}