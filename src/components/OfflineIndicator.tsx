'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  /** Whether the displayed data is from cache (stale). */
  isStale?: boolean;
  /** When the data was cached (ISO string). */
  cachedAt?: string;
}

/**
 * Visual indicator showing offline status and data staleness.
 *
 * Displays a warning banner when:
 * - The user is offline
 * - The data being viewed is from cache (stale)
 *
 * Provides clear feedback about data freshness and network state.
 */
export function OfflineIndicator({ isStale = false, cachedAt }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline && !isStale) {
    return null; // Don't show anything when online with fresh data
  }

  const getBackgroundColor = () => {
    if (!isOnline) return 'bg-amber-50 border-amber-200';
    if (isStale) return 'bg-yellow-50 border-yellow-200';
    return 'bg-slate-50 border-slate-200';
  };

  const getIconColor = () => {
    if (!isOnline) return 'text-amber-600';
    if (isStale) return 'text-yellow-600';
    return 'text-slate-600';
  };

  const getTextColor = () => {
    if (!isOnline) return 'text-amber-900';
    if (isStale) return 'text-yellow-900';
    return 'text-slate-900';
  };

  const getMessage = () => {
    if (!isOnline) {
      return 'You are offline. Showing previously loaded data.';
    }
    if (isStale) {
      return 'This data may be outdated. Last updated recently.';
    }
    return '';
  };

  const formatCachedTime = () => {
    if (!cachedAt) return null;
    const date = new Date(cachedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const backgroundColor = getBackgroundColor();
  const iconColor = getIconColor();
  const textColor = getTextColor();
  const message = getMessage();
  const cachedTime = formatCachedTime();

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${backgroundColor}`}
      role="status"
      aria-live="polite"
      aria-label={isOnline ? 'Data may be outdated' : 'You are offline'}
    >
      <div className="flex items-center gap-3">
        <svg
          className={`h-5 w-5 flex-shrink-0 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          {!isOnline ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          )}
        </svg>
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{message}</p>
          {cachedTime && (
            <p className={`text-xs ${textColor} opacity-75 mt-0.5`}>
              Cached {cachedTime}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OfflineIndicator;
