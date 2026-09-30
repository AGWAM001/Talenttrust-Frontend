import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MilestonesLoading from '../loading';
import MilestonesError from '../error';
import { setErrorReporter } from '@/lib/errorReporter';

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
    expect(report).toHaveBeenCalledWith(error, 'Milestones page', undefined, undefined);
  });

  it('reports one failure once and makes retry idempotent while recovery is pending', async () => {
    const user = userEvent.setup();
    const reset = jest.fn();
    const report = jest.fn();
    setErrorReporter(report);
    const error = new Error('transient repository failure');

    const { rerender } = render(<MilestonesError error={error} reset={reset} />);
    rerender(<MilestonesError error={error} reset={reset} />);

    expect(report).toHaveBeenCalledTimes(1);
    const retry = screen.getByRole('button', { name: 'Try again' });
    await user.click(retry);
    await user.click(retry);

    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
  });
});
