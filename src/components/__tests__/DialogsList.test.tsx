/**
 * DialogsList.test.tsx
 *
 * Tests for src/components/dialogs/DialogsList.tsx (issue #53).
 * Covers:
 *  - Loading / error / empty / success states (mutually exclusive)
 *  - State transitions
 *  - Filter-respect: export buttons act on the filtered view
 *  - CSV and JSON export integration (download triggered with correct data)
 *  - Empty-view export guard (buttons disabled when nothing to export)
 *  - Accessibility attributes on export controls
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DialogsList, type DialogRecord } from '../dialogs/DialogsList';
import * as exportDialogs from '@/lib/exportDialogs';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleDialogs: DialogRecord[] = [
  {
    id: 'dlg-001',
    title: 'Release funds',
    description: 'Approve payment to contractor.',
    status: 'Open',
    createdAt: '2024-01-10',
    resolvedAt: null,
  },
  {
    id: 'dlg-002',
    title: 'Dispute contract',
    description: 'Raise a dispute for milestone 3.',
    status: 'Pending',
    createdAt: '2024-01-12',
    resolvedAt: null,
  },
  {
    id: 'dlg-003',
    title: 'Project closure',
    description: 'Final sign-off and close.',
    status: 'Closed',
    createdAt: '2024-01-20',
    resolvedAt: '2024-01-25',
  },
];

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('DialogsList — loading state', () => {
  it('renders the loading skeleton when isLoading=true', () => {
    render(<DialogsList dialogs={[]} isLoading />);
    expect(screen.getByTestId('dialogs-loading')).toBeInTheDocument();
  });

  it('loading skeleton has aria-busy="true"', () => {
    render(<DialogsList dialogs={[]} isLoading />);
    expect(screen.getByTestId('dialogs-loading')).toHaveAttribute('aria-busy', 'true');
  });

  it('loading skeleton has an accessible aria-label', () => {
    render(<DialogsList dialogs={[]} isLoading />);
    expect(screen.getByTestId('dialogs-loading')).toHaveAttribute('aria-label');
  });

  it('does NOT show the list while loading', () => {
    render(<DialogsList dialogs={sampleDialogs} isLoading />);
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
  });

  it('does NOT show the empty state while loading', () => {
    render(<DialogsList dialogs={[]} isLoading />);
    expect(screen.queryByTestId('dialogs-empty')).not.toBeInTheDocument();
  });

  it('does NOT show the error state while loading', () => {
    render(<DialogsList dialogs={[]} isLoading error="fail" />);
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-loading')).toBeInTheDocument();
  });

  it('loading is mutually exclusive with all other states', () => {
    render(<DialogsList dialogs={sampleDialogs} isLoading />);
    expect(screen.getByTestId('dialogs-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

describe('DialogsList — error state', () => {
  it('renders error element when error prop is set', () => {
    render(<DialogsList dialogs={[]} error="Failed to load." />);
    expect(screen.getByTestId('dialogs-error')).toBeInTheDocument();
  });

  it('error element has role="alert"', () => {
    render(<DialogsList dialogs={[]} error="Network error" />);
    expect(screen.getByTestId('dialogs-error')).toHaveAttribute('role', 'alert');
  });

  it('renders the error message text', () => {
    render(<DialogsList dialogs={[]} error="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('does NOT show the list in error state', () => {
    render(<DialogsList dialogs={sampleDialogs} error="Oops" />);
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
  });

  it('does NOT show the loading skeleton in error state', () => {
    render(<DialogsList dialogs={[]} error="Oops" />);
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
  });

  it('error is mutually exclusive with all other states', () => {
    render(<DialogsList dialogs={sampleDialogs} error="Oh no!" />);
    expect(screen.getByTestId('dialogs-error')).toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('DialogsList — empty state', () => {
  it('renders the empty state when dialogs is an empty array', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.getByTestId('dialogs-empty')).toBeInTheDocument();
  });

  it('shows the "All" empty message by default', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.getByText('There are no dialogs to display.')).toBeInTheDocument();
  });

  it('shows a filter-specific empty message when filter yields no results', () => {
    const openOnly: DialogRecord[] = [sampleDialogs[0]]; // Open only
    render(<DialogsList dialogs={openOnly} />);
    fireEvent.click(screen.getByText('Filter Closed'));
    expect(screen.getByTestId('dialogs-empty')).toBeInTheDocument();
    expect(screen.getByText(/No dialogs match the "Closed" filter/)).toBeInTheDocument();
  });

  it('does NOT show the list when empty', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
  });

  it('does NOT show loading skeleton when empty', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
  });

  it('does NOT show error state when empty', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
  });

  it('empty is mutually exclusive with all other states', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.getByTestId('dialogs-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

describe('DialogsList — success state', () => {
  it('renders the list when dialogs are provided', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('dialogs-list')).toBeInTheDocument();
  });

  it('renders one list item per dialog', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(sampleDialogs.length);
  });

  it('renders each dialog title', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    sampleDialogs.forEach((d) => {
      expect(screen.getByText(d.title)).toBeInTheDocument();
    });
  });

  it('renders each dialog id', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    sampleDialogs.forEach((d) => {
      expect(screen.getByTestId(`dialog-id-${d.id}`)).toHaveTextContent(d.id);
    });
  });

  it('renders each dialog status', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    sampleDialogs.forEach((d) => {
      expect(screen.getByTestId(`dialog-status-${d.id}`)).toHaveTextContent(d.status);
    });
  });

  it('does NOT show loading skeleton in success state', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
  });

  it('does NOT show error in success state', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
  });

  it('does NOT show empty state in success state', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.queryByTestId('dialogs-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

describe('DialogsList — state transitions', () => {
  it('transitions from loading → success', () => {
    const { rerender } = render(<DialogsList dialogs={[]} isLoading />);
    expect(screen.getByTestId('dialogs-loading')).toBeInTheDocument();
    rerender(<DialogsList dialogs={sampleDialogs} isLoading={false} />);
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-list')).toBeInTheDocument();
  });

  it('transitions from loading → empty', () => {
    const { rerender } = render(<DialogsList dialogs={[]} isLoading />);
    rerender(<DialogsList dialogs={[]} isLoading={false} />);
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-empty')).toBeInTheDocument();
  });

  it('transitions from loading → error', () => {
    const { rerender } = render(<DialogsList dialogs={[]} isLoading />);
    rerender(<DialogsList dialogs={[]} isLoading={false} error="Request failed." />);
    expect(screen.queryByTestId('dialogs-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-error')).toBeInTheDocument();
  });

  it('transitions from error → success when error is cleared', () => {
    const { rerender } = render(<DialogsList dialogs={sampleDialogs} error="Oops" />);
    expect(screen.getByTestId('dialogs-error')).toBeInTheDocument();
    rerender(<DialogsList dialogs={sampleDialogs} error={null} />);
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-list')).toBeInTheDocument();
  });

  it('transitions from success → empty when all dialogs removed', () => {
    const { rerender } = render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('dialogs-list')).toBeInTheDocument();
    rerender(<DialogsList dialogs={[]} />);
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-empty')).toBeInTheDocument();
  });

  it('loading takes precedence over error', () => {
    render(<DialogsList dialogs={[]} isLoading error="fail" />);
    expect(screen.getByTestId('dialogs-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-error')).not.toBeInTheDocument();
  });

  it('filter: success → empty → success round-trip', () => {
    const openOnly: DialogRecord[] = [sampleDialogs[0]];
    render(<DialogsList dialogs={openOnly} />);
    expect(screen.getByTestId('dialogs-list')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Filter Closed'));
    expect(screen.queryByTestId('dialogs-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('dialogs-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Filter All'));
    expect(screen.getByTestId('dialogs-list')).toBeInTheDocument();
    expect(screen.queryByTestId('dialogs-empty')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe('DialogsList — filtering', () => {
  it('shows all dialogs when "Filter All" is active', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows only Open dialogs when "Filter Open" is clicked', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Open'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('dialog-status-dlg-001')).toHaveTextContent('Open');
  });

  it('shows only Pending dialogs when "Filter Pending" is clicked', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Pending'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('dialog-status-dlg-002')).toHaveTextContent('Pending');
  });

  it('shows only Closed dialogs when "Filter Closed" is clicked', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Closed'));
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('dialog-status-dlg-003')).toHaveTextContent('Closed');
  });

  it('filter button has aria-pressed="true" for the active filter', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Open'));
    expect(screen.getByText('Filter Open')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Filter All')).toHaveAttribute('aria-pressed', 'false');
  });
});

// ---------------------------------------------------------------------------
// Export controls — accessibility and disabled state
// ---------------------------------------------------------------------------

describe('DialogsList — export controls accessibility', () => {
  it('renders the CSV export button', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-csv-btn')).toBeInTheDocument();
  });

  it('renders the JSON export button', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-json-btn')).toBeInTheDocument();
  });

  it('CSV button has an accessible aria-label', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-csv-btn')).toHaveAttribute('aria-label', 'Export dialogs as CSV');
  });

  it('JSON button has an accessible aria-label', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-json-btn')).toHaveAttribute('aria-label', 'Export dialogs as JSON');
  });

  it('CSV button is enabled when dialogs are present', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-csv-btn')).not.toBeDisabled();
  });

  it('JSON button is enabled when dialogs are present', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-json-btn')).not.toBeDisabled();
  });

  it('CSV button is disabled when dialogs list is empty', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.getByTestId('export-csv-btn')).toBeDisabled();
  });

  it('JSON button is disabled when dialogs list is empty', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.getByTestId('export-json-btn')).toBeDisabled();
  });

  it('export buttons are disabled when filter produces empty results', () => {
    const openOnly: DialogRecord[] = [sampleDialogs[0]];
    render(<DialogsList dialogs={openOnly} />);
    fireEvent.click(screen.getByText('Filter Closed'));
    expect(screen.getByTestId('export-csv-btn')).toBeDisabled();
    expect(screen.getByTestId('export-json-btn')).toBeDisabled();
  });

  it('export buttons re-enable when filter is reset to matching results', () => {
    const openOnly: DialogRecord[] = [sampleDialogs[0]];
    render(<DialogsList dialogs={openOnly} />);
    fireEvent.click(screen.getByText('Filter Closed'));
    expect(screen.getByTestId('export-csv-btn')).toBeDisabled();
    fireEvent.click(screen.getByText('Filter All'));
    expect(screen.getByTestId('export-csv-btn')).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Export controls — download integration
// ---------------------------------------------------------------------------

describe('DialogsList — export download integration', () => {
  let csvSpy: jest.SpyInstance;
  let jsonSpy: jest.SpyInstance;

  beforeEach(() => {
    csvSpy = jest.spyOn(exportDialogs, 'downloadDialogsCsv').mockImplementation(() => {});
    jsonSpy = jest.spyOn(exportDialogs, 'downloadDialogsJson').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls downloadDialogsCsv with the full unfiltered list by default', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByTestId('export-csv-btn'));
    expect(csvSpy).toHaveBeenCalledTimes(1);
    expect(csvSpy).toHaveBeenCalledWith(sampleDialogs);
  });

  it('calls downloadDialogsJson with the full unfiltered list by default', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByTestId('export-json-btn'));
    expect(jsonSpy).toHaveBeenCalledTimes(1);
    expect(jsonSpy).toHaveBeenCalledWith(sampleDialogs);
  });

  it('respects active filter: CSV exports only the filtered subset', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Open'));
    fireEvent.click(screen.getByTestId('export-csv-btn'));
    const exportedDialogs = csvSpy.mock.calls[0][0] as DialogRecord[];
    expect(exportedDialogs).toHaveLength(1);
    expect(exportedDialogs[0].id).toBe('dlg-001');
  });

  it('respects active filter: JSON exports only the filtered subset', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Pending'));
    fireEvent.click(screen.getByTestId('export-json-btn'));
    const exportedDialogs = jsonSpy.mock.calls[0][0] as DialogRecord[];
    expect(exportedDialogs).toHaveLength(1);
    expect(exportedDialogs[0].id).toBe('dlg-002');
  });

  it('does not call download when CSV button is disabled (empty view)', () => {
    render(<DialogsList dialogs={[]} />);
    fireEvent.click(screen.getByTestId('export-csv-btn'));
    expect(csvSpy).not.toHaveBeenCalled();
  });

  it('does not call download when JSON button is disabled (empty view)', () => {
    render(<DialogsList dialogs={[]} />);
    fireEvent.click(screen.getByTestId('export-json-btn'));
    expect(jsonSpy).not.toHaveBeenCalled();
  });

  it('exports the Closed subset when Closed filter is active', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByText('Filter Closed'));
    fireEvent.click(screen.getByTestId('export-json-btn'));
    const exportedDialogs = jsonSpy.mock.calls[0][0] as DialogRecord[];
    expect(exportedDialogs).toHaveLength(1);
    expect(exportedDialogs[0].status).toBe('Closed');
  });
});
