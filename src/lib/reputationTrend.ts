import type { ReputationEvent } from '@/components/ReputationProfile';

export type ReputationTrend = 'up' | 'down' | 'stable';

const RECENT_WINDOW_DAYS = 30;
const OLDER_WINDOW_DAYS = 90;

/**
 * Derives a trend direction from reputation history events by comparing the
 * number of events in the last 30 days against the preceding 60-day window
 * (days 31–90 ago). Returns 'stable' when there are no events or the counts
 * are equal.
 */
export function deriveReputationTrend(history: ReputationEvent[]): ReputationTrend {
  if (!history || history.length === 0) return 'stable';

  const now = Date.now();
  const recentCutoff = now - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const olderCutoff = now - OLDER_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  let recentCount = 0;
  let olderCount = 0;

  for (const event of history) {
    const timestamp = Date.parse(event.date);
    if (Number.isNaN(timestamp)) continue;

    if (timestamp >= recentCutoff) {
      recentCount++;
    } else if (timestamp >= olderCutoff) {
      olderCount++;
    }
  }

  if (recentCount > olderCount) return 'up';
  if (recentCount < olderCount) return 'down';
  return 'stable';
}
