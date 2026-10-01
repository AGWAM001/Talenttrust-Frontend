/**
 * Failure-recovery coverage for the `/contracts` Suspense fallback (#1166).
 *
 * Focuses on the adverse paths the fallback owns:
 *   - stalled stream  → bounded, announced escalation (never a false failure)
 *   - throwing subtree → contained alert, reported, no internals leaked
 *   - retry           → deterministic, bounded, re-entrancy safe
 *   - recovery        → skeleton returns, persisted data untouched
 *
 * The public entry point (`loading.tsx`) is exercised alongside the boundary so
 * the route-level fallback and the shared skeleton cannot drift apart.
 */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import ContractsLoading from '../loading';
import ContractsLoadingBoundary, {
  CONTRACTS_LOADING_FAILED_CODE,
  CONTRACTS_LOADING_STALLED_CODE,
  CONTRACTS_LOADING_SKELETON_ROWS,
  DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS,
  MAX_IN_BOUNDARY_RETRIES,
} from '../ContractsLoadingBoundary';
import { setErrorReporter } from '@/lib/errorReporter';
import { STORAGE_KEY as REPOSITORY_STORAGE_KEY } from '@/lib/repository';

const STALL_MS = 1_000;

/** A skeleton stand-in that can be made to fail on demand. */
let shouldThrow = false;
const Probe = () => {
  if (shouldThrow) throw new Error('skeleton exploded: user=alice@example.com');
  return <div data-testid="skeleton-probe">skeleton</div>;
};

const renderBoundary = (props: Partial<React.ComponentProps<typeof ContractsLoadingBoundary>> = {}) =>
  render(
    <ContractsLoadingBoundary stallTimeoutMs={STALL_MS} {...props}>
      <Probe />
    </ContractsLoadingBoundary>,
  );

/** Reports filtered to one code, so a test can assert on stalls independently of failures. */
const reportsWithCode = (reporter: jest.Mock, code: string) =>
  reporter.mock.calls.filter((call) => (call[3] as { code?: string } | undefined)?.code === code);

beforeEach(() => {
  shouldThrow = false;
  jest.useFakeTimers();
  setErrorReporter(null);
  window.localStorage.clear();
  // Expected throws and stalls would otherwise flood the test output.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  // Some suites in this file switch to real timers (axe-core needs them), so
  // only flush the queue when fake timers are still installed.
  if (jest.isMockFunction(global.setTimeout)) {
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }
  jest.useRealTimers();
  setErrorReporter(null);
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------

describe('contracts loading – normal operation', () => {
  it('renders the shared skeleton with the documented row count', () => {
    const { container } = render(<ContractsLoading />);

    expect(screen.getByTestId('contracts-skeleton')).toBeInTheDocument();
    const list = container.querySelector('ul[aria-label="Loading contract list"]');
    expect(list!.querySelectorAll('li')).toHaveLength(CONTRACTS_LOADING_SKELETON_ROWS);
  });

  it('announces the pending state politely and marks the region busy', () => {
    const { container } = render(<ContractsLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading contracts');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('does not emit a second main landmark inside the layout main (regression, #682)', () => {
    const { container } = render(<main id="main-content"><ContractsLoading /></main>);

    expect(container.querySelectorAll('main')).toHaveLength(1);
  });

  it('keeps the public entry point a zero-argument component (regression)', () => {
    expect(typeof ContractsLoading).toBe('function');
    expect(ContractsLoading.length).toBe(0);
  });

  it('renders deterministically – two renders of the pending state are identical (I7)', () => {
    const first = render(<ContractsLoading />).container.innerHTML;
    const second = render(<ContractsLoading />).container.innerHTML;

    expect(second).toBe(first);
  });

  it('has no automated accessibility violations while pending', async () => {
    jest.useRealTimers();
    const { container } = render(<main id="main-content"><ContractsLoading /></main>);

    expect(await axe(container)).toHaveNoViolations();
  });
});

// ---------------------------------------------------------------------------

describe('contracts loading – stalled stream', () => {
  it('does not escalate before the stall budget elapses', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter);
    renderBoundary();

    act(() => {
      jest.advanceTimersByTime(STALL_MS - 1);
    });

    expect(screen.queryByTestId('contracts-loading-stalled')).toBeNull();
    expect(reporter).not.toHaveBeenCalled();
  });

  it('escalates to an actionable notice and re-announces politely', () => {
    renderBoundary();

    act(() => {
      jest.advanceTimersByTime(STALL_MS);
    });

    expect(screen.getByTestId('contracts-loading-stalled')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/taking longer than expected/i);
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('keeps the skeleton mounted so the page does not jump (no false failure)', () => {
    renderBoundary();

    act(() => {
      jest.advanceTimersByTime(STALL_MS);
    });

    expect(screen.getByTestId('skeleton-probe')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports the stall once, at warn level, with a stable code and no user data', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter);
    renderBoundary();

    act(() => {
      jest.advanceTimersByTime(STALL_MS);
    });
    act(() => {
      jest.advanceTimersByTime(STALL_MS * 5);
    });

    expect(reporter).toHaveBeenCalledTimes(1);
    const [error, context, level, meta] = reporter.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(context).toBe('ContractsLoadingBoundary');
    expect(level).toBe('warn');
    expect(meta).toEqual({
      code: CONTRACTS_LOADING_STALLED_CODE,
      attempt: 0,
      stallTimeoutMs: STALL_MS,
    });
    expect(JSON.stringify(meta)).not.toContain('alice');
  });

  it('clears the timer on unmount so a resolved stream never reports a stall', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter);
    const { unmount } = renderBoundary();

    unmount();
    act(() => {
      jest.advanceTimersByTime(STALL_MS * 3);
    });

    expect(reporter).not.toHaveBeenCalled();
  });

  it('treats a non-positive budget as "watchdog disabled" instead of firing at once', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter);
    renderBoundary({ stallTimeoutMs: 0 });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS * 2);
    });

    expect(screen.queryByTestId('contracts-loading-stalled')).toBeNull();
    expect(reporter).not.toHaveBeenCalled();
  });

  it('treats a NaN budget as "watchdog disabled"', () => {
    renderBoundary({ stallTimeoutMs: Number.NaN });

    act(() => {
      jest.advanceTimersByTime(DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS * 2);
    });

    expect(screen.queryByTestId('contracts-loading-stalled')).toBeNull();
  });

  it('uses a finite default budget so a prop-less boundary still recovers', () => {
    expect(DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isFinite(DEFAULT_CONTRACTS_LOADING_STALL_TIMEOUT_MS)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('contracts loading – failing fallback subtree', () => {
  it('renders an assertive alert instead of an empty page', () => {
    shouldThrow = true;
    renderBoundary();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveTextContent(/contracts list couldn’t load/i);
  });

  it('reports the failure once, at error level, with a stable code and no user data', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter);
    shouldThrow = true;
    renderBoundary();

    expect(reporter).toHaveBeenCalledTimes(1);
    const [error, context, level, meta] = reporter.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(context).toBe('ContractsLoadingBoundary');
    expect(level).toBe('error');
    expect(meta).toEqual({
      code: CONTRACTS_LOADING_FAILED_CODE,
      attempt: 0,
      retriesRemaining: MAX_IN_BOUNDARY_RETRIES,
    });
    expect(JSON.stringify(meta)).not.toContain('alice');
  });

  it('never leaks the thrown message into the DOM (I4)', () => {
    shouldThrow = true;
    renderBoundary();

    expect(
      screen.queryByText(/skeleton exploded|alice@example\.com/),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('contracts-loading-failed')).toBeInTheDocument();
  });

  it('forwards the caught error to an onError observer exactly once', () => {
    const onError = jest.fn();
    shouldThrow = true;
    renderBoundary({ onError });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('has no automated accessibility violations in the failure state', async () => {
    jest.useRealTimers();
    shouldThrow = true;
    const { container } = renderBoundary();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers a home link so the user is never trapped (regression)', () => {
    shouldThrow = true;
    renderBoundary();

    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
  });
});

// ---------------------------------------------------------------------------

describe('contracts loading – retry and recovery', () => {
  it('recovers when the subtree succeeds on retry', () => {
    shouldThrow = true;
    const { container } = renderBoundary();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('skeleton-probe')).toBeInTheDocument();
    // A clean mount, not a reused half-initialised subtree.
    expect(container.querySelectorAll('[data-testid="skeleton-probe"]')).toHaveLength(1);
  });

  it('restarts the stall budget after a retry instead of re-reporting immediately', () => {
    const reporter = jest.fn();
    setErrorReporter(reporter);
    shouldThrow = true;
    renderBoundary();

    shouldThrow = false;
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    act(() => {
      jest.advanceTimersByTime(STALL_MS - 1);
    });
    expect(screen.queryByTestId('contracts-loading-stalled')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('contracts-loading-stalled')).toBeInTheDocument();
    // Exactly one stall, from the retried watchdog (the first one never fired).
    expect(reportsWithCode(reporter, CONTRACTS_LOADING_STALLED_CODE)).toHaveLength(1);
  });

  it('applies at most one transition for two concurrent retry activations (I2)', () => {
    const reporter = jest.fn();
    const onError = jest.fn();
    setErrorReporter(reporter);
    shouldThrow = true;
    renderBoundary({ onError });

    shouldThrow = false;
    const retry = screen.getByRole('button', { name: /try again/i });
    act(() => {
      fireEvent.click(retry);
      fireEvent.click(retry);
    });

    expect(screen.getByTestId('skeleton-probe')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);

    // The attempt counter is the discriminator: one remount reports `attempt: 1`.
    // A double-claimed retry would have advanced it to 2 and reported twice.
    act(() => {
      jest.advanceTimersByTime(STALL_MS);
    });
    const stalls = reportsWithCode(reporter, CONTRACTS_LOADING_STALLED_CODE);
    expect(stalls).toHaveLength(1);
    expect(stalls[0][3]).toEqual({
      code: CONTRACTS_LOADING_STALLED_CODE,
      attempt: 1,
      stallTimeoutMs: STALL_MS,
    });
  });

  it('bounds retries and falls back to a hard reload (I3)', () => {
    const reporter = jest.fn();
    const onHardReload = jest.fn();
    setErrorReporter(reporter);
    shouldThrow = true;
    renderBoundary({ onHardReload });

    for (let attempt = 1; attempt <= MAX_IN_BOUNDARY_RETRIES; attempt += 1) {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      });
    }

    // One catch per attempt (the initial one plus one per retry), spent in order.
    const failures = reportsWithCode(reporter, CONTRACTS_LOADING_FAILED_CODE);
    expect(failures.map((call) => (call[3] as { attempt: number }).attempt)).toEqual([0, 1, 2, 3]);
    expect(failures.map((call) => (call[3] as { retriesRemaining: number }).retriesRemaining)).toEqual(
      [3, 2, 1, 0],
    );

    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    const reload = screen.getByRole('button', { name: /reload page/i });
    act(() => {
      fireEvent.click(reload);
    });
    expect(onHardReload).toHaveBeenCalledTimes(1);
  });

  it('tells the user retries were exhausted and that reloading rebuilds from saved data', () => {
    shouldThrow = true;
    renderBoundary();

    for (let attempt = 1; attempt <= MAX_IN_BOUNDARY_RETRIES; attempt += 1) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      });
    }

    expect(screen.getByTestId('contracts-loading-failed')).toHaveTextContent(
      /reloading the page rebuilds this view from your saved data/i,
    );
  });

  it('starts a fresh retry budget on a fresh mount', () => {
    shouldThrow = true;
    const { unmount } = renderBoundary();
    for (let attempt = 1; attempt <= MAX_IN_BOUNDARY_RETRIES; attempt += 1) {
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      });
    }
    unmount();

    renderBoundary();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('leaves persisted storage byte-identical across a failure/stall/retry cycle (I1)', () => {
    const persisted = JSON.stringify({
      contracts: [{ id: 'c-1', contractName: 'Website redesign' }],
      milestones: [],
      walletItems: [],
      reputationEvents: [],
    });
    window.localStorage.setItem(REPOSITORY_STORAGE_KEY, persisted);

    shouldThrow = true;
    renderBoundary();
    act(() => {
      jest.advanceTimersByTime(STALL_MS);
    });
    shouldThrow = false;
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });
    act(() => {
      jest.advanceTimersByTime(STALL_MS);
    });

    // Same key, same bytes: recovery re-reads storage, it never rewrites it.
    expect(window.localStorage.getItem(REPOSITORY_STORAGE_KEY)).toBe(persisted);
    expect(window.localStorage.length).toBe(1);
  });

  it('has no automated accessibility violations in the stalled state', async () => {
    jest.useRealTimers();
    const { container } = renderBoundary({ stallTimeoutMs: 20 });

    expect(await screen.findByTestId('contracts-loading-stalled')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
