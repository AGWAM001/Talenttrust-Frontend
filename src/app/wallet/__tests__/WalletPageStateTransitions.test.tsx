/**
 * WalletPage state transition tests
 *
 * Covers:
 * - Initial render state (page heading immediately visible)
 * - Empty state (EmptyState shown when no items and seeds sample data)
 * - Success state (WalletItemList shown when items exist)
 * - Repository load paths (seeding vs persisted items)
 * - State exclusivity: WalletItemList vs EmptyState are mutually exclusive
 * - UI element visibility per state (checkboxes, edit/delete buttons, toolbar)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletPage from '../page';
import { SAMPLE_WALLET_ITEMS } from '../constants';
import { listWalletItems, saveWalletItem } from '@/lib/repository';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';

// Mock repository functions
jest.mock('@/lib/repository', () => ({
  listWalletItems: jest.fn(),
  saveWalletItem: jest.fn(),
  updateWalletItem: jest.fn(),
  deleteWalletItems: jest.fn(() => true),
}));

const mockListWalletItems = jest.mocked(listWalletItems);
const mockSaveWalletItem = jest.mocked(saveWalletItem);

const renderPage = () => {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        <WalletPage />
      </ToastProvider>
    </PreferencesProvider>
  );
};

describe('WalletPage — State Transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Initial render state ────────────────────────────────────────────────────

  describe('Initial render state', () => {
    it('renders the page heading immediately on mount', () => {
      mockListWalletItems.mockReturnValue([]);
      renderPage();

      expect(screen.getByRole('heading', { level: 1, name: /wallet management/i })).toBeInTheDocument();
    });

    it('renders page description immediately on mount', () => {
      mockListWalletItems.mockReturnValue([]);
      renderPage();

      expect(screen.getByText(/manage your connected assets/i)).toBeInTheDocument();
    });

    it('heading and description are always visible regardless of items state', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      expect(screen.getByRole('heading', { level: 1, name: /wallet management/i })).toBeVisible();
      expect(screen.getByText(/manage your connected assets/i)).toBeInTheDocument();
    });
  });

  // ─── Empty state (via fallback seeding) ─────────────────────────────────────

  describe('Empty/seeded state (repository empty)', () => {
    it('seeds sample items and shows WalletItemList when repository is empty', () => {
      mockListWalletItems.mockReturnValue([]);
      renderPage();

      // Page always seeds SAMPLE_WALLET_ITEMS when repository is empty,
      // so WalletItemList (table) is shown — EmptyState is never reached on fresh load
      expect(screen.getByRole('table', { name: /wallet items table/i })).toBeInTheDocument();
      expect(screen.queryByText('No wallet items')).not.toBeInTheDocument();
    });

    it('calls saveWalletItem for each sample item when repository is empty', () => {
      mockListWalletItems.mockReturnValue([]);
      renderPage();

      expect(mockSaveWalletItem).toHaveBeenCalledTimes(SAMPLE_WALLET_ITEMS.length);
      SAMPLE_WALLET_ITEMS.forEach(item => {
        expect(mockSaveWalletItem).toHaveBeenCalledWith(item);
      });
    });

    it('shows all sample items when seeded', () => {
      mockListWalletItems.mockReturnValue([]);
      renderPage();

      SAMPLE_WALLET_ITEMS.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      });
    });

    it('does not call saveWalletItem when repository has items', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      expect(mockSaveWalletItem).not.toHaveBeenCalled();
    });
  });

  // ─── Success state (items present) ──────────────────────────────────────────

  describe('Success state (items loaded from repository)', () => {
    it('renders WalletItemList when items are present', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      expect(screen.getByRole('table', { name: /wallet items table/i })).toBeInTheDocument();
    });

    it('does not render EmptyState when items are loaded', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      expect(screen.queryByText('No wallet items')).not.toBeInTheDocument();
    });

    it('renders all items from repository', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      SAMPLE_WALLET_ITEMS.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument();
      });
    });

    it('renders a single repository item correctly', () => {
      const singleItem = {
        id: 'single-1',
        name: 'Single Token',
        type: 'Custom',
        balance: 42,
        currency: 'TOK',
        status: 'Active' as const,
        createdAt: '2026-06-01',
      };
      mockListWalletItems.mockReturnValue([singleItem]);

      renderPage();

      expect(screen.getByText('Single Token')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('uses repository items (not sample items) when repository has data', () => {
      const repositoryItem = {
        id: 'repo-1',
        name: 'Repository Loaded Item',
        type: 'Asset',
        balance: 100,
        currency: 'XLM',
        status: 'Active' as const,
        createdAt: '2026-01-01',
      };
      mockListWalletItems.mockReturnValue([repositoryItem]);

      renderPage();

      expect(screen.getByText('Repository Loaded Item')).toBeInTheDocument();
      expect(screen.queryByText('Stellar Lumens (XLM)')).not.toBeInTheDocument();
    });
  });

  // ─── State exclusivity ──────────────────────────────────────────────────────

  describe('State exclusivity — WalletItemList vs EmptyState', () => {
    it('WalletItemList and EmptyState are mutually exclusive when items are present', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      const tablePresent = screen.queryByRole('table') !== null;
      const emptyStatePresent = screen.queryByText('No wallet items') !== null;

      // Exactly one should be true
      expect(tablePresent).toBe(true);
      expect(emptyStatePresent).toBe(false);
    });

    it('WalletItemList and EmptyState are mutually exclusive when no items loaded directly', () => {
      // When repository returns [] the page seeds sample items and shows WalletItemList
      mockListWalletItems.mockReturnValue([]);
      renderPage();

      const tablePresent = screen.queryByRole('table') !== null;
      const emptyStatePresent = screen.queryByText('No wallet items') !== null;

      // Only one state is active at a time
      expect(tablePresent !== emptyStatePresent).toBe(true);
    });

    it('never renders both a table and EmptyState simultaneously', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      const table = screen.queryByRole('table');
      const emptyText = screen.queryByText('No wallet items');

      if (table) {
        expect(emptyText).not.toBeInTheDocument();
      } else {
        expect(emptyText).toBeInTheDocument();
      }
    });
  });

  // ─── UI element visibility per state ───────────────────────────────────────

  describe('UI element visibility per state', () => {
    it('select-all checkbox is present in success state', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      expect(screen.getByTestId('select-all-checkbox')).toBeInTheDocument();
    });

    it('per-item checkboxes are rendered for each item', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      SAMPLE_WALLET_ITEMS.forEach(item => {
        expect(screen.getByTestId(`select-item-checkbox-${item.id}`)).toBeInTheDocument();
      });
    });

    it('delete buttons are rendered for each item in success state', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      SAMPLE_WALLET_ITEMS.forEach(item => {
        expect(screen.getByRole('button', { name: `Delete ${item.name}` })).toBeInTheDocument();
      });
    });

    it('edit buttons are rendered for each item in success state', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      SAMPLE_WALLET_ITEMS.forEach(item => {
        expect(screen.getByTestId(`edit-item-btn-${item.id}`)).toBeInTheDocument();
      });
    });

    it('bulk toolbar is NOT visible when no items are selected', () => {
      // Toolbar requires selectedCount > 0 to be visible (returns null otherwise)
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      // With no selection, toolbar returns null
      expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
    });

    it('bulk toolbar appears when items are selected', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      // Select an item
      const firstCheckbox = screen.getByTestId(`select-item-checkbox-${SAMPLE_WALLET_ITEMS[0].id}`);
      fireEvent.click(firstCheckbox);

      expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();
    });

    it('bulk toolbar disappears when selection is cleared', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      // Select then deselect
      const firstCheckbox = screen.getByTestId(`select-item-checkbox-${SAMPLE_WALLET_ITEMS[0].id}`);
      fireEvent.click(firstCheckbox);

      expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();

      fireEvent.click(firstCheckbox);

      expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
    });

    it('item count in table matches repository items count', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      // Each item has a row with a per-item checkbox
      const itemCheckboxes = SAMPLE_WALLET_ITEMS.map(item =>
        screen.queryByTestId(`select-item-checkbox-${item.id}`)
      );
      expect(itemCheckboxes.filter(Boolean)).toHaveLength(SAMPLE_WALLET_ITEMS.length);
    });
  });

  // ─── Item status rendering ───────────────────────────────────────────────────

  describe('Item status badges', () => {
    it('renders Active, Pending, and Archived status badges', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderPage();

      // SAMPLE_WALLET_ITEMS includes all three statuses
      const activeItems = SAMPLE_WALLET_ITEMS.filter(i => i.status === 'Active');
      const pendingItems = SAMPLE_WALLET_ITEMS.filter(i => i.status === 'Pending');
      const archivedItems = SAMPLE_WALLET_ITEMS.filter(i => i.status === 'Archived');

      expect(activeItems.length).toBeGreaterThan(0);
      expect(pendingItems.length).toBeGreaterThan(0);
      expect(archivedItems.length).toBeGreaterThan(0);

      // Check badges are present
      const activeBadges = screen.getAllByText('Active');
      expect(activeBadges.length).toBe(activeItems.length);

      const pendingBadges = screen.getAllByText('Pending');
      expect(pendingBadges.length).toBe(pendingItems.length);

      const archivedBadges = screen.getAllByText('Archived');
      expect(archivedBadges.length).toBe(archivedItems.length);
    });
  });
});
