'use client';

import { useCallback, useRef } from 'react';
import { upsertReputationEvent, getReputationEventVersion, deleteReputationEvents } from '@/lib/repository';
import type { ReputationEvent } from '@/types/domain';

/**
 * Result returned by optimistic mutation operations.
 */
export type OptimisticResult =
  | { ok: true }
  | { ok: false; stale: boolean; error: string };

/**
 * A hook that applies reputation event mutations (create, update, delete) optimistically
 * to the UI and rolls back on persistence failure.
 *
 * @param events - The current events array from React state.
 * @param setEvents - State setter to apply optimistic changes and rollbacks.
 */
export function useOptimisticReputationMutation(
  events: ReputationEvent[],
  setEvents: React.Dispatch<React.SetStateAction<ReputationEvent[]>>,
) {
  /**
   * Snapshot of the events array taken right before an optimistic mutation.
   * Restored on persistence failure to roll back the UI.
   */
  const rollbackRef = useRef<ReputationEvent[]>([]);

  // ---------------------------------------------------------------------------
  // Optimistic create
  // ---------------------------------------------------------------------------

  const optimisticCreate = useCallback(
    (event: ReputationEvent): OptimisticResult => {
      rollbackRef.current = events;
      setEvents((prev) => [...prev, event]);

      const result = upsertReputationEvent(event);

      if (!result.success) {
        if (rollbackRef.current) {
          setEvents(rollbackRef.current);
        }
        rollbackRef.current = [];
        return result.stale
          ? {
              ok: false,
              stale: true,
              error:
                'This reputation event was updated in another session. Please reload and try again.',
            }
          : {
              ok: false,
              stale: false,
              error:
                'The reputation event could not be saved. Please try again.',
            };
      }

      rollbackRef.current = [];
      return { ok: true };
    },
    [events, setEvents],
  );

  // ---------------------------------------------------------------------------
  // Optimistic update
  // ---------------------------------------------------------------------------

  const optimisticUpdate = useCallback(
    (id: string, patch: Partial<ReputationEvent>): OptimisticResult => {
      rollbackRef.current = events;
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );

      const version = getReputationEventVersion(id);
      const existing = events.find((e) => e.id === id);
      if (!existing) {
        // Event not found in current state – roll back and warn.
        if (rollbackRef.current) {
          setEvents(rollbackRef.current);
        }
        rollbackRef.current = [];
        return {
          ok: false,
          stale: false,
          error: 'Reputation event not found in the current list. Please reload and try again.',
        };
      }

      const updatedEvent: ReputationEvent = { ...existing, ...patch, version };
      const result = upsertReputationEvent(updatedEvent);

      if (!result.success) {
        if (rollbackRef.current) {
          setEvents(rollbackRef.current);
        }
        rollbackRef.current = [];
        return result.stale
          ? {
              ok: false,
              stale: true,
              error:
                'This reputation event was updated in another session. Please reload and try again.',
            }
          : {
              ok: false,
              stale: false,
              error:
                'The reputation event could not be saved. Please try again.',
            };
      }

      rollbackRef.current = [];
      return { ok: true };
    },
    [events, setEvents],
  );

  // ---------------------------------------------------------------------------
  // Optimistic delete
  // ---------------------------------------------------------------------------

  const optimisticDelete = useCallback(
    (ids: string[]): OptimisticResult => {
      rollbackRef.current = events;
      setEvents((prev) => prev.filter((e) => !ids.includes(e.id)));

      const removed = deleteReputationEvents(ids);

      if (removed === 0 && ids.length > 0) {
        // Nothing was actually deleted — roll back.
        if (rollbackRef.current) {
          setEvents(rollbackRef.current);
        }
        rollbackRef.current = [];
        return {
          ok: false,
          stale: false,
          error: 'No reputation events were found to delete. Please reload and try again.',
        };
      }

      rollbackRef.current = [];
      return { ok: true };
    },
    [events, setEvents],
  );

  return { optimisticCreate, optimisticUpdate, optimisticDelete };
}
