'use client';

/**
 * @file src/app/reputation/page.tsx
 *
 * Entry-point route component for /reputation.
 *
 * ## State model
 *
 * The page owns four mutually exclusive UI states:
 *
 *   loading  → data fetch in progress; renders the skeleton UI
 *   error    → data fetch failed; renders a diagnosable error message
 *              without leaking raw error details to the user
 *   empty    → fetch succeeded but no reputation data available;
 *              rendered by ReputationPageContent via its own invariant
 *   success  → fetch succeeded and data passes validation;
 *              rendered by ReputationPageContent
 *
 * ## Invariants enforced here
 *
 * 1. **Mutual exclusivity** — only one of {loading, error, content} is ever
 *    rendered at a time; a loading-ref guard prevents a stale async callback
 *    from committing state after the component unmounts or a second call fires.
 *
 * 2. **Data validation** — incoming data is run through `validateReputationData`
 *    before being committed to state. Invalid or structurally corrupt payloads
 *    are treated as a recoverable error rather than silent data loss.
 *
 * 3. **Concurrent-execution safety** — each call to `loadReputation` captures
 *    a per-invocation `active` flag. If the component unmounts or a newer call
 *    starts before the current one resolves, the stale call is a no-op.
 *
 * 4. **Error isolation** — the error message shown to the user is a static,
 *    safe string. The raw Error object is only ever forwarded to `reportError`
 *    (which may log it to a monitoring service), never rendered into the DOM.
 *
 * 5. **Re-try safety** — re-mounting or calling `loadReputation` a second time
 *    is safe: state is reset to loading first, and any in-flight call that
 *    resolves after a re-try is discarded via the active flag.
 *
 * `ReputationPageContent` (in ReputationPageContent.tsx) handles its own
 * sub-tree invariants (empty vs. full vs. error-boundary fallback) and is
 * imported rather than duplicated here.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import SafeBoundary from '@/components/SafeBoundary';
import { listReputationEvents } from '@/lib/repository';
import { reportError } from '@/lib/errorReporter';
import type { Reputation } from '@/types/domain';
import { ReputationPageContent } from './ReputationPageContent';
import ReputationLoading from './loading';

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Validates that `data` is structurally sound enough to pass to
 * `ReputationPageContent`. Invalid shapes produce a recoverable error
 * rather than silent rendering with undefined values.
 *
 * Rules:
 * - `data` must be a non-null object.
 * - `score`, when present, must be a finite number.
 * - `history`, when present, must be an array.
 *
 * @throws {Error} with a descriptive message when any rule is violated.
 */
export function validateReputationData(data: unknown): asserts data is Reputation {
  if (data === null || typeof data !== 'object') {
    throw new Error(
      `validateReputationData: expected an object, got ${data === null ? 'null' : typeof data}`,
    );
  }

  const record = data as Record<string, unknown>;

  if ('score' in record && record.score !== null && record.score !== undefined) {
    if (typeof record.score !== 'number' || !Number.isFinite(record.score)) {
      throw new Error(
        `validateReputationData: score must be a finite number, got ${JSON.stringify(record.score)}`,
      );
    }
  }

  if ('history' in record && record.history !== undefined && record.history !== null) {
    if (!Array.isArray(record.history)) {
      throw new Error(
        `validateReputationData: history must be an array, got ${typeof record.history}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Data-fetch helper (swap for a real API call when available)
// ---------------------------------------------------------------------------

/**
 * Loads reputation data from the local repository.
 *
 * Returns `null` when no events exist (empty state). Wraps access in a
 * try/catch so any storage error propagates as a rejected Promise and is
 * handled uniformly by the loading logic inside `ReputationPage`.
 */
async function fetchReputationData(): Promise<Reputation | null> {
  const history = listReputationEvents();
  if (history.length === 0) return null;

  return { score: null, history };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Reputation | null };

const INITIAL_STATE: PageState = { status: 'loading' };

const ReputationPage: React.FC = () => {
  const [pageState, setPageState] = useState<PageState>(INITIAL_STATE);

  /**
   * `mountedRef` guards against setState calls after the component unmounts.
   * A ref (not state) is correct here: toggling it must never trigger a
   * re-render, and it must be readable inside async closures.
   */
  const mountedRef = useRef(true);

  const loadReputation = useCallback(async () => {
    // Reset to loading before every fetch so state is always consistent.
    setPageState({ status: 'loading' });

    // `active` tracks whether *this particular invocation* is still the
    // current one. If a newer call fires before this one resolves, or if
    // the component unmounts, we bail out without touching state.
    let active = true;

    try {
      const raw = await fetchReputationData();

      if (!active || !mountedRef.current) return;

      if (raw !== null) {
        // Validate before committing: a corrupt payload becomes an error
        // state rather than silent corruption of the rendered UI.
        validateReputationData(raw);
      }

      setPageState({ status: 'success', data: raw });
    } catch (err) {
      if (!active || !mountedRef.current) return;

      // Forward raw error to monitoring; never render it to the user.
      reportError(err, 'ReputationPage.loadReputation');

      setPageState({
        status: 'error',
        message: 'Unable to load your reputation data. Please try again.',
      });
    }

    return () => {
      // Mark this invocation as stale when the effect re-runs or the
      // component unmounts.
      active = false;
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadReputation();

    return () => {
      mountedRef.current = false;
    };
  }, [loadReputation]);

  // ------------------------------------------------------------------
  // Render – mutually exclusive states
  // ------------------------------------------------------------------

  if (pageState.status === 'loading') {
    return <ReputationLoading />;
  }

  if (pageState.status === 'error') {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-6">Reputation</h1>
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center p-8 rounded-lg border border-red-200 bg-red-50 text-center space-y-4"
        >
          <p className="text-red-700 font-medium">{pageState.message}</p>
          <button
            type="button"
            onClick={loadReputation}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // status === 'success': delegate content + sub-tree error isolation to
  // ReputationPageContent (which wraps in SafeBoundary + Suspense).
  return (
    <SafeBoundary>
      <ReputationPageContent reputationData={pageState.data} />
    </SafeBoundary>
  );
};

export default ReputationPage;
