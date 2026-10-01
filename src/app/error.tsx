'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { reportError } from '../lib/errorReporter';

/**
 * Public compatibility interface for Error boundary props.
 * Compatible with Next.js App Router error components and custom callers.
 */
export interface ErrorProps {
  /** The error value caught by the error boundary */
  error: (Error & { digest?: string }) | unknown;
  /** Function to reset the error boundary and re-render the segment */
  reset: () => void;
}

/**
 * Alias interface for callers expecting ErrorBoundaryProps.
 */
export type ErrorBoundaryProps = ErrorProps;

/**
 * Alias interface for callers expecting ErrorComponentProps.
 */
export type ErrorComponentProps = ErrorProps;

/**
 * Segment-level Error Boundary component for Next.js App Router.
 *
 * Invariants:
 * 1. Interface compatibility: Exports ErrorBoundary, GlobalError, ErrorPage and ErrorProps.
 * 2. Information protection: Internal error messages, stacks, or digests are never leaked into the UI.
 * 3. Input determinism: Tolerates valid, invalid (null/undefined/non-Error), and boundary error objects.
 * 4. Concurrency & idempotency: Multiple rapid clicks on "Try Again" cannot trigger concurrent resets.
 * 5. Failure resilience: Synchronous exceptions or Promise rejections within `reset` are caught safely
 *    and forwarded to `reportError`, preventing cascading crashes.
 */
export function ErrorBoundary({ error, reset }: ErrorProps) {
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    reportError(error, 'Error Boundary');
  }, [error]);

  const handleReset = useCallback(() => {
    if (isResetting) {
      return;
    }

    if (typeof reset !== 'function') {
      reportError(
        new TypeError('Error boundary reset handler is not a function'),
        'Error Boundary'
      );
      return;
    }

    try {
      setIsResetting(true);
      const result: unknown = reset();

      if (typeof (result as Promise<unknown>)?.then === 'function') {
        (result as Promise<unknown>)
          .catch((err) => {
            reportError(err, 'Error Boundary Reset');
          })
          .finally(() => {
            setIsResetting(false);
          });
      } else {
        setIsResetting(false);
      }
    } catch (err) {
      setIsResetting(false);
      reportError(err, 'Error Boundary Reset');
    }
  }, [reset, isResetting]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--background)]">
      <div
        role="alert"
        aria-live="assertive"
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="text-6xl" role="img" aria-label="Warning">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Unexpected Error</h1>
        <p className="text-gray-600">
          Something went wrong on our end. Please try again or contact support if
          the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            aria-busy={isResetting}
            className="px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? 'Retrying...' : 'Try Again'}
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
      </div>
    </main>
  );
}

// Preserve backwards compatibility for callers expecting `GlobalError` or `ErrorPage`
export const GlobalError = ErrorBoundary;
export const ErrorPage = ErrorBoundary;
export default ErrorBoundary;
