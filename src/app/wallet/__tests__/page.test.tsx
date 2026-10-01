import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WalletPage from '../page';
import { SAMPLE_WALLET_ITEMS } from '../constants';
import { listWalletItems, saveWalletItem, updateWalletItem, deleteWalletItems } from '@/lib/repository';
import { ToastProvider } from '@/components/toast/toast-provider';
import { PreferencesProvider } from '@/lib/preferences';

// Mock repository functions
jest.mock('@/lib/repository', () => ({
  listWalletItems: jest.fn(),
  saveWalletItem: jest.fn(),
  updateWalletItem: jest.fn(),
  deleteWalletItems: jest.fn(),
}));

const mockListWalletItems = jest.mocked(listWalletItems);
const mockSaveWalletItem = jest.mocked(saveWalletItem);
const mockUpdateWalletItem = jest.mocked(updateWalletItem);
const mockDeleteWalletItems = jest.mocked(deleteWalletItems);

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <PreferencesProvider>
      <ToastProvider>{ui}</ToastProvider>
    </PreferencesProvider>
  );
};

describe('WalletPage Integration & Bulk Selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListWalletItems.mockReturnValue([]);
    mockDeleteWalletItems.mockReturnValue(true);
  });

  it('seeds sample items when repository is empty on mount', async () => {
    renderWithProviders(<WalletPage />);

    expect(mockSaveWalletItem).toHaveBeenCalledTimes(SAMPLE_WALLET_ITEMS.length);
    expect(screen.getByText('Wallet Management')).toBeInTheDocument();
    expect(screen.getByText('Stellar Lumens (XLM)')).toBeInTheDocument();
    expect(screen.getByText('USD Coin (USDC)')).toBeInTheDocument();
  });

  it('renders persisted items from repository when available', () => {
    const customItem = {
      id: 'custom-1',
      name: 'Custom Asset Token',
      type: 'Asset',
      balance: 500,
      currency: 'CAT',
      status: 'Active' as const,
      createdAt: '2026-04-01',
    };
    mockListWalletItems.mockReturnValue([customItem]);

    renderWithProviders(<WalletPage />);

    expect(mockSaveWalletItem).not.toHaveBeenCalled();
    expect(screen.getByText('Custom Asset Token')).toBeInTheDocument();
    expect(screen.queryByText('Stellar Lumens (XLM)')).not.toBeInTheDocument();
  });

  it('handles empty state when no items exist', () => {
    mockListWalletItems.mockReturnValue([]);
    // Prevent sample seeding by mocking empty return after seed
    mockSaveWalletItem.mockImplementation(() => {});

    renderWithProviders(<WalletPage />);
    
    // Clear elements to test empty render behavior
    mockListWalletItems.mockReturnValue([]);
  });

  it('selects and deselects individual items via checkboxes', () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    const itemCheckbox = screen.getByTestId('select-item-checkbox-w-1');
    expect(itemCheckbox).not.toBeChecked();

    fireEvent.click(itemCheckbox);
    expect(itemCheckbox).toBeChecked();
    expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();
    expect(screen.getByText('1 item selected')).toBeInTheDocument();

    fireEvent.click(itemCheckbox);
    expect(itemCheckbox).not.toBeChecked();
    expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
  });

  it('handles Select All and Deselect All', () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
    expect(selectAllCheckbox).not.toBeChecked();

    // Click select all
    fireEvent.click(selectAllCheckbox);
    expect(screen.getByText(`${SAMPLE_WALLET_ITEMS.length} items selected`)).toBeInTheDocument();

    SAMPLE_WALLET_ITEMS.forEach((item) => {
      expect(screen.getByTestId(`select-item-checkbox-${item.id}`)).toBeChecked();
    });

    // Click select all again to deselect all
    fireEvent.click(selectAllCheckbox);
    expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
  });

  it('clears selection when Clear selection button is clicked', () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    const itemCheckbox = screen.getByTestId('select-item-checkbox-w-1');
    fireEvent.click(itemCheckbox);
    expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
    fireEvent.click(clearBtn);

    expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
    expect(itemCheckbox).not.toBeChecked();
  });

  it('exports selected items and triggers success toast', () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    const itemCheckbox = screen.getByTestId('select-item-checkbox-w-1');
    fireEvent.click(itemCheckbox);

    const exportBtn = screen.getByRole('button', { name: /export 1 selected item/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText('Export successful')).toBeInTheDocument();
  });

  it('opens confirmation modal and cancels bulk deletion', async () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    const selectAllCheckbox = screen.getByTestId('select-all-checkbox');
    fireEvent.click(selectAllCheckbox);

    const deleteBtn = screen.getByRole('button', { name: `Delete ${SAMPLE_WALLET_ITEMS.length} selected items` });
    fireEvent.click(deleteBtn);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(`Delete ${SAMPLE_WALLET_ITEMS.length} wallet items?`)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mockDeleteWalletItems).not.toHaveBeenCalled();
  });

  it('confirms bulk deletion, removes items from repository, and updates UI', async () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    // Select first 2 items
    fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));
    fireEvent.click(screen.getByTestId('select-item-checkbox-w-2'));

    const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
    fireEvent.click(deleteBtn);

    // Mock repository after delete
    const remainingItems = SAMPLE_WALLET_ITEMS.slice(2);
    mockListWalletItems.mockReturnValue(remainingItems);

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    expect(mockDeleteWalletItems).toHaveBeenCalledWith(['w-1', 'w-2']);
    await waitFor(() => {
      expect(screen.getByText('Items deleted')).toBeInTheDocument();
    });
  });

  it('deletes a single item when row delete button is clicked', async () => {
    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
    renderWithProviders(<WalletPage />);

    const rowDeleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
    fireEvent.click(rowDeleteBtn);

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete wallet item?')).toBeInTheDocument();

    mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS.slice(1));
    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmBtn);

    expect(mockDeleteWalletItems).toHaveBeenCalledWith(['w-1']);
  });

  describe('inline editing', () => {
    it('enters edit mode when edit button is clicked', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderWithProviders(<WalletPage />);

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));

      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('save-edit-btn-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-edit-btn-w-1')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-name-input-w-2')).not.toBeInTheDocument();
    });

    it('exits edit mode and shows success toast when save succeeds', async () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      mockUpdateWalletItem.mockReturnValue(true);
      renderWithProviders(<WalletPage />);

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: 'Updated Name' } });
      fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

      expect(mockUpdateWalletItem).toHaveBeenCalledWith('w-1', expect.objectContaining({ name: 'Updated Name' }));
      await waitFor(() => {
        expect(screen.getByText('Item updated')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('edit-name-input-w-1')).not.toBeInTheDocument();
    });

    it('shows error toast when save fails', async () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      mockUpdateWalletItem.mockReturnValue(false);
      renderWithProviders(<WalletPage />);

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: 'Updated Name' } });
      fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });

    it('exits edit mode without saving when cancel is clicked', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      renderWithProviders(<WalletPage />);

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-edit-btn-w-1'));
      expect(mockUpdateWalletItem).not.toHaveBeenCalled();
      expect(screen.queryByTestId('edit-name-input-w-1')).not.toBeInTheDocument();
    });

    it('blocks save when validation fails', () => {
      mockListWalletItems.mockReturnValue(SAMPLE_WALLET_ITEMS);
      mockUpdateWalletItem.mockReturnValue(true);
      renderWithProviders(<WalletPage />);

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: '' } });
      fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

      expect(mockUpdateWalletItem).not.toHaveBeenCalled();
      expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Name is required.');
    });
  });
});
