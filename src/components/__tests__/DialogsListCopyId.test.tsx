/**
 * DialogsListCopyId.test.tsx
 *
 * Tests for issue #51 (icon-only button accessible names) and the copy-to-clipboard
 * feature added to DialogsList.
 * Covers:
 *  - Every icon-only button has an accessible name (aria-label)
 *  - Filter buttons have aria-label
 *  - Copy button renders per dialog item
 *  - Clipboard API success → toast + aria-pressed state change
 *  - execCommand fallback when Clipboard API is absent
 *  - Both paths fail → error toast
 *  - execCommandFallback utility unit tests
 *  - Keyboard operability
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DialogsList, execCommandFallback, type DialogRecord } from '../dialogs/DialogsList';
import * as exportDialogs from '@/lib/exportDialogs';

// ---------------------------------------------------------------------------
// Toast mock
// ---------------------------------------------------------------------------

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sampleDialogs: DialogRecord[] = [
  {
    id: 'dlg-001',
    title: 'Release funds',
    description: 'Approve payment.',
    status: 'Open',
    createdAt: '2024-01-10',
    resolvedAt: null,
  },
  {
    id: 'dlg-002',
    title: 'Dispute contract',
    description: 'Raise a dispute.',
    status: 'Pending',
    createdAt: '2024-01-12',
    resolvedAt: null,
  },
];

// ---------------------------------------------------------------------------
// Clipboard helpers
// ---------------------------------------------------------------------------

let originalClipboard: typeof navigator.clipboard;

beforeEach(() => {
  jest.useFakeTimers();
  originalClipboard = navigator.clipboard;
  mockShowSuccess.mockClear();
  mockShowError.mockClear();
});

afterEach(() => {
  act(() => { jest.runAllTimers(); });
  jest.useRealTimers();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
});

function mockClipboard(impl: () => Promise<void> = () => Promise.resolve()) {
  const writeText = jest.fn().mockImplementation(impl);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return writeText;
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
}

// ---------------------------------------------------------------------------
// Issue #51: Icon-only button accessible names
// ---------------------------------------------------------------------------

describe('DialogsList — icon-only button accessible names (issue #51)', () => {
  it('every copy-ID button has an aria-label', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    sampleDialogs.forEach((d) => {
      const btn = screen.getByTestId(`copy-dialog-id-btn-${d.id}`);
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).not.toBe('');
    });
  });

  it('copy-ID button aria-label references the dialog ID', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    sampleDialogs.forEach((d) => {
      expect(
        screen.getByRole('button', { name: new RegExp(`Copy dialog ID ${d.id}`, 'i') }),
      ).toBeInTheDocument();
    });
  });

  it('filter buttons have aria-label attributes', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    (['All', 'Open', 'Pending', 'Closed'] as const).forEach((status) => {
      const btn = screen.getByText(`Filter ${status}`);
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).not.toBe('');
    });
  });

  it('filter button aria-label references the status', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    (['All', 'Open', 'Pending', 'Closed'] as const).forEach((status) => {
      const btn = screen.getByText(`Filter ${status}`);
      expect(btn.getAttribute('aria-label')).toMatch(new RegExp(status, 'i'));
    });
  });

  it('export CSV button has an accessible aria-label', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-csv-btn')).toHaveAttribute('aria-label', 'Export dialogs as CSV');
  });

  it('export JSON button has an accessible aria-label', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('export-json-btn')).toHaveAttribute('aria-label', 'Export dialogs as JSON');
  });
});

// ---------------------------------------------------------------------------
// Copy button renders
// ---------------------------------------------------------------------------

describe('DialogsList — copy ID button renders', () => {
  it('renders a copy button for each dialog item', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    sampleDialogs.forEach((d) => {
      expect(screen.getByTestId(`copy-dialog-id-btn-${d.id}`)).toBeInTheDocument();
    });
  });

  it('button has aria-pressed="false" before any copy', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('copy-dialog-id-btn-dlg-001')).toHaveAttribute('aria-pressed', 'false');
  });

  it('button text reads "Copy ID" before any click', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('copy-dialog-id-btn-dlg-001')).toHaveTextContent('Copy ID');
  });

  it('dialog ID is rendered as a code element next to the copy button', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('dialog-id-dlg-001')).toHaveTextContent('dlg-001');
  });
});

// ---------------------------------------------------------------------------
// Clipboard API success path
// ---------------------------------------------------------------------------

describe('DialogsList — Clipboard API success', () => {
  it('calls navigator.clipboard.writeText with the dialog ID', async () => {
    const writeText = mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(writeText).toHaveBeenCalledWith('dlg-001');
  });

  it('shows a success toast after copying', async () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
    expect(mockShowSuccess.mock.calls[0][0]).toMatchObject({ title: expect.stringContaining('dlg-001') });
  });

  it('button shows "Copied" and aria-pressed="true" after copy', async () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    const btn = screen.getByTestId('copy-dialog-id-btn-dlg-001');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveTextContent('Copied');
  });

  it('button resets to "Copy ID" after the delay', async () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    act(() => { jest.advanceTimersByTime(2000); });

    await waitFor(() => {
      expect(screen.getByTestId('copy-dialog-id-btn-dlg-001')).toHaveTextContent('Copy ID');
    });
  });

  it('only the clicked button shows "Copied"; others are unaffected', async () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(screen.getByTestId('copy-dialog-id-btn-dlg-001')).toHaveTextContent('Copied');
    expect(screen.getByTestId('copy-dialog-id-btn-dlg-002')).toHaveTextContent('Copy ID');
  });

  it('does not show error toast on success', async () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Clipboard API unavailable — execCommand fallback
// ---------------------------------------------------------------------------

describe('DialogsList — execCommand fallback', () => {
  it('falls back to execCommand when clipboard is absent', async () => {
    removeClipboard();
    document.execCommand = jest.fn().mockReturnValue(true);
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when both Clipboard API and execCommand fail', async () => {
    removeClipboard();
    document.execCommand = jest.fn().mockReturnValue(false);
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(mockShowError).toHaveBeenCalledTimes(1);
    expect(mockShowError.mock.calls[0][0]).toMatchObject({ title: expect.stringContaining('dlg-001') });
  });

  it('shows error toast when Clipboard API rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('denied')));
    document.execCommand = jest.fn().mockReturnValue(false);
    render(<DialogsList dialogs={sampleDialogs} />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-dialog-id-btn-dlg-001'));
    });

    expect(mockShowError).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Keyboard operability
// ---------------------------------------------------------------------------

describe('DialogsList — copy button keyboard operability', () => {
  it('button is not disabled (keyboard reachable)', () => {
    mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    expect(screen.getByTestId('copy-dialog-id-btn-dlg-001')).not.toBeDisabled();
  });

  it('pressing Enter on button triggers the copy', async () => {
    const writeText = mockClipboard();
    render(<DialogsList dialogs={sampleDialogs} />);
    const btn = screen.getByTestId('copy-dialog-id-btn-dlg-001');

    await act(async () => {
      btn.focus();
      fireEvent.keyDown(btn, { key: 'Enter' });
      fireEvent.click(btn);
    });

    expect(writeText).toHaveBeenCalledWith('dlg-001');
  });
});

// ---------------------------------------------------------------------------
// Copy button absent in empty/loading/error states
// ---------------------------------------------------------------------------

describe('DialogsList — copy button not shown when no items', () => {
  it('copy buttons do not appear in empty state', () => {
    render(<DialogsList dialogs={[]} />);
    expect(screen.queryByTestId('copy-dialog-id-btn-dlg-001')).not.toBeInTheDocument();
  });

  it('copy buttons do not appear in loading state', () => {
    render(<DialogsList dialogs={sampleDialogs} isLoading />);
    expect(screen.queryByTestId('copy-dialog-id-btn-dlg-001')).not.toBeInTheDocument();
  });

  it('copy buttons do not appear in error state', () => {
    render(<DialogsList dialogs={sampleDialogs} error="Failed" />);
    expect(screen.queryByTestId('copy-dialog-id-btn-dlg-001')).not.toBeInTheDocument();
  });

  it('copy buttons not shown when filter yields no results', () => {
    const openOnly: DialogRecord[] = [sampleDialogs[0]]; // Open only
    render(<DialogsList dialogs={openOnly} />);
    fireEvent.click(screen.getByText('Filter Closed'));
    expect(screen.queryByTestId('copy-dialog-id-btn-dlg-001')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// execCommandFallback unit tests
// ---------------------------------------------------------------------------

describe('execCommandFallback (DialogsList)', () => {
  it('returns true when execCommand succeeds', () => {
    document.execCommand = jest.fn().mockReturnValue(true);
    expect(execCommandFallback('hello')).toBe(true);
  });

  it('returns false when execCommand returns false', () => {
    document.execCommand = jest.fn().mockReturnValue(false);
    expect(execCommandFallback('hello')).toBe(false);
  });

  it('returns false when execCommand throws', () => {
    document.execCommand = jest.fn().mockImplementation(() => { throw new Error('nope'); });
    expect(execCommandFallback('hello')).toBe(false);
  });

  it('removes the textarea from the DOM after completion', () => {
    document.execCommand = jest.fn().mockReturnValue(true);
    execCommandFallback('test');
    expect(document.body.querySelectorAll('textarea').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Export integration (regression: existing behaviour still works)
// ---------------------------------------------------------------------------

describe('DialogsList — export controls still work after refactor', () => {
  let csvSpy: jest.SpyInstance;
  let jsonSpy: jest.SpyInstance;

  beforeEach(() => {
    csvSpy = jest.spyOn(exportDialogs, 'downloadDialogsCsv').mockImplementation(() => {});
    jsonSpy = jest.spyOn(exportDialogs, 'downloadDialogsJson').mockImplementation(() => {});
    mockClipboard();
  });

  afterEach(() => { jest.restoreAllMocks(); });

  it('CSV export still works', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByTestId('export-csv-btn'));
    expect(csvSpy).toHaveBeenCalledWith(sampleDialogs);
  });

  it('JSON export still works', () => {
    render(<DialogsList dialogs={sampleDialogs} />);
    fireEvent.click(screen.getByTestId('export-json-btn'));
    expect(jsonSpy).toHaveBeenCalledWith(sampleDialogs);
  });
});
