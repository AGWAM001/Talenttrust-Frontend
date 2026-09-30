'use client';

import React, { Suspense, type ReactNode } from 'react';
import EmptyState from '../../components/EmptyState';
import ReputationProfile, { resolveReputationLevel } from '../../components/ReputationProfile';
import ReputationSummaryCard from '../../components/ReputationSummaryCard';
import SafeBoundary from '../../components/SafeBoundary';
import type { Reputation, ReputationEvent } from '@/types/domain';

/**
 * Seed score for a reputation profile. The only reputation data source today
 * is the local event store; the documented API integration
 * (docs/components/ReputationPage.md → "API Integration (Future)") replaces
 * this seed with a real score. It lives here, next to the shaping helper,
 * rather than inline in a caller.
 */
export const REPUTATION_DEMO_SCORE = 4.5;

/** Scale the documented reputation bands are expressed against. */
const REPUTATION_MAX_SCORE = 5;

/**
 * Shapes persisted reputation events into the page's `Reputation` model.
 *
 * Level is always derived from the score bands (`resolveReputationLevel`)
 * rather than a caller-supplied literal, so score and level cannot disagree.
 * An empty history is still a profile: it renders the documented "partial
 * reputation" state instead of falling back to the empty state.
 */
export function shapeReputationData(history: ReputationEvent[]): Reputation {
  return {
    score: REPUTATION_DEMO_SCORE,
    level: resolveReputationLevel(REPUTATION_DEMO_SCORE, REPUTATION_MAX_SCORE),
    history,
  };
}

export type ReputationPageContentProps = {
  reputationData?: Reputation | null;
  userName?: string;
  /**
   * Route-level status and recovery regions rendered above the profile or
   * empty state, inside the same `<main>` landmark and `SafeBoundary`.
   */
  children?: ReactNode;
};

export function ReputationPageContent({
  reputationData,
  userName = 'User',
  children = null,
}: ReputationPageContentProps) {
  const score = reputationData?.score;
  const hasReputation = typeof score === 'number' && score >= 0;

  return (
    <SafeBoundary>
      {!reputationData || !hasReputation ? (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
          {children}
          <EmptyState
            illustration="reputation"
            title="No reputation yet"
            description="Your reputation will be built as you complete contracts and receive feedback from clients. Start by creating and fulfilling your first contract."
          />
        </main>
      ) : (
        <main className="min-h-screen p-8">
          <h1 className="text-2xl font-bold mb-6">Reputation</h1>
          {children}
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

