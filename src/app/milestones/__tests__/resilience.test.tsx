/**
 * Integration coverage for the board's resilience contract.
 *
 * The real filter and list are intentionally replaced with deterministic
 * render probes. This lets the test make one subtree fail at a time and
 * prove that the page composition keeps its siblings alive. The boundary's
 * own behavior is covered by MilestonesErrorBoundary.test.tsx; this suite
 * verifies that the page actually places boundaries at the right seams.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import MilestonesPage from '../page';
import { setErrorReporter } from '@/lib/errorReporter';

let mockFilterShouldThrow = false;
let mockListShouldThrow = false;

jest.mock('@/lib/repository', () => ({
  listMilestones: jest.fn(() => [
    {
      id: 'resilience-1',
      title: 'Resilience fixture',
      status: 'Pending',
      payout: 100,
      currency: 'USD',
    },
  ]),
  saveMilestone: jest.fn(),
  updateMilestone: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null, toString: () => '' }),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock('@/components/milestones/MilestoneFilter', () => ({
  __esModule: true,
  default: () => {
    if (mockFilterShouldThrow) throw new Error('filter internals must stay private');
    return <div data-testid="filter-probe">Filter controls</div>;
  },
}));

jest.mock('@/components/MilestonesList', () => ({
  __esModule: true,
  default: () => {
    if (mockListShouldThrow) throw new Error('list internals must stay private');
    return <div data-testid="list-probe">Milestone rows</div>;
  },
}));

beforeEach(() => {
  mockFilterShouldThrow = false;
  mockListShouldThrow = false;
  setErrorReporter(null);
  window.localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  setErrorReporter(null);
  jest.restoreAllMocks();
});

describe('milestones board resilience seams', () => {
  it('transitions from the loading shell to the resolved board', async () => {
    const { unmount } = render(
      <div>
        <div data-testid="loading-shell">Loading milestones…</div>
        <MilestonesPage />
      </div>,
    );

    expect(screen.getByTestId('loading-shell')).toBeInTheDocument();
    await act(async () => {});
    expect(screen.getByTestId('filter-probe')).toBeInTheDocument();
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
    unmount();
  });

  it('contains a filter failure while actions and the list remain available', async () => {
    mockFilterShouldThrow = true;
    const reporter = jest.fn();
    setErrorReporter(reporter);

    render(<MilestonesPage />);
    await act(async () => {});

    expect(screen.getByText(/the filters section couldn.t load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
    expect(screen.queryByText('filter internals must stay private')).not.toBeInTheDocument();
    expect(reporter).toHaveBeenCalledWith(
      expect.any(Error),
      'MilestonesErrorBoundary',
      'error',
      expect.objectContaining({ code: 'MILESTONES_SECTION_FAILED', section: 'filters' }),
    );
  });

  it('contains a list failure while filters and actions remain available', async () => {
    mockListShouldThrow = true;
    render(<MilestonesPage />);
    await act(async () => {});

    expect(screen.getByTestId('filter-probe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
    expect(screen.getByText(/the milestone list section couldn.t load/i)).toBeInTheDocument();
    expect(screen.queryByText('list internals must stay private')).not.toBeInTheDocument();
  });

  it('retries only the failed subtree and renders it after recovery', async () => {
    mockListShouldThrow = true;
    render(<MilestonesPage />);
    await act(async () => {});

    mockListShouldThrow = false;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    });

    expect(screen.getByTestId('list-probe')).toBeInTheDocument();
    expect(screen.getByTestId('filter-probe')).toBeInTheDocument();
    expect(screen.queryByText(/milestone list section couldn.t load/i)).not.toBeInTheDocument();
  });
});
