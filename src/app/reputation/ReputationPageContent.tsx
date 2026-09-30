'use client';

import React, { Suspense } from 'react';
import EmptyState from '../../components/EmptyState';
import ReputationProfile from '../../components/ReputationProfile';
import ReputationSummaryCard from '../../components/ReputationSummaryCard';
import SafeBoundary from '../../components/SafeBoundary';
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

  return (
    <SafeBoundary>
      {!reputationData || !hasReputation ? (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
          <EmptyState
            illustration="reputation"
            title="No reputation yet"
            description="Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract."
          />
        </main>
      ) : (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
          <ReputationSummaryCard
            name={userName}
            score={score}
            level={reputationData.level}
            history={reputationData.history}
          />
          <Suspense fallback={null}>
            <ReputationProfile
              name={userName}
              score={score}
              level={reputationData.level}
              history={reputationData.history}
            />
          </Suspense>
        </main>
      )}
    </SafeBoundary>
  );
}

