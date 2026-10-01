/**
 * Unit tests for `useMilestonesRouteError` (`src/hooks/useMilestonesRouteError.ts`).
 *
 * Covers the state invariants the milestones route boundary relies on:
 * - each distinct failure is reported exactly once, with sanitized metadata
 * - a new failure re-arms recovery and reports again
 * - reset is single-flight (double-clicks cannot overlap) and re-arms after a
 *   cooldown so a persistent failure stays recoverable
 * - a throwing reset degrades gracefully (safe notice + reported, no rethrow)
 * - no error message ever reaches the reported metadata
 *
 * Error objects are declared once per test and reused across renders, mirroring
 * how Next.js hands the boundary a stable error for a given failure.
 */

import { act, renderHook } from '@testing-library/react';
import {
  MILESTONES_RESET_FAILURE_NOTICE,
  MILESTONES_RETRY_COOLDOWN_MS,
  useMilestonesRouteError,
} from '../useMilestonesRouteError';
import { setErrorReporter } from '@/lib/errorReporter';

describe('useMilestonesRouteError', () => {
  afterEach(() => {
    setErrorReporter(null);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('reporting', () => {
    it('reports the initial failure once with sanitized metadata', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const error = new Error('secret-message');
      const reset = jest.fn();

      renderHook(() => useMilestonesRouteError(error, reset, 'digest-1'));

      expect(reporter).toHaveBeenCalledTimes(1);
      expect(reporter).toHaveBeenCalledWith(
        error,
        'Milestones page',
        'error',
        expect.objectContaining({
          code: 'MILESTONES_ROUTE_FAILED',
          name: 'Error',
          digest: 'digest-1',
        }),
      );
      expect(JSON.stringify(reporter.mock.calls[0][3])).not.toContain(
        'secret-message',
      );
    });

    it('does not double-report when the same failure re-renders', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const error = new Error('once');
      const reset = jest.fn();

      const { rerender } = renderHook(() =>
        useMilestonesRouteError(error, reset, 'digest-1'),
      );
      rerender();
      rerender();

      expect(reporter).toHaveBeenCalledTimes(1);
    });

    it('dedupes a fresh error object that carries the same digest', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const reset = jest.fn();

      const { rerender } = renderHook(
        ({ error }: { error: unknown }) =>
          useMilestonesRouteError(error, reset, 'stable-digest'),
        { initialProps: { error: new Error('first instance') } },
      );

      // A new object with the same digest is still the same logical failure.
      rerender({ error: new Error('second instance') });

      expect(reporter).toHaveBeenCalledTimes(1);
    });

    it('reports and re-arms when a new failure arrives', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const reset = jest.fn();
      const first = new Error('first');
      const second = new Error('second');

      const { result, rerender } = renderHook(
        ({ error, digest }: { error: unknown; digest?: unknown }) =>
          useMilestonesRouteError(error, reset, digest),
        { initialProps: { error: first as unknown, digest: 'a' } },
      );

      // Use a retry so the hook is mid-recovery for the first failure.
      act(() => {
        result.current.handleRetry();
      });
      expect(result.current.isRetryDisabled).toBe(true);

      rerender({ error: second, digest: 'b' });

      expect(reporter).toHaveBeenCalledTimes(2);
      // A new failure re-arms recovery.
      expect(result.current.status).toBe('idle');
      expect(result.current.isRetryDisabled).toBe(false);
    });

    it('treats a changed digest as a new failure', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const error = new Error('same instance');
      const reset = jest.fn();

      const { rerender } = renderHook(
        ({ digest }: { digest?: unknown }) =>
          useMilestonesRouteError(error, reset, digest),
        { initialProps: { digest: 'a' as unknown } },
      );

      rerender({ digest: 'b' });

      expect(reporter).toHaveBeenCalledTimes(2);
    });
  });

  describe('single-flight reset', () => {
    it('invokes reset once for repeated synchronous activations', () => {
      const reset = jest.fn();
      const error = new Error('x');
      const { result } = renderHook(() =>
        useMilestonesRouteError(error, reset),
      );

      act(() => {
        result.current.handleRetry();
        result.current.handleRetry();
        result.current.handleRetry();
      });

      expect(reset).toHaveBeenCalledTimes(1);
    });

    it('disables retry while recovering and re-arms after the cooldown', () => {
      jest.useFakeTimers();
      const reset = jest.fn();
      const error = new Error('persistent');
      const { result } = renderHook(() =>
        useMilestonesRouteError(error, reset),
      );

      expect(result.current.isRetryDisabled).toBe(false);

      act(() => {
        result.current.handleRetry();
      });
      expect(result.current.isRetryDisabled).toBe(true);

      act(() => {
        jest.advanceTimersByTime(MILESTONES_RETRY_COOLDOWN_MS);
      });
      expect(result.current.isRetryDisabled).toBe(false);
      expect(result.current.status).toBe('idle');
    });
  });

  describe('reset failure handling', () => {
    it('captures a throwing reset without rethrowing and stays recoverable', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const thrown = new Error('reset exploded');
      const reset = jest.fn(() => {
        throw thrown;
      });
      const error = new Error('original');

      const { result } = renderHook(() =>
        useMilestonesRouteError(error, reset),
      );

      expect(() =>
        act(() => {
          result.current.handleRetry();
        }),
      ).not.toThrow();

      expect(result.current.status).toBe('failed');
      expect(result.current.recoveryNotice).toBe(MILESTONES_RESET_FAILURE_NOTICE);
      expect(result.current.isRetryDisabled).toBe(false);

      // The reset failure is reported with a sanitized, phase-tagged payload.
      expect(reporter).toHaveBeenLastCalledWith(
        thrown,
        'Milestones page',
        'error',
        expect.objectContaining({
          code: 'MILESTONES_ROUTE_FAILED',
          phase: 'reset',
        }),
      );
    });

    it('re-arms immediately after a reset failure so the user can retry', () => {
      const reset = jest.fn(() => {
        throw new Error('nope');
      });
      const error = new Error('original');
      const { result } = renderHook(() =>
        useMilestonesRouteError(error, reset),
      );

      act(() => {
        result.current.handleRetry();
      });
      act(() => {
        result.current.handleRetry();
      });

      expect(reset).toHaveBeenCalledTimes(2);
    });

    it('treats a non-function reset as a handled failure', () => {
      const reporter = jest.fn();
      setErrorReporter(reporter);
      const error = new Error('original');
      const { result } = renderHook(() =>
        useMilestonesRouteError(error, undefined as unknown as () => void),
      );

      expect(() =>
        act(() => {
          result.current.handleRetry();
        }),
      ).not.toThrow();
      expect(result.current.status).toBe('failed');
    });
  });

  describe('resource cleanup', () => {
    it('clears a pending cooldown timer on unmount', () => {
      jest.useFakeTimers();
      const reset = jest.fn();
      const error = new Error('x');
      const { result, unmount } = renderHook(() =>
        useMilestonesRouteError(error, reset),
      );

      act(() => {
        result.current.handleRetry();
      });
      expect(jest.getTimerCount()).toBe(1);

      unmount();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
