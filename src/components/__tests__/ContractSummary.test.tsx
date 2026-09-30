import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContractSummary, { sanitizeAddress } from '../ContractSummary';
import { PreferencesProvider } from '@/lib/preferences';
import { testA11y } from '@/test-utils/a11y';

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: jest.fn(() => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  })),
}));

function mockClipboard(impl: () => Promise<void> = () => Promise.resolve()) {
  const writeText = jest.fn().mockImplementation(impl);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
}

function renderWithPrefs(
  ui: React.ReactElement,
  prefs: Record<string, unknown> = {}
) {
  localStorage.setItem(
    'talenttrust-user-preferences',
    JSON.stringify({ amountFormat: 'usd', ...prefs })
  );
  return render(<PreferencesProvider>{ui}</PreferencesProvider>);
}

const defaultProps = {
  contractName: 'Escrow Contract',
  parties: [
    { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
    { label: 'Freelancer', address: 'GXYZ9876STU5432VWXQ1098ABCD7654EFGH3210' },
  ],
  totalValue: 1200,
  currency: 'USD',
  status: 'Active' as const,
  createdAt: 'May 1, 2026',
  milestoneCount: 2,
};

describe('ContractSummary', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  it('renders contract name and party addresses truncated', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />);

    expect(screen.getByText('Escrow Contract')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Freelancer')).toBeInTheDocument();
    expect(screen.getByText(/GABC12...7890/)).toBeInTheDocument();
    expect(screen.getByText(/GXYZ98...3210/)).toBeInTheDocument();
  });

  it('renders status badge reflecting the passed status', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Active');
    expect(badge).toHaveAttribute('aria-label', 'Status: Active');
  });

  it('formats total with default USD', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />);

    const expected = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(1200);

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('formats total with NGN override', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />, {
      amountFormat: 'ngn',
    });

    const expected = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(1200);

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('formats total with compact notation', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />, {
      amountFormat: 'compact',
    });

    const expected = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      style: 'currency',
      currency: 'USD',
    }).format(1200);

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('displays correct milestone count for zero milestones', async () => {
    renderWithPrefs(
      <ContractSummary {...defaultProps} milestoneCount={0} />
    );

    expect(await screen.findByText('0 milestones')).toBeInTheDocument();
  });

  it('displays correct milestone count for single milestone', async () => {
    renderWithPrefs(
      <ContractSummary {...defaultProps} milestoneCount={1} />
    );

    expect(await screen.findByText('1 milestone')).toBeInTheDocument();
  });

  it('displays correct party count for zero parties and renders fallback message', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} parties={[]} />);

    expect(screen.getByText('0 parties')).toBeInTheDocument();
    expect(screen.getByText('No parties listed')).toBeInTheDocument();
  });

  it('displays correct party count for a single party', async () => {
    renderWithPrefs(
      <ContractSummary
        {...defaultProps}
        parties={[{ label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' }]}
      />
    );

    expect(screen.getByText('1 party')).toBeInTheDocument();
    expect(screen.queryByText('No parties listed')).not.toBeInTheDocument();
  });

  it('displays correct party count for multiple parties', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />);
    expect(screen.getByText('2 parties')).toBeInTheDocument();
  });

  it('handles duplicate party labels safely using composite keys', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const duplicateProps = {
      ...defaultProps,
      parties: [
        { label: 'Client', address: 'GABC1234DEF5678HIJK9012LMNO3456PQRS7890' },
        { label: 'Client', address: 'GXYZ9876STU5432VWXQ1098ABCD7654EFGH3210' },
      ],
    };
    renderWithPrefs(<ContractSummary {...duplicateProps} />);

    expect(screen.getAllByText('Client')).toHaveLength(2);
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Each child in a list should have a unique "key" prop')
    );
    consoleSpy.mockRestore();
  });

  it('renders with very long addresses', async () => {
    const longAddress =
      'GABC1234DEF5678HIJK9012LMNO3456PQRS7890WXYZ1234EXTRA';
    renderWithPrefs(
      <ContractSummary
        {...defaultProps}
        parties={[{ label: 'Client', address: longAddress }]}
      />
    );

    expect(await screen.findByText('GABC12...XTRA')).toBeInTheDocument();
  });

  it('associates the section via aria-labelledby', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />);

    const section = document.querySelector('section');
    expect(section).toHaveAttribute(
      'aria-labelledby',
      'contract-summary-title'
    );
    const heading = document.getElementById('contract-summary-title');
    expect(heading).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    jest.useRealTimers();
    await testA11y(
      <PreferencesProvider>
        <ContractSummary {...defaultProps} />
      </PreferencesProvider>
    );
    jest.useFakeTimers();
  });

  it('shows relative last-updated timestamp when updatedAt is provided', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
    renderWithPrefs(
      <ContractSummary
        {...defaultProps}
        updatedAt="2026-05-01T11:55:00.000Z"
      />
    );

    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText(/Data last updated/)).toHaveClass('sr-only');
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('does not show last-updated timestamp when updatedAt is absent', async () => {
    renderWithPrefs(<ContractSummary {...defaultProps} />);

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  describe('Clipboard Copying', () => {
    const originalClipboard = navigator.clipboard;

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
        writable: true,
      });
    });

    it('copies the full Client address to the clipboard and shows success toast', async () => {
      const writeText = mockClipboard();
      renderWithPrefs(<ContractSummary {...defaultProps} />);

      const copyBtn = screen.getByRole('button', {
        name: /copy client address to clipboard/i,
      });
      expect(copyBtn).toBeInTheDocument();
      expect(copyBtn).toHaveAttribute('title', 'Copy address');

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeText).toHaveBeenCalledWith('GABC1234DEF5678HIJK9012LMNO3456PQRS7890');
      expect(mockShowSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Address copied',
        })
      );
    });

    it('updates the accessible button name when copied and reverts after 2 seconds', async () => {
      mockClipboard();
      renderWithPrefs(<ContractSummary {...defaultProps} />);

      const copyBtn = screen.getByRole('button', {
        name: /copy client address to clipboard/i,
      });
      expect(copyBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      const copiedButton = screen.getByRole('button', {
        name: /client address copied/i,
      });
      expect(copiedButton).toBeInTheDocument();
      expect(copiedButton).toHaveAttribute('title', 'Client address copied');

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(
        screen.getByRole('button', {
          name: /copy client address to clipboard/i,
        })
      ).toBeInTheDocument();
    });

    it('clears the pending timeout when the same address is copied again before revert', async () => {
      const writeText = mockClipboard();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      renderWithPrefs(<ContractSummary {...defaultProps} />);

      const copyBtn = screen.getByRole('button', {
        name: /copy client address to clipboard/i,
      });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeText).toHaveBeenCalledTimes(2);
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(
        screen.getByRole('button', {
          name: /client address copied/i,
        })
      ).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(
        screen.getByRole('button', {
          name: /copy client address to clipboard/i,
        })
      ).toBeInTheDocument();

      clearTimeoutSpy.mockRestore();
    });

    it('clears the pending timeout when the component unmounts', async () => {
      mockClipboard();
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = renderWithPrefs(<ContractSummary {...defaultProps} />);

      const copyBtn = screen.getByRole('button', {
        name: /copy client address to clipboard/i,
      });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('shows error toast when copying to clipboard fails', async () => {
      mockClipboard(() => Promise.reject(new Error('Permission denied')));
      renderWithPrefs(<ContractSummary {...defaultProps} />);

      const copyBtn = screen.getByRole('button', { name: /copy client address to clipboard/i });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Copy failed',
        })
      );
    });

    it('shows error toast when navigator.clipboard is not supported', async () => {
      removeClipboard();
      renderWithPrefs(<ContractSummary {...defaultProps} />);

      const copyBtn = screen.getByRole('button', { name: /copy client address to clipboard/i });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(mockShowError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Copy not supported',
        })
      );
    });

    it('strips control and bidirectional characters before copying to clipboard', async () => {
      const writeText = mockClipboard();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const VALID_KEY = 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H';
      // Insert control characters and bidi overrides
      const dirtyAddress = `\u202EGAAQC\x03AIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H`;

      const dirtyProps = {
        ...defaultProps,
        parties: [
          { label: 'Client', address: dirtyAddress }
        ]
      };
      renderWithPrefs(<ContractSummary {...dirtyProps} />);

      const copyBtn = screen.getByRole('button', { name: /copy client address to clipboard/i });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeText).toHaveBeenCalledWith(VALID_KEY);
      expect(mockShowSuccess).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('warns when copying a malformed address', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const writeText = mockClipboard();

      const malformedProps = {
        ...defaultProps,
        parties: [
          { label: 'Client', address: 'INVALID_STELLAR_ADDRESS' }
        ]
      };
      renderWithPrefs(<ContractSummary {...malformedProps} />);

      const copyBtn = screen.getByRole('button', { name: /copy client address to clipboard/i });

      await act(async () => {
        fireEvent.click(copyBtn);
      });

      expect(writeText).toHaveBeenCalledWith('INVALID_STELLAR_ADDRESS');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ContractSummary] Copied address appears malformed: "INVALID_STELLAR_ADDRESS"')
      );
      consoleWarnSpy.mockRestore();
    });
  });
});

describe('sanitizeAddress', () => {
  it('strips ASCII control characters', () => {
    expect(sanitizeAddress('GAA\x00QCA\x1fIBA\x7fEAQ\x9fCAI')).toBe('GAAQCAIBAEAQCAI');
  });

  it('strips Unicode bidirectional characters', () => {
    expect(sanitizeAddress('\u200EGAA\u200FQCA\u202AIBA\u202EEAQ\u2066CAI\u2069')).toBe('GAAQCAIBAEAQCAI');
  });

  it('leaves clean alphanumeric strings intact', () => {
    expect(sanitizeAddress('GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H')).toBe(
      'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H'
    );
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeAddress(undefined as unknown as string)).toBe('');
    expect(sanitizeAddress(null as unknown as string)).toBe('');
  });
});
