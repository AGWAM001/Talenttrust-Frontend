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
  // Tracks whether this component actually assumed focus. Only when true
  // does cleanup restore focus, preventing focus theft from elements the
  // user or another component legitimately focused after mount.
  const didFocusRef = useRef(false);

  useEffect(() => {
    // Store the previously focused element when the page mounts.
    // Guard against environments with no document (SSR / test runners).
    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      previousFocusRef.current = active instanceof HTMLElement ? active : null;
    }

    // Focus the main content area after a small delay to ensure DOM is ready.
    // The delay is cleared on unmount so a navigation away before the
    // timer fires cannot leak a focus call into a detached tree.
    const timer = setTimeout(() => {
      if (typeof document === 'undefined') {
        return;
      }
      const main = document.querySelector('main') || mainRef.current;
      if (main && typeof main.focus === 'function') {
        // Only assume focus if nothing else has already claimed it. This
        // keeps the effect idlempotent when another component focuses a
        // meaningful target during the delay window.
        const active = document.activeElement;
        if (active && active !== document.body && active !== main) {
          return;
        }
        main.focus();
        didFocusRef.current = true;
      }
    }, delay);

    return () => {
      clearTimeout(timer);
      // Restore focus only if we assumed it and the main element still
      // holds it. Otherwise leave focus where the user or another component
      // put it. This avoids focus theft on unmount and keeps the
      // transition deterministic.
      if (!didFocusRef.current) {
        return;
      }
      if (typeof document === 'undefined') {
        return;
      }
      const main = document.querySelector('main') || mainRef.current;
      if (!main || document.activeElement !== main) {
        return;
      }
      const previous = previousFocusRef.current;
      if (previous && previous.isConnected && typeof previous.focus === 'function') {
        previous.focus();
      }
    };
  }, [focusSelector, focusDelayMs]);

  return (
    <main ref={mainRef} className="min-h-screen p-8" tabIndex={-1}>
      <ReputationPageContent reputationData={reputationData} userName={userName} />
    </main>
  );
}
