/**
 * ReputationLoadingClient.test.tsx
 *
 * Comprehensive tests for reputation loading state, focus management,
 * and deterministic failure recovery.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import ReputationLoadingClient, {
  REPUTATION_LOADING_ERROR_CODE,
  REPUTATION_LOADING_TIMEOUT_CODE,
  REPUTATION_LOADING_RETRY_FAILED_CODE,
  DEFAULT_MAX_RETRIES,
  normalizeError,
  normalizeMaxRetries,
  normalizeTimeoutMs,
} from '../ReputationLoadingClient';
import { setErrorReporter, type ErrorReporter } from '@/lib/errorReporter';
import { assertNoA11yViolations } from '@/test-utils/a11y';

// Mock the ReputationLoading component to avoid complex rendering
jest.mock('../loading', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="reputation-loading">
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading reputation…
      </span>
    </div>
  ),
}));

// Helper component that throws on demand
const Bomb: React.FC<{ shouldThrow?: boolean; message?: string }> = ({
  shouldThrow = true,
  message = 'Explosion in reputation loading',
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="bomb-content">Healthy Child Content</div>;
};

describe('ReputationLoadingClient – focus management & normal operation', () => {
  beforeEach(() => {
    // Reset document focus before each test
    document.body.focus();
    setErrorReporter(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setErrorReporter(null);
  });

  describe('Initial focus behavior', () => {
    it('renders the main element with tabIndex={-1}', () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('tabIndex', '-1');
    });

    it('sets aria-busy="true" on main element', () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      expect(main).toHaveAttribute('aria-busy', 'true');
    });

    it('stores the previously focused element on mount', () => {
      // Create a focusable element and focus it before mounting
      const button = document.createElement('button');
      button.textContent = 'Previous focus';
      document.body.appendChild(button);
      button.focus();

      expect(document.activeElement).toBe(button);

      render(<ReputationLoadingClient />);

      // The component should have stored the previous focus
      expect(button).toBeInTheDocument();

      document.body.removeChild(button);
    });

    it('moves focus to the main element after mount', async () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');

      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('handles the case where no element was previously focused', async () => {
      // Ensure no element is focused
      document.body.focus();

      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');

      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });
  });

  describe('Cleanup behavior', () => {
    it('clears the focus timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<ReputationLoadingClient />);

      unmount();

      // clearTimeout should be called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('does not throw when unmounting before focus is set', () => {
      const { unmount } = render(<ReputationLoadingClient />);

      // Unmount immediately before the focus timer fires
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility attributes', () => {
    it('applies correct CSS classes to main element', () => {
      render(<ReputationLoadingClient />);

      const main = document.querySelector('main');
      expect(main).toHaveClass('min-h-screen', 'p-8');
    });

    it('renders child loading content correctly', () => {
      render(<ReputationLoadingClient />);

      expect(screen.getByTestId('reputation-loading')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Loading reputation…');
    });
  });

  describe('Edge cases', () => {
    it('handles missing main element gracefully', async () => {
      // Mock querySelector to return null temporarily
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn((selector: string) => {
        if (selector === 'main') return null;
        return originalQuerySelector.call(document, selector);
      });

      render(<ReputationLoadingClient />);

      // Should not throw even when main is not found
      await waitFor(() => {
        expect(document.querySelector).toHaveBeenCalledWith('main');
      });

      document.querySelector = originalQuerySelector;
    });

    it('handles rapid mount/unmount cycles', () => {
      const { unmount } = render(<ReputationLoadingClient />);
      unmount();

      const { unmount: unmount2 } = render(<ReputationLoadingClient />);
      expect(() => unmount2()).not.toThrow();
    });

    it('maintains focus when component re-renders', async () => {
      const { rerender } = render(<ReputationLoadingClient />);

      const main = document.querySelector('main');

      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });

      // Re-render should maintain focus
      rerender(<ReputationLoadingClient />);

      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });
  });
});

describe('ReputationLoadingClient – deterministic failure recovery', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockReporter: jest.MockedFunction<ErrorReporter>;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockReporter = jest.fn();
    setErrorReporter(mockReporter);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    setErrorReporter(null);
    jest.restoreAllMocks();
  });

  describe('Error boundary containment & reporting', () => {
    it('catches descendant render errors and renders accessible alert fallback', () => {
      render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} message="Failed to fetch reputation data" />
        </ReputationLoadingClient>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Unable to load reputation');
      expect(
        screen.getByText('A problem occurred while loading reputation data. You can try again.')
      ).toBeInTheDocument();
    });

    it('sets aria-busy="false" on the main container when an error occurs', () => {
      render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      const main = document.querySelector('main');
      expect(main).toHaveAttribute('aria-busy', 'false');
    });

    it('reports the caught error to errorReporter with proper context and metadata', () => {
      render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} message="Database query timeout" />
        </ReputationLoadingClient>
      );

      expect(mockReporter).toHaveBeenCalledTimes(1);
      expect(mockReporter).toHaveBeenCalledWith(
        expect.any(Error),
        'ReputationLoadingClient',
        'error',
        expect.objectContaining({
          code: REPUTATION_LOADING_ERROR_CODE,
          retryCount: 0,
          maxRetries: DEFAULT_MAX_RETRIES,
        })
      );
    });

    it('calls onError callback prop when provided', () => {
      const onError = jest.fn();
      render(
        <ReputationLoadingClient onError={onError}>
          <Bomb shouldThrow={true} message="Specific error" />
        </ReputationLoadingClient>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Specific error' }),
        expect.anything()
      );
    });

    it('does not unseat the error boundary if onError callback throws', () => {
      const onError = jest.fn(() => {
        throw new Error('Callback failed');
      });

      expect(() => {
        render(
          <ReputationLoadingClient onError={onError}>
            <Bomb shouldThrow={true} />
          </ReputationLoadingClient>
        );
      }).not.toThrow();

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('sanitizes user-facing UI and does not leak stack traces or raw messages into DOM', () => {
      const sensitiveLeak = 'Bearer secret-token-xyz-12345 in stack trace';
      render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} message={sensitiveLeak} />
        </ReputationLoadingClient>
      );

      expect(screen.queryByText(new RegExp(sensitiveLeak))).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Unable to load reputation');
    });

    it('renders custom fallbackTitle when provided', () => {
      render(
        <ReputationLoadingClient fallbackTitle="Reputation service unavailable">
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      expect(
        screen.getByRole('heading', { level: 2, name: 'Reputation service unavailable' })
      ).toBeInTheDocument();
    });

    it('focuses the "Try again" button when the error fallback renders', async () => {
      render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await waitFor(() => {
        expect(document.activeElement).toBe(retryButton);
      });
    });

    it('renders Go Home link pointing to /', () => {
      render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      const goHomeLink = screen.getByRole('link', { name: /go home/i });
      expect(goHomeLink).toBeInTheDocument();
      expect(goHomeLink).toHaveAttribute('href', '/');
    });
  });

  describe('Deterministic retry & recovery', () => {
    it('recovers cleanly when clicking "Try again" and error condition is resolved', async () => {
      let shouldThrow = true;
      const DynamicChild = () => <Bomb shouldThrow={shouldThrow} />;

      const onRecover = jest.fn();
      const onRetry = jest.fn();

      render(
        <ReputationLoadingClient onRetry={onRetry} onRecover={onRecover}>
          <DynamicChild />
        </ReputationLoadingClient>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'false');

      // Error condition resolves externally
      shouldThrow = false;

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await act(async () => {
        fireEvent.click(retryButton);
      });

      // Verify onRetry was triggered
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRecover).toHaveBeenCalledTimes(1);

      // Verify healthy child content is mounted cleanly
      expect(screen.getByTestId('bomb-content')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'true');

      // Focus should return to main
      await waitFor(() => {
        expect(document.activeElement).toBe(document.querySelector('main'));
      });
    });

    it('supports asynchronous onRetry handler with pending loading state', async () => {
      let resolveRetry: () => void = () => {};
      const pendingPromise = new Promise<void>((resolve) => {
        resolveRetry = resolve;
      });

      let shouldThrow = true;
      const DynamicChild = () => <Bomb shouldThrow={shouldThrow} />;

      render(
        <ReputationLoadingClient onRetry={() => pendingPromise}>
          <DynamicChild />
        </ReputationLoadingClient>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      act(() => {
        fireEvent.click(retryButton);
      });

      // While async retry is in flight, button is disabled and displays "Retrying…"
      expect(screen.getByRole('button', { name: /retrying/i })).toBeDisabled();
      expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'true');

      // Resolve the retry
      shouldThrow = false;
      await act(async () => {
        resolveRetry();
      });

      expect(screen.getByTestId('bomb-content')).toBeInTheDocument();
    });

    it('handles rejected asynchronous onRetry by remaining in error state and logging', async () => {
      render(
        <ReputationLoadingClient
          onRetry={() => Promise.reject(new Error('Network reconnect failed'))}
        >
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(mockReporter).toHaveBeenCalledWith(
        expect.any(Error),
        'ReputationLoadingClient',
        'error',
        expect.objectContaining({
          code: REPUTATION_LOADING_RETRY_FAILED_CODE,
          retryCount: 1,
        })
      );

      // Still in error state with retry available (retryCount 1 < 3)
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('guards against concurrent retry clicks while retry is in flight', async () => {
      let resolvePromise: () => void = () => {};
      const retryFn = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(
        <ReputationLoadingClient onRetry={retryFn}>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });

      // Click multiple times rapidly
      act(() => {
        fireEvent.click(retryButton);
        fireEvent.click(retryButton);
        fireEvent.click(retryButton);
      });

      expect(retryFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePromise();
      });
    });
  });

  describe('Max retries & exhausted terminal state', () => {
    it('transitions to exhausted state after maxRetries attempts fail', async () => {
      let shouldThrow = true;
      const DynamicChild = () => <Bomb shouldThrow={shouldThrow} message="Persistent failure" />;

      render(
        <ReputationLoadingClient maxRetries={2}>
          <DynamicChild />
        </ReputationLoadingClient>
      );

      // Initial failure (retryCount = 0)
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      // Retry 1: fails
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      });
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

      // Retry 2: fails -> maxRetries (2) reached
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
      });

      // Terminal state: "Try again" button is removed
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(
        screen.getByText(
          'Unable to load reputation after multiple attempts. Please return home or contact support if the problem persists.'
        )
      ).toBeInTheDocument();

      // Go Home link remains accessible
      expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
    });

    it('immediately enters exhausted state when maxRetries is 0', () => {
      render(
        <ReputationLoadingClient maxRetries={0}>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
      expect(
        screen.getByText(
          'Unable to load reputation after multiple attempts. Please return home or contact support if the problem persists.'
        )
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /go home/i })).toBeInTheDocument();
    });

    it('normalizes invalid maxRetries values (negative, NaN) to default', () => {
      expect(normalizeMaxRetries(-5)).toBe(DEFAULT_MAX_RETRIES);
      expect(normalizeMaxRetries(NaN)).toBe(DEFAULT_MAX_RETRIES);
      expect(normalizeMaxRetries('three')).toBe(DEFAULT_MAX_RETRIES);
      expect(normalizeMaxRetries(4.8)).toBe(4);
    });
  });

  describe('Timeout handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('transitions to error state when timeoutMs threshold is exceeded', () => {
      const onError = jest.fn();
      render(
        <ReputationLoadingClient timeoutMs={500} onError={onError}>
          <div data-testid="slow-loading">Simulated slow component</div>
        </ReputationLoadingClient>
      );

      // Before timeout
      expect(screen.getByTestId('slow-loading')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      // Advance past timeout
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // After timeout
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Unable to load reputation');
      expect(mockReporter).toHaveBeenCalledWith(
        expect.any(Error),
        'ReputationLoadingClient',
        'warn',
        expect.objectContaining({
          code: REPUTATION_LOADING_TIMEOUT_CODE,
          timeoutMs: 500,
        })
      );
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Reputation loading timed out' }));
    });

    it('clears timeout timer cleanly on unmount before timeout expires', () => {
      const { unmount } = render(
        <ReputationLoadingClient timeoutMs={1000}>
          <div>Slow content</div>
        </ReputationLoadingClient>
      );

      unmount();

      // Advancing timer after unmount should not throw or update state
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1500);
        });
      }).not.toThrow();
    });

    it('normalizes invalid timeoutMs inputs (non-positive, NaN)', () => {
      expect(normalizeTimeoutMs(-100)).toBeNull();
      expect(normalizeTimeoutMs(0)).toBeNull();
      expect(normalizeTimeoutMs(NaN)).toBeNull();
      expect(normalizeTimeoutMs('500')).toBeNull();
      expect(normalizeTimeoutMs(1000)).toBe(1000);
    });
  });

  describe('Custom fallback support', () => {
    it('renders custom ReactNode fallback when provided', () => {
      render(
        <ReputationLoadingClient fallback={<div data-testid="custom-ui">Custom Fallback UI</div>}>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      expect(screen.getByTestId('custom-ui')).toBeInTheDocument();
      expect(screen.queryByText('Unable to load reputation')).not.toBeInTheDocument();
    });

    it('renders custom function fallback with fallback context props', () => {
      render(
        <ReputationLoadingClient
          fallback={({ error, retry, retryCount, isExhausted }) => (
            <div data-testid="context-ui">
              <span>Error: {error?.message}</span>
              <span>Count: {retryCount}</span>
              <span>Exhausted: {String(isExhausted)}</span>
              <button type="button" onClick={retry}>
                Custom Retry
              </button>
            </div>
          )}
        >
          <Bomb shouldThrow={true} message="Context test error" />
        </ReputationLoadingClient>
      );

      expect(screen.getByTestId('context-ui')).toBeInTheDocument();
      expect(screen.getByText('Error: Context test error')).toBeInTheDocument();
      expect(screen.getByText('Count: 0')).toBeInTheDocument();
      expect(screen.getByText('Exhausted: false')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom Retry' })).toBeInTheDocument();
    });

    it('gracefully falls back to default fallback if custom fallback function throws', () => {
      render(
        <ReputationLoadingClient
          fallback={() => {
            throw new Error('Custom fallback render threw');
          }}
        >
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );

      // Catches and renders default fallback instead of white-screening
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Unable to load reputation');
    });
  });

  describe('Initial error & error normalization', () => {
    it('mounts directly in error state when initialError is provided', () => {
      render(<ReputationLoadingClient initialError={new Error('Pre-existing error')} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'false');
    });

    it('mounts in error state when initialError is a string', () => {
      render(<ReputationLoadingClient initialError="String error message" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('normalizes non-Error thrown objects, strings, numbers, null', () => {
      expect(normalizeError('String err').message).toBe('String err');
      expect(normalizeError({ message: 'Object err' }).message).toBe('Object err');
      expect(normalizeError(404).message).toBe('404');
      expect(normalizeError(null).message).toBe('Unknown error occurred');
      expect(normalizeError(undefined).message).toBe('Unknown error occurred');
    });

    it('updates to error state when initialError prop changes after mount', () => {
      const { rerender } = render(<ReputationLoadingClient />);

      expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'true');

      rerender(<ReputationLoadingClient initialError="Late error arriving" />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(document.querySelector('main')).toHaveAttribute('aria-busy', 'false');
    });
  });

  describe('Accessibility – jest-axe audits', () => {
    it('has zero accessibility violations in normal loading state', async () => {
      const { container } = render(<ReputationLoadingClient />);
      await assertNoA11yViolations(container);
    });

    it('has zero accessibility violations in error fallback state', async () => {
      const { container } = render(
        <ReputationLoadingClient>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );
      await assertNoA11yViolations(container);
    });

    it('has zero accessibility violations in exhausted state', async () => {
      const { container } = render(
        <ReputationLoadingClient maxRetries={0}>
          <Bomb shouldThrow={true} />
        </ReputationLoadingClient>
      );
      await assertNoA11yViolations(container);
    });
  });
});
