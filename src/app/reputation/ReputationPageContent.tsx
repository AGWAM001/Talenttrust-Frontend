'use client';

import React, { Suspense } from 'react';
import EmptyState from '../../components/EmptyState';
import ReputationProfile from '../../components/ReputationProfile';
import ReputationSummaryCard from '../../components/ReputationSummaryCard';
import SafeBoundary from '../../components/SafeBoundary';
import type { Reputation, ReputationEvent } from '@/types/domain';

export type ReputationPageContentProps = {
  reputationData?: Reputation | null;
  userName?: string;
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
}: ReputationPageContentProps) {
  const normalized = normalizeReputationPageInput(reputationData, userName);
  const safeReputationData = normalized.reputationData;
  const score = safeReputationData?.score;
  const hasReputation = typeof score === 'number' && score >= 0;

  return (
    <SafeBoundary>
      {!safeReputationData || !hasReputation ? (
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
            name={normalized.userName}
            score={score}
            level={safeReputationData.level}
            history={safeReputationData.history}
          />
          <Suspense fallback={null}>
            <ReputationProfile
              name={normalized.userName}
              score={score}
              level={safeReputationData.level}
              history={safeReputationData.history}
            />
          </Suspense>
        </main>
      )}
    </SafeBoundary>
  );
}
