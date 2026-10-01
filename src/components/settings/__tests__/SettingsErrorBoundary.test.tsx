import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsErrorBoundary from '../SettingsErrorBoundary';
import { setErrorReporter, type ErrorReporter } from '@/lib/errorReporter';

// Suppress React error boundary console noise in tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  setErrorReporter(null);
});

afterEach(() => {
  jest.restoreAllMocks();
  setErrorReporter(null);
});

/** A component that throws on demand. */
const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>Safe content</div>;
};

describe('SettingsErrorBoundary', () => {
  describe('no error', () => {
    it('renders children when there is no error', () => {
      render(
        <SettingsErrorBoundary>
          <div data-testid="child">Settings section content</div>
        </SettingsErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Settings section content')).toBeInTheDocument();
    });

    it('does not render any fallback elements when children are healthy', () => {
      render(
        <SettingsErrorBoundary>
          <div>Healthy</div>
        </SettingsErrorBoundary>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders accessible fallback UI when a child throws', () => {
      render(
        <SettingsErrorBoundary>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      expect(
        screen.getByText(/settings section couldn.*t load/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    it('fallback container has role="alert" for screen reader announcement', () => {
      render(
        <SettingsErrorBoundary>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('displays the error message when available', () => {
      const BombWithMessage = () => {
        throw new Error('Something went wrong in settings');
      };

      render(
        <SettingsErrorBoundary>
          <BombWithMessage />
        </SettingsErrorBoundary>
      );

      expect(
        screen.getByTestId('settings-error-message')
      ).toHaveTextContent('Something went wrong in settings');
    });

    it('renders a helpful description below the error heading', () => {
      render(
        <SettingsErrorBoundary>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      expect(
        screen.getByText(/This is likely a temporary issue/)
      ).toBeInTheDocument();
    });

    it('retry button auto-focuses for keyboard accessibility', () => {
      render(
        <SettingsErrorBoundary>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toHaveFocus();
    });

    it('retry button has focus-visible outline styling', () => {
      render(
        <SettingsErrorBoundary>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton.className).toMatch(/focus-visible/);
    });
  });

  describe('retry recovery', () => {
    it('recovers and re-renders children when Retry is clicked (throw → no throw)', () => {
      let triggerThrow = true;

      const Child = () => <Bomb shouldThrow={triggerThrow} />;

      const { rerender } = render(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      expect(
        screen.getByText(/settings section couldn.*t load/i)
      ).toBeInTheDocument();

      // Flip the flag before clicking Retry
      triggerThrow = false;

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      // Force a rerender so React picks up the new flag
      rerender(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      expect(screen.getByText('Safe content')).toBeInTheDocument();
      expect(
        screen.queryByText(/settings section couldn.*t load/i)
      ).not.toBeInTheDocument();
    });

    it('can retry multiple times — second throw then recover', () => {
      let triggerThrow = true;

      const Child = () => <Bomb shouldThrow={triggerThrow} />;

      const { rerender } = render(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      expect(
        screen.getByText(/settings section couldn.*t load/i)
      ).toBeInTheDocument();

      // First retry — still throwing
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      rerender(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      // Should show fallback again since it still throws
      expect(
        screen.getByText(/settings section couldn.*t load/i)
      ).toBeInTheDocument();

      // Second retry — stop throwing
      triggerThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      rerender(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      expect(screen.getByText('Safe content')).toBeInTheDocument();
      expect(
        screen.queryByText(/settings section couldn.*t load/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('error reporting', () => {
    it('logs the error via reportError when a child throws', () => {
      const mockReporter: ErrorReporter = jest.fn();
      setErrorReporter(mockReporter);

      render(
        <SettingsErrorBoundary>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      expect(mockReporter).toHaveBeenCalledTimes(1);
      expect(mockReporter).toHaveBeenCalledWith(
        expect.any(Error),
        'SettingsErrorBoundary',
        'error',
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });

    it('does not swallow the error silently — the error is passed to the reporter', () => {
      const mockReporter: ErrorReporter = jest.fn();
      setErrorReporter(mockReporter);

      const CustomError = new Error('Custom settings error');
      const CustomBomb = () => {
        throw CustomError;
      };

      render(
        <SettingsErrorBoundary>
          <CustomBomb />
        </SettingsErrorBoundary>
      );

      expect(mockReporter).toHaveBeenCalledWith(
        CustomError,
        'SettingsErrorBoundary',
        'error',
        expect.any(Object)
      );
    });

    it('calls the optional onError callback when provided', () => {
      const onError = jest.fn();

      render(
        <SettingsErrorBoundary onError={onError}>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });
  });

  describe('custom fallback', () => {
    it('renders a custom fallback when provided instead of the built-in one', () => {
      render(
        <SettingsErrorBoundary fallback={<div>Custom fallback UI</div>}>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      expect(screen.getByText('Custom fallback UI')).toBeInTheDocument();
      expect(
        screen.queryByText(/settings section couldn.*t load/i)
      ).not.toBeInTheDocument();
    });

    it('still logs the error when a custom fallback is used', () => {
      const mockReporter: ErrorReporter = jest.fn();
      setErrorReporter(mockReporter);

      render(
        <SettingsErrorBoundary fallback={<div>Custom</div>}>
          <Bomb shouldThrow={true} />
        </SettingsErrorBoundary>
      );

      expect(mockReporter).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('passes through children that render null', () => {
      const NullComponent = () => null;

      const { container } = render(
        <SettingsErrorBoundary>
          <NullComponent />
        </SettingsErrorBoundary>
      );

      // Should render nothing, not a fallback
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(container.firstChild).toBeNull();
    });

    it('resets error state and clears error message on retry', () => {
      let triggerThrow = true;
      const Child = () => <Bomb shouldThrow={triggerThrow} />;

      const { rerender } = render(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      // Error message should be in the DOM
      expect(
        screen.getByTestId('settings-error-message')
      ).toHaveTextContent('Test explosion');

      triggerThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      rerender(
        <SettingsErrorBoundary>
          <Child />
        </SettingsErrorBoundary>
      );

      // Error state should be cleared
      expect(screen.queryByTestId('settings-error-message')).not.toBeInTheDocument();
      expect(screen.getByText('Safe content')).toBeInTheDocument();
    });

    it('wraps children that are simple text nodes', () => {
      render(
        <SettingsErrorBoundary>
          <span>Simple text content</span>
        </SettingsErrorBoundary>
      );

      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });
  });
});
