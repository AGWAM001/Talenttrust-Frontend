import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WalletBulkToolbar } from '../WalletBulkToolbar';

describe('WalletBulkToolbar', () => {
  const defaultProps = {
    selectedCount: 2,
    onClearSelection: jest.fn(),
    onExport: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders nothing when selectedCount is 0', () => {
      const { container } = render(<WalletBulkToolbar {...defaultProps} selectedCount={0} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders toolbar with correct count for 1 selected item', () => {
      render(<WalletBulkToolbar {...defaultProps} selectedCount={1} />);
      expect(screen.getByTestId('wallet-bulk-toolbar')).toBeInTheDocument();
      expect(screen.getByText('1 item selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export 1 selected item/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete 1 selected item/i })).toBeInTheDocument();
    });

    it('renders toolbar with correct count for multiple selected items', () => {
      render(<WalletBulkToolbar {...defaultProps} selectedCount={3} />);
      expect(screen.getByText('3 items selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export 3 selected items/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete 3 selected items/i })).toBeInTheDocument();
    });
  });

  describe('mouse click handlers', () => {
    it('calls onClearSelection when Clear selection button is clicked', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      fireEvent.click(clearBtn);
      expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);
    });

    it('calls onExport when Export button is clicked', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      fireEvent.click(exportBtn);
      expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when Delete button is clicked', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      fireEvent.click(deleteBtn);
      expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard — Escape', () => {
    it('clears selection when Escape key is pressed', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClearSelection).toHaveBeenCalledTimes(1);
    });

    it('does not clear selection when Escape is pressed but selectedCount is 0', () => {
      const onClear = jest.fn();
      render(<WalletBulkToolbar {...defaultProps} selectedCount={0} onClearSelection={onClear} />);
      expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();
    });

    it('does not clear selection after component unmounts', () => {
      const onClear = jest.fn();
      const { unmount } = render(
        <WalletBulkToolbar {...defaultProps} onClearSelection={onClear} />
      );
      unmount();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClear).not.toHaveBeenCalled();
    });
  });

  describe('keyboard — Enter/Space activation', () => {
    it('Enter key activates Clear selection button', async () => {
      const onClear = jest.fn();
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} onClearSelection={onClear} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      clearBtn.focus();
      await user.keyboard('{Enter}');

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('Space key activates Clear selection button', async () => {
      const onClear = jest.fn();
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} onClearSelection={onClear} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      clearBtn.focus();
      await user.keyboard('[Space]');

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('Enter key activates Export button', async () => {
      const onExport = jest.fn();
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} onExport={onExport} />);

      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      exportBtn.focus();
      await user.keyboard('{Enter}');

      expect(onExport).toHaveBeenCalledTimes(1);
    });

    it('Space key activates Export button', async () => {
      const onExport = jest.fn();
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} onExport={onExport} />);

      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      exportBtn.focus();
      await user.keyboard('[Space]');

      expect(onExport).toHaveBeenCalledTimes(1);
    });

    it('Enter key activates Delete button', async () => {
      const onDelete = jest.fn();
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} onDelete={onDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      deleteBtn.focus();
      await user.keyboard('{Enter}');

      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('Space key activates Delete button', async () => {
      const onDelete = jest.fn();
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} onDelete={onDelete} />);

      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      deleteBtn.focus();
      await user.keyboard('[Space]');

      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard — arrow navigation within toolbar', () => {
    it('ArrowRight moves focus to next focusable element', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      clearBtn.focus();
      expect(clearBtn).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      expect(exportBtn).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      expect(deleteBtn).toHaveFocus();
    });

    it('ArrowRight wraps around to first element', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      deleteBtn.focus();

      await user.keyboard('{ArrowRight}');
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn).toHaveFocus();
    });

    it('ArrowLeft moves focus to previous focusable element', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      exportBtn.focus();

      await user.keyboard('{ArrowLeft}');
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn).toHaveFocus();
    });

    it('ArrowLeft wraps around to last element', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      clearBtn.focus();

      await user.keyboard('{ArrowLeft}');
      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      expect(deleteBtn).toHaveFocus();
    });

    it('ArrowDown works like ArrowRight', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      clearBtn.focus();

      await user.keyboard('{ArrowDown}');
      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      expect(exportBtn).toHaveFocus();
    });

    it('ArrowUp works like ArrowLeft', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      exportBtn.focus();

      await user.keyboard('{ArrowUp}');
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn).toHaveFocus();
    });

    it('Home moves focus to first element', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      deleteBtn.focus();

      await user.keyboard('{Home}');
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn).toHaveFocus();
    });

    it('End moves focus to last element', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      clearBtn.focus();

      await user.keyboard('{End}');
      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      expect(deleteBtn).toHaveFocus();
    });

    it('arrow keys do not navigate when focus is outside toolbar', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <button data-testid="outside-btn">Outside</button>
          <WalletBulkToolbar {...defaultProps} />
        </div>
      );

      const outsideBtn = screen.getByTestId('outside-btn');
      outsideBtn.focus();
      expect(outsideBtn).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      // Focus should remain on the outside button
      expect(outsideBtn).toHaveFocus();
    });
  });

  describe('keyboard — tab order', () => {
    it('buttons are reachable by Tab in DOM order', async () => {
      const user = userEvent.setup();
      render(<WalletBulkToolbar {...defaultProps} />);

      await user.tab();
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn).toHaveFocus();

      await user.tab();
      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      expect(exportBtn).toHaveFocus();

      await user.tab();
      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      expect(deleteBtn).toHaveFocus();
    });
  });

  describe('focus ring styles', () => {
    it('Clear selection button has focus-visible outline classes', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn.className).toMatch(/focus-visible:outline/);
    });

    it('Export button has focus-visible outline classes', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      const exportBtn = screen.getByRole('button', { name: /export 2 selected items/i });
      expect(exportBtn.className).toMatch(/focus-visible:outline/);
    });

    it('Delete button has focus-visible outline classes', () => {
      render(<WalletBulkToolbar {...defaultProps} />);
      const deleteBtn = screen.getByRole('button', { name: /delete 2 selected items/i });
      expect(deleteBtn.className).toMatch(/focus-visible:outline/);
    });
  });

  describe('auto-focus on mount', () => {
    it('auto-focuses the first button when toolbar appears (transition from 0 to >0)', () => {
      const { rerender } = render(
        <WalletBulkToolbar {...defaultProps} selectedCount={0} />
      );

      expect(screen.queryByTestId('wallet-bulk-toolbar')).not.toBeInTheDocument();

      rerender(<WalletBulkToolbar {...defaultProps} selectedCount={2} />);

      const clearBtn = screen.getByRole('button', { name: /clear item selection/i });
      expect(clearBtn).toHaveFocus();
    });
  });
});
