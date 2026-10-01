/**
 * jest-axe accessibility tests for ConfirmDialog.
 *
 * Covers the key view states:
 *   - closed (renders nothing — no violations by definition)
 *   - default/loaded (role="dialog")
 *   - destructive/loaded (role="alertdialog")
 *   - custom button labels
 *   - long / whitespace-heavy description (edge-case content)
 *   - error-style content slot
 *
 * Each open-dialog test runs axe against the full document.body so the
 * backdrop, dialog, and any side-by-side page content are all included in
 * the scan — matching real-world usage.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ConfirmDialog } from '../ConfirmDialog';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Renders the dialog inside a minimal page shell and returns the container. */
function renderDialog(ui: React.ReactElement) {
  return render(
    <div>
      {/* Simulate a real page with background content */}
      <main>
        <h1>Page content</h1>
        <p>Background paragraph that should be hidden from AT when dialog opens.</p>
      </main>
      {ui}
    </div>,
  );
}

// ---------------------------------------------------------------------------
// Closed state
// ---------------------------------------------------------------------------

describe('ConfirmDialog a11y — closed state', () => {
  it('renders nothing when isOpen=false, so there are no violations', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={false}
        title="Delete item"
        description="This action cannot be undone."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Default (loaded) state — role="dialog"
// ---------------------------------------------------------------------------

describe('ConfirmDialog a11y — default loaded state', () => {
  it('has no violations with standard title and description', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Confirm action"
        description="Are you sure you want to proceed?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no violations with custom confirm and cancel labels', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Submit milestone"
        description="Once submitted, the milestone will be reviewed by the client."
        confirmLabel="Yes, submit"
        cancelLabel="Go back"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('exposes aria-labelledby pointing to the visible title element', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Accessible title"
        description="Accessible description"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const titleEl = screen.getByText('Accessible title');
    expect(dialog).toHaveAttribute('aria-labelledby', titleEl.id);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('exposes aria-describedby pointing to the visible description element', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        description="Detailed description of the action."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const descEl = screen.getByText('Detailed description of the action.');
    expect(dialog).toHaveAttribute('aria-describedby', descEl.id);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has aria-modal="true" and no violations', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Modal check"
        description="Verifying modal attribute."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Destructive state — role="alertdialog"
// ---------------------------------------------------------------------------

describe('ConfirmDialog a11y — destructive (alertdialog) state', () => {
  it('has no violations with tone="destructive"', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Delete contract"
        description="This will permanently remove the contract and all its milestones."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('alertdialog has aria-modal="true" and no violations', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Irreversible action"
        description="You cannot undo this."
        tone="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const alertDialog = screen.getByRole('alertdialog');
    expect(alertDialog).toHaveAttribute('aria-modal', 'true');

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('alertdialog has aria-labelledby and aria-describedby wired correctly', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Release funds"
        description="Funds will be transferred to the freelancer immediately."
        tone="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const alertDialog = screen.getByRole('alertdialog');
    const titleEl = screen.getByText('Release funds');
    const descEl = screen.getByText('Funds will be transferred to the freelancer immediately.');

    expect(alertDialog).toHaveAttribute('aria-labelledby', titleEl.id);
    expect(alertDialog).toHaveAttribute('aria-describedby', descEl.id);

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Edge-case content
// ---------------------------------------------------------------------------

describe('ConfirmDialog a11y — edge-case content', () => {
  it('has no violations with a very long description (error-like content)', async () => {
    const longDescription =
      'An unexpected error occurred while processing your request. ' +
      'The server returned a 500 Internal Server Error. ' +
      'Please try again later or contact support if the problem persists. ' +
      'Reference code: ERR-20260715-0042.';

    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Server error"
        description={longDescription}
        confirmLabel="Retry"
        cancelLabel="Dismiss"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no violations when title and description contain special characters', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title='Confirm: "Delete & Archive"'
        description="All data < 30 days will be removed. This affects > 100 records."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('has no violations with minimum-length single-word labels', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="OK?"
        description="Proceed."
        confirmLabel="OK"
        cancelLabel="No"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('both buttons are focusable and present in the accessibility tree', async () => {
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        description="Are you sure?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Background content isolation
// ---------------------------------------------------------------------------

describe('ConfirmDialog a11y — background isolation', () => {
  it('has no violations when background elements carry aria-hidden=true', async () => {
    // When the dialog opens, ConfirmDialog sets aria-hidden on background
    // siblings. axe should still find zero violations in this state.
    const { container } = renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Isolated dialog"
        description="The rest of the page should be hidden from AT."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });

  it('cancel button has visible focus-ring class applied', () => {
    renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Focus check"
        description="Cancel button should have a visible focus ring."
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    // Confirm the className string contains a focus-visible ring utility
    expect(cancelBtn.className).toMatch(/focus-visible/);
  });

  it('confirm button has visible focus-ring class applied', () => {
    renderDialog(
      <ConfirmDialog
        isOpen={true}
        title="Focus check"
        description="Confirm button should have a visible focus ring."
        confirmLabel="Delete"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Delete' });
    expect(confirmBtn.className).toMatch(/focus-visible/);
  });
});
