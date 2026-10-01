/**
 * Unit tests for the offline milestone queue (`src/lib/offlineMilestoneQueue.ts`).
 *
 * Covers the issue's required edge cases that live at the queue boundary:
 * - enqueue + persistence across reload
 * - malformed persisted data is discarded safely (never crashes)
 * - flush runs in exact insertion order
 * - duplicate flushes / the flush lock prevent double application
 * - creates are idempotent (no duplicate milestones after interrupted replay)
 * - version conflicts surface as `MUTATION_CONFLICT` and are not discarded
 * - empty queue flush is a no-op
 * - stable typed errors with retryable semantics
 */

import {
  OFFLINE_QUEUE_ERROR_CODES,
  enqueueMutation,
  loadPendingQueue,
  flushQueue,
  resetQueueCacheForTests,
  clearPersistedQueue,
  applyMutation,
  createMutationId,
  OFFLINE_QUEUE_KEY,
  MAX_QUEUED_MUTATIONS,
  type QueuedMilestoneMutation,
} from '../offlineMilestoneQueue';
import type { Milestone } from '@/components/MilestonesList';
import { setItem } from '../safeStorage';

function makeMilestone(id: string, overrides: Partial<Milestone> = {}): Milestone {
  return {
    id,
    title: `Milestone ${id}`,
    status: 'Pending',
    payout: 100,
    currency: 'USD',
    ...overrides,
  };
}

function create(id: string): QueuedMilestoneMutation {
  return {
    id: createMutationId(),
    kind: 'create',
    milestone: makeMilestone(id),
    createdAt: 1,
  };
}

function update(
  targetId: string,
  patch: Partial<Milestone>,
  baseVersion = 0,
): QueuedMilestoneMutation {
  return {
    id: createMutationId(),
    kind: 'update',
    targetId,
    patch,
    baseVersion,
    createdAt: 2,
  };
}

function del(ids: string[]): QueuedMilestoneMutation {
  return { id: createMutationId(), kind: 'delete', ids, createdAt: 3 };
}

function status(ids: string[], statusValue: Milestone['status']): QueuedMilestoneMutation {
  return { id: createMutationId(), kind: 'status', ids, status: statusValue, createdAt: 4 };
}

// In-memory authoritative store used by the injected replay strategy.
function makeStore(initial: Milestone[] = []) {
  let milestones: Milestone[] = [...initial];
  const seenCreates = new Set<string>(initial.map((m) => m.id));
  const strategy = {
    listMilestones: jest.fn(() => [...milestones]),
    saveMilestone: jest.fn((m: Milestone) => {
      if (!seenCreates.has(m.id)) {
        milestones.push(m);
        seenCreates.add(m.id);
      }
      return true;
    }),
    upsertMilestone: jest.fn((m: Milestone) => {
      const existing = milestones.find((x) => x.id === m.id);
      const existingVersion = existing?.version ?? 0;
      const incomingVersion = m.version ?? 0;
      if (existing && incomingVersion < existingVersion) {
        return { success: false, stale: true };
      }
      const updated: Milestone = { ...m, version: (m.version ?? 0) + 1 };
      milestones = milestones.map((x) => (x.id === m.id ? updated : x));
      if (!existing) milestones.push(updated);
      return { success: true, stale: false };
    }),
    deleteMilestones: jest.fn((ids: string[]) => {
      const before = milestones.length;
      const idSet = new Set(ids);
      milestones = milestones.filter((m) => !idSet.has(m.id));
      return before - milestones.length;
    }),
    bulkUpdateMilestoneStatus: jest.fn((ids: string[], newStatus: Milestone['status']) => {
      const idSet = new Set(ids);
      milestones = milestones.map((m) => (idSet.has(m.id) ? { ...m, status: newStatus } : m));
      return ids.length;
    }),
  };
  return { strategy, read: () => [...milestones] };
}

beforeEach(() => {
  clearPersistedQueue();
  window.localStorage.clear();
  resetQueueCacheForTests();
});

afterEach(() => {
  clearPersistedQueue();
  window.localStorage.clear();
  resetQueueCacheForTests();
});

describe('queue persistence', () => {
  it('persists enqueued mutations and restores them after a simulated reload', () => {
    const store = makeStore();
    const a = create('a');
    const b = create('b');
    expect(enqueueMutation(a)).toBeNull();
    expect(enqueueMutation(b)).toBeNull();

    // Simulate a reload: drop the in-memory cache and re-read from storage.
    resetQueueCacheForTests();
    const restored = loadPendingQueue();
    expect(restored.map((m) => m.kind)).toEqual(['create', 'create']);

    // Flushing into the same store applies both, in order.
    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(2);
    resetQueueCacheForTests();
    expect(loadPendingQueue()).toEqual([]);
    expect(store.read().some((m) => m.id === 'a')).toBe(true);
    expect(store.read().some((m) => m.id === 'b')).toBe(true);
  });

  it('preserves exact insertion order on flush', () => {
    const store = makeStore();
    const first = create('first');
    const second = create('second');
    const third = create('third');
    enqueueMutation(first);
    enqueueMutation(second);
    enqueueMutation(third);

    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(3);
    expect(result.applied.map((m) => m.id)).toEqual([first.id, second.id, third.id]);
    expect(store.read().map((m) => m.id)).toEqual(['first', 'second', 'third']);
  });
});

describe('malformed persisted data', () => {
  it('discards malformed entries and never throws', () => {
    setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify([
        { id: 'ok', kind: 'delete', ids: ['x'], createdAt: 1 },
        { id: 'no-kind', createdAt: 1 },
        'garbage',
        null,
        { kind: 'create', createdAt: 1 }, // missing milestone
      ]),
    );

    resetQueueCacheForTests();
    const restored = loadPendingQueue();
    expect(restored).toHaveLength(1);
    expect(restored[0].kind).toBe('delete');
  });

  it('returns an empty queue for corrupt JSON', () => {
    setItem(OFFLINE_QUEUE_KEY, '%%%not-json%%%');
    resetQueueCacheForTests();
    expect(loadPendingQueue()).toEqual([]);
  });

  it('returns an empty queue when the key is absent', () => {
    resetQueueCacheForTests();
    expect(loadPendingQueue()).toEqual([]);
  });
});

describe('flush locking / no double apply', () => {
  it('a create is applied exactly once across repeated flushes', () => {
    const store = makeStore();
    const a = create('a');
    enqueueMutation(a);

    const first = flushQueue(store.strategy);
    const second = flushQueue(store.strategy);

    expect(first.flushed).toBe(1);
    // Second flush sees an empty queue and is a no-op.
    expect(second.flushed).toBe(0);
    expect(second.wasEmpty).toBe(true);
    expect(store.read().filter((m) => m.id === 'a')).toHaveLength(1);
    expect(store.strategy.saveMilestone).toHaveBeenCalledTimes(1);
  });

  it('a re-entrant flush triggered during replay is a no-op (flush lock)', () => {
    const store = makeStore();
    const a = create('a');
    enqueueMutation(a);

    const originalSave = store.strategy.saveMilestone;
    store.strategy.saveMilestone = jest.fn((m: Milestone) => {
      const nested = flushQueue(store.strategy);
      expect(nested.flushed).toBe(0);
      expect(nested.wasEmpty).toBe(true);
      return originalSave(m);
    });

    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(1);
    expect(store.read().filter((m) => m.id === 'a')).toHaveLength(1);
  });

  it('a previously-applied create is not re-applied after an interrupted flush', () => {
    const store = makeStore();
    enqueueMutation(create('first'));

    // First mutation replays fine.
    const before = store.strategy.saveMilestone;
    store.strategy.saveMilestone = jest.fn((m: Milestone) =>
      m.id === 'first' ? before(m) : (() => {
        throw new Error('storage transient failure');
      })(),
    );

    // Queue: [create first, create second]. 'first' applies; 'second' fails.
    enqueueMutation(create('second'));
    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(store.read().filter((m) => m.id === 'first')).toHaveLength(1);

    // Restore the sinks so the remaining mutation can flush.
    store.strategy.saveMilestone = before;
    const again = flushQueue(store.strategy);
    expect(again.flushed).toBe(1);
    // 'first' was removed from the queue after its success — never re-applied.
    expect(store.read().filter((m) => m.id === 'first')).toHaveLength(1);
    expect(store.read().filter((m) => m.id === 'second')).toHaveLength(1);
  });
});

describe('idempotent create on replay', () => {
  it('does not create a duplicate if the milestone already reached the store', () => {
    const store = makeStore([makeMilestone('dup')]);
    const a = create('dup');
    expect(enqueueMutation(a)).toBeNull();

    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(1);
    expect(store.read().filter((m) => m.id === 'dup')).toHaveLength(1);
    expect(store.strategy.saveMilestone).not.toHaveBeenCalled();
  });
});

describe('conflict handling', () => {
  it('surfaces MUTATION_CONFLICT for a stale version update and leaves it queued', () => {
    const store = makeStore([{ ...makeMilestone('m1'), version: 5 }]);
    // The offline edit was based on an older version than the store holds.
    const m = update('m1', { title: 'offline edit' }, 2);
    enqueueMutation(m);

    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(0);
    expect(result.failed).toHaveLength(1);
    const err = result.failed[0];
    expect(err.code).toBe(OFFLINE_QUEUE_ERROR_CODES.conflict);
    expect(err.retryable).toBe(false);
    expect(err.mutationId).toBe(m.id);

    // The mutation is NOT silently discarded — still queued.
    resetQueueCacheForTests();
    const pending = loadPendingQueue();
    expect(pending.some((p) => p.id === m.id)).toBe(true);
    // Store is unchanged (old version preserved).
    expect(store.read().find((x) => x.id === 'm1')?.title).toBe('Milestone m1');
  });

  it('applies a non-stale update and bumps the version', () => {
    const store = makeStore([{ ...makeMilestone('m1'), version: 0 }]);
    const m = update('m1', { title: 'Edited online after reconnect' }, 0);
    enqueueMutation(m);

    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(1);
    expect(result.failed).toHaveLength(0);
    expect(store.read().find((x) => x.id === 'm1')?.title).toBe('Edited online after reconnect');
    expect((store.read().find((x) => x.id === 'm1') as Milestone).version).toBe(1);
  });
});

describe('empty queue', () => {
  it('flushes an empty queue as a no-op', () => {
    const store = makeStore();
    const result = flushQueue(store.strategy);
    expect(result.flushed).toBe(0);
    expect(result.failed).toHaveLength(0);
    expect(result.wasEmpty).toBe(true);
    expect(store.strategy.listMilestones).not.toHaveBeenCalled();
  });
});

describe('application by kind', () => {
  it('delete removes matching milestones', () => {
    const store = makeStore([makeMilestone('a'), makeMilestone('b')]);
    enqueueMutation(del(['a']));
    flushQueue(store.strategy);
    expect(store.read().map((m) => m.id)).toEqual(['b']);
  });

  it('status updates matching milestones', () => {
    const store = makeStore([makeMilestone('a'), makeMilestone('b')]);
    enqueueMutation(status(['a', 'b'], 'Completed'));
    flushQueue(store.strategy);
    expect(store.read().every((m) => m.status === 'Completed')).toBe(true);
  });

  it('update fails (non-retryable) when the target no longer exists', () => {
    const store = makeStore();
    const m = update('ghost', { title: 'nope' });
    const result = applyMutation(m, store.strategy);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(OFFLINE_QUEUE_ERROR_CODES.replayFailed);
      expect(result.error.retryable).toBe(false);
    }
  });
});

describe('queue capacity', () => {
  it('rejects enqueues beyond the maximum with a stable error', () => {
    for (let i = 0; i < MAX_QUEUED_MUTATIONS; i += 1) {
      expect(enqueueMutation(create(`m${i}`))).toBeNull();
    }
    const rejected = enqueueMutation(create('overflow'));
    expect(rejected?.code).toBe(OFFLINE_QUEUE_ERROR_CODES.persistenceFailed);
    expect(rejected?.retryable).toBe(true);
  });
});

describe('cleanup helpers', () => {
  it('clearPersistedQueue removes everything', () => {
    enqueueMutation(create('a'));
    clearPersistedQueue();
    expect(loadPendingQueue()).toEqual([]);
  });
});