import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionToolbar } from '../BulkActionToolbar';
import { useToast } from '@/components/toast/toast-provider';

// Mock the toast provider
jest.mock('@/components/toast/toast-provider', () => ({
  useToast: jest.fn(),
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('BulkActionToolbar', () => {
  const mockOnSelectAll = jest.fn();
  const mockOnClearSelection = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnExport = jest.fn();
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showSuccess: mockShowSuccess,
      showError: mockShowError,
    } as any);
  });

  describe('Rendering', () => {
    it('does not render when isOpen is false', () => {
      render(
        <BulkActionToolbar
          selectedCount={0}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={false}
        />
      );

      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument();
    });

    it('renders toolbar when isOpen is true', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      expect(screen.getByRole('region', { name: /bulk actions/i })).toBeInTheDocument();
    });

    it('displays correct selection count and remaining count', () => {
      render(
        <BulkActionToolbar
          selectedCount={3}
          totalCount={10}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      expect(screen.getByText('3 of 10 selected')).toBeInTheDocument();
      expect(screen.getByText('7 remaining')).toBeInTheDocument();
    });
  });

  describe('Select All Button', () => {
    it('calls onSelectAll when clicked', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /select all/i }));

      expect(mockOnSelectAll).toHaveBeenCalledTimes(1);
    });

    it('has correct aria-label for select all button', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={7}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const selectAllBtn = screen.getByRole('button', { name: /select all 7/i });
      expect(selectAllBtn).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('calls onClearSelection when clicked', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /clear/i }));

      expect(mockOnClearSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export Button', () => {
    it('is disabled when no items selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={0}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const exportBtn = screen.getByRole('button', { name: /export 0/i });
      expect(exportBtn).toBeDisabled();
    });

    it('is enabled when items are selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const exportBtn = screen.getByRole('button', { name: /export 2/i });
      expect(exportBtn).not.toBeDisabled();
    });

    it('calls onExport and shows success toast when clicked', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /export 2/i }));

      expect(mockOnExport).toHaveBeenCalledTimes(1);
      expect(mockShowSuccess).toHaveBeenCalledWith({
        title: 'Successfully exported 2 contracts.',
      });
    });

    it('shows error toast when export fails', () => {
      mockOnExport.mockImplementation(() => {
        throw new Error('Export failed');
      });

      render(
        <BulkActionToolbar
          selectedCount={1}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /export 1/i }));

      expect(mockShowError).toHaveBeenCalledWith({
        title: 'Failed to export contracts. Please try again.',
      });
    });
  });

  describe('Delete Button', () => {
    it('is disabled when no items selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={0}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /delete 0/i });
      expect(deleteBtn).toBeDisabled();
    });

    it('is enabled when items are selected', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: /delete 2/i });
      expect(deleteBtn).not.toBeDisabled();
    });

    it('shows confirmation dialog when clicked', () => {
      const windowConfirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /delete 2/i }));

      expect(windowConfirmSpy).toHaveBeenCalledWith('Delete 2 contracts?');
      windowConfirmSpy.mockRestore();
    });

    it('calls onDelete and shows success toast when user confirms', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <BulkActionToolbar
          selectedCount={3}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /delete 3/i }));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockShowSuccess).toHaveBeenCalledWith({
        title: 'Successfully deleted 3 contracts.',
      });
    });

    it('does not call onDelete when user cancels', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /delete 2/i }));

      expect(mockOnDelete).not.toHaveBeenCalled();
      expect(mockShowSuccess).not.toHaveBeenCalled();
    });

    it('shows singular "contract" when deleting one item', () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <BulkActionToolbar
          selectedCount={1}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /delete 1/i }));

      expect(mockShowSuccess).toHaveBeenCalledWith({
        title: 'Successfully deleted 1 contract.',
      });
    });
  });

  describe('Accessibility', () => {
    it('has aria-live attribute on toolbar region', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const toolbar = screen.getByRole('region', { name: /bulk actions/i });
      expect(toolbar).toHaveAttribute('aria-live', 'polite');
    });

    it('all buttons are keyboard accessible', () => {
      render(
        <BulkActionToolbar
          selectedCount={2}
          totalCount={5}
          onSelectAll={mockOnSelectAll}
          onClearSelection={mockOnClearSelection}
          onDelete={mockOnDelete}
          onExport={mockOnExport}
          isOpen={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });
});
