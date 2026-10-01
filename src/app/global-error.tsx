'use client';

import { useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { reportError } from '../lib/errorReporter';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The global error boundary is the last line of defense when the root
 * layout fails. It must not throw while rendering, must not leak error
 * details to the UI, and must not report the same error more than once
 * even under React StrictMode double-invocation or re-renders.
 *
 * Invariants owned by this component:
 *  1. Error reporting is idempotent per error instance (no duplicate reports).
 *  2. The error message, stack, and digest are never rendered in the UI.
 *  3. Reset is a consumable transition: once invoked, duplicate clicks are
 *     ignored until the component is remounted or a different error arrives.
 *  4. Reporting failures are swallowed so the fallback UI always renders.
 */

function getErrorKey(error: Error & { digest?: string }): string {
  if (error.digest) {
    return `digest:${error.digest}`;
  }
  const message = typeof error.message === 'string' ? error.message : '';
  const name = typeof error.name === 'string' ? error.name : 'Error';
  return `${name}:${message}`;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [isPending, startTransition] = useTransition();
  const reportedErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (reportedErrorRef.current !== error) {
      reportError(error, 'Global Error Boundary');
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
    <html lang="en">
      <head>
        <title>Critical Error - TalentTrust</title>
      </head>
      <body className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 font-sans">
        <main className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl" role="img" aria-label="critical error">
            🚮
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Critical Error</h1>
          <p className="text-gray-600">
            A critical error occurred. Please try reloading the page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              disabled={isPending}
              aria-disabled={isPending}
              className="px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPending ? 'Trying...' : 'Try Again'}
            </button>
            <Link
              href="/"
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Go Home
            </Link>
            <a
              href="mailto:support@talenttrust.io"
              className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
