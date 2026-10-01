'use client';

/**
 * Recovery + reporting state machine for the milestones route error boundary
 * (`src/app/milestones/error.tsx`).
 *
 * Next.js hands the boundary an `error` and a `reset()` callback. The hook
 * protects the invariants that naive wiring breaks:
 *
 * 1. **Report once per distinct failure.** Reporting runs in an effect keyed on
 *    the error identity/digest, so re-renders with the same failure never emit
 *    duplicate telemetry. A genuinely new failure re-arms recovery and reports
 *    again.
 * 2. **One reset per failure cycle.** `handleRetry` is guarded synchronously, so
 *    double-clicks and rapid repeated activations cannot issue overlapping
 *    resets. A short cooldown keeps the guard in place across event ticks while
 *    still re-arming, so a persistent failure never locks the user out.
 * 3. **A throwing `reset` degrades gracefully.** The call is wrapped; on throw
 *    the boundary stays usable, a safe user-visible notice is shown, and the
 *    failure is reported with sanitized metadata (`phase: 'reset'`) instead of
 *    escalating into a second crash.
 * 4. **No sensitive leakage.** All reported metadata comes from
 *    `buildMilestonesRouteErrorMeta`, which never copies messages or stacks.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from '@/lib/errorReporter';
import { buildMilestonesRouteErrorMeta } from '@/lib/milestonesRouteError';

/** Recovery phases the boundary can be in. */
export type MilestonesRecoveryStatus = 'idle' | 'recovering' | 'failed';

/** Cooldown (ms) that keeps concurrent/repeated retries single-flight. */
export const MILESTONES_RETRY_COOLDOWN_MS = 1000;

/** Safe, generic copy shown when `reset()` itself throws. */
export const MILESTONES_RESET_FAILURE_NOTICE =
  'We couldn’t restart the milestones view. Reload the page to try again.';

export interface MilestonesRouteErrorRecovery {
  /** Current recovery phase. */
  status: MilestonesRecoveryStatus;
  /** True while a reset is in flight/cooldown — the retry affordance is inert. */
  isRetryDisabled: boolean;
  /** Sanitized notice shown when recovery failed, otherwise `null`. */
  recoveryNotice: string | null;
  /** Guarded reset trigger; safe to call repeatedly. */
  handleRetry: () => void;
}

/**
 * @param error  - The failure passed by the route error boundary.
 * @param reset  - Next.js `reset()` callback for the segment.
 * @param digest - Optional Next.js error digest used to distinguish failures.
 */
export function useMilestonesRouteError(
  error: unknown,
  reset: () => void,
  digest?: unknown,
): MilestonesRouteErrorRecovery {
  const [status, setStatus] = useState<MilestonesRecoveryStatus>('idle');
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const hasReportedRef = useRef(false);
  const reportedErrorRef = useRef<unknown>(undefined);
  const reportedDigestRef = useRef<unknown>(undefined);
  const attemptedRef = useRef(false);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCooldown = useCallback(() => {
    if (cooldownRef.current !== null) {
      clearTimeout(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCooldown();
    };
  }, [clearCooldown]);

  // Report each distinct failure exactly once and re-arm recovery for it.
  //
  // A digest (when present) is the strongest failure identity, so a stable
  // digest suppresses duplicate reports even if the boundary hands us a fresh
  // error object. Without a digest we fall back to object identity, which is
  // stable for the error the boundary caught.
  useEffect(() => {
    const sameFailure = hasReportedRef.current
      ? digest !== undefined
        ? reportedDigestRef.current === digest
        : reportedErrorRef.current === error
      : false;

    if (sameFailure) {
      return;
    }

    hasReportedRef.current = true;
    reportedErrorRef.current = error;
    reportedDigestRef.current = digest;
    clearCooldown();
    attemptedRef.current = false;
    setStatus('idle');
    setRecoveryNotice(null);
    reportError(
      error,
      'Milestones page',
      'error',
      buildMilestonesRouteErrorMeta(error, digest),
    );
  }, [error, digest, clearCooldown]);

  const handleRetry = useCallback(() => {
    // Single-flight guard: one reset per failure cycle. This runs synchronously
    // before `reset`, so even two clicks in the same tick cannot overlap.
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    setStatus('recovering');
    setRecoveryNotice(null);

    try {
      reset();
    } catch (resetError) {
      // `reset` threw, so no state transition happened — re-arm immediately so
      // the user can try again, and report the failure without leaking detail.
      attemptedRef.current = false;
      setStatus('failed');
      setRecoveryNotice(MILESTONES_RESET_FAILURE_NOTICE);
      reportError(resetError, 'Milestones page', 'error', {
        ...buildMilestonesRouteErrorMeta(resetError),
        phase: 'reset',
      });
      return;
    }

    // Cooldown keeps the guard effective across event ticks. Re-arm afterwards
    // (if the boundary is still mounted) so a persistent failure stays
    // recoverable rather than locking the retry affordance forever.
    cooldownRef.current = setTimeout(() => {
      cooldownRef.current = null;
      if (!mountedRef.current) return;
      attemptedRef.current = false;
      setStatus((current) => (current === 'recovering' ? 'idle' : current));
    }, MILESTONES_RETRY_COOLDOWN_MS);
  }, [reset]);

  return {
    status,
    isRetryDisabled: status === 'recovering',
    recoveryNotice,
    handleRetry,
  };
}
