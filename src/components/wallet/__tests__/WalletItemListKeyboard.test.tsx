import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WalletItemList } from '../WalletItemList';
import type { WalletItem } from '@/types/domain';

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

describe('WalletItemList — keyboard operation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('select-all checkbox is first in tab order within the table', async () => {
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    await user.tab();
    expect(screen.getByTestId('select-all-checkbox')).toHaveFocus();
  });

  it('tabs through row focusables in order', async () => {
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    await user.tab();
    expect(screen.getByTestId('select-all-checkbox')).toHaveFocus();

    // Each row: checkbox → edit → delete
    await user.tab();
    expect(screen.getByTestId('select-item-checkbox-w-1')).toHaveFocus();

    // w-1 has an address, so its copy-address button is the next tab stop.
    await user.tab();
    expect(screen.getByTestId('copy-wallet-address-btn-w-1')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('edit-item-btn-w-1')).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' })).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('select-item-checkbox-w-2')).toHaveFocus();

    // w-2 also has an address.
    await user.tab();
    expect(screen.getByTestId('copy-wallet-address-btn-w-2')).toHaveFocus();

    // w-3 has no address, so its checkbox follows directly with no copy button.
    await user.tab();
    expect(screen.getByTestId('edit-item-btn-w-2')).toHaveFocus();
  });

  it('Space key toggles individual selection checkbox', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={onToggle}
        onToggleSelectAll={jest.fn()}
      />
    );

    const checkbox = screen.getByTestId('select-item-checkbox-w-1');
    checkbox.focus();
    await user.keyboard('[Space]');

    expect(onToggle).toHaveBeenCalledWith('w-1');
  });

  it('Enter key on a checkbox does not toggle (Enter submits forms, not toggles checkboxes)', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={onToggle}
        onToggleSelectAll={jest.fn()}
      />
    );

    const checkbox = screen.getByTestId('select-item-checkbox-w-1');
    checkbox.focus();
    await user.keyboard('{Enter}');

    // Enter does not toggle checkbox; only Space does
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('Space key activates select-all checkbox', async () => {
    const onToggleSelectAll = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={onToggleSelectAll}
      />
    );

    const selectAll = screen.getByTestId('select-all-checkbox');
    selectAll.focus();
    await user.keyboard('[Space]');

    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it('tabs to delete button when delete handler is provided', async () => {
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    // tab through select-all, row 1 checkbox, row 1 copy-address, row 1 edit, row 1 delete
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    expect(screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' })).toHaveFocus();
  });

  it('Enter key activates delete button', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={onDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
    deleteBtn.focus();
    await user.keyboard('{Enter}');

    expect(onDelete).toHaveBeenCalledWith('w-1');
  });

  it('Space key activates delete button', async () => {
    const onDelete = jest.fn();
    const user = userEvent.setup();
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
        onDeleteItem={onDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
    deleteBtn.focus();
    await user.keyboard('[Space]');

    expect(onDelete).toHaveBeenCalledWith('w-1');
  });

  it('row has focus-within class for visible focus tracking', () => {
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const row = screen.getByTestId('wallet-item-row-w-1');
    expect(row.className).toContain('focus-within:bg-slate-100/80');
  });

  it('focus-within style is applied to dark mode variant', () => {
    render(
      <WalletItemList
        items={ITEMS}
        selectedIds={new Set()}
        onToggleSelect={jest.fn()}
        onToggleSelectAll={jest.fn()}
      />
    );

    const row = screen.getByTestId('wallet-item-row-w-1');
    expect(row.className).toContain('dark:focus-within:bg-slate-800/60');
  });

  describe('focus ring styles', () => {
    it('select-all checkbox has focus ring classes', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      );

      const selectAll = screen.getByTestId('select-all-checkbox');
      expect(selectAll.className).toMatch(/focus:ring-2/);
      expect(selectAll.className).toMatch(/focus:ring-blue-500/);
    });

    it('item checkbox has focus ring classes', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      );

      const checkbox = screen.getByTestId('select-item-checkbox-w-1');
      expect(checkbox.className).toMatch(/focus:ring-2/);
      expect(checkbox.className).toMatch(/focus:ring-blue-500/);
    });

    it('delete button has focus ring classes', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onDeleteItem={jest.fn()}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: 'Delete Stellar Lumens (XLM)' });
      expect(deleteBtn.className).toMatch(/focus:ring-2/);
      expect(deleteBtn.className).toMatch(/focus:ring-rose-500/);
    });
  });

  describe('logical focus order', () => {
    it('focus order follows table DOM order: per row — checkbox, edit, delete', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onDeleteItem={jest.fn()}
        />
      );

      // In a table, focusable elements follow DOM order which is column-major:
      // all checkboxes first (from thead + tbody), then all buttons (copy-address
      // and delete, in per-row DOM order: copy comes before delete within a row)
      const allCheckboxes = screen.getAllByRole('checkbox');
      const allButtons = screen.getAllByRole('button');
      const focusableOrder = [...allCheckboxes, ...allButtons];

      const actualLabels = Array.from(focusableOrder)
        .filter(el => el.getAttribute('aria-label'))
        .map(el => el.getAttribute('aria-label'));

      const expectedLabels = [
        'Select all wallet items',
        'Select Stellar Lumens (XLM)',
        'Select USD Coin (USDC)',
        'Select Archived Client Token',
        'Copy wallet address for Stellar Lumens (XLM)',
        'Edit Stellar Lumens (XLM)',
        'Delete Stellar Lumens (XLM)',
        'Copy wallet address for USD Coin (USDC)',
        'Edit USD Coin (USDC)',
        'Delete USD Coin (USDC)',
        'Edit Archived Client Token',
        'Delete Archived Client Token',
      ];

      expect(actualLabels).toEqual(expectedLabels);
    });
  });

  describe('empty state', () => {
    it('renders nothing when items array is empty', () => {
      const { container } = render(
        <WalletItemList
          items={[]}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('edit mode', () => {
    it('renders edit button for each item', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onEditItem={jest.fn()}
          onSaveEdit={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      expect(screen.getByTestId('edit-item-btn-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-item-btn-w-2')).toBeInTheDocument();
      expect(screen.getByTestId('edit-item-btn-w-3')).toBeInTheDocument();
    });

    it('shows form inputs for the row being edited', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          editingId="w-1"
          onEditItem={jest.fn()}
          onSaveEdit={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      expect(screen.getByTestId('edit-name-input-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-type-input-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-balance-input-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-currency-input-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-status-select-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('save-edit-btn-w-1')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-edit-btn-w-1')).toBeInTheDocument();

      // Other rows still in view mode
      expect(screen.queryByTestId('edit-name-input-w-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-name-input-w-3')).not.toBeInTheDocument();
    });

    it('calls onEditItem when edit button is clicked', () => {
      const onEditItem = jest.fn();
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          onEditItem={onEditItem}
          onSaveEdit={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
      expect(onEditItem).toHaveBeenCalledWith('w-1');
    });

    it('calls onSaveEdit when Save is clicked', () => {
      const onSaveEdit = jest.fn();
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          editingId="w-1"
          onEditItem={jest.fn()}
          onSaveEdit={onSaveEdit}
          onCancelEdit={jest.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));
      expect(onSaveEdit).toHaveBeenCalledWith('w-1', expect.objectContaining({ name: 'Stellar Lumens (XLM)' }));
    });

    it('calls onCancelEdit when Cancel is clicked', () => {
      const onCancelEdit = jest.fn();
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          editingId="w-1"
          onEditItem={jest.fn()}
          onSaveEdit={jest.fn()}
          onCancelEdit={onCancelEdit}
        />
      );

      fireEvent.click(screen.getByTestId('cancel-edit-btn-w-1'));
      expect(onCancelEdit).toHaveBeenCalledWith('w-1');
    });

    it('editing row has data-editing attribute', () => {
      render(
        <WalletItemList
          items={ITEMS}
          selectedIds={new Set()}
          onToggleSelect={jest.fn()}
          onToggleSelectAll={jest.fn()}
          editingId="w-1"
          onEditItem={jest.fn()}
          onSaveEdit={jest.fn()}
          onCancelEdit={jest.fn()}
        />
      );

      const row = screen.getByTestId('wallet-item-row-w-1');
      expect(row).toHaveAttribute('data-editing', 'true');

      const row2 = screen.getByTestId('wallet-item-row-w-2');
      expect(row2).not.toHaveAttribute('data-editing');
    });
  });
});
