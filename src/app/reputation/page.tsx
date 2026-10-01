'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReputationPageContent,
  shapeReputationData,
  type ReputationPageContentProps,
} from './ReputationPageContent';
import { listReputationEvents } from '@/lib/repository';
import { checkStorageAvailability } from '@/lib/safeStorage';
import { reportError } from '@/lib/errorReporter';
import type { Reputation, ReputationEvent } from '@/types/domain';

/**
 * Route contracts for `/reputation`, pinned by `__tests__/page-contracts.test.tsx`.
 *
 * 1. Rendering goes through `ReputationPageContent`, the only implementation
 *    under test. The route used to carry its own copy of that component, which
 *    silently dropped the `SafeBoundary` and the history `Suspense` wrapper, so
 *    a crash in the profile took the whole route down.
 * 2. The local event store is the only data source, and a degraded read never
 *    renders a profile: silent fallback must not be presented as trustworthy
 *    reputation data.
 * 3. Persistence is synchronous, so every read lands as one state replacement —
 *    a retry can never interleave with the data already on screen.
 * 4. Focus lands on the `<main>` landmark 100ms after mount, as documented in
 *    docs/components/ReputationAccessibility.md. `ReputationPageClient` carries
 *    the same behaviour but wraps the content in a second `<main>`/`<h1>`, so
 *    the route applies it around the content's own landmark instead.
 */

type ReputationRead = {
  events: ReputationEvent[];
  storageAvailable: boolean;
};

type ReputationFetchState = {
  status: 'loading' | 'success' | 'unavailable';
  events: ReputationEvent[];
  storageAvailable: boolean;
};

const UNAVAILABLE_MESSAGE =
  'Reputation history could not be read from this browser, so the profile is not shown. Your saved events are not affected.';

/**
 * Reads persistence outside React so a failure is reported instead of swallowed.
 * The repository already reports and degrades to an empty list; the availability
 * probe is what lets the route tell "no events yet" apart from "cannot read".
 */
function readReputationEvents(): ReputationRead {
  if (!checkStorageAvailability()) {
    return { events: [], storageAvailable: false };
  }

  try {
    return { events: listReputationEvents(), storageAvailable: true };
  } catch (error) {
    reportError(error, '[reputation] Failed to read reputation events.');
    return { events: [], storageAvailable: false };
  }
}

/** Events are persisted client-side, so anything without a usable id cannot be rendered. */
function isRenderableEvent(event: ReputationEvent): boolean {
  return (
    !!event &&
    typeof event === 'object' &&
    typeof event.id === 'string' &&
    event.id.length > 0
  );
}

const ReputationPage: React.FC = () => {
  const [fetchState, setFetchState] = useState<ReputationFetchState>({
    status: 'loading',
    events: [],
    storageAvailable: true,
  });

  // One token per read. Overlapping reads (double effect, repeated retries) may
  // resolve in any order, so only the newest one is allowed to replace state.
  const readGeneration = useRef(0);

  const runRead = useCallback((generation: number) => {
    queueMicrotask(() => {
      if (generation !== readGeneration.current) return;
      const read = readReputationEvents();
      setFetchState({
        status: read.storageAvailable ? 'success' : 'unavailable',
        ...read,
      });
    });
  }, []);

  // The only read per mount: persistence is a browser side effect, so it lives
  // in the effect, not the initial state (which would also run during SSR).
  useEffect(() => {
    runRead(++readGeneration.current);
  }, [runRead]);

  // Focus-on-mount contract (see header note 4).
  useEffect(() => {
    const timer = setTimeout(() => {
      const main = document.querySelector<HTMLElement>('main');
      if (!main) return;
      main.tabIndex = -1;
      main.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const events = useMemo(
    () => fetchState.events.filter(isRenderableEvent),
    [fetchState.events]
  );

  const reputationData: Reputation | null =
    fetchState.status === 'success' ? shapeReputationData(events) : null;

  const handleRetry = useCallback(() => {
    runRead(++readGeneration.current);
  }, [runRead]);

  return (
    <ReputationPageContent reputationData={reputationData}>
      {fetchState.status === 'loading' ? (
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          Loading reputation
        </p>
      ) : null}

      {fetchState.status === 'unavailable' ? (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900"
        >
          <p className="text-sm">{UNAVAILABLE_MESSAGE}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-900"
          >
            Retry
          </button>
        </div>
      ) : null}
    </ReputationPageContent>
  );
};

export { ReputationPageContent, type ReputationPageContentProps };

export default ReputationPage;
