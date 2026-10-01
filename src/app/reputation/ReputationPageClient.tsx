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
 * This ensures that users navigating to the reputation page have a predictable
 * focus target, improving accessibility and UX.
 *
 * ## State invariants
 *
 * This component owns a single client-side effect that mutates focus. The
 * invariants below must hold across all renders, re-renders, StrictMode
 * double-invocations, and concurrent navigation events:
 *
 * 1. **No focus theft on unmount**: while this component is mounted, it
 *    may move focus onto its own `<main>`. On unmount it must not leave focus
 *    on a detached node; if the main element still holds focus when the
 *    component unmounts, focus is restored to the previously focused
 *    element when it is still connected to the DOM. This keeps keyboard
 *    navigation deterministic and avoids losing the user's place.
 * 2. **No focus hijacking**: if the user (actively or via another component)
 *    moves focus away from the main element before the deferred focus task
 *    runs, the task must not steal focus back. The effect therefore records
 *    whether it actually assumed focus and only restores when it did.
 * 3. **Idlempotent on re-render**: the effect must run exactly once per
 *    mount. Re-renders with new props must not re-run the focus effect or
 *    clobber the stored previous focus target.
 * 4. **Deterministic cleanup**: timers are always cleared and the active
 *    element is never read from a detached document during SSR or teardown.
 */
export default function ReputationPageClient({
  reputationData,
  userName = 'User',
  focusSelector = DEFAULT_FOCUS_SELECTOR,
  focusDelayMs = DEFAULT_FOCUS_DELAY_MS,
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
  }, [focusSelector, focusDelayMs]);

  return (
    <main ref={mainRef} className="min-h-screen p-8" tabIndex={-1}>
      <ReputationPageContent reputationData={reputationData} userName={userName} />
    </main>
  );
}
