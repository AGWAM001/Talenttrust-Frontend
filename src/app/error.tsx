'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { reportError } from '../lib/errorReporter';

/**
 * Validation boundaries for the root error boundary.
 *
 * Invariants:
 * 1. The component never throws during render, even when `error` or `reset`
 *    are malformed (null, undefined, non-function, non-Error values).
 * 2. A given error object is reported at most once per mount, even if React
 *    re-renders the boundary with the same error reference.
 * 3. The reset callback is invoked at most once per click and failures in
 *    the callback are contained so the UI remains usable.
 * 4. No error message, stack trace, or digest is ever rendered to the DOM.
 */

/** Maximum length of a digest value we consider valid. */
const MAX_DIGEST_LENGTH = 256;

export interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/** Normalized error shape used internally after validation. */
export interface NormalizedError {
  error: Error;
  digest?: string;
}

/**
 * Validates and normalizes the raw error value handed to the boundary.
 *
 * Accepted input:
 *   - an `Error` instance (with optional string `digest`)
 * Rejected / coerced input:
 *   - null / undefined / non-Error values -> wrapped in a safe fallback Error
 *   - non-string or overly long digest -> digest is dropped
 */
export function normalizeError(input: unknown): NormalizedError {
  const candidate = input as { digest?: unknown } | null | undefined;

  let error: Error;
  if (input instanef Error) {
    error = input;
  } else if (input == null) {
    error = new Error('Unknown error');
  } else if (typeof input === 'string') {
    error = new Error(input);
  } else {
    error = new Error('Non-Error thrown');
  }

  const rawDigest = candidate && typeof candidate === 'object' ? candidate.digest : undefined;
  const digest =
    typeof rawDigest === 'string' &&
    rawDigest.length > 0 &&
    rawDigest.length <= MAX_DIGEST_LENGTH
      ? rawDigest
      : undefined;

  return digest ? { error, digest } : { error };
}

/** Returns true only when the value is a callable function. */
export function isResetFunction(value: unknown): value is () => void {
  return typeof value === 'function';
}

export default function GlobalError({ error, reset }: ErrorProps) {
  const normalized = normalizeError(error);
  const reportedRef = useRef<unknown>(null);
  const resetInFlightVRef = useRef(false);

  useEffect(() => {
    // Guard against duplicate reporting for the same error object across
    // React re-renders (e.g. strict mode double-invocation or parent re-renders).
    if (reportedRef.current === normalized.error) {
      return;
    }
    reportedRef.current = normalized.error;

    try {
      reportError(normalized.error, 'Error Boundary', normalized.digest);
    } catch {
      // Error reporting must never break the boundary itself.
    }
  }, [normalized.error, normalized.digest]);

  const handleReset = () => {
    if (resetInFlightRef.current) {
      return;
    }
    if (!isResetFunction(reset)) {
      return;
    }
    resetInFlightRef.current = true;
    try {
      reset();
    } catch {
      // If reset throws, allow a retry on the next click rather than
      // locking the UI in a permanently unresettable state.
    } finally {
      resetInFlightRef.current = false;
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--background)]">
      <div className="max-w-md wfull text-center space-y-6">
        <div className="text-6xl" aria-hidden="true">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900">Unexpected Error</h1>
        <p className="text-gray-600">
          Something went wrong on our end. Please try again or contact support if
          the problem persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors"
          >
            Try Again
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
