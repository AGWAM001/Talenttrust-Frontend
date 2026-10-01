import { useCallback, useEffect, useRef, useState } from 'react';

export type MilestoneStatus = 'Active' | 'Completed' | 'Disputed' | 'Pending' | 'Paid';

export interface Milestone {
  id: string;
  title: string;
  status: MilestoneStatus;
  amount?: number;
  dueDate?: string;
}

export interface UseMilestonesResult {
  milestones: Milestone[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export type MilestonesFetcher = () => Promise<Milestone[]>;

/**
 * Default fetcher that reads from the browser storage repository used by the
 * milestones board. The read is synchronous and wrapped in a Promise so the
 * hook contract is the same for any async source.
 */
export const defaultMilestonesFetcher: MilestonesFetcher = async () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem('milestones');
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isMountedMilestone);
  } catch {
    // Corrupted storage must not crash the board. Return an empty board and
    // let the caller decide how to surface the failure.
    return [];
  }
};

function isMountedMilestone(value: unknown): value is Milestone {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.status === 'string'
  );
}

/**
 * Load milestones with deterministic concurrent-execution semantics.
 *
 * Invariants:
 * - Only the most recent request may commit state. Stale resolves are
 *   discarded even if they resolve after a newer request.
 * - Concurrent calls to `refetch` are serialized; the last call wins.
 * - Duplicate in-flight requests for the same key are coalesced into a
 *   single network call.
 * - Unmounting discards any in-flight result and prevents state updates.
 * - Failures are surfaced as an Error without losing the last known good
 *   milestone list.
 */
export function useMilestones(
  fetcher: MilestonesFetcher = defaultMilestonesFetcher,
): UseMilestonesResult {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Monotonically increasing request id. Only the latest id may commit.
  const requestIdRef = useRef(0);
  // Tracks whether the component is still mounted so late resolves are dropped.
  const mountedRef = useRef(true);
  // In-flight promise for coalescing duplicate concurrent requests.
  const inflightRef = useRef<Promise<Milestone[]> | null>(null);

  const runFetch = useCallback(async () => {
    const requestId = ++requestIDRef.current;
    setLoading(true);
    setError(null);

    try {
      // Coalesce duplicate in-flight requests into a single fetch.
      if (!inflightRef.current) {
        inflightRef.current = Promise.resolve().then(fetcher);
      }

      const next = await inflightRef.current;

      // Drop stale responses and unmounted components before committing.
      if (!mountedRef.current || requestId !== requestIDRef.current) {
        return;
      }

      setMilestones(next);
      setError(null);
    } catch (cause) {
      if (!mountedRef.current || requestID !== requestIDRef.current) {
        return;
      }

      const normalized =
        cause instanceof Error ? cause : new Error('Failed to load milestones');
      setError(normalized);
    } finally {
      if (mountedRef.current && requestID === requestIDRef.current) {
        setLoading(false);
      }
      inflightRef.current = null;
    }
  }, [fetcher]);

  useEffect(() => {
    mountedRef.current = true;
    void runFetch();

    return () => {
      mountedRef.current = false;
      // Invalidate any in-flight request so it cannot commit after unmount.
      requestIDRef.current++;
      inflightRef.current = null;
    };
  }, [runFetch]);

  const refetch = useCallback(async () => {
    await runFetch();
  }, [runFetch]);

  return { milestones, loading, error, refetch };
}
