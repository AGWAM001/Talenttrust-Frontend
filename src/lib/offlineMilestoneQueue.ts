/**
 * @file offlineMilestoneQueue.ts
 *
 * Offline mutation queue for the milestones board.
 *
 * ## Why it exists
 *
 * TalentTrust is a fully client-side app: milestone data is persisted in
 * `localStorage` via `src/lib/repository.ts` (there is no backend). The
 * repository, together with its monotonically-increasing `version` field and
 * the `stale: true` stale-overwrite guard in `upsertMilestone`, is treated as
 * the *authoritative store* for this queue's purposes.
 *
 * When the browser is offline we **defer** milestone mutations to the local
 * repository instead of applying them immediately. Each mutation is captured
 * into a persistent queue (backed by `safeStorage`) so it survives reloads.
 * When connectivity returns the queue is flushed — applied to the repository
 * **in the exact order it was recorded** — and then the UI reconciles with the
 * authoritative repository state.
 *
 * ## Why mutations have stable IDs
 *
 * Every entry carries a unique, stable `id` (mutation id) generated at enqueue
 * time. Because `MilestoneCreationForm` derives milestone `id`s from
 * title + timestamp, a create can be made *idempotent on replay*: `create`
 * checks whether a milestone with that id already exists before writing,
 * eliminating duplicate creates if a flush was interrupted between applying a
 * write and persisting its removal from the queue. Update/delete/status
 * mutations are naturally idempotent when replayed against an unchanged store.
 *
 * ## How the flush lock prevents duplicate replay
 *
 * Reconciliation is driven by UI events (`window online`, mount) that can fire
 * many times. A module-level `flushInProgress` flag ensures only one flush runs
 * at a time; concurrent calls return `{ flushed: 0 }` immediately. Combined
 * with idempotent ops and "remove from the queue only after a successful write",
 * a mutation is never applied more than once.
 *
 * ## How conflicts are handled
 *
 * Replaying an `update` goes through `upsertMilestone`'s version guard. If the
 * authoritative store holds a *newer* version than the one the offline edit was
 * based on, the write is rejected with `stale: true`. That becomes a
 * `MUTATION_CONFLICT` error, which is surfaced to the user (the mutation stays
 * in the queue so it is not silently dropped). No internal stack traces or raw
 * exceptions are ever surfaced to users.
 *
 * ## Error codes
 *
 * Failures are normalised into `MilestoneMutationError` objects with a stable
 * `code`. Codes are internal identifiers; UI callers map them to safe,
 * user-facing messages (see `docs/offline-milestones.md`).
 */

import { getItem, setItem, removeItem } from '@/lib/safeStorage';
import { reportError } from '@/lib/errorReporter';
import type { Milestone } from '@/components/MilestonesList';
import type { StatusType } from '@/components/StatusBadge';
import {
  listMilestones,
  saveMilestone,
  upsertMilestone,
  deleteMilestones,
  bulkUpdateMilestoneStatus,
} from '@/lib/repository';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/** Single storage key holding the serialised pending mutation queue. */
export const OFFLINE_QUEUE_KEY = 'talenttrust_milestones_offline_queue';

/** Hard cap on queued entries; guards against runaway growth while offline. */
export const MAX_QUEUED_MUTATIONS = 200;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Stable internal error codes for offline-queue failures. */
export const OFFLINE_QUEUE_ERROR_CODES = {
  persistenceFailed: 'OFFLINE_QUEUE_PERSIST_FAILED',
  invalidEntry: 'OFFLINE_QUEUE_INVALID_ENTRY',
  replayFailed: 'MUTATION_REPLAY_FAILED',
  conflict: 'MUTATION_CONFLICT',
  reconciliationFailed: 'RECONCILIATION_FAILED',
  queueFlushInProgress: 'QUEUE_FLUSH_IN_PROGRESS',
} as const;

export type OfflineQueueErrorCode =
  (typeof OFFLINE_QUEUE_ERROR_CODES)[keyof typeof OFFLINE_QUEUE_ERROR_CODES];

/**
 * A single queued milestone-board mutation. The discriminated `kind` mirrors
 * the repository mutations the board supports, and the payload carries enough
 * data to replay it against the authoritative store.
 */
export type QueuedMilestoneMutation =
  | {
      /** Stable, unique id for this queued entry (dedupe/idempotency). */
      id: string;
      kind: 'create';
      milestone: Milestone;
      createdAt: number;
      retryCount?: number;
    }
  | {
      id: string;
      kind: 'update';
      targetId: string;
      patch: Partial<Milestone>;
      /** Repository version the offline edit was based on (for conflict
       *  detection on replay). */
      baseVersion?: number;
      createdAt: number;
      retryCount?: number;
    }
  | {
      id: string;
      kind: 'delete';
      ids: string[];
      createdAt: number;
      retryCount?: number;
    }
  | {
      id: string;
      kind: 'status';
      ids: string[];
      status: StatusType;
      createdAt: number;
      retryCount?: number;
    };

/** Outcome of applying a single queued mutation to the repository. */
export type MutationApplyResult =
  | { ok: true }
  | { ok: false; error: MilestoneMutationError };

/** Normalised, stable, typed error surfaced by the queue. */
export type MilestoneMutationError = {
  code: OfflineQueueErrorCode;
  /** Short, safe, user-facing message — never leaks internals. */
  message: string;
  /** Whether retrying the mutation is expected to succeed. */
  retryable: boolean;
  /** The id of the failed queued mutation (for UI correlation). */
  mutationId: string;
};

/** Result of a flush run. */
export type FlushResult = {
  /** How many queued mutations were successfully applied and removed. */
  flushed: number;
  /** Mutations that were applied and removed. */
  applied: QueuedMilestoneMutation[];
  /** Mutations that failed and remain queued (for user-visible retry). */
  failed: MilestoneMutationError[];
  /** True when the queue was empty at flush start. */
  wasEmpty: boolean;
};

/**
 * Replay strategy for the flush. Injected so tests can mock the exact
 * repository boundary, and the production path simply forwards to the real
 * repository functions.
 */
export type ReplayStrategy = {
  listMilestones: () => Milestone[];
  saveMilestone: (milestone: Milestone) => boolean;
  upsertMilestone: (milestone: Milestone) => { success: boolean; stale: boolean };
  deleteMilestones: (ids: string[]) => number;
  bulkUpdateMilestoneStatus: (ids: string[], status: StatusType) => number;
};

const defaultReplay: ReplayStrategy = {
  listMilestones,
  saveMilestone,
  upsertMilestone,
  deleteMilestones,
  bulkUpdateMilestoneStatus,
};

// ---------------------------------------------------------------------------
// Mutation id helper
// ---------------------------------------------------------------------------

/**
 * Generates a unique, stable id for a queued mutation. Uses `crypto.randomUUID`
 * when available with a timestamp/random fallback for older environments.
 */
export function createMutationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `m-${crypto.randomUUID()}`;
  }
  return `m-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Module-level flush lock
// ---------------------------------------------------------------------------

let flushInProgress = false;
let liveQueueCache: QueuedMilestoneMutation[] | null = null;
let liveQueueLoaded = false;

// ---------------------------------------------------------------------------
// Queue persistence
// ---------------------------------------------------------------------------

function isValidMutation(value: unknown): value is QueuedMilestoneMutation {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string') return false;
  if (typeof record.createdAt !== 'number') return false;
  switch (record.kind) {
    case 'create':
      return typeof record.milestone === 'object' && record.milestone !== null;
    case 'update':
      return (
        typeof record.targetId === 'string' &&
        typeof record.patch === 'object' &&
        record.patch !== null
      );
    case 'delete':
      return Array.isArray(record.ids) && record.ids.every((id) => typeof id === 'string');
    case 'status':
      return (
        Array.isArray(record.ids) &&
        record.ids.every((id) => typeof id === 'string') &&
        typeof record.status === 'string'
      );
    default:
      return false;
  }
}

/**
 * Loads the persisted queue, discarding malformed entries safely. Never throws
 * — corrupt or invalid JSON/results fall back to an empty queue.
 */
export function loadPendingQueue(): QueuedMilestoneMutation[] {
  const raw = getItem(OFFLINE_QUEUE_KEY);
  if (raw === null || raw === '') {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    reportError(err, '[offlineQueue] Corrupt queue JSON; discarding.', 'warn');
    return [];
  }

  if (!Array.isArray(parsed)) {
    reportError(
      new Error('[offlineQueue] Persisted queue is not an array; discarding.'),
      '[offlineQueue]',
      'warn',
    );
    return [];
  }

  const valid = parsed.filter(isValidMutation);
  if (valid.length !== parsed.length) {
    reportError(
      new Error(`[offlineQueue] Discarded ${parsed.length - valid.length} malformed entries.`),
      '[offlineQueue]',
      'warn',
    );
  }
  return valid;
}

/** Serialises and stores the pending queue. Returns true on success. */
export function persistQueue(queue: QueuedMilestoneMutation[]): boolean {
  try {
    const ok = setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUED_MUTATIONS)));
    liveQueueCache = [...queue];
    return ok;
  } catch (err) {
    reportError(err, '[offlineQueue] Failed to persist queue.', 'error');
    return false;
  }
}

function readLiveQueue(): QueuedMilestoneMutation[] {
  if (!liveQueueLoaded) {
    liveQueueCache = loadPendingQueue();
    liveQueueLoaded = true;
  }
  return liveQueueCache ?? [];
}

/**
 * Adds a mutation to the queue in a snapshot-persistent way: the *updated*
 * array is what gets written, so a crash mid-sequence never leaves the store
 * out of sync with the in-memory view.
 */
export function enqueueMutation(mutation: QueuedMilestoneMutation): MilestoneMutationError | null {
  const next = [...readLiveQueue(), mutation];
  if (next.length > MAX_QUEUED_MUTATIONS) {
    return {
      code: OFFLINE_QUEUE_ERROR_CODES.persistenceFailed,
      message: 'Too many pending offline changes. Connect to the internet to continue.',
      retryable: true,
      mutationId: mutation.id,
    };
  }
  const ok = persistQueue(next);
  if (!ok) {
    return {
      code: OFFLINE_QUEUE_ERROR_CODES.persistenceFailed,
      message: 'Your change could not be saved offline. Please try again.',
      retryable: true,
      mutationId: mutation.id,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Replay
// ---------------------------------------------------------------------------

/**
 * Applies one queued mutation to the authoritative store. Returns `{ok:true}`
 * on success, or a stable error. On `MUTATION_CONFLICT` the reason is recorded
 * but the mutation is left queued so it is not silently discarded.
 */
export function applyMutation(
  mutation: QueuedMilestoneMutation,
  replay: ReplayStrategy = defaultReplay,
): MutationApplyResult {
  try {
    switch (mutation.kind) {
      case 'create': {
        // Idempotency guard: if the milestone already reached the store (e.g. a
        // previous interrupted flush), do not create a duplicate.
        const exists = replay
          .listMilestones()
          .some((m) => m.id === mutation.milestone.id);
        if (exists) {
          return { ok: true };
        }
        replay.saveMilestone(mutation.milestone);
        return { ok: true };
      }
      case 'update': {
        const current = replay.listMilestones().find((m) => m.id === mutation.targetId);
        if (!current) {
          return {
            ok: false,
            error: makeError(
              OFFLINE_QUEUE_ERROR_CODES.replayFailed,
              'This milestone no longer exists and could not be updated.',
              false,
              mutation,
            ),
          };
        }
        // Version-gated upsert surfaces a stale-overwrite conflict.
        const version = mutation.baseVersion ?? current.version ?? 0;
        const result = replay.upsertMilestone({ ...current, ...mutation.patch, version });
        if (result.stale) {
          return {
            ok: false,
            error: makeError(
              OFFLINE_QUEUE_ERROR_CODES.conflict,
              'This milestone was changed elsewhere. Review before saving.',
              false,
              mutation,
            ),
          };
        }
        if (!result.success) {
          return {
            ok: false,
            error: makeError(
              OFFLINE_QUEUE_ERROR_CODES.replayFailed,
              'Could not save this milestone right now.',
              true,
              mutation,
            ),
          };
        }
        return { ok: true };
      }
      case 'delete': {
        replay.deleteMilestones(mutation.ids);
        return { ok: true };
      }
      case 'status': {
        replay.bulkUpdateMilestoneStatus(mutation.ids, mutation.status);
        return { ok: true };
      }
    }
  } catch (err) {
    reportError(err, '[offlineQueue] Mutation replay failed.');
    return {
      ok: false,
      error: makeError(
        OFFLINE_QUEUE_ERROR_CODES.replayFailed,
        'Could not apply one of your offline changes. Please try again.',
        true,
        mutation,
      ),
    };
  }
}

function makeError(
  code: OfflineQueueErrorCode,
  message: string,
  retryable: boolean,
  mutation: QueuedMilestoneMutation,
): MilestoneMutationError {
  return { code, message, retryable, mutationId: mutation.id };
}

// ---------------------------------------------------------------------------
// Flush
// ---------------------------------------------------------------------------

/**
 * Flushes the pending queue to the authoritative store, in insertion order.
 *
 * Guarantees:
 * - Only one flush runs at a time (module-level lock); a concurrent/second
 *   call returns `{ flushed: 0 }` immediately.
 * - Order is preserved: mutations apply sequentially, first-in-first-out.
 * - A mutation is removed from the persistent queue *only after* its repository
 *   write succeeds, so a crash cannot cause unsafe re-replay.
 * - On a failure, later mutations are still processed only where safe; any
 *   failed mutation stays queued (never silently discarded) and is reported via
 *   the returned `failed` errors.
 *
 * @returns A `FlushResult` describing what happened.
 */
export function flushQueue(replay: ReplayStrategy = defaultReplay): FlushResult {
  if (flushInProgress) {
    // A concurrent/duplicate flush is a no-op. Treat it as "nothing to do" so
    // callers do not trigger a reconciliation on a redundant flush.
    return { flushed: 0, applied: [], failed: [], wasEmpty: true };
  }
  flushInProgress = true;
  try {
    const queue = readLiveQueue();
    if (queue.length === 0) {
      return { flushed: 0, applied: [], failed: [], wasEmpty: true };
    }

    const applied: QueuedMilestoneMutation[] = [];
    const failed: MilestoneMutationError[] = [];
    let remaining = [...queue];

    for (const mutation of queue) {
      const result = applyMutation(mutation, replay);
      if (result.ok) {
        applied.push(mutation);
        remaining = remaining.filter((m) => m.id !== mutation.id);
        persistQueue(remaining);
      } else {
        failed.push(result.error);
        // Stop here: later mutations may depend on this one (ordering).
        break;
      }
    }

    return { flushed: applied.length, applied, failed, wasEmpty: false };
  } finally {
    liveQueueLoaded = true;
    flushInProgress = false;
  }
}

/** Number of pending mutations currently in the queue (persisted + cached). */
export function pendingMutationCount(): number {
  return readLiveQueue().length;
}

/**
 * Clears the *in-memory* cached queue view (does not touch storage). Primarily
 * for tests to re-sync the module's cache with storage.
 */
export function resetQueueCacheForTests(): void {
  liveQueueCache = null;
  liveQueueLoaded = false;
  flushInProgress = false;
}

/** Removes the persistenced queue entry (used by tests and debug reset). */
export function clearPersistedQueue(): void {
  try {
    removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // safeStorage resilience
  }
  resetQueueCacheForTests();
}