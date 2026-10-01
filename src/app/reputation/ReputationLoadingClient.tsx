'use client';

import { useEffect, useRef } from 'react';
import ReputationLoading from './loading';

/**
 * Client wrapper for the reputation loading state that manages focus on mount.
 *
 * Invariants protected by this component:
 * 1. Focus is moved to the main content area exactly once per mount,
 *    and only when the component is still mounted when the timer fires.
 * 2. The previously focused element is captured before any focus move
 *    so that a caller can restore it if needed.
 * 3. Concurrent or repeated mounts cannot leak timers or double-focus.
 * 4. When the component unmounts before the timer fires, no focus move
 *    is performed and the timer is cleared.
 *
 * This ensures that users navigating to the reputation page during loading
 * have a predictable focus target, improving accessibility and UX.
 */
export default function ReputationLoadingClient() {
  const mainRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Capture the previously focused element before any focus move so that
    // callers can restore it if needed. Guard against non-HTMLElement
    // activeElement values (e.g. document.body in some environments).
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    previousFocusRef.current = active instanceof HTMLElement ? active : null;

    // Focus the main content area after a small delay to ensure DOM is ready.
    // The timer is tracked so that unmounting before it fires cannot cause a
    // focus move on a detached node.
    const timer = setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }
      const main = mainRef.current ?? document.querySelector('main');
      if (main && typeof main.focus === 'function') {
        main.focus();
      }
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      // Note: Focus restoration is handled by RouteAnnouncer on navigation away.
    };
  }, []);

  return (
    <main
      ref={mainRef}
      className="min-h-screen p-8"
      tabIndex={-1}
      aria-busy="true"
    >
      <ReputationLoading />
    </main>
  );
}
