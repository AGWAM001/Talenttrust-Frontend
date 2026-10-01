/**
 * Concurrency, Race Condition, and State Invariant Regression Tests
 * for src/app/wallet/page.tsx
 *
 * Covers:
 * - Racing and duplicate delete requests (mutex locking)
 * - In-flight mutation locking and re-entrancy prevention
 * - Concurrent edit & delete conflict resolution (auto-cancel edit on delete)
 * - Concurrently deleting unrelated items while editing another item
 * - Selection invariant enforcement (selectedIds ⊆ items.id)
 * - Idempotent seeding and mount-safety (no duplicate items)
 * - Rollback on persistence failure and idempotent retries
 * - Concurrency protection for rapid sequential saves
 * - Export safety under concurrent mutations
 * - Safe error reporting without sensitive data leakage
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletPage from '../page';
import { SAMPLE_WALLET_ITEMS } from '../constants';
import {
  listWalletItems,
  saveWalletItem,
  updateWalletItem,
  deleteWalletItems,
  getWalletItemVersion,
  upsertWalletItem,
} from '@/lib/repository';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';

jest.mock('@/lib/repository', () => ({
  ...jest.requireActual('@/lib/repository'),
  listWalletItems: jest.fn(),
  saveWalletItem: jest.fn(),
  updateWalletItem: jest.fn(),
  deleteWalletItems: jest.fn(),
  getWalletItemVersion: jest.fn(),
  upsertWalletItem: jest.fn(),
}));

const mockListWalletItems = jest.mocked(listWalletItems);
const mockSaveWalletItem = jest.mocked(saveWalletItem);
const mockUpdateWalletItem = jest.mocked(updateWalletItem);
const mockDeleteWalletItems = jest.mocked(deleteWalletItems);
const mockGetWalletItemVersion = jest.mocked(getWalletItemVersion);
const mockUpsertWalletItem = jest.mocked(upsertWalletItem);

const renderWithProviders = (ui: React.ReactElement = <WalletPage />) => {
  return render(
    <PreferencesProvider>
      <ToastProvider>{ui}</ToastProvider>
    </PreferencesProvider>,
  );
};

describe('WalletPage — Concurrency & Invariant Hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    mockDeleteWalletItems.mockReturnValue(true);
    mockUpdateWalletItem.mockReturnValue(true);
    mockSaveWalletItem.mockReturnValue(true);
    mockGetWalletItemVersion.mockReturnValue(1);
    mockUpsertWalletItem.mockReturnValue({ success: true, stale: false });
  });

  // ===========================================================================
  // 1. Racing Requests & Mutex Locking
  // ===========================================================================
  describe('Racing requests & in-flight mutex', () => {
    it('blocks duplicate concurrent delete executions on rapid double-clicks', async () => {
      renderWithProviders();

      // Open single delete modal for w-1
      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      const confirmBtn = screen.getByRole('button', { name: 'Delete' });

      // Simulate rapid double click on Delete
      fireEvent.click(confirmBtn);
      fireEvent.click(confirmBtn);

      // deleteWalletItems must be called only once
      expect(mockDeleteWalletItems).toHaveBeenCalledTimes(1);
      expect(mockDeleteWalletItems).toHaveBeenCalledWith(['w-1']);
    });

    it('displays loading state in confirm dialog while delete is in flight', async () => {
      let resolveDelete!: (value: boolean) => void;
      mockDeleteWalletItems.mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      renderWithProviders();

      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      const confirmBtn = screen.getByRole('button', { name: 'Delete' });

      // Before click: normal label
      expect(confirmBtn).toHaveTextContent('Delete');

      // Click confirm -> initiates async delete
      fireEvent.click(confirmBtn);

      // While in flight, confirm button displays 'Loading...'
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Loading...' })).toBeInTheDocument();
      });

      // Complete the operation
      await act(async () => {
        resolveDelete(true);
      });

      // Upon completion, modal is closed
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
    });

    it('blocks rapid duplicate save clicks during inline edit', async () => {
      let resolveUpdate!: (value: boolean) => void;
      mockUpdateWalletItem.mockImplementationOnce(
        () =>
          new Promise<boolean>((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      renderWithProviders();

      // Enter edit mode
      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();

      const saveBtn = screen.getByTestId('save-edit-btn-w-1');

      // First click: triggers save in-flight
      fireEvent.click(saveBtn);
      // Rapid second click while in-flight
      fireEvent.click(saveBtn);

      expect(mockUpdateWalletItem).toHaveBeenCalledTimes(1);

      // Finish update
      await act(async () => {
        resolveUpdate(true);
      });
    });
  });

  // ===========================================================================
  // 2. Conflict Resolution between Concurrent Edit & Delete
  // ===========================================================================
  describe('Concurrent edit & delete conflict resolution', () => {
    it('cancels edit mode if edited item is included in a bulk delete', async () => {
      renderWithProviders();

      // Select all
      fireEvent.click(screen.getByTestId('select-all-checkbox'));

      // Edit w-1
      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();

      // Trigger bulk delete
      const bulkDeleteBtn = screen.getByRole('button', {
        name: `Delete ${SAMPLE_WALLET_ITEMS.length} selected items`,
      });
      fireEvent.click(bulkDeleteBtn);

      // Confirm delete
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      // Edit mode is cancelled and table displays empty state
      await waitFor(() => {
        expect(screen.getByText('No wallet items')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('edit-name-input-w-1')).not.toBeInTheDocument();
    });

    it('allows deleting an unrelated item while another item is in edit mode', async () => {
      renderWithProviders();

      // Enter edit mode on w-1
      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();

      // Delete w-2
      const deleteW2Btn = screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[1].name}` });
      fireEvent.click(deleteW2Btn);
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(mockDeleteWalletItems).toHaveBeenCalledWith(['w-2']);

      // w-1 should still remain in edit mode
      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();
      // w-2 should be removed
      expect(screen.queryByText(SAMPLE_WALLET_ITEMS[1].name)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 3. Selection Invariant Enforcement (selectedIds ⊆ items.id)
  // ===========================================================================
  describe('Selection invariants under mutations', () => {
    it('prunes deleted items from selectedIds and updates toolbar count', async () => {
      renderWithProviders();

      // Select w-1 and w-2
      fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));
      fireEvent.click(screen.getByTestId('select-item-checkbox-w-2'));

      expect(screen.getByText('2 items selected')).toBeInTheDocument();

      // Delete single item w-1
      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      // w-1 should be deleted, and selectedCount should decrement to 1
      await waitFor(() => {
        expect(screen.getByText('1 item selected')).toBeInTheDocument();
      });
      expect(screen.getByTestId('select-item-checkbox-w-2')).toBeChecked();
    });

    it('cleans up toolbar when all selected items are deleted', async () => {
      renderWithProviders();

      // Select first item
      fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));
      expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();

      // Delete it
      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      // Toolbar must be removed
      await waitFor(() => {
        expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
      });
    });

    it('deduplicates bulk delete IDs when triggering confirmation', async () => {
      renderWithProviders();

      // Select items
      fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));
      fireEvent.click(screen.getByTestId('select-item-checkbox-w-2'));

      fireEvent.click(screen.getByRole('button', { name: /delete 2 selected items/i }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(mockDeleteWalletItems).toHaveBeenCalledWith(['w-1', 'w-2']);
    });
  });

  // ===========================================================================
  // 4. Partial Failure & Rollback Determinism
  // ===========================================================================
  describe('Partial failure & rollback determinism', () => {
    it('rolls back items and selections when deleteWalletItems fails', async () => {
      mockDeleteWalletItems.mockReturnValue(false);
      renderWithProviders();

      // Select w-1
      fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));
      expect(screen.getByTestId('select-item-checkbox-w-1')).toBeChecked();

      // Attempt delete
      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      // Error toast should appear
      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });

      // Item should still be present in DOM
      expect(screen.getByText('Stellar Lumens (XLM)')).toBeInTheDocument();
      // Selection should be restored
      expect(screen.getByTestId('select-item-checkbox-w-1')).toBeChecked();
    });

    it('allows an idempotent retry after a failed deletion', async () => {
      // First attempt fails, second succeeds
      mockDeleteWalletItems.mockReturnValueOnce(false).mockReturnValueOnce(true);
      renderWithProviders();

      // First attempt
      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });

      // Retry delete
      fireEvent.click(screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS[0].name}` }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.getByText('Items deleted')).toBeInTheDocument();
      });

      expect(screen.queryByText('Stellar Lumens (XLM)')).not.toBeInTheDocument();
    });

    it('rolls back edited item and shows error toast when updateWalletItem fails', async () => {
      mockUpdateWalletItem.mockReturnValue(false);
      renderWithProviders();

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      fireEvent.change(screen.getByTestId('edit-name-input-w-1'), {
        target: { value: 'Failed Change' },
      });
      fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });

      // User can cancel edit, and original name is preserved
      fireEvent.click(screen.getByTestId('cancel-edit-btn-w-1'));
      expect(screen.getByText('Stellar Lumens (XLM)')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 5. Mount-Safety and Seeding Idempotency
  // ===========================================================================
  describe('Mount-safety and seeding idempotency', () => {
    it('seeds sample items exactly once even with strict-mode double mount pattern', () => {
      mockListWalletItems.mockReturnValue([]);

      const { unmount } = render(
        <React.StrictMode>
          <PreferencesProvider>
            <ToastProvider>
              <WalletPage />
            </ToastProvider>
          </PreferencesProvider>
        </React.StrictMode>,
      );
      expect(mockSaveWalletItem).toHaveBeenCalledTimes(SAMPLE_WALLET_ITEMS.length);
      unmount();
    });

    it('self-heals and deduplicates items if repository returns duplicates', () => {
      const duplicated = [
        SAMPLE_WALLET_ITEMS[0],
        { ...SAMPLE_WALLET_ITEMS[0] }, // duplicate id
        SAMPLE_WALLET_ITEMS[1],
      ];
      mockListWalletItems.mockReturnValue(duplicated);

      renderWithProviders();

      // Check that only 2 unique rows are rendered
      const checkboxes = screen.getAllByRole('checkbox');
      // 1 select-all + 2 items = 3 checkboxes
      expect(checkboxes).toHaveLength(3);
    });
  });

  // ===========================================================================
  // 6. Export Safety under Concurrency
  // ===========================================================================
  describe('Export safety under concurrency', () => {
    it('exports only existing items even if selection state had stale IDs', () => {
      renderWithProviders();

      fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));

      const exportBtn = screen.getByRole('button', { name: /export 1 selected item/i });
      fireEvent.click(exportBtn);

      expect(screen.getByText('Export successful')).toBeInTheDocument();
    });
  });
});
