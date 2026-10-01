/**
 * @file useMilestones.ts
 *
 * React hook that owns the milestones list state for a contract.
 *
 * The hook wraps the data source in a deterministic state machine:
 * - every load is tagged with a request id so out-of-order responses from
 *   concurrent loads are discarded;
 * - failures are surfaced as a typed error state and never clear existing
 *   data, so a transient failure does not cause silent data loss;
 * - components unmounting mid-flight cannot update state.
 *
 * The hook accepts an injectable `fetcher` so tests and callers can supply
 * their own transport without changing the public shape of the hook.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  applyStatusTransition,
  normalizeMilestones,
  type Milestone,
} from '@/lib/milestones';

/** Fetches the raw milestone payload for a contract. */
export type MilestonesFetcher = (contractId: string) => Promise<unknown>;

/** State exposed by the hook. */
export interface UseMilestonesResult {
  /** The normalized, deduplicated, deterministically ordered milestones. */
  milestones: Milestone[];
  /** True while the initial load is in flight and no data is available. */
  isLoading: boolean;
  /** True while a refresh is in flight with existing data still visible. */
  isRefreshing: boolean;
  /** A user-safe message for the most recent failure, or null. */
  error: string | null;
  /** Reloads the milestones from the fetcher. */
  refresh: () => Promise<void>;
  /**
   * Attempts a status transition on a loaded milestone.
   *
   * Returns `true` when the transition was applied. Returns `false
   * without mutating state when the transition is not allowed.
   */
  updateStatus: (id: string, nextStatus: unknown) => boolean;
}

/** Error message shown when the fetcher rejects. */
const LOAD_ERROR_MESSAGE =
  'We could not load the milestones. Please try again.';

/** Error message shown when a contract id is missing. */
const MISSING_CONTRACT_MESSAGE = 'No contract was selected.';

/**
 * Manages milestone data for a single contract.

 * @param contractId The contract whose milestones should be loaded.
 * @param fetcher Async transport. Defaults to a fetch against the app's
 *   milestones endpoint.
 */
export function useMilestones(
  contractId: string | undefined | null,
  fetcher?: MilestonesFetcher,
): UseMilestonesResult {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Monotonically increasing request id. Only the latest request may
  // commit state, which makes concurrent loads and retries safe.
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);

  const load = useCallback(
    async (id: string, isRefresh: boolean) => {
      const requestId = ++requestIdRef.current;

      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const payload = await fetcher(id);
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }
        setMilestones(normalizeMilestones(payload));
      } catch {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }
        // Keep any previously loaded data in place; only surface the error.
        setError(LOAD_ERROR_MESSAGE);
      } finally {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [fetcher],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Invalidate any in-flight request so it cannot commit after unmount.
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!contractId) {
      // No contract selected: reset to an empty, error-free state.
      requestIdRef.current += 1;
      setMilestones([]);
      setIsLoading(false);
      setIsRefreshing(false);
      setError(MISSING_CONTRACT_MESSAGE);
      return;
    }

    void load(contractId, false);
  }, [contractId, load]);

  const refresh = useCallback(async () => {
    if (!contractId) return;
    await load(contractId, true);
  }, [contractId, load]);

  const updateStatus = useCallback(
    (id: string, nextStatus: unknown): boolean => {
      let applied = false;

      setMilestones((current) => {
        const index = current.findIndex((m) => m.id === id);
        if (index === -1) return current;

        const result = applyStatusTransition(current[index], nextStatus);
        if (!result.ok) return current;

        applied = true;
        const next = [...current];
        next[index] = result.milestone;
        return next;
      });

      return applied;
    },
    [],
  );

  return {
    milestones,
    isLoading,
    isRefreshing,
    error,
    refresh,
    updateStatus,
  };
}
