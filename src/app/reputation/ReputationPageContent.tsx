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

type ReputationPageInput = {
  reputationData: Reputation | null;
  userName: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidReputationEvent(value: unknown): value is ReputationEvent {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    typeof value.type !== 'string' ||
    !value.type.trim() ||
    typeof value.summary !== 'string' ||
    !value.summary.trim() ||
    typeof value.date !== 'string' ||
    !value.date.trim() ||
    Number.isNaN(Date.parse(value.date))
  ) {
    return false;
  }

  return (
    value.version === undefined ||
    (typeof value.version === 'number' &&
      Number.isInteger(value.version) &&
      value.version >= 0)
  );
}

/**
 * Validates untrusted reputation input before it reaches child components.
 * Invalid datasets are rejected as a whole to avoid silently dropping history,
 * while omitted optional fields retain their existing defaults.
 */
export function normalizeReputationPageInput(
  reputationData: Reputation | null | undefined,
  userName: string | undefined,
): ReputationPageInput {
  const safeUserName = typeof userName === 'string' && userName.trim() ? userName : 'User';

  if (!isRecord(reputationData)) {
    return { reputationData: null, userName: safeUserName };
  }

  const score = reputationData.score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return { reputationData: null, userName: safeUserName };
  }

  const rawHistory = reputationData.history;
  if (rawHistory !== undefined && !Array.isArray(rawHistory)) {
    return { reputationData: null, userName: safeUserName };
  }

  const history = rawHistory ?? [];
  const seenIds = new Set<string>();
  for (const event of history) {
    if (!isValidReputationEvent(event) || seenIds.has(event.id)) {
      return { reputationData: null, userName: safeUserName };
    }
    seenIds.add(event.id);
  }

  const level = reputationData.level;
  if (level !== undefined && (typeof level !== 'string' || !level.trim())) {
    return { reputationData: null, userName: safeUserName };
  }

  return {
    reputationData: {
      score,
      level,
      history,
    },
    userName: safeUserName,
  };
}

export function ReputationPageContent({
  reputationData,
  userName = 'User',
  children = null,
}: ReputationPageContentProps) {
  const score = reputationData?.score;
  const hasReputation =
    typeof score === 'number' && Number.isFinite(score) && score >= 0;
  const suppliedMaxScore = reputationData?.maxScore;
  const maxScore =
    typeof suppliedMaxScore === 'number' &&
    Number.isFinite(suppliedMaxScore) &&
    suppliedMaxScore > 0
      ? suppliedMaxScore
      : undefined;

  return (
    <SafeBoundary>
      {!safeReputationData || !hasReputation ? (
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
            name={normalized.userName}
            score={score}
            maxScore={maxScore}
            level={reputationData.level}
            history={reputationData.history}
          />
          <Suspense fallback={null}>
            <ReputationProfile
              name={normalized.userName}
              score={score}
              maxScore={maxScore}
              level={reputationData.level}
              history={reputationData.history}
              lastUpdated={reputationData.lastUpdated}
            />
          </Suspense>
        </main>
      )}
    </SafeBoundary>
  );
}
