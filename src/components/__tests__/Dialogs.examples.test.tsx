/**
 * Compile-verification tests for docs/components/Dialogs.md
 *
 * These tests do NOT assert complex behaviour — ConfirmDialog, ContractCreationForm,
 * and MilestoneCreationForm each have their own dedicated test suites for that.
 *
 * The sole purpose here is to verify that every code example shown in the usage
 * guide compiles and mounts without errors. If a prop is renamed, removed, or its
 * type is changed in the source, TypeScript will surface the regression here
 * before it reaches a reviewer.
 *
 * Each test corresponds to a named example in Dialogs.md.
 */

import React, { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ConfirmDialog } from '../ConfirmDialog';
import {
  ContractCreationForm,
  MAX_CONTRACT_NAME_LENGTH,
  MAX_PARTY_LABEL_LENGTH,
} from '../ContractCreationForm';
import {
  MilestoneCreationForm,
  MAX_MILESTONE_TITLE_LENGTH,
} from '../milestones/MilestoneCreationForm';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import type { Contract } from '@/types/domain';
import type { Milestone } from '@/types/domain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal no-op stubs used across examples. */
const noop = () => {};
const noopContract = (_c: Contract) => {};
const noopMilestone = (_m: Milestone) => {};

// ---------------------------------------------------------------------------
// 1. ConfirmDialog — exported constants and props shape
// ---------------------------------------------------------------------------

describe('docs/components/Dialogs.md — ConfirmDialog', () => {
  it('renders nothing when isOpen=false (closed state)', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete record"
        description="This action cannot be undone."
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('mounts with all required props (basic usage example)', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete record"
        description="This action cannot be undone. The record will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="destructive"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete record')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone. The record will be permanently removed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument();
  });

  it('uses default confirmLabel="Confirm" and cancelLabel="Cancel" when omitted', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Submit"
        description="Send for approval?"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('uses role="dialog" when tone="default" (explicit)', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Submit milestone"
        description="Send this milestone for client approval."
        confirmLabel="Submit"
        tone="default"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('uses role="alertdialog" when tone="destructive"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Dispute contract"
        description="Opening a dispute is permanent and cannot be undone."
        confirmLabel="Open dispute"
        tone="destructive"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('focus-restoration pattern: triggerRef-based close handler compiles correctly', () => {
    /**
     * Mirrors the "Returning focus to the trigger" example in Dialogs.md.
     * We only verify it compiles and renders — focus behaviour is covered by
     * ConfirmDialog.test.tsx and ActionPanel.test.tsx.
     */
    function ActionButton() {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(false);

      const close = () => {
        setOpen(false);
        triggerRef.current?.focus();
      };

      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
            Release funds
          </button>
          <ConfirmDialog
            isOpen={open}
            title="Confirm Release Funds"
            description="Funds will be transferred to the contractor immediately."
            confirmLabel="Release Funds"
            tone="destructive"
            onConfirm={() => { noop(); close(); }}
            onCancel={close}
          />
        </>
      );
    }

    render(<ActionButton />);
    expect(screen.getByRole('button', { name: 'Release funds' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('aria-modal is "true"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Check"
        description="Modal?"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('aria-labelledby points to the title element', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Accessible Title"
        description="Accessible Description"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId!)).toHaveTextContent('Accessible Title');
  });

  it('aria-describedby points to the description element', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Title"
        description="Body text"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const descId = dialog.getAttribute('aria-describedby');
    expect(descId).toBeTruthy();
    expect(document.getElementById(descId!)).toHaveTextContent('Body text');
  });

  it('initial focus lands on the cancel button', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Focus test"
        description="Where does focus go?"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('onConfirm fires when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        description="Are you sure?"
        onConfirm={onConfirm}
        onCancel={noop}
      />,
    );
    screen.getByRole('button', { name: 'Confirm' }).click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('onCancel fires when cancel button is clicked', () => {
    const onCancel = jest.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        description="Are you sure?"
        onConfirm={noop}
        onCancel={onCancel}
      />,
    );
    screen.getByRole('button', { name: 'Cancel' }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('onCancel fires when backdrop is clicked', () => {
    const onCancel = jest.fn();
    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm"
        description="Are you sure?"
        onConfirm={noop}
        onCancel={onCancel}
      />,
    );
    // The backdrop is the aria-hidden div behind the dialog panel
    const backdrop = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    backdrop.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 2. ContractCreationForm — exported constants and props shape
// ---------------------------------------------------------------------------

describe('docs/components/Dialogs.md — ContractCreationForm', () => {
  it('exported MAX_CONTRACT_NAME_LENGTH is 200', () => {
    expect(MAX_CONTRACT_NAME_LENGTH).toBe(200);
  });

  it('exported MAX_PARTY_LABEL_LENGTH is 100', () => {
    expect(MAX_PARTY_LABEL_LENGTH).toBe(100);
  });

  it('mounts with required props and renders the dialog', () => {
    render(
      <ContractCreationForm
        onSubmit={noopContract}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Contract')).toBeInTheDocument();
  });

  it('renders all expected form fields', () => {
    render(<ContractCreationForm onSubmit={noopContract} onCancel={noop} />);
    expect(screen.getByLabelText(/contract name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total value/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
  });

  it('renders the Cancel and Create Contract buttons', () => {
    render(<ContractCreationForm onSubmit={noopContract} onCancel={noop} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create contract/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(<ContractCreationForm onSubmit={noopContract} onCancel={onCancel} />);
    screen.getByRole('button', { name: /cancel/i }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('dialog has aria-modal="true" and aria-labelledby', () => {
    render(<ContractCreationForm onSubmit={noopContract} onCancel={noop} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-contract-title');
  });

  it('usage example: parent controls open/close — form only mounts when showForm=true', () => {
    // This test verifies the compile-time types compile correctly.
    // The actual dialog rendering depends on the full provider chain.
    // We verify the toggle button exists and the ContractCreationForm type is valid.
    function ContractsPage() {
      const [showForm, setShowForm] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setShowForm(true)}>
            Create Contract
          </button>
          {showForm && (
            <ContractCreationForm
              onSubmit={(_c: Contract) => { setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </>
      );
    }

    render(<ContractsPage />);
    expect(screen.getByRole('button', { name: /create contract/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. MilestoneCreationForm — exported constants and props shape
// ---------------------------------------------------------------------------

describe('docs/components/Dialogs.md — MilestoneCreationForm', () => {
  it('exported MAX_MILESTONE_TITLE_LENGTH is 200', () => {
    expect(MAX_MILESTONE_TITLE_LENGTH).toBe(200);
  });

  it('mounts with required props and renders the dialog', () => {
    render(
      <MilestoneCreationForm
        onSubmit={noopMilestone}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // 'Add Milestone' appears in heading and submit button
    expect(screen.getAllByText('Add Milestone').length).toBeGreaterThan(0);
  });

  it('accepts optional contractId prop without error', () => {
    render(
      <MilestoneCreationForm
        contractId="contract-abc-123"
        onSubmit={noopMilestone}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders all expected form fields', () => {
    render(<MilestoneCreationForm onSubmit={noopMilestone} onCancel={noop} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payout amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
  });

  it('renders the Cancel and Add Milestone buttons', () => {
    render(<MilestoneCreationForm onSubmit={noopMilestone} onCancel={noop} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = jest.fn();
    render(<MilestoneCreationForm onSubmit={noopMilestone} onCancel={onCancel} />);
    screen.getByRole('button', { name: /cancel/i }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('dialog has aria-modal="true" and aria-labelledby="create-milestone-title"', () => {
    render(<MilestoneCreationForm onSubmit={noopMilestone} onCancel={noop} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-milestone-title');
  });

  it('initial focus lands on the title input', () => {
    render(<MilestoneCreationForm onSubmit={noopMilestone} onCancel={noop} />);
    expect(document.activeElement).toBe(screen.getByLabelText(/title/i));
  });

  it('usage example — standalone milestones page pattern compiles and mounts', () => {
    function MilestonesPage() {
      const [showForm, setShowForm] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setShowForm(true)}>
            Add Milestone
          </button>
          {showForm && (
            <MilestoneCreationForm
              onSubmit={(_m: Milestone) => { setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </>
      );
    }

    render(<MilestonesPage />);
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
  });

  it('usage example — contract detail page pattern (with contractId) compiles', () => {
    function ContractDetailPage() {
      const [showForm, setShowForm] = useState(false);
      const contractId = 'contract-xyz-789';
      return (
        <>
          <button type="button" onClick={() => setShowForm(true)}>
            Add Milestone
          </button>
          {showForm && (
            <MilestoneCreationForm
              contractId={contractId}
              onSubmit={(_m: Milestone) => { setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          )}
        </>
      );
    }

    render(<ContractDetailPage />);
    expect(screen.getByRole('button', { name: /add milestone/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. useDialogFocusTrap — custom dialog usage example from Dialogs.md
// ---------------------------------------------------------------------------

describe('docs/components/Dialogs.md — useDialogFocusTrap hook', () => {
  it('custom dialog example compiles and mounts correctly', () => {
    /**
     * This is the verbatim "Usage in a custom dialog" example from Dialogs.md.
     * It verifies the hook's option names and types are still accurate.
     */
    interface MyDialogProps {
      isOpen: boolean;
      onClose: () => void;
    }

    function MyDialog({ isOpen, onClose }: MyDialogProps) {
      const dialogRef = useRef<HTMLDivElement>(null);
      const firstInputRef = useRef<HTMLInputElement>(null);

      useDialogFocusTrap({
        isOpen,
        dialogRef,
        initialFocusRef: firstInputRef,
        onEscape: onClose,
        restoreFocus: true,
      });

      if (!isOpen) return null;

      return (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-dialog-title"
        >
          <h2 id="my-dialog-title">My Dialog</h2>
          <input ref={firstInputRef} type="text" aria-label="First input" />
          <button type="button" onClick={onClose}>Close</button>
        </div>
      );
    }

    render(<MyDialog isOpen={true} onClose={noop} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'My Dialog' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'First input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('custom dialog example renders nothing when isOpen=false', () => {
    interface MyDialogProps { isOpen: boolean; onClose: () => void; }

    function MyDialog({ isOpen, onClose }: MyDialogProps) {
      const dialogRef = useRef<HTMLDivElement>(null);
      const firstInputRef = useRef<HTMLInputElement>(null);
      useDialogFocusTrap({ isOpen, dialogRef, initialFocusRef: firstInputRef, onEscape: onClose });
      if (!isOpen) return null;
      return (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="d-title">
          <h2 id="d-title">My Dialog</h2>
          <input ref={firstInputRef} type="text" aria-label="Input" />
          <button type="button" onClick={onClose}>Close</button>
        </div>
      );
    }

    const { container } = render(<MyDialog isOpen={false} onClose={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('initial focus moves to initialFocusRef when isOpen becomes true', () => {
    interface MyDialogProps { isOpen: boolean; onClose: () => void; }

    function MyDialog({ isOpen, onClose }: MyDialogProps) {
      const dialogRef = useRef<HTMLDivElement>(null);
      const firstInputRef = useRef<HTMLInputElement>(null);
      useDialogFocusTrap({
        isOpen,
        dialogRef,
        initialFocusRef: firstInputRef,
        onEscape: onClose,
        restoreFocus: true,
      });
      if (!isOpen) return null;
      return (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="d-title">
          <h2 id="d-title">My Dialog</h2>
          <input ref={firstInputRef} type="text" aria-label="First field" />
          <button type="button" onClick={onClose}>Close</button>
        </div>
      );
    }

    render(<MyDialog isOpen={true} onClose={noop} />);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'First field' }));
  });
});
