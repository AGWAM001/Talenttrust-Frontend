'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import ReputationProfile from '@/components/ReputationProfile';
import ReputationSummaryCard from '@/components/ReputationSummaryCard';
import SafeBoundary from '@/components/SafeBoundary';
import { readReputationHistory, ReputationHistoryReadError } from '@/lib/readReputationHistory';
import { reportError } from '@/lib/errorReporter';
import type { Reputation } from '@/types/domain';

export type ReputationPageContentProps = {
  reputationData?: Reputation | null;
  userName?: string;
};

export function ReputationPageContent({
  reputationData,
  userName = 'User',
}: ReputationPageContentProps) {
  const score = reputationData?.score;
  const hasReputation = typeof score === 'number' && score >= 0;

  if (!reputationData || !hasReputation) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-6">Reputation</h1>
        <EmptyState
          illustration="reputation"
          title="No reputation yet"
          description="Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract."
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Reputation</h1>
      <ReputationSummaryCard
        name={userName}
        score={score}
        level={reputationData.level}
        history={reputationData.history}
      />
      <ReputationProfile
        name={userName}
        score={score}
        level={reputationData.level}
        history={reputationData.history}
        lastUpdated={reputationData.lastUpdated}
      />
    </main>
  );
}

const ReputationPage: React.FC = () => {
  const [reputationData, setReputationData] = useState<Reputation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  const requestRef = useRef<{ cancelled: boolean } | null>(null);

  const loadReputation = useCallback(async () => {
    // The ref closes the gap before React commits the disabled button state.
    if (requestRef.current) return;
    const request = { cancelled: false };
    requestRef.current = request;
    setIsLoading(true);
    setReadError(null);
    try {
      const history = await Promise.resolve().then(readReputationHistory);
      if (request.cancelled) return;
      setReputationData({ score: 4.5, level: 'Expert', history });
    } catch (error) {
      if (request.cancelled) return;
      const reason = error instanceof ReputationHistoryReadError ? error.reason : 'read-failed';
      setReadError(
        reason === 'invalid-data'
          ? 'Saved reputation history is invalid. Your saved data has not been changed.'
          : 'Reputation history could not be read. Check browser storage access and retry. Your saved data has not been changed.',
      );
      // Arbitrary storage/JSON exception messages can contain private history.
      reportError(new Error('Reputation history read failed'), 'ReputationPage.load', 'error', {
        reason,
      });
      // Keep both the last successful snapshot and the mounted profile's local state.
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadReputation();
    return () => {
      if (requestRef.current) {
        requestRef.current.cancelled = true;
        requestRef.current = null;
      }
    };
  }, [loadReputation]);

  return (
    <>
      <section aria-label="Reputation updates" className="px-8 pt-8">
        {isLoading && <p role="status">Loading reputation history…</p>}
        {readError && <p role="alert">{readError}</p>}
        <button
          type="button"
          onClick={() => void loadReputation()}
          disabled={isLoading}
          className="rounded-lg border px-4 py-2 focus-visible:outline focus-visible:outline-2"
        >
          {readError ? 'Retry reputation history' : 'Refresh reputation history'}
        </button>
      </section>
      {reputationData ? (
        <SafeBoundary>
          <ReputationPageContent reputationData={reputationData} />
        </SafeBoundary>
      ) : (
        <main className="min-h-screen p-8" aria-busy={isLoading}>
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
        </main>
      )}
    </>
  );
};

export default ReputationPage;
