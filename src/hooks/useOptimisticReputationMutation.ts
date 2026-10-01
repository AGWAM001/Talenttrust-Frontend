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
  // Keep the latest optimistic snapshot available to same-turn repeated calls.
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // ---------------------------------------------------------------------------
  // Optimistic create
  // ---------------------------------------------------------------------------

  const optimisticCreate = useCallback(
    (event: ReputationEvent): OptimisticResult => {
      const previousEvents = eventsRef.current;
      const existingIndex = previousEvents.findIndex((current) => current.id === event.id);
      const nextEvents =
        existingIndex === -1
          ? [...previousEvents, event]
          : previousEvents.map((current) =>
              current.id === event.id ? event : current,
            );
      eventsRef.current = nextEvents;
      setEvents(() => nextEvents);

      const result = upsertReputationEvent(event);

      if (!result.success) {
        eventsRef.current = previousEvents;
        setEvents(previousEvents);
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

      return { ok: true };
    },
    [setEvents],
  );

  // ---------------------------------------------------------------------------
  // Optimistic update
  // ---------------------------------------------------------------------------

  const optimisticUpdate = useCallback(
    (id: string, patch: Partial<ReputationEvent>): OptimisticResult => {
      const previousEvents = eventsRef.current;
      const existing = previousEvents.find((event) => event.id === id);
      const nextEvents = previousEvents.map((event) =>
        event.id === id ? { ...event, ...patch, id } : event,
      );
      eventsRef.current = nextEvents;
      setEvents(() => nextEvents);

      if (!existing) {
        // Event not found in current state – roll back and warn.
        eventsRef.current = previousEvents;
        setEvents(previousEvents);
        return {
          ok: false,
          stale: false,
          error: 'Reputation event not found in the current list. Please reload and try again.',
        };
      }

      const version = getReputationEventVersion(id);
      const updatedEvent: ReputationEvent = { ...existing, ...patch, id, version };
      const result = upsertReputationEvent(updatedEvent);

      if (!result.success) {
        eventsRef.current = previousEvents;
        setEvents(previousEvents);
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

      return { ok: true };
    },
    [setEvents],
  );

  // ---------------------------------------------------------------------------
  // Optimistic delete
  // ---------------------------------------------------------------------------

  const optimisticDelete = useCallback(
    (ids: string[]): OptimisticResult => {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return { ok: true };

      const previousEvents = eventsRef.current;
      const idsToDelete = new Set(uniqueIds);
      const nextEvents = previousEvents.filter((event) => !idsToDelete.has(event.id));
      eventsRef.current = nextEvents;
      setEvents(() => nextEvents);

      const removed = deleteReputationEvents(uniqueIds);

      if (removed === 0) {
        // Nothing was actually deleted — roll back.
        eventsRef.current = previousEvents;
        setEvents(previousEvents);
        return {
          ok: false,
          stale: false,
          error: 'No reputation events were deleted. They may have changed or storage may be unavailable. Please reload and try again.',
        };
      }

      return { ok: true };
    },
    [setEvents],
  );

  return { optimisticCreate, optimisticUpdate, optimisticDelete };
}
