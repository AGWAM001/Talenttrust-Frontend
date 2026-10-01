'use client';

import React, { Component, type ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';

export interface SettingsErrorBoundaryProps {
  children: ReactNode;
  /**
   * Optional custom fallback. When provided it replaces the built-in
   * accessible fallback entirely — the consumer is responsible for rendering
   * a retry affordance if desired.
   */
  fallback?: ReactNode;
  /**
   * Optional callback fired after an error is caught, in addition to the
   * internal `reportError` call. Useful for testing or custom instrumentation.
   */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * SettingsErrorBoundary
 *
 * An error boundary scoped to the settings panel section. When a descendant
 * throws during render, the boundary:
 *   1. Reports the error via `reportError` (the existing error-reporter seam).
 *   2. Renders an accessible fallback UI with a visible "Retry" button.
 *   3. Resets its own state on retry so the settings section re-mounts.
 *
 * Accessibility:
 *   - The fallback container uses `role="alert"` so assistive-technology users
 *     are immediately informed that the section failed.
 *   - The "Retry" button receives focus automatically (via `autoFocus`)
 *     when the fallback renders, providing a clear keyboard entry point.
 *   - All interactive elements meet WCAG 2.4.7 focus-visible requirements.
 */
export default class SettingsErrorBoundary extends Component<
  SettingsErrorBoundaryProps,
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    reportError(error, 'SettingsErrorBoundary', 'error', {
      componentStack: info.componentStack ?? undefined,
    });
    this.props.onError?.(error, info);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-sm"
      >
        <p className="text-base font-semibold text-red-800">
          The settings section couldn&rsquo;t load.
        </p>

        {error?.message && (
          <p
            className="mt-1 text-sm text-red-600"
            data-testid="settings-error-message"
          >
            {error.message}
          </p>
        )}

        <p className="mt-2 text-sm text-red-700">
          This is likely a temporary issue. Use the button below to try again.
        </p>

        <button
          type="button"
          autoFocus
          onClick={this.handleRetry}
          className={[
            'mt-4 inline-flex items-center gap-2 rounded-xl',
            'bg-red-700 px-4 py-2 text-sm font-semibold text-white',
            'transition hover:bg-red-800',
            'focus-visible:outline focus-visible:outline-4',
            'focus-visible:outline-offset-2 focus-visible:outline-red-600',
          ].join(' ')}
        >
          Retry
        </button>
      </div>
    );
  }
}
