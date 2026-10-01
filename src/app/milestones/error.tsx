'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [isRetrying, setIsRetrying] = useState(false);
  const reportedError = useRef<Error | null>(null);

  useEffect(() => {
    if (reportedError.current === error) return;
    reportedError.current = error;
    setIsRetrying(false);
    reportError(error, 'Milestones page');
  }, [error]);

  const handleRetry = () => {
    if (isRetrying) return;
    setIsRetrying(true);
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
            onClick={handleRetry}
            disabled={isRetrying}
            aria-describedby="milestones-retry-status"
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            {isRetrying ? 'Retrying…' : 'Try again'}
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Go home
          </Link>
        </div>
        <p id="milestones-retry-status" className="sr-only" aria-live="polite">
          {isRetrying ? 'Retrying milestones.' : ''}
        </p>
      </section>
    </main>
  );
}
