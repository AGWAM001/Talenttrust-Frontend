/**
 * MilestonesErrorBoundary — comprehensive test suite
 *
 * Covers:
 *   1. Normal render (children pass-through, no error)
 *   2. Fallback UI rendered when a child throws
 *   3. Accessible attributes on the fallback (role, aria-live, aria-atomic)
 *   4. autoFocus on the retry button
 *   5. Internal error details are not displayed in the fallback
 *   6. Retry re-mounts children (successful recovery)
 *   7. Retry that still fails keeps the fallback visible
 *   8. Custom fallback prop
 *   9. onError callback invoked with error + info
 *  10. reportError called with correct context and level
 *  11. reportError called with component-stack metadata
 *  12. reportError NOT called when no error
 *  13. Multiple successive errors — each one reported
 *  14. Fallback shown for errors thrown in deeply nested descendants
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MilestonesErrorBoundary from '../MilestonesErrorBoundary';
import { setErrorReporter } from '../../../lib/errorReporter';

// ---------------------------------------------------------------------------
// Suppress React's own error-boundary console noise in all tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  // React logs two console.error calls for boundary errors in test mode.
  // Silence them so test output stays readable.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Reset the global reporter to the default between tests.
  setErrorReporter(null);
});

afterEach(() => {
  jest.restoreAllMocks();
  setErrorReporter(null);
});

// ---------------------------------------------------------------------------
// Reusable test helpers
// ---------------------------------------------------------------------------

/** Renders children but throws when shouldThrow is true. */
const Bomb = ({ shouldThrow, message = 'Test explosion' }: { shouldThrow: boolean; message?: string }) => {
  if (shouldThrow) throw new Error(message);
  return <div>Safe content</div>;
};

/** A Bomb that is nested three levels deep. */
const DeepBomb = ({ shouldThrow }: { shouldThrow: boolean }) => (
  <div>
    <div>
      <div>
        <Bomb shouldThrow={shouldThrow} />
      </div>
    </div>
  </div>
);

// ===========================================================================
// 1. Normal render — children pass-through
// ===========================================================================

describe('MilestonesErrorBoundary — normal render', () => {
  it('renders children when no error is thrown', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow={false} />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('does not render the fallback when children are healthy', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow={false} />
      </MilestonesErrorBoundary>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('renders multiple healthy children', () => {
    render(
      <MilestonesErrorBoundary>
        <span>child-one</span>
        <span>child-two</span>
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText('child-one')).toBeInTheDocument();
    expect(screen.getByText('child-two')).toBeInTheDocument();
  });
});

// ===========================================================================
// 2. Fallback UI rendered when a child throws
// ===========================================================================

describe('MilestonesErrorBoundary — fallback UI on error', () => {
  it('renders the fallback container when a child throws', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders the human-readable heading in the fallback', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(
      screen.getByText(/the milestones section couldn.t load/i),
    ).toBeInTheDocument();
  });

  it('renders the helper text in the fallback', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText(/this is likely a temporary issue/i)).toBeInTheDocument();
  });

  it('renders a "Try again" button in the fallback', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('hides children when the fallback is shown', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.queryByText('Safe content')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 3. Accessibility attributes on the fallback
// ===========================================================================

describe('MilestonesErrorBoundary — fallback accessibility', () => {
  it('uses role="alert" on the fallback container', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-live="assertive" on the fallback container', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('sets aria-atomic="true" on the fallback container', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('the retry button has type="button" (not submit)', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: /try again/i })).toHaveAttribute('type', 'button');
  });
});

// ===========================================================================
// 4. autoFocus on the retry button
// ===========================================================================

describe('MilestonesErrorBoundary — autoFocus on retry button', () => {
  it('the retry button has the autoFocus attribute when the fallback is shown', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    const btn = screen.getByRole('button', { name: /try again/i });
    // jsdom honours the autoFocus attribute on render
    expect(btn).toHaveFocus();
  });
});

// ===========================================================================
// 5. Error message displayed in the fallback
// ===========================================================================

describe('MilestonesErrorBoundary — error message in fallback', () => {
  it('does not display internal thrown error details in the fallback', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow message="Cannot read properties of undefined" />
      </MilestonesErrorBoundary>,
    );

    expect(screen.queryByTestId('milestones-error-message')).not.toBeInTheDocument();
    expect(screen.queryByText('Cannot read properties of undefined')).not.toBeInTheDocument();
  });

  it('keeps the fallback safe when the error has no message', () => {
    const NoMessageBomb = () => {
      throw Object.assign(new Error(), { message: '' });
  };

    render(
      <MilestonesErrorBoundary>
        <NoMessageBomb />
      </MilestonesErrorBoundary>,
    );

    expect(screen.queryByTestId('milestones-error-message')).not.toBeInTheDocument();
  });

  it('uses the supplied section name while retaining a stable fallback shape', () => {
    render(
      <MilestonesErrorBoundary sectionName="filters">
        <Bomb shouldThrow message="database password=secret" />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText(/the filters section couldn.t load/i)).toBeInTheDocument();
    expect(screen.queryByText(/database password=secret/i)).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 6. Retry — successful recovery
// ===========================================================================

describe('MilestonesErrorBoundary — retry and recovery', () => {
  it('re-mounts children after clicking "Try again" when the fix has been applied', () => {
    let shouldThrow = true;
    const Child = () => <Bomb shouldThrow={shouldThrow} />;

    const { rerender } = render(
      <MilestonesErrorBoundary>
        <Child />
      </MilestonesErrorBoundary>,
    );

    // Sanity: fallback is visible
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Simulate the underlying issue being resolved
    shouldThrow = false;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    // Force rerender so React picks up the updated closure value
    rerender(
      <MilestonesErrorBoundary>
        <Child />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the displayed error message after a successful retry', () => {
    let shouldThrow = true;
    const Child = () => <Bomb shouldThrow={shouldThrow} message="Boom" />;

    const { rerender } = render(
      <MilestonesErrorBoundary>
        <Child />
      </MilestonesErrorBoundary>,
    );

    shouldThrow = false;

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    rerender(
      <MilestonesErrorBoundary>
        <Child />
      </MilestonesErrorBoundary>,
    );

    expect(screen.queryByTestId('milestones-error-message')).not.toBeInTheDocument();
  });
});

// ===========================================================================
// 7. Retry that still fails — fallback stays visible
// ===========================================================================

describe('MilestonesErrorBoundary — retry that still fails', () => {
  it('keeps the fallback visible when the retry also throws', () => {
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    // Click Retry — child still throws
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    // Fallback should still be present
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

// ===========================================================================
// 8. Custom fallback prop
// ===========================================================================

describe('MilestonesErrorBoundary — custom fallback prop', () => {
  it('renders the custom fallback instead of the built-in one when provided', () => {
    render(
      <MilestonesErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    // The built-in fallback should NOT be present
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('does not render the custom fallback when there is no error', () => {
    render(
      <MilestonesErrorBoundary fallback={<div>Custom error UI</div>}>
        <Bomb shouldThrow={false} />
      </MilestonesErrorBoundary>,
    );

    expect(screen.queryByText('Custom error UI')).not.toBeInTheDocument();
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});

// ===========================================================================
// 9. onError callback
// ===========================================================================

describe('MilestonesErrorBoundary — onError callback', () => {
  it('calls onError with the thrown error when a child throws', () => {
    const onError = jest.fn();
    const expectedError = new Error('callback-test');

    const ThrowOnMount = () => {
      throw expectedError;
    };

    render(
      <MilestonesErrorBoundary onError={onError}>
        <ThrowOnMount />
      </MilestonesErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expectedError, expect.any(Object));
  });

  it('calls onError with an ErrorInfo object that includes componentStack', () => {
    const onError = jest.fn();

    render(
      <MilestonesErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    const [, errorInfo] = onError.mock.calls[0];
    expect(errorInfo).toHaveProperty('componentStack');
  });

  it('does not call onError when no error is thrown', () => {
    const onError = jest.fn();

    render(
      <MilestonesErrorBoundary onError={onError}>
        <Bomb shouldThrow={false} />
      </MilestonesErrorBoundary>,
    );

    expect(onError).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 10. reportError called with correct context and level
// ===========================================================================

describe('MilestonesErrorBoundary — reportError integration', () => {
  it('calls the error reporter with context "MilestonesErrorBoundary"', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter).toHaveBeenCalledWith(
      expect.any(Error),
      'MilestonesErrorBoundary',
      'error',
      expect.any(Object),
    );
  });

  it('passes the exact thrown Error instance to the reporter', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    const specificError = new Error('specific-error-payload');
    const Thrower = () => {
      throw specificError;
    };

    render(
      <MilestonesErrorBoundary>
        <Thrower />
      </MilestonesErrorBoundary>,
    );

    expect(mockReporter.mock.calls[0][0]).toBe(specificError);
  });

  it('uses level "error" (not "warn") when reporting', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(mockReporter.mock.calls[0][2]).toBe('error');
  });
});

// ===========================================================================
// 11. reportError called with component-stack metadata
// ===========================================================================

describe('MilestonesErrorBoundary — component stack in metadata', () => {
  it('includes a componentStack in the meta argument to reportError', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    const meta = mockReporter.mock.calls[0][3];
    expect(meta).toHaveProperty('componentStack');
  });

  it('includes a stable code and safe section label in the report metadata', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    render(
      <MilestonesErrorBoundary sectionName="milestone list">
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(mockReporter.mock.calls[0][3]).toEqual(
      expect.objectContaining({
        code: 'MILESTONES_SECTION_FAILED',
        section: 'milestone list',
      }),
    );
  });
});

// ===========================================================================
// 12. reportError NOT called when no error occurs
// ===========================================================================

describe('MilestonesErrorBoundary — reportError not called on clean render', () => {
  it('does not invoke the error reporter when children render successfully', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow={false} />
      </MilestonesErrorBoundary>,
    );

    expect(mockReporter).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 13. Multiple successive errors — each one reported
// ===========================================================================

describe('MilestonesErrorBoundary — successive errors reported separately', () => {
  it('reports both the first and the second error when retry also fails', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    // Always throws — simulates a persistent failure
    render(
      <MilestonesErrorBoundary>
        <Bomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    // First error is reported on mount
    expect(mockReporter).toHaveBeenCalledTimes(1);

    // Click Retry — child still throws, triggering componentDidCatch again
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    expect(mockReporter).toHaveBeenCalledTimes(2);
  });
});

// ===========================================================================
// 14. Deeply nested descendants
// ===========================================================================

describe('MilestonesErrorBoundary — deeply nested errors', () => {
  it('catches errors thrown in deeply nested descendants', () => {
    render(
      <MilestonesErrorBoundary>
        <DeepBomb shouldThrow />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Safe content')).not.toBeInTheDocument();
  });

  it('renders nested children normally when no error is thrown', () => {
    render(
      <MilestonesErrorBoundary>
        <DeepBomb shouldThrow={false} />
      </MilestonesErrorBoundary>,
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
