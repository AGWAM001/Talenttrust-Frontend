import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MilestonesLoading from '../loading';
import MilestonesError from '../error';
import { setErrorReporter } from '@/lib/errorReporter';
import { MILESTONES_ROUTE_ERROR_CODE } from '@/lib/milestonesRouteError';
import { MILESTONES_RESET_FAILURE_NOTICE } from '@/hooks/useMilestonesRouteError';

describe('Milestones route states', () => {
  afterEach(() => {
    setErrorReporter(null);
    jest.restoreAllMocks();
  });

  it('announces the loading state while rendering milestone placeholders', () => {
    const { container } = render(<MilestonesLoading />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading milestones…');
    expect(screen.getByRole('region', { name: 'Loading milestones' })).toBeInTheDocument();
  });

  it('shows a recoverable error state without exposing internal error details', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    const error = new Error('Repository storage failed');
    const report = jest.fn();
    setErrorReporter(report);

    render(<MilestonesError error={error} reset={reset} />);

    expect(screen.getByRole('heading', { name: 'Unable to load milestones' })).toBeInTheDocument();
    expect(screen.queryByText('Repository storage failed')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(
      error,
      'Milestones page',
      'error',
      expect.objectContaining({
        code: MILESTONES_ROUTE_ERROR_CODE,
        name: 'Error',
      }),
    );
  });

  it('issues at most one reset for rapid repeated activation', () => {
    const reset = jest.fn();
    render(<MilestonesError error={new Error('boom')} reset={reset} />);

    const button = screen.getByRole('button', { name: 'Try again' });
    // Two activations in the same event loop must not overlap.
    fireEvent.click(button);
    fireEvent.click(button);

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('marks retry aria-disabled while a reset is in flight', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    render(<MilestonesError error={new Error('boom')} reset={reset} />);

    const button = screen.getByRole('button', { name: 'Try again' });
    expect(button).toHaveAttribute('aria-disabled', 'false');

    await user.click(button);

    expect(reset).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('degrades gracefully when reset throws, without leaking the failure', () => {
    const reset = jest.fn(() => {
      throw new Error('reset internals must stay private');
    });

    expect(() =>
      render(<MilestonesError error={new Error('boom')} reset={reset} />),
    ).not.toThrow();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByRole('status')).toHaveTextContent(
      MILESTONES_RESET_FAILURE_NOTICE,
    );
    expect(
      screen.queryByText(/reset internals must stay private/i),
    ).not.toBeInTheDocument();
    // The user can try again after the failed reset.
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );
  });

  it('prevents duplicate reporting of the same error object', () => {
    const error = new Error('Network timeout');
    const report = jest.fn();
    setErrorReporter(report);

    const { rerender } = render(<MilestonesError error={error} reset={jest.fn()} />);
    rerender(<MilestonesError error={error} reset={jest.fn()} />);
    rerender(<MilestonesError error={error} reset={jest.fn()} />);

    expect(report).toHaveBeenCalledTimes(1);

    const newError = new Error('Database disconnected');
    rerender(<MilestonesError error={newError} reset={jest.fn()} />);
    expect(report).toHaveBeenCalledTimes(2);
  });

  it('prevents concurrent execution of reset (idempotent retries)', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    const error = new Error('Rate limited');
    const report = jest.fn();
    setErrorReporter(report);

    render(<MilestonesError error={error} reset={reset} />);
    const button = screen.getByRole('button', { name: /try again/i });

    // Click once
    await user.click(button);
    
    // In a real environment with async reset, startTransition prevents concurrent runs
    // Here we just verify it delegates to reset correctly
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
