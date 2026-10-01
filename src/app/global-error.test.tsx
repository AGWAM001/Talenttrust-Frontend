import { render, screen, fireEvent } from '@testing-library/react';
import GlobalError from './global-error';
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

const testError = Object.assign(new Error('Synthetic root crash'), { digest: undefined });
const mockReset = jest.fn();

describe('GlobalError page', () => {
  it('renders critical error message without leaking error details', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.getByRole('heading', { name: /critical error/i })).toBeInTheDocument();
    expect(screen.queryByText('Synthetic root crash')).not.toBeInTheDocument();
  });

  it('calls reset when Try Again is clicked', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('renders Home, Contact Support links and try again button', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /contact support/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('logs error to console only in non-production', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // NODE_ENV is 'test' in Jest, which is !== 'production', so logging should fire
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(spy).toHaveBeenCalledWith('[Global Error Boundary]', testError);
  });

  it('does not render error message or stack trace in the UI', () => {
    render(<GlobalError error={testError} reset={mockReset} />);
    expect(screen.queryByText(/synthetic root crash/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/digest/i)).not.toBeInTheDocument();
  });

  it('invokes the pluggable error reporter when rendered', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    render(<GlobalError error={testError} reset={mockReset} />);

    expect(mockReporter).toHaveBeenCalledTimes(1);
    expect(mockReporter).toHaveBeenCalledWith(testError, 'Global Error Boundary', undefined, undefined);
  });

  it('is accessible and clean of violations via jest-axe', async () => {
    // Render and check for accessibility violations
    await testA11y(<GlobalError error={testError} reset={mockReset} />);
  });

  it('does not report the same error twice across re-renders', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    const { rerender } = render(<GlobalError error={testError} reset={mockReset} />);
    rerender(<GlobalError error={testError} reset={mockReset} />);
    rerender(<GlobalError error ={testError} reset={mockReset} />);

    expect(mockReporter).toHaveBeenCalledTimes(1);
  });

  it('reports a new error instance when the error changes', () => {
    const mockReporter = jest.fn();
    setErrorReporter(mockReporter);

    const { rerender } = render(<GlobalError error={testError} reset={mockReset} />);
    const nextError = Object.assign(new Error('Second crash'), { digest: 'abc123' });
    rerender(<GlobalError error={nextError} reset={mockReset} />);

    expect(mockReporter).toHaveBeenCalledTimes(2);
    expect(mockReporter).toHaveBeenLastCalledWith(nextError, 'Global Error Boundary', undefined, undefined);
  });

  it('swallows reporter failures and still renders the fallback UI', () => {
    const mockReporter = jest.fn(() => {
      throw new Error('reporter down');
    });
    setErrorReporter(mockReporter);

    expect(() => render(<GlobalError error={testError} reset={mockReset} />)).not.toThrow();
    expect(screen.getByRole('heading', { name: /critical error/i })).toBeInTheDocument();
  });

  it('only invokes reset once for repeated clicks', () => {
    const resetSpy = jest.fn();
    render(<GlobalError error={testError} reset={resetSpy} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it('allows reset again after a new error arrives', () => {
    const resetSpy = jest.fn();
    const { rerender } = render(<GlobalError error={testError} reset={resetSpy} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(resetSpy).toHaveBeenCalledTimes(1);

    const nextError = Object.assign(new Error('Second crash'), { digest: 'abc123' });
    rerender(<GlobalError error={nextError} reset={resetSpy} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(resetSpy).toHaveBeenCalledTimes(2);
  });

  it('re-allows reset if the reset call throws', () => {
    const resetSpy = jest.fn().mockImplementationOnce(() => {
      throw new Error('reset failed');
    });
    render(<GlobalError error={testError} reset={resetSpy} />);

    const button = screen.getByRole('button', { name: /try again/i });
    expect(() => fireEvent.click(button)).not.toThrow();
    fireEvent.click(button);

    expect(resetSpy).toHaveBeenCalledTimes(2);
  });
});
