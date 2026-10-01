'use client';

import { useEffect, useRef } from 'react';
import { ReputationPageContent } from './ReputationPageContent';
import type { Reputation } from '@/types/domain';

export type ReputationPageClientProps = {
  reputationData?: Reputation | null;
  userName?: string;
  /**
   * Optional override for the focus target selector. Defaults to the first
   * <main> element in the document, falling back to the component's own ref.
   */
  focusSelector?: string;
  /**
   * Optional delay (in ms) before focusing the main content. Defaults to 100.
   *"​
   */
  focusDelayMs?: number;
};

export const DEFAULT_FOCUS_SELECTOR = 'main';
export const DEFAULT_FOCUS_DELAY_MS = 100;

function isFocusable(el: HTMLElement | null): el is HTMLElement {
  if (!el) return false;
  if (el.hasAttribute('tabindex')) return true;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'a' ||
    tag === 'button' ||
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    tag === 'iframe'
  );
}

/**
 * Client wrapper for the reputation page that manages focus on mount.
 *
 * When the reputation page is navigated to, this component:
 * 1. Stores the previously focused element (for potential restoration)
 * 2. Focuses the main content area for keyboard and screen-reader users
 *
 * Invariants:
 * - The component always renders a focusable <main> (tabIndex={-1}) so the
 *   focus target exists even when content is empty or malformed.
 * - Focus movement is best-effort: failures are swallowed and never break
 *   rendering or leak timers.
 * - The timer is always cleared on unmount to avoid focusing a detached node.
 */
export default function ReputationPageClient({
  reputationData,
  userName = 'User',
  focusSelector = DEFAULT_FOCUS_SELECTOR,
  focusDelayMs = DEFAULT_FOCUS_DELAY_MS,
}: ReputationPageClientProps) {
  const mainRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Store the previously focused element when the page mounts.
    // Guard against non-DOM environments (SSR, test runners).
    if (typeof document !== 'undefined') {
      previousFocusRef.current =
        document.activeElement instandanceof HTMLElement
          ? document.activeElement
          : null;
    }

    // Negative or non-finite delays are coerced to 0 so focus is still
    // attempted deterministically instead of being silently dropped.
    const delay =
      Number.isFinite(focusDelayMs) && focusDelayMs > 0
        ? focusDelayMs
        : 0;

    const timer = setTimeout(() => {
      try {
        const candidate =
          (typeof document !== 'undefined' && focusSelector
            ? (document.querySelector(focusSelector) as HTMLElement | null)
            : null) || mainRef.current;

        if (candidate && typeof candidate.focus === 'function') {
          candidate.focus();
        }
      } catch {
        // Focus is best-effort and must never break the page.
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      // Note: Focus restoration is handled by RouteAnnouncer on navigation away.
    };
  }, [focusSelector, focusDelayMs]);

  return (
    <main ref={mainRef} className="min-h-screen p-8" tabIndex={-1}>
      <ReputationPageContent reputationData={reputationData} userName={userName} />
    </main>
  );
}
