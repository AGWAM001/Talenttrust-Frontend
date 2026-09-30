import { render, screen, fireEvent, act } from '@testing-library/react';
import GlobalError, { ErrorBoundary, ErrorPage } from './error';
import { setErrorReporter } from '../lib/errorReporter';
import { testA11y } from '../test-utils/a11y';

// Suppress React error boundary noise in test output
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  setErrorReporter(null);
});
afterEach(() => {
  jest.restoreAllMocks();
  setErrorReporter(null);
});

const testError = Object.assign(new Error('Something broke'), { digest: undefined });
const mockReset = jest.fn();

describe('Error page', () => {
  it('renders generic error message without leaking error details', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
    expect(screen.queryByText('Something broke')).not.toBeInTheDocument();
  });

  it('calls reset when Try Again is clicked', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('renders Home and Contact Support links', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
  });

  it('logs error to console only in non-production', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // NODE_ENV is 'test' in Jest, which is !== 'production', so logging should fire
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(spy).toHaveBeenCalledWith('[Error Boundary]', testError);
  });

  it('does not render error message or stack trace in the UI', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.queryByText(/something broke/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/digest/i)).not.toBeInTheDocument();
  });

  it('invokes the pluggable error reporter when rendered', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);
    
    render(<GlobalError error={testError} reset={mockReset} />);
    
    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter).toHaveBeenCalledWith(testError, 'Error Boundary', undefined, undefined);
  });

  describe('Compatibility contracts & exports', () => {
    it('exports ErrorBoundary, GlobalError, and ErrorPage with matching behavior', () => {
      expect(ErrorBoundary).toBeDefined();
      expect(GlobalError).toBe(ErrorBoundary);
      expect(ErrorPage).toBe(ErrorBoundary);

      const { unmount } = render(<ErrorBoundary error={testError} reset={mockReset} />);
      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
      unmount();

      render(<ErrorPage error={testError} reset={mockReset} />);
      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
    });

    it('satisfies accessibility standards (jest-axe)', async () => {
      await testA11y(<GlobalError error={testError} reset={mockReset} />);
    });
  });

  describe('Boundary and malformed inputs', () => {
    it('handles null error without throwing', () => {
      const mockReporter = jest.fn();
      setErrorReporter(mockReporter);

      render(<GlobalError error={null} reset={mockReset} />);
      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
      expect(mockReporter).toHaveBeenCalledWith(null, 'Error Boundary', undefined, undefined);
    });

    it('handles undefined error without throwing', () => {
      const mockReporter = jest.fn();
      setErrorReporter(mockReporter);

      render(<GlobalError error={undefined} reset={mockReset} />);
      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
      expect(mockReporter).toHaveBeenCalledWith(undefined, 'Error Boundary', undefined, undefined);
    });

    it('handles primitive error values (string / number)', () => {
      const mockReporter = jest.fn();
      setErrorReporter(mockReporter);

      const { rerender } = render(<GlobalError error="String failure" reset={mockReset} />);
      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
      expect(mockReporter).toHaveBeenCalledWith('String failure', 'Error Boundary', undefined, undefined);

      rerender(<GlobalError error={500} reset={mockReset} />);
      expect(mockReporter).toHaveBeenCalledWith(500, 'Error Boundary', undefined, undefined);
    });

    it('handles errors with Next.js digest without leaking it in the UI', () => {
      const digestError = Object.assign(new Error('Internal server failure'), {
        digest: 'NEXT_DIGEST_SECRET_TOKEN_9999',
      });
      render(<GlobalError error={digestError} reset={mockReset} />);

      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
      expect(screen.queryByText(/NEXT_DIGEST_SECRET_TOKEN_9999/)).not.toBeInTheDocument();
      expect(screen.queryByText(/internal server failure/i)).not.toBeInTheDocument();
    });

    it('safely handles non-function reset handler without crashing', () => {
      const mockReporter = jest.fn();
      setErrorReporter(mockReporter);

      render(<GlobalError error={testError} reset={undefined as unknown as () => void} />);
      const tryAgainBtn = screen.getByRole('button', { name: /try again/i });

      expect(() => {
        fireEvent.click(tryAgainBtn);
      }).not.toThrow();

      expect(mockReporter).toHaveBeenCalledWith(
        expect.any(TypeError),
        'Error Boundary',
        undefined,
        undefined
      );
    });
  });

  describe('Retry resilience & concurrent execution', () => {
    it('catches and reports synchronous reset errors without crashing the UI', () => {
      const mockReporter = jest.fn();
      setErrorReporter(mockReporter);

      const throwingReset = jest.fn(() => {
        throw new Error('Reset failed catastrophically');
      });

      render(<GlobalError error={testError} reset={throwingReset} />);
      const tryAgainBtn = screen.getByRole('button', { name: /try again/i });

      expect(() => {
        fireEvent.click(tryAgainBtn);
      }).not.toThrow();

      expect(throwingReset).toHaveBeenCalledTimes(1);
      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Reset failed catastrophically' }),
        'Error Boundary Reset',
        undefined,
        undefined
      );
      expect(screen.getByRole('heading', { name: /unexpected error/i })).toBeInTheDocument();
    });

    it('catches and reports asynchronous reset promise rejections', async () => {
      const mockReporter = jest.fn();
      setErrorReporter(mockReporter);

      const rejectingReset = jest.fn(() => Promise.reject(new Error('Async reset failed')));

      render(<GlobalError error={testError} reset={rejectingReset} />);
      const tryAgainBtn = screen.getByRole('button', { name: /try again/i });

      await act(async () => {
        fireEvent.click(tryAgainBtn);
      });

      expect(rejectingReset).toHaveBeenCalledTimes(1);
      expect(mockReporter).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Async reset failed' }),
        'Error Boundary Reset',
        undefined,
        undefined
      );
    });

    it('prevents concurrent executions when reset is already in progress', async () => {
      let resolvePromise: () => void = () => {};
      const slowReset = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvePromise = resolve;
          })
      );

      render(<GlobalError error={testError} reset={slowReset} />);
      const tryAgainBtn = screen.getByRole('button', { name: /try again/i });

      // First click triggers reset
      act(() => {
        fireEvent.click(tryAgainBtn);
      });
      expect(slowReset).toHaveBeenCalledTimes(1);

      // Button should indicate busy/disabled
      expect(tryAgainBtn).toBeDisabled();
      expect(screen.getByRole('button', { name: /retrying/i })).toBeInTheDocument();

      // Second click while in progress should be ignored
      act(() => {
        fireEvent.click(tryAgainBtn);
      });
      expect(slowReset).toHaveBeenCalledTimes(1);

      // Resolve the reset operation
      await act(async () => {
        resolvePromise();
      });

      // Button should be re-enabled
      expect(tryAgainBtn).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});
