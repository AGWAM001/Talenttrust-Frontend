'use client';

import { useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { reportError } from '../lib/errorReporter';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
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
          <div className="text-6xl">🚨</div>
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
