import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditableWalletRow from '../EditableWalletRow';
import type { WalletItem } from '@/types/domain';

const baseItem: WalletItem = {
  id: 'w-1',
  name: 'Stellar Lumens (XLM)',
  type: 'Native Asset',
  balance: 12500,
  currency: 'XLM',
  address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
  status: 'Active',
  createdAt: '2026-01-15',
};

function renderRow(partial?: Partial<WalletItem>, editing = false) {
  const onToggleSelect = jest.fn();
  const onEdit = jest.fn();
  const onSave = jest.fn();
  const onCancel = jest.fn();
  const onDelete = jest.fn();
  const item = { ...baseItem, ...partial };

  const utils = render(
    <table>
      <tbody>
        <EditableWalletRow
          item={item}
          editing={editing}
          selected={false}
          onToggleSelect={onToggleSelect}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </tbody>
    </table>,
  );

  return { onToggleSelect, onEdit, onSave, onCancel, onDelete, item, ...utils };
}

describe('EditableWalletRow — view mode', () => {
  it('renders item details and an edit affordance', () => {
    renderRow();
    expect(screen.getByText('Stellar Lumens (XLM)')).toBeInTheDocument();
    expect(screen.getByText('Native Asset')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTestId('edit-item-btn-w-1')).toBeInTheDocument();
  });

  it('calls onEdit when the edit button is clicked', () => {
    const { onEdit } = renderRow();
    fireEvent.click(screen.getByTestId('edit-item-btn-w-1'));
    expect(onEdit).toHaveBeenCalledWith('w-1');
  });

  it('calls onDelete when the delete button is clicked', () => {
    const { onDelete } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: /delete stellar lumens/i }));
    expect(onDelete).toHaveBeenCalledWith('w-1');
  });

  it('calls onToggleSelect when the checkbox is clicked', () => {
    const { onToggleSelect } = renderRow();
    fireEvent.click(screen.getByTestId('select-item-checkbox-w-1'));
    expect(onToggleSelect).toHaveBeenCalledWith('w-1');
  });
});

describe('EditableWalletRow — edit mode', () => {
  it('shows form inputs and save/cancel buttons when editing', () => {
    renderRow({}, true);
    expect(screen.getByTestId('edit-name-input-w-1')).toHaveValue('Stellar Lumens (XLM)');
    expect(screen.getByTestId('edit-type-input-w-1')).toHaveValue('Native Asset');
    expect(screen.getByTestId('edit-balance-input-w-1')).toHaveValue('12500');
    expect(screen.getByTestId('edit-currency-input-w-1')).toHaveValue('XLM');
    expect(screen.getByTestId('edit-status-select-w-1')).toHaveValue('Active');
    expect(screen.getByTestId('save-edit-btn-w-1')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-edit-btn-w-1')).toBeInTheDocument();
  });

  it('saves changes when Save is clicked', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: 'Updated Token' } });
    fireEvent.change(screen.getByTestId('edit-status-select-w-1'), { target: { value: 'Pending' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('w-1', {
      ...baseItem,
      name: 'Updated Token',
      status: 'Pending',
    });
  });

  it('trims whitespace from name, type, and currency on save', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: '  Padded Name  ' } });
    fireEvent.change(screen.getByTestId('edit-type-input-w-1'), { target: { value: '  New Type  ' } });
    fireEvent.change(screen.getByTestId('edit-currency-input-w-1'), { target: { value: '  USDC  ' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).toHaveBeenCalledWith('w-1', expect.objectContaining({
      name: 'Padded Name',
      type: 'New Type',
      currency: 'USDC',
    }));
  });

  it('blocks saving when name is empty', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Name is required.');
  });

  it('blocks saving when name is only whitespace', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Name is required.');
  });

  it('blocks saving when type is empty', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-type-input-w-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Type is required.');
  });

  it('blocks saving when currency is empty', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-currency-input-w-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Currency is required.');
  });

  it('blocks saving when balance is empty', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-balance-input-w-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Balance must be a valid number.');
  });

  it('blocks saving when balance is not a valid number', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-balance-input-w-1'), { target: { value: 'not-a-number' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Balance must be a valid number.');
  });

  it('blocks saving when balance is negative', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-balance-input-w-1'), { target: { value: '-1' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Balance cannot be negative.');
  });

  it('clears error once the user corrects the input', () => {
    renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: '' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));
    expect(screen.getByTestId('edit-error-w-1')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: 'Fixed' } });
    expect(screen.queryByTestId('edit-error-w-1')).not.toBeInTheDocument();
  });

  it('cancels editing and calls onCancel when Cancel is clicked', () => {
    const { onSave, onCancel } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByTestId('cancel-edit-btn-w-1'));

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledWith('w-1');
  });

  it('cancels editing when Escape is pressed on the row', () => {
    const { onSave, onCancel } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-name-input-w-1'), { target: { value: 'Discarded' } });

    const row = screen.getByTestId('wallet-item-row-w-1');
    fireEvent.keyDown(row, { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledWith('w-1');
  });

  it('disables the checkbox while editing', () => {
    renderRow({}, true);
    const checkbox = screen.getByTestId('wallet-item-row-w-1').querySelector('input[type="checkbox"]');
    expect(checkbox).toBeDisabled();
  });

  it('accepts decimal values for balance', () => {
    renderRow({}, true);
    const input = screen.getByTestId('edit-balance-input-w-1');
    fireEvent.change(input, { target: { value: '12.5' } });
    expect(input).toHaveValue('12.5');
  });

  it('balance validation rejects non-numeric input on save', () => {
    const { onSave } = renderRow({}, true);
    fireEvent.change(screen.getByTestId('edit-balance-input-w-1'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByTestId('save-edit-btn-w-1'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('edit-error-w-1')).toHaveTextContent('Balance must be a valid number.');
  });
});
