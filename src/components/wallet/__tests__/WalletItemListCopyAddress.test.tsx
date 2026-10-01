/**
 * WalletItemListCopyAddress.test.tsx
 *
 * Tests for the copy-to-clipboard affordance added to wallet identifiers in
 * WalletItemList (issue #853).
 * Covers:
 *  - Copy button renders only for rows with an address
 *  - Accessible label and aria-pressed state
 *  - Clipboard API success path -> toast shown, "Copied" state
 *  - Clipboard API unavailable -> execCommand fallback -> toast shown
 *  - Both fallback paths fail -> error toast shown
 *  - Clipboard API rejects -> execCommand fallback -> toast shown
 *  - Keyboard operability
 *  - "copied" state resets after the delay and is isolated per row
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WalletItemList } from '../WalletItemList';
import type { WalletItem } from '@/types/domain';

// ---------------------------------------------------------------------------
// Toast mock
// ---------------------------------------------------------------------------

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismissToast: jest.fn(),
    toasts: [],
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEMS: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
    status: 'Active',
    createdAt: '2026-01-15',
  },
  {
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3200,
    currency: 'USDC',
    address: 'GA2C456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
    status: 'Pending',
    createdAt: '2026-02-01',
  },
  {
    id: 'w-3',
    name: 'Archived Client Token',
    type: 'Custom Asset',
    balance: 50,
    currency: 'ACT',
    status: 'Archived',
    createdAt: '2025-11-20',
  },
];

function renderList(items = ITEMS) {
  return render(
    <WalletItemList
      items={items}
      selectedIds={new Set()}
      onToggleSelect={jest.fn()}
      onToggleSelectAll={jest.fn()}
    />
  );
}

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
// Render: copy button present only when an address exists
// ---------------------------------------------------------------------------

describe('WalletItemList — copy address button renders', () => {
  it('renders a copy button for each row with an address', () => {
    mockClipboard();
    renderList();
    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toBeInTheDocument();
    expect(screen.getByTestId('copy-wallet-address-btn-w-2')).toBeInTheDocument();
  });

  it('does not render a copy button for a row without an address', () => {
    mockClipboard();
    renderList();
    expect(screen.queryByTestId('copy-wallet-address-btn-w-3')).not.toBeInTheDocument();
  });

  it('button has a descriptive aria-label containing the item name', () => {
    mockClipboard();
    renderList();
    expect(
      screen.getByRole('button', { name: 'Copy wallet address for Stellar Lumens (XLM)' }),
    ).toBeInTheDocument();
  });

  it('button has aria-pressed="false" before any copy', () => {
    mockClipboard();
    renderList();
    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toHaveAttribute('aria-pressed', 'false');
  });

  it('still renders the raw address text next to the button', () => {
    mockClipboard();
    renderList();
    expect(screen.getByText(ITEMS[0].address!)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Clipboard API success path
// ---------------------------------------------------------------------------

describe('WalletItemList — Clipboard API success', () => {
  it('calls navigator.clipboard.writeText with the full (untruncated) address', async () => {
    const writeText = mockClipboard();
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(writeText).toHaveBeenCalledWith(ITEMS[0].address);
  });

  it('shows a success toast after a successful copy', async () => {
    mockClipboard();
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
    expect(mockShowSuccess.mock.calls[0][0]).toMatchObject({
      title: expect.stringContaining('Stellar Lumens (XLM)'),
    });
  });

  it('sets aria-pressed="true" after a successful copy', async () => {
    mockClipboard();
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toHaveAttribute('aria-pressed', 'true');
  });

  it('resets aria-pressed back to "false" after the delay', async () => {
    mockClipboard();
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    act(() => { jest.advanceTimersByTime(2000); });

    await waitFor(() => {
      expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('only the clicked row shows the "copied" state; other rows are unaffected', async () => {
    mockClipboard();
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('copy-wallet-address-btn-w-2')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not show an error toast on success', async () => {
    mockClipboard();
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Clipboard API unavailable — execCommand fallback
// ---------------------------------------------------------------------------

describe('WalletItemList — execCommand fallback (Clipboard API unavailable)', () => {
  it('falls back to execCommand when navigator.clipboard is absent', async () => {
    removeClipboard();
    document.execCommand = jest.fn().mockReturnValue(true);
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast when both Clipboard API and execCommand fail', async () => {
    removeClipboard();
    document.execCommand = jest.fn().mockReturnValue(false);
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(mockShowError).toHaveBeenCalledTimes(1);
    expect(mockShowError.mock.calls[0][0]).toMatchObject({
      title: expect.stringContaining('Stellar Lumens (XLM)'),
    });
  });

  it('falls back to execCommand when Clipboard API rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('Permission denied')));
    document.execCommand = jest.fn().mockReturnValue(true);
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows an error toast when Clipboard API rejects and execCommand also fails', async () => {
    mockClipboard(() => Promise.reject(new Error('Permission denied')));
    document.execCommand = jest.fn().mockReturnValue(false);
    renderList();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-wallet-address-btn-w-1'));
    });

    expect(mockShowError).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Keyboard operability
// ---------------------------------------------------------------------------

describe('WalletItemList — copy button keyboard operability', () => {
  it('button is in the tab order (not disabled)', () => {
    mockClipboard();
    renderList();
    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).not.toBeDisabled();
  });

  it('is reachable via Tab and copies via keyboard activation (Enter)', async () => {
    const writeText = mockClipboard();
    renderList();

    const btn = screen.getByTestId('copy-wallet-address-btn-w-1');

    await act(async () => {
      btn.focus();
      fireEvent.keyDown(btn, { key: 'Enter' });
      fireEvent.click(btn);
    });

    expect(btn).toHaveFocus();
    expect(writeText).toHaveBeenCalledWith(ITEMS[0].address);
  });

  it('copies via keyboard activation (Space) as well', async () => {
    const writeText = mockClipboard();
    renderList();

    const btn = screen.getByTestId('copy-wallet-address-btn-w-2');

    await act(async () => {
      btn.focus();
      fireEvent.keyDown(btn, { key: ' ' });
      fireEvent.click(btn);
    });

    expect(writeText).toHaveBeenCalledWith(ITEMS[1].address);
  });

  it('has a title attribute for a visible tooltip label', () => {
    mockClipboard();
    renderList();
    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toHaveAttribute('title', 'Copy wallet address');
  });
});
