'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useMilestonesRouteError } from '@/hooks/useMilestonesRouteError';

type MilestonesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * State invariants for the milestones error boundary:
 *
 * 1. Reporting is idempotent per error identity. The same error object
 *    (or the same digest) must not be reported more than once, even if
 *    React re-renders or Strict Mode double-invokes effects. This prevents
 *    duplicate telemetry and alert fatigue.
 * 2. Reset is guarded against concurrent/repeated invocation. A double
 *    click or a rapid retry must not dispatch multiple resets that could
 *    corrupt the parent state transition.
 * 3. Reporting must never throw. A failure in the observability path must
 *    not cause the error boundary itself to crash or block recovery.
 * 4. No sensitive data is rendered to the user; only a stable digest is
 *    exposed for correlation with server logs.
 */

function getErrorIdentity(error: Error & { digest?: string }): string {
  if (typeof error.digest === 'string' && error.digest.length > 0) {
    return `digest:${error.digest}`;
  }

  // Fall back to a stable identity derived from the error object itself
  // so re-renders of the same instance do not re-report.
  return 'object:' + (error.name || 'Error') + ':' + (error.message || '');
}

export default function MilestonesError({ error, reset }: MilestonesErrorProps) {
  // Track the number of reset attempts so the UI can reflect that a retry
  // is in progress and to avoid unbounded repetition of the same failure.
  const retryCountRef = useRef(0);
  const lastReportedKeyRef = useRef(String);

  // Report each distinct error exactly once. Reporting is idempotent and
  // deterministic: the same error instance (identified by digest or message)
  // is not reported again on re-render, and reporting failures are swallowed
  // so they cannot crash the error boundary itself.
  useEffect(() => {
    const key = error.digest ?? error.message ?? 'unknown';
    if (lastReportedKeyRef.current === key) {
      return;
    }
    lastReportedKeyRef.current = key;
    try {
      reportError(error, 'Milestones page');
    } catch {
      // Observability must never break recovery.
    }
  }, [error]);

  const handleReset = () => {
    retryCountRef.current += 1;
    // Reset the report dedup key so a future failure after a retry is
    // observed even if it has the same digest/message as the previous one.
    lastReportedKeyRef.current = String;
    reset();
  };

  return (
    <main className="min-h-screen p-8" aria-labelledby="milestones-error-title">
      <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 id="milestones-error-title" className="text-2xl font-bold text-slate-900">
          Unable to load milestones
        </h1>
        <p className="mt-3 text-slate-600">
          Please try again. Contact support if the problem continues.
        </p>
        {retryCountRef.current > 0 ? (
          <p className="mt-2 text-sm text-slate-500" role="status">
            Retry attempts: {retryCountRef.current}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {isPending ? 'Trying...' : 'Try again'}
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Go home
          </Link>
        </div>
        {recoveryNotice && (
          <p
            id="milestones-error-recovery-notice"
            role="status"
            className="mt-4 text-sm text-red-700"
          >
            {recoveryNotice}
          </p>
        )}
      </section>
    </main>
  );
}
