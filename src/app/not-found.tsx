'use client';

import { useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { reportError } from '@/lib/errorReporter';
import {
  NO_PATH_REPORT_KEY,
  planNotFoundRecovery,
  sanitizeMissingPath,
} from '@/lib/notFoundRecovery';

const quickLinks = [
  {
    href: '/contracts',
    label: 'View Contracts',
    description: 'Pick up where you left off',
  },
  {
    href: '/milestones',
    label: 'Track Milestones',
    description: 'See your project checkpoints',
  },
  {
    href: '/reputation',
    label: 'My Reputation',
    description: 'Check your work history',
  },
];

export default function NotFound() {
  const pathname = usePathname();
  const router = useRouter();

  // Deterministically sanitize the untrusted path: only a safe, rooted,
  // query-free path is ever shown or logged. `null` yields a stable fallback.
  const displayPath = sanitizeMissingPath(pathname);

  // De-duplication guard keyed on the sanitized path. React StrictMode
  // double-invokes effects and transient re-renders must not spam the reporter,
  // but a genuinely different missing route (different key) is still reported.
  const reportKey = displayPath ?? NO_PATH_REPORT_KEY;
  const reportedRef = useRef<string | null>(null);

  useEffect(() => {
    if (reportedRef.current === reportKey) {
      return;
    }
    reportedRef.current = reportKey;
    // Level 'warn': a 404 is an expected adverse condition, not a crash. The
    // sanitized path (never the query) keeps this diagnosable without leaking
    // session tokens or other secrets that live in the URL.
    reportError(new Error('Route not found'), 'not-found', 'warn', {
      path: displayPath ?? 'unknown',
    });
  }, [reportKey, displayPath]);

  const handleGoBack = useCallback(() => {
    // Decide at click time so the behaviour tracks the live history depth
    // rather than a possibly stale render-time snapshot.
    const action = planNotFoundRecovery(window.history.length);
    if (action === 'back') {
      // Return to the previous document; the app router restores it without a
      // full reload, preserving in-memory state.
      window.history.back();
    } else {
      // No history to return to: client-side navigation to the root keeps
      // persisted data and in-memory state intact (no hard reload).
      router.push('/');
    }
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--background)]">
      <div className="max-w-md w-full text-center space-y-8">
        <div aria-hidden="true" className="text-6xl font-bold text-gray-200">
          404
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
          <p className="text-gray-600">
            This page doesn&apos;t exist or the link may have expired. Here are
            a few places to get back on track.
          </p>
          {displayPath !== null ? (
            <p className="text-sm text-gray-500">
              We couldn&apos;t find{' '}
              <code className="px-1 py-0.5 rounded bg-gray-100 text-gray-700 break-all">
                {displayPath}
              </code>
              .
            </p>
          ) : (
            <p className="text-sm text-gray-500">
              We couldn&apos;t identify the page you were looking for.
            </p>
          )}
        </div>

        <nav aria-label="Quick links">
          <h2 className="sr-only">Where would you like to go?</h2>
          <ul className="flex flex-col gap-3">
            {quickLinks.map(({ href, label, description }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex flex-col items-center sm:flex-row sm:items-center gap-1 sm:gap-3 px-5 py-3 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                >
                  <span className="font-medium text-gray-900">{label}</span>
                  <span className="hidden sm:inline text-gray-400">—</span>
                  <span className="text-sm text-gray-500">{description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={handleGoBack}
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            Go Back
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            Go Home
          </Link>
          <a
            href="mailto:support@talenttrust.io"
            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            Contact Support
          </a>
        </div>
      </div>
    </main>
  );
}
