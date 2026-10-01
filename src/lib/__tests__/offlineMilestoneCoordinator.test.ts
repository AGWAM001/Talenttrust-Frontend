/**
 * Unit tests for the offline milestone coordinator
 * (`src/lib/offlineMilestoneCoordinator.ts`).
 *
 * The coordinator is the seam the milestones page calls. It decides how a board
 * mutation is handled based on connectivity (provided by the caller/hook):
 * - `applyImmediate` → online: writes straight to the repository.
 * - `enqueue` → offline: captures to the persistent queue, store untouched.
 * - `flushPending` → reconnect: applies the queue then reports `reconciled`
 *   only when a real flush ran.
 *
 * These tests exercise the real repository bound to jsdom localStorage, so they
 * validate observable behaviour (the authoritative store changing) rather than
 * implementation detail.
 */

import {
  applyImmediate,
  enqueue,
  flushPending,
  currentPendingCount,
} from '../offlineMilestoneCoordinator';
import {
  listMilestones,
  saveMilestone,
  clearAppData,
} from '../repository';
import {
  resetQueueCacheForTests,
  clearPersistedQueue,
  type QueuedMilestoneMutation,
} from '../offlineMilestoneQueue';
import type { Milestone } from '@/components/MilestonesList';

function milestone(id: string, overrides: Partial<Milestone> = {}): Milestone {
  return { id, title: id, status: 'Pending', payout: 10, currency: 'USD', ...overrides };
}

beforeEach(() => {
  clearAppData();
  window.localStorage.clear();
  resetQueueCacheForTests();
  clearPersistedQueue();
});

afterEach(() => {
  clearAppData();
  window.localStorage.clear();
  resetQueueCacheForTests();
  clearPersistedQueue();
});

describe('applyImmediate (online path)', () => {
  it('writes a create straight to the repository', () => {
    const snapshot = applyImmediate({ kind: 'create', milestone: milestone('m1') });
    expect(snapshot.accepted).toBe(true);
    expect(snapshot.reconciled).toBe(true);
    expect(listMilestones().some((m) => m.id === 'm1')).toBe(true);
  });

  it('updates an existing milestone in place', () => {
    saveMilestone(milestone('m1'));
    const snapshot = applyImmediate({
      kind: 'update',
      targetId: 'm1',
      patch: { title: 'Renamed' },
    });
    expect(snapshot.accepted).toBe(true);
    expect(listMilestones().find((m) => m.id === 'm1')?.title).toBe('Renamed');
  });

  it('deletes matching milestones', () => {
    saveMilestone(milestone('m1'));
    applyImmediate({ kind: 'delete', ids: ['m1'] });
    expect(listMilestones()).toHaveLength(0);
  });

  it('sets status on matching milestones', () => {
    saveMilestone(milestone('m1'));
    applyImmediate({ kind: 'status', ids: ['m1'], status: 'Completed' });
    expect(listMilestones().find((m) => m.id === 'm1')?.status).toBe('Completed');
  });
});

describe('enqueue (offline path)', () => {
  it('captures the mutation and leaves the store untouched', () => {
    const snapshot = enqueue({ kind: 'create', milestone: milestone('offline') });
    expect(snapshot.accepted).toBe(true);
    expect(snapshot.reconciled).toBe(false);
    expect(snapshot.pending).toHaveLength(1);
    // Nothing written to the authoritative store yet.
    expect(listMilestones()).toHaveLength(0);
    expect(currentPendingCount()).toBe(1);
  });

  it('returns a safe user-facing message when queued', () => {
    const snapshot = enqueue({ kind: 'update', targetId: 'm1', patch: { title: 'x' } });
    expect(snapshot.accepted).toBe(true);
    expect(snapshot.userMessage).toContain('Saved offline');
  });
});

describe('flushPending (reconnect path)', () => {
  it('applies queued mutations and reports reconciliation', () => {
    enqueue({ kind: 'create', milestone: milestone('a') });
    enqueue({ kind: 'create', milestone: milestone('b') });

    const snapshot = flushPending();
    expect(snapshot.flushed).toHaveLength(2);
    expect(snapshot.accepted).toBe(true);
    expect(snapshot.reconciled).toBe(true);
    expect(snapshot.failed).toHaveLength(0);
    expect(snapshot.userMessage).toContain('synchronized');
    expect(listMilestones().map((m) => m.id)).toEqual(['a', 'b']);
    expect(currentPendingCount()).toBe(0);
  });

  it('never re-applies after a duplicate reconnect flush', () => {
    enqueue({ kind: 'create', milestone: milestone('one') });
    flushPending();
    const again = flushPending();
    expect(again.flushed).toHaveLength(0);
    expect(again.reconciled).toBe(false);
    expect(listMilestones().filter((m) => m.id === 'one')).toHaveLength(1);
  });

  it('is a no-op (no reconcile) when the queue is empty', () => {
    const snapshot = flushPending();
    expect(snapshot.flushed).toHaveLength(0);
    expect(snapshot.reconciled).toBe(false);
    expect(snapshot.accepted).toBe(false);
  });

  it('preserves a conflicted mutation and reports a conflict message', () => {
    // Store holds a newer version than the queued offline edit.
    saveMilestone({ ...milestone('c'), version: 3 });
    resetQueueCacheForTests();
    enqueue({
      kind: 'update',
      targetId: 'c',
      patch: { title: 'older edit' },
      // The edit was made when the store was at version 1.
      baseVersion: 1,
    });

    const snapshot = flushPending();
    expect(snapshot.flushed).toHaveLength(0);
    expect(snapshot.failed).toHaveLength(1);
    expect(snapshot.failed[0].code).toBe('MUTATION_CONFLICT');
    expect(snapshot.userMessage).toContain('conflict');
    // Not silently discarded.
    expect(currentPendingCount()).toBe(1);
    // Store preserved the newer version.
    expect(listMilestones().find((m) => m.id === 'c')?.title).toBe('c');
  });
});

describe('queue survives reload while still offline', () => {
  it('restores and re-flushes after a cache reset (reopening the app)', () => {
    enqueue({ kind: 'create', milestone: milestone('persist') });
    // Simulate reload: clear in-memory cache and storage of repo, but the queue
    // is stored separately and survives.
    resetQueueCacheForTests();

    const restored = flushPending();
    expect(restored.flushed).toHaveLength(1);
    expect(listMilestones().some((m) => m.id === 'persist')).toBe(true);
  });
});

describe('queue shape', () => {
  it('produces stable queued mutation records with unique ids', () => {
    const a = enqueue({ kind: 'create', milestone: milestone('x') });
    const b = enqueue({ kind: 'delete', ids: ['y'] });
    const pendingA = a.pending as QueuedMilestoneMutation[];
    const pendingB = b.pending as QueuedMilestoneMutation[];
    expect(pendingA[0].id).toBeTruthy();
    expect(pendingA[0].id).not.toBe(pendingB[1].id);
    expect(pendingA[0].kind).toBe('create');
    // After both enqueues the queue is [create, delete].
    expect(pendingB).toHaveLength(2);
    expect(pendingB[1].kind).toBe('delete');
  });
});