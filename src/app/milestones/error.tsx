'use client';

import { useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/errorReporter';

type MilestonesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function MilestonesError({ error, reset }: MilestonesErrorProps) {
  const [isPending, startTransition] = useTransition();
  const reportedErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (reportedErrorRef.current !== error) {
      reportError(error, 'Milestones page');
      reportedErrorRef.current = error;
    }
  }, [error]);

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
            onClick={handleReset}
            disabled={isPending}
            aria-disabled={isPending}
            className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
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
      </section>
    </main>
  );
}
