/**
 * Keyboard operability tests for ConfirmDialog.
 *
 * Requirements verified:
 *   - All interactive controls are reachable and operable by keyboard.
 *   - Logical focus order (cancel before confirm).
 *   - Initial focus lands on cancel button when dialog opens.
 *   - Tab wraps forward (last → first) and Shift+Tab wraps backward (first → last).
 *   - Enter / Space activate each button.
 *   - Escape triggers onCancel from any focus position.
 *   - Both buttons carry a visible focus-visible class for CSS ring styling.
 *   - Focus is restored to the trigger element after the dialog closes.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

// ---------------------------------------------------------------------------
// Harness — wraps ConfirmDialog with a trigger button so focus-restoration
// tests can verify the trigger re-receives focus after close.
// ---------------------------------------------------------------------------

interface HarnessProps {
  tone?: 'default' | 'destructive';
  onConfirm?: () => void;
  onCancel?: () => void;
}

function DialogHarness({
  tone = 'default',
  onConfirm = jest.fn(),
  onCancel = jest.fn(),
}: HarnessProps) {
  const [open, setOpen] = useState(false);
  const wrappedConfirm = () => {
    onConfirm();
    setOpen(false);
  };
  const wrappedCancel = () => {
    onCancel();
    setOpen(false);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <ConfirmDialog
        isOpen={open}
        title="Confirm action"
        description="Are you sure you want to proceed?"
        confirmLabel="Yes, confirm"
        cancelLabel="No, cancel"
        tone={tone}
        onConfirm={wrappedConfirm}
        onCancel={wrappedCancel}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Focus order
// ---------------------------------------------------------------------------

describe('ConfirmDialog keyboard — focus order', () => {
  it('initial focus is on the cancel button when the dialog opens', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(screen.getByRole('button', { name: 'No, cancel' })).toHaveFocus();
  });

  it('Tab moves focus from cancel to confirm (logical order)', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    // Cancel has focus; Tab → Confirm
    await user.tab();

    expect(screen.getByRole('button', { name: 'Yes, confirm' })).toHaveFocus();
  });

  it('Tab wraps from confirm back to cancel (focus trap — forward)', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    // Cancel → Confirm → (wrap) → Cancel
    await user.tab();
    await user.tab();

    expect(screen.getByRole('button', { name: 'No, cancel' })).toHaveFocus();
  });

  it('Shift+Tab wraps from cancel back to confirm (focus trap — backward)', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    // Cancel has focus; Shift+Tab → (wrap) → Confirm
    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Yes, confirm' })).toHaveFocus();
  });

  it('focus does not escape the dialog when tabbing from the last button', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    // Tab to confirm, then Tab again — should wrap, not escape to the trigger
    await user.tab();
    await user.tab();

    // Focus must be on one of the dialog buttons (cancel or confirm)
    const focused = document.activeElement;
    const dialogButtons = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-hidden') !== 'true');
    expect(dialogButtons).toContain(focused);
  });
});

// ---------------------------------------------------------------------------
// Enter / Space activation
// ---------------------------------------------------------------------------

describe('ConfirmDialog keyboard — Enter and Space activation', () => {
  it('pressing Enter on the confirm button calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<DialogHarness onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    // Tab to confirm
    await user.tab();
    await user.keyboard('{Enter}');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('pressing Space on the confirm button calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<DialogHarness onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    await user.tab();
    await user.keyboard(' ');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('pressing Enter on the cancel button calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    // Cancel already has focus
    await user.keyboard('{Enter}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('pressing Space on the cancel button calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    await user.keyboard(' ');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Escape key
// ---------------------------------------------------------------------------

describe('ConfirmDialog keyboard — Escape key', () => {
  it('Escape calls onCancel when focus is on cancel button', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape calls onCancel when focus is on confirm button', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DialogHarness onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    await user.tab(); // move to confirm
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('dialog is removed from the DOM after Escape', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Focus restoration
// ---------------------------------------------------------------------------

describe('ConfirmDialog keyboard — focus restoration', () => {
  it('focus returns to the trigger after closing with Escape', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
  });

  it('focus returns to the trigger after cancel button is activated', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(trigger);
    await user.keyboard('{Enter}'); // activate cancel (initial focus)

    expect(trigger).toHaveFocus();
  });

  it('focus returns to the trigger after confirm button is activated', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(trigger);
    await user.tab();            // move to confirm
    await user.keyboard('{Enter}');

    expect(trigger).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Visible focus styles
// ---------------------------------------------------------------------------

describe('ConfirmDialog keyboard — visible focus styles', () => {
  it('cancel button has focus-visible class for CSS ring styling', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Focus ring check"
        description="Buttons must have a visible focus ring."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn.className).toMatch(/focus-visible/);
  });

  it('confirm button has focus-visible class for CSS ring styling', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Focus ring check"
        description="Buttons must have a visible focus ring."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).toMatch(/focus-visible/);
  });

  it('destructive confirm button has a red focus ring class', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Destructive"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    // Destructive tone should carry a red ring variant
    expect(deleteBtn.className).toMatch(/ring-red/);
  });

  it('default confirm button does not carry a red focus ring class', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Default"
        description="Standard action."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        tone="default"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmBtn.className).not.toMatch(/ring-red/);
    // Should use blue instead
    expect(confirmBtn.className).toMatch(/ring-blue/);
  });
});

// ---------------------------------------------------------------------------
// Destructive tone keyboard operability
// ---------------------------------------------------------------------------

describe('ConfirmDialog keyboard — destructive tone', () => {
  it('alertdialog responds to Escape and calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(<DialogHarness tone="destructive" onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('alertdialog confirm is reachable by Tab and activatable with Enter', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    render(<DialogHarness tone="destructive" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Open dialog' }));
    await user.tab();            // cancel → confirm
    await user.keyboard('{Enter}');

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
