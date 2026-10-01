'use client';

/**
 * ContractsLoadingBoundary
 *
 * Failure-recovery shell for the `/contracts` Suspense fallback (issue #1166).
 *
 * `loading.tsx` is what a user stares at while the contracts route streams in.
 * Two things can go wrong in that window, and the fallback has to give a
 * deterministic answer for both instead of becoming a dead end:
 *
 *   1. The stream stalls — the page never resolves. Without help the user is
 *      left watching an infinite shimmer with no recourse, which is an
 *      unrecoverable experience even though nothing has actually failed.
 *   2. The fallback subtree itself throws (a bad render, a hydration/stream
 *      error, a future edit to the skeleton). Unhandled, this takes down the
 *      whole route; handled, it degrades into a contained, retryable state.
 *
 * State model (see `phase` below). The transition table is exhaustive:
 *
 *   pending ──(render throws)──▶ failed
 *   pending ──(stall timeout)──▶ pending + stalled notice
 *   failed  ──("Try again")───▶ pending (attempt + 1, subtree remounted)
 *   failed  ──(retry cap hit)──▶ failed, "Reload page" replaces "Try again"
 *
 * Invariants (each is asserted by __tests__/loading.test.tsx):
 *
 *   I1 – No data loss. The boundary never reads, writes, or clears persisted
 *        storage (`talenttrust_app_data`) and never remounts anything above
 *        itself, so contracts, milestones, wallet items and preferences
 *        survive a failure/retry cycle untouched. Recovery is re-read only.
 *   I2 – Retry is idempotent and re-entrancy safe. `handleRetry` is a state
 *        updater keyed on the *previous* state, so N concurrent activations
 *        produce at most one transition: the first flips `phase` to pending
 *        and every later call observes a non-failed phase and no-ops. The
 *        attempt counter can therefore never skip or double-increment.
 *   I3 – Retries are bounded. After {@link MAX_IN_BOUNDARY_RETRIES} in-session
 *        attempts the retry affordance is replaced by a hard page reload. A
 *        subtree that fails on every render cannot spin forever, and the only
 *        remaining recovery is one that discards all React state.
 *   I4 – No sensitive data in the DOM or the report. Error messages, stacks and
 *        component stacks are never rendered; the report carries a stable code,
 *        the attempt number and the component stack only.
 *   I5 – Escalation is never a false failure. A stall is reported at `warn`
 *        level and keeps the skeleton visible, because the pending render may
 *        still succeed. Only a thrown error produces the `role="alert"` state.
 *   I6 – Announcements are singular. Exactly one polite live region exists at
 *        a time, so a stall does not double-announce on top of the loading
 *        message; the failure state replaces it with a single `role="alert"`.
 *   I7 – Deterministic output. The pending render contains no `Date`, `Math.
 *        random`, or environment reads, so two renders of the same phase are
 *        byte-identical.
 */

import React, {
  Component,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { reportError } from '@/lib/errorReporter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stable, user-facing code for "the loading fallback subtree threw". */
export const CONTRACTS_LOADING_FAILED_CODE = 'CONTRACTS_LOADING_FAILED' as const;

/** Stable, user-facing code for "the stream outlived the stall budget". */
export const CONTRACTS_LOADING_STALLED_CODE = 'CONTRACTS_LOADING_STALLED' as const;

/**
 * Skeleton rows rendered while the contracts list streams in. Matches the five
 * cards ContractsPage renders for a typical list so the page does not jump.
 */
export const CONTRACTS_LOADING_SKELETON_ROWS = 5;

/**
 * How long the fallback waits before telling the user it is taking longer than
 * expected. Generous enough that a cold start on a slow connection never trips
 * it, short enough that a hung request is not an unrecoverable dead end.
 */
export const DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS = 30_000;

/**
 * Maximum in-session retries (I3). Three attempts is enough to outlast a
 * transient failure; beyond that the user is offered a full reload.
 */
export const MAX_IN_BOUNDARY_RETRIES = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContractsLoadingBoundaryProps {
  /** Skeleton subtree to protect. Purely presentational — no data access. */
  children: ReactNode;
  /**
   * Stall budget in milliseconds. Non-positive or non-finite values disable
   * the watchdog (the fallback then stays pending indefinitely, which is the
   * pre-existing behaviour).
   */
  stallTimeoutMs?: number;
  /**
   * Hard-reload escape hatch. Injectable so tests can assert the call without
   * navigating; defaults to `location.reload()`.
   */
  onHardReload?: () => void;
  /** Fired after a catch, in addition to the internal `reportError` call. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ContractsLoadingBoundaryState {
  /** `pending` = showing the skeleton; `failed` = showing the retry state. */
  phase: 'pending' | 'failed';
}

// ---------------------------------------------------------------------------
// Hard reload
// ---------------------------------------------------------------------------

/**
 * Full-page reload used by the stall and retry-cap affordances.
 *
 * Guarded because the boundary also renders during SSR, where `location` does
 * not exist. `location.reload()` is a navigation the browser does not cancel,
 * which is exactly the point: it is the one recovery that clears every piece of
 * in-memory React state.
 */
function reloadDocument(): void {
  if (typeof window === 'undefined' || typeof window.location?.reload !== 'function') {
    return;
  }
  window.location.reload();
}

// ---------------------------------------------------------------------------
// Stall watchdog
// ---------------------------------------------------------------------------

interface LoadingStallWatchdogProps {
  /** Normalised (clamped, floored) stall budget. `0` disables the watchdog. */
  timeoutMs: number;
  /** Called exactly once per mount, when the budget elapses. */
  onStalled: () => void;
  children: ReactNode;
}

/**
 * Escalates an unresolved stream into a visible, actionable notice.
 *
 * The skeleton stays mounted underneath so the page geometry does not shift
 * while the pending render is still in flight. The timer is cleared on unmount,
 * so a fallback that resolves normally never reports a stall.
 */
function LoadingStallWatchdog({
  timeoutMs,
  onStalled,
  children,
}: LoadingStallWatchdogProps) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!(timeoutMs > 0)) return undefined;

    const timer = setTimeout(() => {
      setStalled(true);
      onStalled();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [timeoutMs, onStalled]);

  return (
    <div aria-busy="true" data-testid="contracts-loading-pending">
      {/* Single polite live region for the whole pending phase (I6). Changing
          its text on escalation is what re-announces the stall to screen
          readers, instead of adding a second live region that would talk over
          the loading message. */}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {stalled
          ? 'Still loading contracts. This is taking longer than expected.'
          : 'Loading contracts…'}
      </span>
      {children}
      {stalled && (
        <div
          data-testid="contracts-loading-stalled"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3"
        >
          <p className="text-sm text-amber-900">
            This is taking longer than expected. You can keep waiting, or reload the page.
          </p>
          <button
            type="button"
            onClick={reloadDocument}
            className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
          >
            Reload page
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boundary
// ---------------------------------------------------------------------------

/**
 * Contains a failure of the `/contracts` loading fallback and keeps recovery
 * deterministic. See the module comment for the state model and invariants.
 */
export default class ContractsLoadingBoundary extends Component<
  ContractsLoadingBoundaryProps,
  ContractsLoadingBoundaryState
> {
  state: ContractsLoadingBoundaryState = { phase: 'pending' };

  /**
   * Count of boundary-driven remounts, held on the instance rather than in
   * state. `getDerivedStateFromError` has no access to the previous state, so
   * keeping the counter here is what stops every catch from resetting the retry
   * budget (which would make I3 unenforced). The boundary instance survives its
   * own caught errors, and a fresh mount legitimately starts a fresh budget.
   *
   * Doubles as the React `key` for the skeleton subtree so a retry always
   * yields a clean mount instead of re-rendering a half-initialised child (the
   * same technique MilestonesErrorBoundary uses for the milestones board).
   */
  private attempts = 0;

  /**
   * Re-entrancy latch for {@link handleRetry}. A click handler can be invoked
   * more than once before React commits (double click, Enter auto-repeat, two
   * programmatic calls in one batch), and `setState` does not update
   * `this.state` until it commits — so without this latch a second call would
   * still observe `phase === 'failed'` and burn a retry budget. Cleared on
   * commit and on the next catch, whichever comes first.
   */
  private retryInFlight = false;

  static getDerivedStateFromError(): ContractsLoadingBoundaryState {
    return { phase: 'failed' };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.retryInFlight = false;
    reportError(error, 'ContractsLoadingBoundary', 'error', {
      code: CONTRACTS_LOADING_FAILED_CODE,
      attempt: this.attempts,
      retriesRemaining: Math.max(0, MAX_IN_BOUNDARY_RETRIES - this.attempts),
    });
    this.props.onError?.(error, info);
  }

  /**
   * Retry handler (I2). Applies at most one transition per failure, and only
   * while the retry budget lasts. `attempts` is incremented outside the state
   * updater on purpose: React re-invokes updater functions in StrictMode, so an
   * updater that mutated the counter would increment it twice.
   */
  handleRetry = (): void => {
    if (this.retryInFlight) return;
    if (this.state.phase !== 'failed') return;
    if (this.attempts >= MAX_IN_BOUNDARY_RETRIES) return;

    this.retryInFlight = true;
    this.attempts += 1;
    this.setState({ phase: 'pending' }, () => {
      this.retryInFlight = false;
    });
  };

  /** Reports a stall exactly once per mount (I5). */
  handleStalled = (): void => {
    reportError(
      new Error('Contracts loading fallback exceeded its stall budget.'),
      'ContractsLoadingBoundary',
      'warn',
      {
        code: CONTRACTS_LOADING_STALLED_CODE,
        attempt: this.attempts,
        stallTimeoutMs: this.props.stallTimeoutMs ?? DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS,
      },
    );
  };

  private readonly handleHardReload = (): void => {
    const { onHardReload } = this.props;
    if (onHardReload) {
      onHardReload();
      return;
    }
    reloadDocument();
  };

  /** True once the retry budget is spent, so only a reload can recover. */
  private get retriesExhausted(): boolean {
    return this.attempts >= MAX_IN_BOUNDARY_RETRIES;
  }

  render(): ReactNode {
    const { phase } = this.state;
    const { children, stallTimeoutMs } = this.props;

    if (phase === 'failed') {
      return this.renderFailure();
    }

    // Negative / non-finite budgets disable the watchdog rather than firing it
    // immediately, so a bad prop degrades to the pre-existing behaviour.
    const parsedTimeout = stallTimeoutMs ?? DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS;
    const budget =
      Number.isFinite(parsedTimeout) && parsedTimeout > 0
        ? Math.floor(parsedTimeout)
        : 0;

    return (
      <LoadingStallWatchdog
        /* Keyed by attempt so every retry remounts the watchdog and its
           subtree from scratch — no reused, half-initialised child state. */
        key={this.attempts}
        timeoutMs={budget}
        onStalled={this.handleStalled}
      >
        {children}
      </LoadingStallWatchdog>
    );
  }

  private renderFailure(): ReactNode {
    const exhausted = this.retriesExhausted;

    return (
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-testid="contracts-loading-failed"
        className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-6"
      >
        <div>
          <h2 className="text-lg font-semibold text-red-900">
            The contracts list couldn&rsquo;t load.
          </h2>
          <p className="mt-2 text-sm text-red-800">
            {exhausted
              ? 'Retrying did not help. Reloading the page rebuilds this view from your saved data.'
              : 'This is usually temporary. Nothing you saved has been lost.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {exhausted ? (
            <button
              type="button"
              autoFocus
              onClick={this.handleHardReload}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-900"
            >
              Reload page
            </button>
          ) : (
            <button
              type="button"
              autoFocus
              onClick={this.handleRetry}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-900"
            >
              Try again
            </button>
          )}

          <Link
            href="/"
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 transition-colors hover:bg-red-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }
}
