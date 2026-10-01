import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { axe } from 'jest-axe';
import ReputationLoading, {
  DEFAULT_HISTORY_ROW_COUNT,
  DEFAULT_METRIC_TILE_LABELS,
  DEFAULT_REPUTATION_LOADING_GEOMETRY,
  MAX_HISTORY_ROW_COUNT,
  MAX_METRIC_TILE_LABELS,
  MIN_HISTORY_ROW_COUNT,
  REPUTATION_LOADING_ANNOUNCEMENT,
  resolveReputationLoadingGeometry,
} from '../loading';
import { reportError } from '@/lib/errorReporter';

jest.mock('@/lib/errorReporter', () => ({
  reportError: jest.fn(),
}));

const reportErrorMock = reportError as jest.MockedFunction<typeof reportError>;

beforeEach(() => {
  reportErrorMock.mockClear();
});

// ---------------------------------------------------------------------------
// Pure geometry resolution — valid / invalid / duplicate / boundary inputs
// ---------------------------------------------------------------------------

describe('resolveReputationLoadingGeometry', () => {
  describe('valid input', () => {
    it('returns the provided labels and row count', () => {
      const geometry = resolveReputationLoadingGeometry({
        metricTileLabels: ['Alpha', 'Beta'],
        historyRowCount: 5,
      });

      expect(geometry.metricTileLabels).toEqual(['Alpha', 'Beta']);
      expect(geometry.historyRowCount).toBe(5);
      expect(reportErrorMock).not.toHaveBeenCalled();
    });

    it('trims surrounding whitespace from labels', () => {
      const geometry = resolveReputationLoadingGeometry({
        metricTileLabels: ['  Score  ', 'Level '],
      });

      expect(geometry.metricTileLabels).toEqual(['Score', 'Level']);
      expect(reportErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('missing input', () => {
    it('falls back to defaults for undefined / null', () => {
      expect(resolveReputationLoadingGeometry()).toEqual(
        DEFAULT_REPUTATION_LOADING_GEOMETRY,
      );
      expect(resolveReputationLoadingGeometry(null)).toEqual(
        DEFAULT_REPUTATION_LOADING_GEOMETRY,
      );
      expect(reportErrorMock).not.toHaveBeenCalled();
    });

    it('falls back to defaults when a field is omitted', () => {
      const geometry = resolveReputationLoadingGeometry({});

      expect(geometry.metricTileLabels).toEqual(DEFAULT_METRIC_TILE_LABELS);
      expect(geometry.historyRowCount).toBe(DEFAULT_HISTORY_ROW_COUNT);
      expect(reportErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('rejection (invalid input)', () => {
    it.each([
      ['non-array labels', { metricTileLabels: 'Score' }],
      ['empty array', { metricTileLabels: [] }],
      ['only blank labels', { metricTileLabels: ['   ', ''] }],
      ['only non-string labels', { metricTileLabels: [1, null, {}] }],
    ])('falls back to default labels for %s and reports', (_case, input) => {
      const geometry = resolveReputationLoadingGeometry(input);

      expect(geometry.metricTileLabels).toEqual(DEFAULT_METRIC_TILE_LABELS);
      expect(reportErrorMock).toHaveBeenCalledTimes(1);
      expect(reportErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        'reputation/loading',
        'warn',
        expect.objectContaining({ invalidFields: ['metricTileLabels'] }),
      );
    });

    it.each([
      ['NaN', Number.NaN],
      ['Infinity', Number.POSITIVE_INFINITY],
      ['-Infinity', Number.NEGATIVE_INFINITY],
      ['string', '3'],
      ['object', {}],
    ])('falls back to default row count for %s and reports', (_case, value) => {
      const geometry = resolveReputationLoadingGeometry({ historyRowCount: value });

      expect(geometry.historyRowCount).toBe(DEFAULT_HISTORY_ROW_COUNT);
      expect(reportErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        'reputation/loading',
        'warn',
        expect.objectContaining({ invalidFields: ['historyRowCount'] }),
      );
    });

    it('does not leak the offending value in the report metadata', () => {
      resolveReputationLoadingGeometry({
        metricTileLabels: ['SECRET_WALLET_ABCDEF'],
        historyRowCount: 'not-a-number',
      });

      const [, , , meta] = reportErrorMock.mock.calls[0];
      expect(meta).toEqual({
        invalidFields: ['historyRowCount'],
        droppedLabels: 0,
      });
      expect(JSON.stringify(meta)).not.toContain('SECRET_WALLET_ABCDEF');
    });

    it('never throws on hostile input', () => {
      const hostile = {
        metricTileLabels: { length: 3 },
        historyRowCount: { valueOf: () => 3 },
      };

      expect(() => resolveReputationLoadingGeometry(hostile as never)).not.toThrow();
    });
  });

  describe('duplicate input', () => {
    it('de-duplicates labels case-insensitively, preserving first occurrence', () => {
      const geometry = resolveReputationLoadingGeometry({
        metricTileLabels: ['Score', 'score', 'Level', 'Score'],
      });

      expect(geometry.metricTileLabels).toEqual(['Score', 'Level']);
      expect(reportErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        'reputation/loading',
        'warn',
        expect.objectContaining({ droppedLabels: 2 }),
      );
    });

    it('keeps React keys unique for every resolved geometry', () => {
      const geometry = resolveReputationLoadingGeometry({
        metricTileLabels: ['A', 'a', 'B', 'B', 'C'],
      });

      expect(new Set(geometry.metricTileLabels).size).toBe(
        geometry.metricTileLabels.length,
      );
    });
  });

  describe('boundary input', () => {
    it('accepts a zero-row history skeleton', () => {
      const geometry = resolveReputationLoadingGeometry({ historyRowCount: 0 });

      expect(geometry.historyRowCount).toBe(0);
      expect(reportErrorMock).not.toHaveBeenCalled();
    });

    it('clamps negative counts to the minimum', () => {
      const geometry = resolveReputationLoadingGeometry({ historyRowCount: -100 });

      expect(geometry.historyRowCount).toBe(MIN_HISTORY_ROW_COUNT);
    });

    it('clamps oversized counts to the maximum', () => {
      const geometry = resolveReputationLoadingGeometry({
        historyRowCount: MAX_HISTORY_ROW_COUNT + 999,
      });

      expect(geometry.historyRowCount).toBe(MAX_HISTORY_ROW_COUNT);
    });

    it('floors fractional counts', () => {
      expect(
        resolveReputationLoadingGeometry({ historyRowCount: 2.9 }).historyRowCount,
      ).toBe(2);
    });

    it('caps the number of metric labels', () => {
      const tooMany = Array.from({ length: MAX_METRIC_TILE_LABELS + 5 }, (_, i) => `T${i}`);

      const geometry = resolveReputationLoadingGeometry({ metricTileLabels: tooMany });

      expect(geometry.metricTileLabels).toHaveLength(MAX_METRIC_TILE_LABELS);
    });

    it('returns a frozen geometry so callers cannot mutate shared state', () => {
      const geometry = resolveReputationLoadingGeometry({ historyRowCount: 1 });

      expect(Object.isFrozen(geometry)).toBe(true);
      expect(Object.isFrozen(geometry.metricTileLabels)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Component invariants
// ---------------------------------------------------------------------------

describe('ReputationLoading', () => {
  it('renders a busy main landmark', () => {
    const { container } = render(<ReputationLoading />);

    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('aria-busy', 'true');
  });

  it('exposes exactly one polite status announcement', () => {
    render(<ReputationLoading />);

    const statuses = screen.getAllByRole('status');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveTextContent(REPUTATION_LOADING_ANNOUNCEMENT);
    expect(statuses[0]).toHaveAttribute('aria-live', 'polite');
    expect(statuses[0]).toHaveAttribute('aria-atomic', 'true');
  });

  it('marks every skeleton card as decorative', () => {
    const { container } = render(<ReputationLoading />);

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    for (const card of Array.from(section!.children)) {
      expect(card).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('mirrors the default profile geometry (INV-3)', () => {
    const { container } = render(<ReputationLoading />);

    const section = container.querySelector('section')!;
    const profileCard = section.children[0];
    const historyCard = section.children[1];

    const metricGrid = profileCard.children[1];
    expect(metricGrid.children).toHaveLength(DEFAULT_METRIC_TILE_LABELS.length);

    const historyRows = historyCard.querySelector('ol')!;
    expect(historyRows.children).toHaveLength(DEFAULT_HISTORY_ROW_COUNT);
  });

  it('does not leak any user data (INV-2)', () => {
    const { container } = render(<ReputationLoading />);

    // The only text in the DOM is the loading announcement — no score, name,
    // wallet address, or history value can appear in this fallback.
    expect(container.textContent).toBe(REPUTATION_LOADING_ANNOUNCEMENT);
  });

  it('renders deterministically and is idempotent across unmounts (INV-1)', () => {
    const first = render(<ReputationLoading />);
    const firstMarkup = first.container.innerHTML;
    cleanup();

    const second = render(<ReputationLoading />);
    const secondMarkup = second.container.innerHTML;
    cleanup();

    const third = render(<ReputationLoading />);
    const thirdMarkup = third.container.innerHTML;

    expect(secondMarkup).toBe(firstMarkup);
    expect(thirdMarkup).toBe(firstMarkup);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReputationLoading />);

    const results = await axe(container);

    expect(results.violations).toHaveLength(0);
  });
});
