import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditableContractRow from '../EditableContractRow';
import { assertNoA11yViolations } from '@/test-utils/a11y';
import type { Contract } from '@/types/domain';

const baseContract: Contract = {
  contractName: 'Alpha Agreement',
  parties: [{ label: 'Client', address: '0xAAA' }],
  totalValue: 1000,
  currency: 'USD',
  status: 'Active',
  createdAt: '2026-01-01',
  milestoneCount: 2,
};

function renderRow(overrides: Partial<Contract> = {}) {
  const onSave = jest.fn();
  const contract = { ...baseContract, ...overrides };
  const utils = render(
    <ul>
      <EditableContractRow contract={contract} onSave={onSave} />
    </ul>,
  );
  return { onSave, contract, ...utils };
}

function enterEditMode() {
  fireEvent.click(screen.getByRole('button', { name: /edit alpha agreement/i }));
}

describe('EditableContractRow', () => {
  it('renders the contract details and an edit affordance in display mode', () => {
    renderRow();
    expect(screen.getByText('Alpha Agreement')).toBeInTheDocument();
    expect(screen.getByText(/Active · Created 2026-01-01/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit alpha agreement/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reveals name and status inputs when editing starts', () => {
    renderRow();
    enterEditMode();
    expect(screen.getByLabelText('Contract name')).toHaveValue('Alpha Agreement');
    expect(screen.getByLabelText('Status')).toHaveValue('Active');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('saves an edited name and status, then returns to display mode', () => {
    const { onSave } = renderRow();
    enterEditMode();

    fireEvent.change(screen.getByLabelText('Contract name'), {
      target: { value: 'Renamed Agreement' },
    });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Completed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Alpha Agreement', {
      ...baseContract,
      contractName: 'Renamed Agreement',
      status: 'Completed',
    });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Contract "Renamed Agreement" updated.');
  });

  it('trims surrounding whitespace from the saved name', () => {
    const { onSave } = renderRow();
    enterEditMode();
    fireEvent.change(screen.getByLabelText('Contract name'), {
      target: { value: '   Padded Name   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(
      'Alpha Agreement',
      expect.objectContaining({ contractName: 'Padded Name' }),
    );
  });

  it('blocks saving when the name is empty and shows an alert', () => {
    const { onSave } = renderRow();
    enterEditMode();
    fireEvent.change(screen.getByLabelText('Contract name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Contract name is required.');
    expect(screen.getByLabelText('Contract name')).toBeInTheDocument();
    expect(screen.getByLabelText('Contract name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('clears the validation error once the name is corrected', () => {
    renderRow();
    enterEditMode();
    fireEvent.change(screen.getByLabelText('Contract name'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Contract name'), { target: { value: 'Fixed' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels editing without saving and restores original values', () => {
    const { onSave } = renderRow();
    enterEditMode();
    fireEvent.change(screen.getByLabelText('Contract name'), { target: { value: 'Discarded' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Alpha Agreement')).toBeInTheDocument();

    enterEditMode();
    expect(screen.getByLabelText('Contract name')).toHaveValue('Alpha Agreement');
  });

  it('ignores non-Escape keys while editing', () => {
    const { onSave } = renderRow();
    enterEditMode();
    fireEvent.keyDown(screen.getByLabelText('Contract name'), { key: 'Enter' });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Contract name')).toBeInTheDocument();
  });

  it('cancels editing when Escape is pressed', () => {
    const { onSave } = renderRow();
    enterEditMode();
    fireEvent.change(screen.getByLabelText('Contract name'), { target: { value: 'Discarded' } });
    fireEvent.keyDown(screen.getByLabelText('Contract name'), { key: 'Escape' });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit alpha agreement/i })).toBeInTheDocument();
  });

  it('has no accessibility violations in display or edit mode', async () => {
    const { container } = renderRow();
    await assertNoA11yViolations(container);
    enterEditMode();
    await assertNoA11yViolations(container);
  });
});
