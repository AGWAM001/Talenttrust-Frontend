'use client';

/**
 * @file src/app/reputation/page.tsx
 *
 * Route-level validation and state boundary for /reputation.
 *
 * Invariants:
 * 1. Only validated reputation data reaches ReputationPageContent.
 * 2. Scores are finite and remain within the UI's supported 0..5 range.
 * 3. History entries have stable, non-empty identity/content fields and
 *    unique IDs so React keys and mutation targets remain deterministic.
 * 4. Loading, error, and success states are mutually exclusive.
 * 5. A stale load cannot overwrite a newer load or update state after unmount.
 * 6. Raw storage errors are reported for diagnostics but never rendered.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { listReputationEvents } from '@/lib/repository';
import { reportError } from '@/lib/errorReporter';
import type { Reputation } from '@/types/domain';
import { ReputationPageContent } from './ReputationPageContent';
import ReputationLoading from './loading';
import { validateReputationData } from '@/lib/validateReputationData';

const DEFAULT_REPUTATION_SCORE = 4.5;
const DEFAULT_REPUTATION_LEVEL = 'Expert';

type ReputationPageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: Reputation | null };

const INITIAL_STATE: ReputationPageState = { status: 'loading' };

async function fetchReputationData(): Promise<Reputation | null> {
  const history = await listReputationEvents();

  if (!Array.isArray(history)) {
    throw new Error('reputation repository returned a non-array history');
  }

  if (history.length === 0) {
    return null;
  }

  // The repository currently persists reputation events but not an aggregate
  // score. Preserve the route's existing display behavior until a canonical
  // persisted score source exists, while validating the event data first.
  const data: Reputation = {
    score: DEFAULT_REPUTATION_SCORE,
    level: DEFAULT_REPUTATION_LEVEL,
    history,
  };

  validateReputationData(data);
  return data;
}

const ReputationPage: React.FC = () => {
  const [pageState, setPageState] =
    useState<ReputationPageState>(INITIAL_STATE);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadReputation = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setPageState({ status: 'loading' });

    try {
      const data = await fetchReputationData();

      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setPageState({ status: 'success', data });
    } catch (error) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      reportError(error, 'ReputationPage.loadReputation');
      setPageState({
        status: 'error',
        message: 'Unable to load your reputation data. Please try again.',
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadReputation();

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadReputation]);

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
            onClick={() => void loadReputation()}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return <ReputationPageContent reputationData={pageState.data} />;
};

export default ReputationPage;
