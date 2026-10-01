'use client';

import Link from 'next/link';
import { useMilestonesRouteError } from '@/hooks/useMilestonesRouteError';

type MilestonesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error boundary for the `/milestones` segment.
 *
 * Invariants owned here (and enforced by `useMilestonesRouteError`):
 * - Each distinct failure is reported exactly once, with sanitized metadata.
 * - `reset` is single-flight: repeated/clashing retries cannot issue overlapping
 *   resets, and the retry affordance re-arms so a persistent failure stays
 *   recoverable.
 * - A throwing `reset` degrades to a safe, user-visible notice instead of
 *   crashing the boundary a second time.
 * - The UI never renders the error message, stack, or digest.
 */
export default function MilestonesError({ error, reset }: MilestonesErrorProps) {
  // `error` is typed as an Error, but a boundary must survive anything at
  // runtime — reading `.digest` off a non-object would otherwise re-crash it.
  const digest = (error as { digest?: unknown } | null | undefined)?.digest;
  const { isRetryDisabled, recoveryNotice, handleRetry } = useMilestonesRouteError(
    error,
    reset,
    digest,
  );

  const handleReset = () => {
    if (isPending) return;
    startTransition(() => {
      reset();
    });
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
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            data-testid="milestones-error-retry"
            onClick={handleRetry}
            aria-disabled={isRetryDisabled}
            aria-describedby={
              recoveryNotice ? 'milestones-error-recovery-notice' : undefined
            }
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
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
