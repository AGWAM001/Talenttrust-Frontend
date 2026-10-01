'use client';

import React, { Suspense } from 'react';
import EmptyState from '../../components/EmptyState';
import ReputationProfile from '../../components/ReputationProfile';
import ReputationSummaryCard from '../../components/ReputationSummaryCard';
import SafeBoundary from '../../components/SafeBoundary';
import type { Reputation } from '@/types/domain';

/**
 * Public compatibility contract for the reputation page.
 *
 * Invariants (preserved across errors, empty data, and upgrades):
 *  1. The component never throws for invalid or malformed input; it degrades to the
 *     empty state.
 *  2. A reputation is considered "present" only when `score` is a finite, non-negative
 *     number. NaN, Infinity, negative, string, or missing scores are treated as empty.
 *  3. The `userName` prop defaults to `'User'` and non-string values fall back to the
 *     default so downstream components always receive a stable string.
 *  4. The `history` and `level` fields are passed through untouched when the profile
 *     is rendered, so existing callers remain compatible.
 */

export type ReputationPageContentProps = {
  reputationData?: Reputation | null;
  userName?: string;
};

const DEFAULT_USER_NAME = 'User';

/**
 * Returns true only when the score is a finite, non-negative number.
 * This is the single source of truth for the "has reputation" decision.
 */
function hasValidScore(score: unknown): score is number {
  return typeof score === 'number' && Number.isFinite(score) && score >= 0;
}

/**
 * Normalizes the `userName` prop to a non-empty string so downstream components
 * always receive a stable value, even when callers pass null, undefined, or a
 * non-string value at runtime.
 */
function normalizeUserName(userName: unknown): string {
  if (typeof userName !== 'string') {
    return DEFAULT_USER_NAME;
  }
  const trimmed = userName.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_USER_NAME;
}

export function ReputationPageContent({
  reputationData,
  userName,
}: ReputationPageContentProps) {
  const score = reputationData?.score;
  const hasReputation = hasValidScore(score);
  const resolvedUserName = normalizeUserName(userName);

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
            name={resolvedUserName}
            score={score}
            level={reputationData.level}
            history={reputationData.history}
          />
          <Suspense fallback={null}>
            <ReputationProfile
              name={resolvedUserName}
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
