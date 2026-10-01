import React, { useRef } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { assertNoA11yViolations } from '@/test-utils/a11y';

/**
 * The dialog's focus-trap contract and caller responsibilities are extensive.
 * These tests document each guarantee as an executable spec — read alongside
 * docs/components/ConfirmDialog.md.
 */

describe('ConfirmDialog', () => {
  afterEach(() => {
    // Make sure backgrounds don't leak aria-hidden/inert between tests.
    document.body.querySelectorAll<HTMLElement>('[aria-hidden="true"]').forEach((el) => {
      el.removeAttribute('aria-hidden');
      el.removeAttribute('inert');
      el.inert = false;
    });
  });

  // ---------------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------------

  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Delete"
        description="Remove this item?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the dialog content when open', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete contract"
        description="Do you want to continue?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete contract')).toBeInTheDocument();
    expect(screen.getByText('Do you want to continue?')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Default prop values
  // ---------------------------------------------------------------------------

  it('uses "Confirm" as the default confirmLabel when not supplied', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Apply"
        description="Apply changes?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('uses "Cancel" as the default cancelLabel when not supplied', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Apply"
        description="Apply changes?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('defaults tone to "default" — renders role="dialog" and not role="alertdialog"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Default action"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Button callbacks
  // ---------------------------------------------------------------------------

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Submit"
        description="Confirm submission?"
        confirmLabel="Submit"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Submit"
        description="Confirm submission?"
        confirmLabel="Submit"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not call any handlers when closed', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={false}
        title="Closed"
        description="Not visible"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // No buttons exist, so nothing is clickable.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Backdrop click
  // ---------------------------------------------------------------------------

  it('treats backdrop clicks as cancellations', () => {
    const onCancel = jest.fn();

    const { container } = render(
      <ConfirmDialog
        isOpen={true}
        title="Backdrop test"
        description="Click outside the dialog?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    // The backdrop element is the first absolute-positioned overlay child
    // (aria-hidden="true" and not the focused dialog panel).
    const backdrop = container.querySelector<HTMLDivElement>('div[aria-hidden="true"]');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Tone / role
  // ---------------------------------------------------------------------------

  it('assigns role="dialog" by default and role="alertdialog" when tone="destructive"', () => {
    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        title="Default action"
        description="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ConfirmDialog
        isOpen={true}
        title="Destructive action"
        description="This cannot be undone!"
        tone="destructive"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // ARIA wiring
  // ---------------------------------------------------------------------------

  it('matches aria-labelledby and aria-describedby exactly with generated title and description IDs', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Accessible Title"
        description="Accessible Description"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const titleEl = screen.getByText('Accessible Title');
    const descEl = screen.getByText('Accessible Description');

    const titleId = titleEl.getAttribute('id');
    const descId = descEl.getAttribute('id');

    expect(titleId).toBeTruthy();
    expect(descId).toBeTruthy();
    expect(dialog).toHaveAttribute('aria-labelledby', titleId!);
    expect(dialog).toHaveAttribute('aria-describedby', descId!);
  });

  it('uses distinct ids for the title and the description across renders', () => {
    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        title="A"
        description="B"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const firstTitleId = screen.getByText('A').getAttribute('id');
    const firstDescId = screen.getByText('B').getAttribute('id');
    expect(firstTitleId).not.toBe(firstDescId);

    rerender(
      <ConfirmDialog
        isOpen={false}
        title="A"
        description="B"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    rerender(
      <ConfirmDialog
        isOpen={true}
        title="A"
        description="B"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const secondTitleId = screen.getByText('A').getAttribute('id');
    const secondDescId = screen.getByText('B').getAttribute('id');
    expect(secondTitleId).toBeTruthy();
    expect(secondDescId).toBeTruthy();
    expect(secondTitleId).not.toBe(secondDescId);
  });

  it('carries aria-modal="true"', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        title="Modal Dialog"
        description="Should be modal"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  // ---------------------------------------------------------------------------
  // Background hiding (aria-hidden + inert)
  // ---------------------------------------------------------------------------

  it('restricts background content with aria-hidden and inert when open', () => {
    const { container } = render(
      <div>
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
        <ConfirmDialog
          isOpen={true}
          title="Restricted Dialog"
          description="Background should be hidden"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    const mainElement = container.querySelector('#main-content')!;
    expect(mainElement).toHaveAttribute('aria-hidden', 'true');
    expect(mainElement).toHaveAttribute('inert');
    // Setting the property means `el.inert === true` for get-by-checking.
    expect((mainElement as HTMLElement).inert).toBe(true);
  });

  it('restores background attribute state when closed and the element had none', () => {
    const { rerender, container } = render(
      <div>
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
        <ConfirmDialog
          isOpen={true}
          title="Restricted Dialog"
          description="Background should be hidden"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    const mainElement = container.querySelector('#main-content')!;
    expect(mainElement).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <div>
        <main id="main-content">
          <h1>Main Content</h1>
        </main>
        <ConfirmDialog
          isOpen={false}
          title="Restricted Dialog"
          description="Background should be hidden"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    expect(mainElement).not.toHaveAttribute('aria-hidden');
    expect(mainElement).not.toHaveAttribute('inert');
    expect((mainElement as HTMLElement).inert).toBe(false);
  });

  it('preserves a pre-existing aria-hidden value when the dialog closes', () => {
    const { rerender } = render(
      <div>
        <aside id="sidebar" aria-hidden="true">
          Pre-hidden sidebar
        </aside>
        <ConfirmDialog
          isOpen={true}
          title="Open"
          description="Sidebar should keep its aria-hidden on close"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    const sidebar = document.getElementById('sidebar')!;
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <div>
        <aside id="sidebar" aria-hidden="true">
          Pre-hidden sidebar
        </aside>
        <ConfirmDialog
          isOpen={false}
          title="Open"
          description="Sidebar should keep its aria-hidden on close"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    // Original aria-hidden="true" is preserved — the cleanup does NOT remove it.
    expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    // Inert was newly added while open, so it should be gone now.
    expect(sidebar).not.toHaveAttribute('inert');
  });

  it('preserves a pre-existing inert setting on a sibling when the dialog closes', () => {
    const sidebar = document.createElement('aside');
    sidebar.id = 'sidebar-inert';
    sidebar.setAttribute('inert', '');
    sidebar.inert = true;
    document.body.appendChild(sidebar);

    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        title="Open"
        description="Sidebar should keep its inert on close"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(sidebar).toHaveAttribute('inert');

    rerender(
      <ConfirmDialog
        isOpen={false}
        title="Open"
        description="Sidebar should keep its inert on close"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    // The element was already inert before opening, so cleanup keeps it inert
    // (only restores when it had been false pre-open).
    expect(sidebar).toHaveAttribute('inert');
    expect(sidebar.inert).toBe(true);

    document.body.removeChild(sidebar);
  });

  it('cleans up background attributes across repeated open/close cycles', () => {
    const { rerender, container } = render(
      <div>
        <main id="repeated-main">
          <h1>Cycled</h1>
        </main>
        <ConfirmDialog
          isOpen={true}
          title="Cycle"
          description="Hide/unhide repeatedly"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    const mainElement = container.querySelector('#repeated-main')!;

    for (let i = 0; i < 3; i++) {
      rerender(
        <div>
          <main id="repeated-main">
            <h1>Cycled</h1>
          </main>
          <ConfirmDialog
            isOpen={true}
            title="Cycle"
            description="Hide/unhide repeatedly"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </div>,
      );
      expect(mainElement).toHaveAttribute('aria-hidden', 'true');
      expect(mainElement).toHaveAttribute('inert');

      rerender(
        <div>
          <main id="repeated-main">
            <h1>Cycled</h1>
          </main>
          <ConfirmDialog
            isOpen={false}
            title="Cycle"
            description="Hide/unhide repeatedly"
            onConfirm={jest.fn()}
            onCancel={jest.fn()}
          />
        </div>,
      );
      expect(mainElement).not.toHaveAttribute('aria-hidden');
      expect(mainElement).not.toHaveAttribute('inert');
    }
  });

  // ---------------------------------------------------------------------------
  // Focus trap (via shared useDialogFocusTrap)
  // ---------------------------------------------------------------------------

  it('moves initial focus to the cancel button when the dialog opens', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Focus cancel first"
        description="Initial focus target"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await user.tab();
    // Wraps to the only other focusable element: the confirm button.
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
  });

  it('wraps focus forward when tabbing past the last focusable element', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Wrap forward"
        description="Keep focus inside the dialog"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    // buttons[0] = Cancel, buttons[1] = Confirm
    buttons[1].focus();
    await user.tab();

    expect(buttons[0]).toHaveFocus();
  });

  it('wraps focus backward when Shift+Tab reaches the first focusable element', async () => {
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Wrap backward"
        description="Keep focus inside the dialog"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    await user.tab({ shift: true });

    expect(buttons[1]).toHaveFocus();
  });

  it('triggers cancel when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Discard"
        description="Lose your changes?"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('delegates the no-focusable fallback to the shared useDialogFocusTrap hook', async () => {
    // ConfirmDialog always renders two buttons (Cancel + Confirm) which keeps
    // the trap's "no focusable element" branch from running in production.
    // This test documents that **when** a future dialog contains only static
    // text, the shared hook used by ConfirmDialog safely no-ops Tab and still
    // fires onEscape. Mirrors the EmptyDialogTrap contract already covered
    // by MilestoneDialogFocus.test.tsx for MilestoneCreationForm.
    function TrapHarnessWithNoFocusables({ onEscape }: { onEscape: () => void }) {
      const dialogRef = useRef<HTMLDivElement | null>(null);
      const initialFocusRef = useRef<HTMLButtonElement | null>(null);
      useDialogFocusTrap({
        isOpen: true,
        dialogRef,
        initialFocusRef,
        onEscape,
      });
      return (
        <div ref={dialogRef}>
          <p>Static content only</p>
        </div>
      );
    }

    const onEscape = jest.fn();
    render(<TrapHarnessWithNoFocusables onEscape={onEscape} />);

    const activeBefore = document.activeElement;

    // Tab must not throw and must NOT trigger preventDefault — when
    // focusable.length === 0 the hook returns early without interfering.
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true, bubbles: true });
    document.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(activeBefore);

    // Escape still works even with no focusable children — the Escape handler
    // is wired independently of the focusable-elements check.
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    document.dispatchEvent(escapeEvent);
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // Caller responsibilities — focus restoration lives upstream
  // ---------------------------------------------------------------------------

  it('does NOT restore focus itself — the caller owns focus restoration', async () => {
    // Per the source comment: "After closing, focus returns to the element that
    // opened the dialog (handled by the caller)." The dialog never moves
    // focus back; the owning component must.

    const user = userEvent.setup();

    function Harness() {
      const triggerRef = useRef<HTMLButtonElement | null>(null);
      const [isOpen, setIsOpen] = React.useState(false);

      const handleCancel = () => {
        setIsOpen(false);
        triggerRef.current?.focus();
      };

      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setIsOpen(true)}>
            Open destructive dialog
          </button>
          <ConfirmDialog
            isOpen={isOpen}
            title="Delete"
            description="Are you sure?"
            tone="destructive"
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={() => setIsOpen(false)}
            onCancel={handleCancel}
          />
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Open destructive dialog' });
    await user.click(trigger);

    // Initial focus moves into the dialog (the cancel button).
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    // Cancel via the button — the caller's onCancel restores focus to the trigger.
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(trigger).toHaveFocus();
  });

  it('does not move focus onto its own buttons after Escape is pressed', async () => {
    // Documented contract: ConfirmDialog only invokes onCancel on Escape and
    // does not perform focus restoration itself. We assert the specific
    // dialog-owned buttons do not receive a NEW focus call after the user
    // presses Escape, so the focus-stays-where-it-was guarantee is testable
    // even when surrounding DOM focus moves under JSDOM/user-event.
    const onCancel = jest.fn();

    const { rerender } = render(
      <ConfirmDialog
        isOpen={true}
        title="Escape"
        description="Press escape"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });

    const cancelFocusSpy = jest.spyOn(cancelButton, 'focus');
    const confirmFocusSpy = jest.spyOn(confirmButton, 'focus');

    // Re-render with `isOpen={true}` so we exercise the effect again after
    // the spies were attached; this also verifies the cleanup path keeps
    // spies intact across re-renders.
    rerender(
      <ConfirmDialog
        isOpen={true}
        title="Escape"
        description="Press escape"
        onConfirm={jest.fn()}
        onCancel={onCancel}
      />,
    );

    // Reset spies after the focus trap sets initial focus on open.
    cancelFocusSpy.mockClear();
    confirmFocusSpy.mockClear();

    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
    // Crucial contract: dialog did not call .focus() on either of its own
    // buttons in response to the user pressing Escape. The caller is
    // responsible for any focus restoration that follows.
    expect(cancelFocusSpy).not.toHaveBeenCalled();
    expect(confirmFocusSpy).not.toHaveBeenCalled();

    cancelFocusSpy.mockRestore();
    confirmFocusSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// jest-axe audits
// ---------------------------------------------------------------------------

describe('ConfirmDialog — accessibility audits', () => {
  afterEach(() => {
    document.body.querySelectorAll<HTMLElement>('[aria-hidden="true"]').forEach((el) => {
      el.removeAttribute('aria-hidden');
      el.removeAttribute('inert');
      el.inert = false;
    });
  });

  it('has no axe violations in the default (non-destructive) state', async () => {
    const { container } = render(
      <div>
        <main>
          <p>Background content for axe context.</p>
        </main>
        <ConfirmDialog
          isOpen={true}
          title="Default confirm"
          description="Are you sure?"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    await assertNoA11yViolations(container);
  });

  it('has no axe violations in the destructive (alertdialog) state', async () => {
    const { container } = render(
      <div>
        <main>
          <p>Background content for axe context.</p>
        </main>
        <ConfirmDialog
          isOpen={true}
          title="Delete permanently"
          description="This cannot be undone!"
          tone="destructive"
          confirmLabel="Delete"
          cancelLabel="Keep"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </div>,
    );

    await assertNoA11yViolations(container);
  });
  it('moves focus to the cancel button on open and restores it to the trigger on close', async () => {
    const Wrapper = () => {
      const [isOpen, setIsOpen] = React.useState(false);
      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Open Confirm</button>
          <ConfirmDialog
            isOpen={isOpen}
            title="Wrap focus"
            description="Keep focus inside the dialog"
            onConfirm={jest.fn()}
            onCancel={() => setIsOpen(false)}
          />
        </div>
      );
    };

    const user = userEvent.setup();
    render(<Wrapper />);
    
    const trigger = screen.getByRole('button', { name: 'Open Confirm' });
    trigger.focus();
    await user.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });
    
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});

// ─── updatedAt (last-updated timestamp) ──────────────────────────────────────

describe('ConfirmDialog - updatedAt', () => {
  const FIXED_NOW = new Date('2026-07-26T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not render a last-updated line when updatedAt is omitted', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete"
        description="Remove this item?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(screen.queryByText(/^updated /i)).not.toBeInTheDocument();
  });

  it('renders a relative last-updated line when updatedAt is provided', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete"
        description="Remove this item?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        updatedAt={new Date(FIXED_NOW.getTime() - 10 * 60 * 1000)}
      />,
    );
    expect(screen.getByText(/updated 10 minutes ago/i)).toBeInTheDocument();
  });

  it('accepts an ISO string for updatedAt', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete"
        description="Remove this item?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        updatedAt="2026-07-26T11:00:00.000Z"
      />,
    );
    expect(screen.getByText(/updated 1 hour ago/i)).toBeInTheDocument();
  });
});