/**
 * Deterministic wallet seed failure-recovery tests (#1261).
 *
 * Covers the mount-time seeding path in `WalletPage`, which persists the
 * starter wallet items from `constants.ts` only when the repository is empty.
 * These tests pin the recovery guarantees:
 *  - success seeds every item exactly once and shows them,
 *  - a partial persistence failure never leaves phantom items on screen and
 *    surfaces a user-visible, non-sensitive diagnostic,
 *  - a total failure recovers to the empty state (no invented rows),
 *  - a non-empty repository is never re-seeded.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletPage from '../page';
import { listWalletItems, saveWalletItem } from '@/lib/repository';
import { reportError } from '@/lib/errorReporter';
import { getSampleWalletItems } from '../constants';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';

jest.mock('@/lib/repository', () => ({
  listWalletItems: jest.fn(),
  saveWalletItem: jest.fn(),
  updateWalletItem: jest.fn(),
  deleteWalletItems: jest.fn(() => true),
}));

jest.mock('@/lib/errorReporter', () => ({
  reportError: jest.fn(),
}));

const mockListWalletItems = jest.mocked(listWalletItems);
const mockSaveWalletItem = jest.mocked(saveWalletItem);
const mockReportError = jest.mocked(reportError);

const renderPage = () =>
  render(
    <PreferencesProvider>
      <ToastProvider>
        <WalletPage />
      </ToastProvider>
    </PreferencesProvider>
  );

const STARTER_ITEMS = getSampleWalletItems();
const ERROR_TITLE = 'Wallet data partially unavailable';

describe('WalletPage — deterministic seed failure recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListWalletItems.mockReturnValue([]);
    mockSaveWalletItem.mockReturnValue(true);
  });

  it('persists every starter item once and shows them when the store is empty', () => {
    renderPage();

    expect(mockSaveWalletItem).toHaveBeenCalledTimes(STARTER_ITEMS.length);
    STARTER_ITEMS.forEach((item) => {
      expect(mockSaveWalletItem).toHaveBeenCalledWith(item);
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });

    expect(screen.queryByText(ERROR_TITLE)).not.toBeInTheDocument();
    expect(mockReportError).not.toHaveBeenCalled();
  });

  it('does not render phantom items and surfaces a diagnostic on partial failure', () => {
    const failingId = STARTER_ITEMS[0].id;
    mockSaveWalletItem.mockImplementation((item) => item.id !== failingId);

    renderPage();

    // The item that failed to persist must not appear on screen.
    expect(screen.queryByText(STARTER_ITEMS[0].name)).not.toBeInTheDocument();
    // Every other starter item still renders.
    STARTER_ITEMS.slice(1).forEach((item) => {
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });

    expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
    // Diagnostic reports only counts — never identifiers or addresses.
    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      'WalletPage.seed',
      'warn',
      { failedCount: 1, totalCount: STARTER_ITEMS.length }
    );
  });

  it('recovers to the empty state with no invented rows on total failure', () => {
    mockSaveWalletItem.mockReturnValue(false);

    renderPage();

    expect(screen.getByText('No wallet items')).toBeInTheDocument();
    STARTER_ITEMS.forEach((item) => {
      expect(screen.queryByText(item.name)).not.toBeInTheDocument();
    });
    expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  it('never re-seeds when the repository already holds items', () => {
    const existing = getSampleWalletItems().slice(0, 1).map((item) => ({ ...item, name: 'Already Persisted' }));
    mockListWalletItems.mockReturnValue(existing);

    renderPage();

    expect(mockSaveWalletItem).not.toHaveBeenCalled();
    expect(screen.getByText('Already Persisted')).toBeInTheDocument();
    expect(screen.queryByText(ERROR_TITLE)).not.toBeInTheDocument();
  });

  it('surfaces the error toast asynchronously after a failure', async () => {
    mockSaveWalletItem.mockImplementation(() => false);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(ERROR_TITLE)).toBeInTheDocument();
    });
  });
});
