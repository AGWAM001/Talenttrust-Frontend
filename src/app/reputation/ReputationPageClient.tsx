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

  useEffect(() => {
    // Store the previously focused element when the page mounts
    previousFocusRef.current = document.activeElement instanceof HTMLElement 
      ? document.activeElement 
      : null;

    // Focus the main content area after a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      const main = document.querySelector('main') || mainRef.current;
      if (main) {
        main.focus();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      // Note: Focus restoration is handled by RouteAnnouncer on navigation away
    };
  }, []);

  return (
    <main ref={mainRef} className="min-h-screen p-8" tabIndex={-1}>
      <ReputationPageContent reputationData={reputationData} userName={userName} />
    </main>
  );
}
