import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReputationPage from '../page';
import {
  REPUTATION_MAX_SCORE,
  validateReputationData,
} from '@/lib/validateReputationData';
import { listReputationEvents } from '@/lib/repository';
import { reportError } from '@/lib/errorReporter';

jest.mock('../loading', () => {
  return function MockReputationLoading() {
    return (
      <main aria-busy="true">
        <span role="status">Loading reputation…</span>
      </main>
    );
  };
});

jest.mock('../ReputationPageContent', () => ({
  ReputationPageContent: ({
    reputationData,
  }: {
    reputationData: { score?: number | null; history?: unknown[] } | null;
  }) => (
    <div data-testid="reputation-page-content">
      <span data-testid="content-score">{reputationData?.score ?? 'null'}</span>
      <span data-testid="content-history-length">
        {reputationData?.history?.length ?? 0}
      </span>
    </div>
  ),
}));

jest.mock('@/lib/repository', () => ({
  listReputationEvents: jest.fn(),
}));

jest.mock('@/lib/errorReporter', () => ({
  reportError: jest.fn(),
}));

const mockListReputationEvents =
  listReputationEvents as jest.MockedFunction<typeof listReputationEvents>;
const mockReportError =
  reportError as jest.MockedFunction<typeof reportError>;

const validEvent = {
  id: 'evt-1',
  type: 'Review',
  summary: 'Positive review',
  date: '2026-09-01',
  version: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockListReputationEvents.mockReturnValue([]);
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('validateReputationData', () => {
  it('accepts the minimum score boundary of 0', () => {
    expect(() =>
      validateReputationData({ score: 0, history: [] }),
    ).not.toThrow();
  });

  it(`accepts the maximum score boundary of ${REPUTATION_MAX_SCORE}`, () => {
    expect(() =>
      validateReputationData({ score: REPUTATION_MAX_SCORE, history: [] }),
    ).not.toThrow();
  });

  it('accepts null or omitted optional score', () => {
    expect(() => validateReputationData({ score: null, history: [] })).not.toThrow();
    expect(() => validateReputationData({ history: [] })).not.toThrow();
  });

  it('rejects negative scores', () => {
    expect(() =>
      validateReputationData({ score: -0.01, history: [] }),
    ).toThrow(/between 0 and 5/);
  });

  it('rejects scores above the maximum', () => {
    expect(() =>
      validateReputationData({ score: REPUTATION_MAX_SCORE + 0.01, history: [] }),
    ).toThrow(/between 0 and 5/);
  });

  it('rejects NaN and infinite scores', () => {
    expect(() => validateReputationData({ score: NaN })).toThrow();
    expect(() => validateReputationData({ score: Infinity })).toThrow();
    expect(() => validateReputationData({ score: -Infinity })).toThrow();
  });

  it('rejects non-numeric scores', () => {
    expect(() => validateReputationData({ score: '4.5' })).toThrow();
    expect(() => validateReputationData({ score: true })).toThrow();
  });

  it('rejects non-array history', () => {
    expect(() =>
      validateReputationData({ history: { id: 'evt-1' } }),
    ).toThrow(/history must be an array/);
  });

  it('accepts a valid reputation event', () => {
    expect(() =>
      validateReputationData({ score: 4.5, history: [validEvent] }),
    ).not.toThrow();
  });

  it('rejects blank event identifiers', () => {
    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [{ ...validEvent, id: '   ' }],
      }),
    ).toThrow(/invalid id/);
  });

  it('rejects blank event type or summary', () => {
    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [{ ...validEvent, type: '   ' }],
      }),
    ).toThrow(/invalid type/);

    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [{ ...validEvent, summary: '' }],
      }),
    ).toThrow(/invalid summary/);
  });

  it('rejects invalid dates', () => {
    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [{ ...validEvent, date: 'not-a-date' }],
      }),
    ).toThrow(/invalid date/);
  });

  it('rejects invalid versions', () => {
    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [{ ...validEvent, version: -1 }],
      }),
    ).toThrow(/invalid version/);

    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [{ ...validEvent, version: 1.5 }],
      }),
    ).toThrow(/invalid version/);
  });

  it('rejects duplicate event IDs deterministically', () => {
    expect(() =>
      validateReputationData({
        score: 4.5,
        history: [
          validEvent,
          { ...validEvent, summary: 'Second event' },
        ],
      }),
    ).toThrow(/duplicate event identifiers/);
  });
});

describe('ReputationPage route', () => {
  it('renders the empty result through the canonical content boundary', async () => {
    mockListReputationEvents.mockReturnValue([]);

    render(<ReputationPage />);

    await waitFor(() => {
      expect(screen.getByTestId('reputation-page-content')).toBeInTheDocument();
    });

    expect(screen.getByTestId('content-score')).toHaveTextContent('null');
    expect(screen.getByTestId('content-history-length')).toHaveTextContent('0');
  });

  it('passes validated history to the canonical content boundary', async () => {
    mockListReputationEvents.mockReturnValue([validEvent]);

    render(<ReputationPage />);

    await waitFor(() => {
      expect(screen.getByTestId('reputation-page-content')).toBeInTheDocument();
    });

    expect(screen.getByTestId('content-score')).toHaveTextContent('4.5');
    expect(screen.getByTestId('content-history-length')).toHaveTextContent('1');
  });

  it('rejects corrupt history into the safe error state', async () => {
    mockListReputationEvents.mockReturnValue([
      { ...validEvent, id: 'evt-1' },
      { ...validEvent, id: 'evt-1', summary: 'Duplicate' },
    ]);

    render(<ReputationPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Unable to load your reputation data. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('reputation-page-content')).not.toBeInTheDocument();
    expect(screen.getByText('Unable to load your reputation data. Please try again.')).not.toHaveTextContent('evt-1');
    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  it('does not expose the raw repository error to the user', async () => {
    const rawError = new Error('sensitive storage failure');
    mockListReputationEvents.mockImplementation(() => {
      throw rawError;
    });

    render(<ReputationPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.queryByText('sensitive storage failure')).not.toBeInTheDocument();
    expect(mockReportError).toHaveBeenCalledWith(
      rawError,
      'ReputationPage.loadReputation',
    );
  });

  it('does not update state after the route unmounts during a load', async () => {
    const original = mockListReputationEvents.getMockImplementation();

    mockListReputationEvents.mockImplementationOnce(
      () => new Promise(() => undefined) as never,
    );

    const { unmount } = render(<ReputationPage />);
    unmount();

    await Promise.resolve();

    expect(mockReportError).not.toHaveBeenCalled();
    mockListReputationEvents.mockImplementation(original ?? (() => []));
  });

  it('recovers from a failed load when Retry is clicked', async () => {
    mockListReputationEvents
      .mockImplementationOnce(() => {
        throw new Error('temporary storage failure');
      })
      .mockReturnValueOnce([validEvent]);

    render(<ReputationPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByTestId('reputation-page-content')).toBeInTheDocument();
    });

    expect(screen.getByTestId('content-history-length')).toHaveTextContent('1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
