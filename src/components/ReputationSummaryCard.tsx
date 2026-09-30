'use client';

import React, { useCallback } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { execCommandFallback } from '@/lib/clipboardFallback';
import { deriveReputationTrend } from '@/lib/reputationTrend';
import { useToast } from '@/components/toast/toast-provider';
import type { ReputationEvent } from '@/components/ReputationProfile';

export type ReputationSummaryCardProps = {
  name: string;
  score?: number | null;
  level?: string;
  history?: ReputationEvent[];
  maxScore?: number;
};

export function ResolveReputationTrend(history: ReputationEvent[]) {
  return deriveReputationTrend(history);
}

function CopyLinkButton() {
  const { showSuccess, showError } = useToast();

  const { copied, copy } = useCopyToClipboard({
    onSuccess: () => {
      showSuccess({ title: 'Reputation summary link copied to clipboard.' });
    },
    onError: () => {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const success = execCommandFallback(url);
      if (success) {
        showSuccess({ title: 'Reputation summary link copied to clipboard.' });
      } else {
        showError({ title: 'Failed to copy the link. Please copy the URL manually.' });
      }
    },
  });

  const handleCopy = useCallback(() => {
    if (typeof window !== 'undefined') {
      copy(window.location.href);
    }
  }, [copy]);

  return (
    <button
      type="button"
      aria-label="Copy reputation summary link to clipboard"
      aria-pressed={copied}
      data-testid="copy-summary-link-btn"
      title="Copy shareable link"
      onClick={handleCopy}
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500',
        copied
          ? 'bg-green-50 border-green-400 text-green-700'
          : 'bg-[var(--card)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]',
      ].join(' ')}
    >
      {copied ? (
        <>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Link copied
        </>
      ) : (
        <>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 8.5a3.5 3.5 0 0 1 0-4.95l1.41-1.41a3.5 3.5 0 0 1 4.95 4.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.5 5.5a3.5 3.5 0 0 1 0 4.95l-1.41 1.41a3.5 3.5 0 0 1-4.95-4.95" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}

const TREND_LABELS: Record<string, string> = {
  up: 'Trending up',
  down: 'Trending down',
  stable: 'Stable',
};

const TREND_ARROWS: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

export default function ReputationSummaryCard({
  name,
  score,
  level,
  history = [],
  maxScore = 5,
}: ReputationSummaryCardProps) {
  const hasReputation = typeof score === 'number' && score >= 0;
  const trend = ResolveReputationTrend(history);
  const resolvedLevel = level !== undefined ? level : 'Community Member';

  return (
    <section
      className="w-full max-w-5xl mx-auto px-4 pt-8 sm:px-6 lg:px-8"
      aria-labelledby="summary-card-heading"
    >
      <div className="rounded-3xl border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <h2 className="sr-only" id="summary-card-heading">
          Shareable reputation summary for {name}
        </h2>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-sm font-semibold text-[var(--background)]"
              aria-hidden="true"
            >
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-[var(--foreground)] truncate">
                {name}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {hasReputation ? (
                  <>
                    Score{' '}
                    <span
                      role="meter"
                      aria-valuenow={score as number}
                      aria-valuemin={0}
                      aria-valuemax={maxScore}
                      aria-label={`Reputation score ${score} out of ${maxScore}`}
                      className="font-semibold text-[var(--foreground)]"
                    >
                      {score}
                    </span>
                    {` / ${maxScore}`}
                  </>
                ) : (
                  'No reputation yet'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasReputation && (
              <>
                <span
                  className="rounded-xl bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--foreground)]"
                  data-testid="summary-level"
                >
                  {resolvedLevel}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)]"
                  data-testid="summary-trend"
                  aria-label={`Reputation trend: ${TREND_LABELS[trend]}`}
                >
                  {TREND_ARROWS[trend]} {TREND_LABELS[trend]}
                </span>
              </>
            )}
            <CopyLinkButton />
          </div>
        </div>
      </div>
    </section>
  );
}
