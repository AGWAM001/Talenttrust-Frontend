'use client';

import React, { Component, type ReactNode } from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/errorReporter';
import ReputationLoading from './loading';

// ---------------------------------------------------------------------------
// Error Codes & Constants
// ---------------------------------------------------------------------------

/** Public error code for render errors caught during reputation loading. */
export const REPUTATION_LOADING_ERROR_CODE = 'REPUTATION_LOADING_FAILED' as const;

/** Public error code when loading exceeds the configured timeout threshold. */
export const REPUTATION_LOADING_TIMEOUT_CODE = 'REPUTATION_LOADING_TIMEOUT' as const;

/** Public error code when a retry operation fails. */
export const REPUTATION_LOADING_RETRY_FAILED_CODE = 'REPUTATION_LOADING_RETRY_FAILED' as const;

/** Public error code when a custom fallback render prop throws. */
export const REPUTATION_LOADING_FALLBACK_FAILED_CODE = 'REPUTATION_LOADING_FALLBACK_FAILED' as const;

/** Default maximum number of retry attempts before entering the exhausted state. */
export const DEFAULT_MAX_RETRIES = 3;

/** Valid state machine statuses for ReputationLoadingClient. */
export type ReputationLoadingStatus = 'loading' | 'error' | 'recovering' | 'exhausted';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReputationLoadingFallbackProps {
  /** Normalized error object, or null. */
  error: Error | null;
  /** Function to trigger a retry. */
  retry: () => void;
  /** Number of retry attempts completed so far. */
  retryCount: number;
  /** Whether the retry limit has been exhausted. */
  isExhausted: boolean;
  /** Whether an asynchronous retry is currently in flight. */
  isRetrying: boolean;
}

export interface ReputationLoadingClientProps {
  /**
   * Optional custom child content to render while in the loading state.
   * Defaults to `<ReputationLoading />`.
   */
  children?: ReactNode;
  /**
   * Optional custom fallback UI. When supplied as a function, receives
   * {@link ReputationLoadingFallbackProps}. When supplied as a ReactNode, replaces
   * the built-in fallback directly.
   */
  fallback?: ReactNode | ((props: ReputationLoadingFallbackProps) => ReactNode);
  /**
   * Accessible heading title displayed in the built-in fallback alert.
   * Defaults to "Unable to load reputation".
   */
  fallbackTitle?: string;
  /**
   * Callback fired whenever an error is encountered (render catch, timeout, or retry error).
   */
  onError?: (error: Error, errorInfo?: React.ErrorInfo) => void;
  /**
   * Callback fired when a retry is initiated. Can be synchronous or return a Promise.
   * While the promise is pending, the component enters the 'recovering' state.
   */
  onRetry?: () => void | Promise<void>;
  /**
   * Callback fired when a retry operation successfully resolves and content is restored.
   */
  onRecover?: () => void;
  /**
   * Maximum allowed retry attempts before entering the exhausted state.
   * Defaults to 3. Must be a non-negative integer.
   */
  maxRetries?: number;
  /**
   * Optional timeout in milliseconds. If loading does not settle within this window,
   * the component transitions deterministically to an error state.
   */
  timeoutMs?: number | null;
  /**
   * Initial error to simulate or propagate an error immediately on mount.
   */
  initialError?: Error | string | null;
  /**
   * Class name for the root `<main>` element.
   * Defaults to "min-h-screen p-8".
   */
  className?: string;
  /**
   * Optional data-testid for the root element.
   */
  'data-testid'?: string;
}

export interface ReputationLoadingClientState {
  status: ReputationLoadingStatus;
  error: Error | null;
  retryCount: number;
  retryKey: number;
  isRetrying: boolean;
}

// ---------------------------------------------------------------------------
// Input Normalization Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes any caught or passed value into an Error instance.
 * Ensures non-Error throws (strings, objects, null, undefined) produce a safe Error.
 */
export default function ReputationLoadingClient() {
  const mainRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusRequestIdRef = useRef(0);

  useEffect(() => {
    // Store the previously focused element when the page mounts. This value is
    // intentionally kept as a ref so a stale timer cannot race with a later
    // mount or re-render and restore focus to the wrong target.
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    // Only the latest focus request is allowed to complete. Repeated renders or
    // React StrictMode double-invocation can schedule multiple timers; each new
    // request invalidates any stale timeout before it can steal focus from the
    // current page state.
    const requestId = ++focusRequestIdRef.current;

    if (focusTimerRef.current !== null) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    focusTimerRef.current = setTimeout(() => {
      if (requestId !== focusRequestIdRef.current) {
        return;
      }

      const main = document.querySelector('main') || mainRef.current;
      if (main && document.activeElement !== main) {
        main.focus();
      }

      focusTimerRef.current = null;
    }, 100);
  }

    return () => {
      if (focusTimerRef.current !== null) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
      // Note: Focus restoration is handled by RouteAnnouncer on navigation away.
    };

    void execute();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private renderFallback(): ReactNode {
    const { fallback, fallbackTitle } = this.props;
    const { error, retryCount, status } = this.state;
    const maxRetries = normalizeMaxRetries(this.props.maxRetries);
    const isExhausted = status === 'exhausted' || retryCount >= maxRetries;
    const isRetrying = this.state.isRetrying || this.isRetryingLock || status === 'recovering';

    if (fallback !== undefined) {
      if (typeof fallback === 'function') {
        try {
          return fallback({
            error,
            retry: this.handleRetry,
            retryCount,
            isExhausted,
            isRetrying,
          });
        } catch (fallbackError) {
          reportError(fallbackError, 'ReputationLoadingClient', 'error', {
            code: REPUTATION_LOADING_FALLBACK_FAILED_CODE,
          });
          // Gracefully fall through to built-in fallback
        }
      } else {
        return fallback;
      }
    }

    const title =
      typeof fallbackTitle === 'string' && fallbackTitle.trim().length > 0
        ? fallbackTitle.trim()
        : 'Unable to load reputation';

    const description = isExhausted
      ? 'Unable to load reputation after multiple attempts. Please return home or contact support if the problem persists.'
      : 'A problem occurred while loading reputation data. You can try again.';

    return (
      <div
        ref={this.alertRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabIndex={-1}
        className="mx-auto my-8 max-w-lg rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-sm sm:p-8"
      >
        <h2 className="text-xl font-bold text-red-900">{title}</h2>
        <p className="mt-2 text-sm text-red-700">{description}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {!isExhausted && (
            <button
              ref={this.retryButtonRef}
              type="button"
              onClick={this.handleRetry}
              disabled={isRetrying}
              className="rounded-xl bg-red-700 px-4 py-2 font-semibold text-white transition hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRetrying ? 'Retrying…' : 'Try again'}
            </button>
          )}
          <Link
            href="/"
            className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { status, retryKey } = this.state;
    const maxRetries = normalizeMaxRetries(this.props.maxRetries);
    const isExhausted = status === 'exhausted' || this.state.retryCount >= maxRetries;
    const isRecovering = status === 'recovering';
    const hasError = status === 'error' || isExhausted;
    const shouldShowFallback = hasError || isRecovering;
    const isBusy = status === 'loading' || isRecovering;

    const childContent =
      this.props.children !== undefined ? (
        this.props.children
      ) : (
        <ReputationLoading />
      );

    return (
      <main
        ref={this.mainRef}
        className={this.props.className ?? 'min-h-screen p-8'}
        tabIndex={-1}
        aria-busy={isBusy ? 'true' : 'false'}
        data-testid={this.props['data-testid']}
      >
        {shouldShowFallback ? (
          this.renderFallback()
        ) : (
          <React.Fragment key={retryKey}>{childContent}</React.Fragment>
        )}
      </main>
    );
  }
}
