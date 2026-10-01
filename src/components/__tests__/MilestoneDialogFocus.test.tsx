import React, { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneCreationForm } from '../milestones/MilestoneCreationForm';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import type { Milestone } from '@/types/domain';

interface DialogHarnessProps {
  onCancel?: () => void;
  onSubmit?: (milestone: Milestone) => void;
}

function DialogHarness({
  onCancel = jest.fn(),
  onSubmit = jest.fn(),
}: DialogHarnessProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open milestone dialog
      </button>
      <button type="button" onClick={() => setIsOpen(false)}>
        Close externally
      </button>
      {isOpen && (
        <MilestoneCreationForm
          onSubmit={(milestone) => {
            onSubmit(milestone);
            setIsOpen(false);
          }}
          onCancel={() => {
            onCancel();
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}

function EmptyDialogTrap({ renderDialog = true }: { renderDialog?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  useDialogFocusTrap({
    isOpen: true,
    dialogRef,
    initialFocusRef,
    onEscape: jest.fn(),
    restoreFocus: true,
  });

  return renderDialog ? <div ref={dialogRef} /> : null;
}

describe('MilestoneCreationForm dialog focus management', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('moves initial focus to the first form field when opened', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open milestone dialog' }));

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
  });

  it('cycles Tab from the last control to the first without reaching outside content', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open milestone dialog' }));

    const title = screen.getByRole('textbox', { name: 'Title' });
    const submit = screen.getByRole('button', { name: 'Add Milestone' });
    const outside = screen.getByRole('button', { name: 'Close externally' });

    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Payout Amount' })).toHaveFocus();

    submit.focus();
    await user.tab();

    expect(title).toHaveFocus();
    expect(outside).not.toHaveFocus();
  });

  it('cycles Shift+Tab from the first control to the last control', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open milestone dialog' }));

    const title = screen.getByRole('textbox', { name: 'Title' });
    const payout = screen.getByRole('textbox', { name: 'Payout Amount' });
    const submit = screen.getByRole('button', { name: 'Add Milestone' });

    payout.focus();
    await user.tab({ shift: true });
    expect(title).toHaveFocus();

    expect(title).toHaveFocus();
    await user.tab({ shift: true });

    expect(submit).toHaveFocus();
  });

  it('invokes onCancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(
      <MilestoneCreationForm onSubmit={jest.fn()} onCancel={onCancel} />,
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('restores focus to the trigger after closing with Escape', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} />);

    const trigger = screen.getByRole('button', { name: 'Open milestone dialog' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('restores focus to the trigger after the Cancel button closes the dialog', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open milestone dialog' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('restores focus to the trigger when the parent closes the dialog', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open milestone dialog' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close externally' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps forward and backward focus on the only enabled focusable element', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open milestone dialog' }));

    const dialog = screen.getByRole('dialog');
    const title = screen.getByRole('textbox', { name: 'Title' });
    dialog
      .querySelectorAll<HTMLElement>('button, input, select, textarea')
      .forEach((element) => {
        if (element !== title) {
          (element as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled = true;
        }
      });

    await user.tab();
    expect(title).toHaveFocus();

    await user.tab({ shift: true });
    expect(title).toHaveFocus();
  });

  it('re-establishes initial focus and restores the trigger across repeated openings', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open milestone dialog' });

    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(trigger).toHaveFocus();
  });

  it('renders required-field errors and keeps the dialog open after an invalid submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<MilestoneCreationForm onSubmit={onSubmit} onCancel={jest.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Milestone' }));

    expect(screen.getAllByText('Title is required')).toHaveLength(2);
    expect(screen.getAllByText('Payout amount is required')).toHaveLength(2);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('validates non-numeric, non-positive, and empty currency values', async () => {
    const user = userEvent.setup();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    const title = screen.getByRole('textbox', { name: 'Title' });
    const payout = screen.getByRole('textbox', { name: 'Payout Amount' });
    const currency = screen.getByRole('combobox', { name: 'Currency' });
    const submit = screen.getByRole('button', { name: 'Add Milestone' });

    await user.type(title, 'Discovery');
    await user.type(payout, 'not-a-number');
    fireEvent.change(currency, { target: { value: '' } });
    await user.click(submit);

    expect(screen.getAllByText('Payout must be a positive number')).toHaveLength(2);
    expect(screen.getAllByText('Currency is required')).toHaveLength(2);

    await user.clear(payout);
    await user.type(payout, '0');
    await user.click(submit);

    expect(screen.getAllByText('Payout must be a positive number')).toHaveLength(2);
  });

  it('submits all field values and restores focus after a successful close', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
    render(<DialogHarness onSubmit={onSubmit} />);

    const trigger = screen.getByRole('button', { name: 'Open milestone dialog' });
    await user.click(trigger);
    await user.type(screen.getByRole('textbox', { name: 'Title' }), ' UI / Review ');
    await user.type(screen.getByRole('textbox', { name: 'Payout Amount' }), '2500.50');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'XLM');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Completed');
    await user.type(screen.getByRole('textbox', { name: 'Due Date' }), 'Jun 1, 2027');
    await user.click(screen.getByRole('button', { name: 'Add Milestone' }));

    expect(onSubmit).toHaveBeenCalledWith({
      id: 'ui-review-1234567890',
      title: 'UI / Review',
      status: 'Completed',
      payout: 2500.5,
      currency: 'XLM',
      dueDate: 'Jun 1, 2027',
      contractId: undefined,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('submits an optional contract id and omits a blank due date', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <MilestoneCreationForm
        contractId="contract-42"
        onSubmit={onSubmit}
        onCancel={jest.fn()}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Delivery');
    await user.type(screen.getByRole('textbox', { name: 'Payout Amount' }), '100');
    await user.click(screen.getByRole('button', { name: 'Add Milestone' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: 'contract-42',
        dueDate: undefined,
      }),
    );
  });

  it('handles temporarily missing dialogs and dialogs with no focusable controls', () => {
    const { rerender } = render(<EmptyDialogTrap renderDialog={false} />);

    expect(() => fireEvent.keyDown(document, { key: 'Tab' })).not.toThrow();

    rerender(<EmptyDialogTrap />);
    expect(() => fireEvent.keyDown(document, { key: 'Tab' })).not.toThrow();
  });

  it('handles the defensive case where the document has no active element', () => {
    const activeElementSpy = jest
      .spyOn(document, 'activeElement', 'get')
      .mockReturnValue(null);

    expect(() => render(<EmptyDialogTrap />)).not.toThrow();

    activeElementSpy.mockRestore();
  });

  it('exposes the visible title as the dialog accessible name', () => {
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Add Milestone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-milestone-title');
    expect(screen.getByRole('heading', { name: 'Add Milestone', level: 2 })).toHaveAttribute(
      'id',
      'create-milestone-title',
    );
  });

  it('closes from the overlay but not from a click inside the panel', () => {
    const onCancel = jest.fn();
    render(<MilestoneCreationForm onSubmit={jest.fn()} onCancel={onCancel} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(screen.getByRole('heading', { name: 'Add Milestone' }));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('re-enters the dialog when focus starts outside before Tab', () => {
    render(
      <>
        <button type="button">Outside trigger</button>
        <MilestoneCreationForm onSubmit={jest.fn()} onCancel={jest.fn()} />
      </>,
    );

    const title = screen.getByRole('textbox', { name: 'Title' });
    const submit = screen.getByRole('button', { name: 'Add Milestone' });
    const outside = screen.getByRole('button', { name: 'Outside trigger' });

    outside.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(title).toHaveFocus();

    outside.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(submit).toHaveFocus();
  });
});
