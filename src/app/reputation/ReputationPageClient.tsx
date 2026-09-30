'use client';

import { useEffect, useRef } from 'react';
import { ReputationPageContent } from './ReputationPageContent';
import type { Reputation } from '@/types/domain';

export type ReputationPageClientProps = {
  reputationData?: Reputation | null;
  userName?: string;
};

/**
 * Client wrapper for the reputation page that manages focus on mount.
 * 
 * When the reputation page is navigated to, this component:
 * 1. Stores the previously focused element (for potential restoration)
 * 2. Focuses the main content area for keyboard and screen-reader users
 * 
 * This ensures that users navigating to the reputation page have a predictable
 * focus target, improving accessibility and UX.
 */
export default function ReputationPageClient({
  reputationData,
  userName = 'User',
}: ReputationPageClientProps) {
  const mainRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRequestIdRef = useRef(0);

  useEffect(() => {
    // Store the previously focused element when the page mounts. This value is
    // intentionally kept as a ref so a stale timer cannot race with a later
    // mount or re-render and restore focus to the wrong target.
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Only the latest focus request should be allowed to complete. StrictMode
    // double-invocation and rapid re-renders can otherwise queue multiple timers
    // that race each other over the same page instance.
    const requestId = ++focusRequestIdRef.current;

    if (focusTimerRef.current !== null) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    focusTimerRef.current = setTimeout(() => {
      if (requestId !== focusRequestIdRef.current) {
        return;
      }

      const main = document.querySelector('main') || mainRef.current;
      if (main && document.activeElement !== main) {
        main.focus();
      }

      focusTimerRef.current = null;
    }, 100);

    return () => {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      // Note: Focus restoration is handled by RouteAnnouncer on navigation away.
    };
  }, []);

  return (
    <main ref={mainRef} className="min-h-screen p-8" tabIndex={-1}>
      <ReputationPageContent reputationData={reputationData} userName={userName} />
    </main>
  );
}
