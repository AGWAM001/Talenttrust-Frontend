/**
 * @file useOfflineMilestones.ts
 *
 * Wires {@link useOnlineStatus} to the offline milestone mutation queue so the
 * milestones page can:
 *
 * - **Online:** apply mutations immediately to the repository (existing
 *   behaviour unchanged).
 * - **Offline:** queue mutations instead of writing to the store, keep the
 *   optimistic change locally, and persist the queue across reloads.
 * - **Reconnect:** flush the queue in order (guarded against duplicate flushes)
 *   and reconcile the UI with authoritative repository state via
 *   `onReconcile`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  applyImmediate,
  enqueue,
  flushPending,
  currentPendingCount,
  type MutateInput,
  type OfflineMilestoneSnapshot,
} from '@/lib/offlineMilestoneCoordinator';

export type { MutateInput, OfflineMilestoneSnapshot };
export type { QueuedMilestoneMutation } from '@/lib/offlineMilestoneQueue';

export type OfflineMilestoneResult = {
  /** Whether the browser is currently online. */
  isOnline: boolean;
  /** Number of mutations waiting in the offline queue. */
  pendingCount: number;
  /** True while the queued mutations are being flushed to the store. */
  isFlushing: boolean;
  /** Most recent user-facing notice about queued/flushed/conflicted changes. */
  notice: string;
  /** Re-reads authoritative repository state into the page's list. */
  reconcile: () => void;
  /**
   * Route a milestone mutation.
   * - Online: applies it immediately to the store.
   * - Offline: enqueues it so it flushes on reconnect.
   *
   * @returns `true` when the change was accepted (applied online or queued).
   */
  mutate: (mutation: MutateInput) => boolean;
};

/** Maps a flush result to a safe user-facing message (never leaks internals). */
function noticeFor(snapshot: OfflineMilestoneSnapshot): string {
  return snapshot.userMessage || '';
}

/**
 * @param onReconcile  Invoked whenever authoritative repository state changes
 *   (after a flush or an immediate online write) so the page can re-read and
 *   re-render from `listMilestones()`.
 */
export function useOfflineMilestones(
  onReconcile: () => void,
): OfflineMilestoneResult {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(currentPendingCount);
  const [isFlushing, setIsFlushing] = useState(false);
  const [notice, setNotice] = useState('');
  const reconcileRef = useLatest(onReconcile);

  const reconcile = useCallback(() => {
    reconcileRef.current();
  }, []);

  const handleFlushResult = useCallback((result: OfflineMilestoneSnapshot) => {
    setPendingCount(result.pending.length);
    setIsFlushing(true);
    setNotice(noticeFor(result));
    if (result.reconciled) {
      reconcileRef.current();
    }
    setIsFlushing(false);
  }, []);

  // On mount: restore the queue's persisted state. If the app starts online
  // with a restored queue, flush + reconcile exactly once (safe under the
  // coordinator's flush lock).
  useEffect(() => {
    setPendingCount(currentPendingCount());
    if (isOnline) {
      handleFlushResult(flushPending());
    }
  }, []);

  // Flush + reconcile whenever the browser transitions back online.
  useEffect(() => {
    if (!isOnline) return;
    handleFlushResult(flushPending());
  }, [isOnline, handleFlushResult]);

  const mutate = useCallback(
    (mutation: MutateInput): boolean => {
      const result = isOnline ? applyImmediate(mutation) : enqueue(mutation);
      setPendingCount(result.pending.length);
      setNotice(noticeFor(result));
      if (result.reconciled) {
        reconcileRef.current();
      }
      return result.accepted;
    },
    [isOnline],
  );

  // Clear transient notices automatically so stale messages don't linger.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const value = useMemo<OfflineMilestoneResult>(
    () => ({
      isOnline,
      pendingCount,
      isFlushing,
      notice,
      reconcile,
      mutate,
    }),
    [isOnline, pendingCount, isFlushing, notice, reconcile, mutate],
  );

  return value;
}

/** Keeps a callback ref-identity stable without re-running effects. */
function useLatest<T>(value: T): { current: T } {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}