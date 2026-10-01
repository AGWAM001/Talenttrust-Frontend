# Dialogs Usage Guide

TalentTrust uses three dialog patterns, each built on the shared `useDialogFocusTrap` hook. This guide covers the public API, common patterns, accessibility guarantees, and the hook itself.

---

## Table of Contents

1. [ConfirmDialog](#confirmdialog)
2. [ContractCreationForm](#contractcreationform)
3. [MilestoneCreationForm](#milestonecreationform)
4. [useDialogFocusTrap hook](#usedialogfocustrap-hook)
5. [Accessibility contract](#accessibility-contract)
6. [Focus restoration patterns](#focus-restoration-patterns)
7. [Choosing a dialog pattern](#choosing-a-dialog-pattern)

---

## ConfirmDialog

`src/components/ConfirmDialog.tsx`

A two-button confirmation dialog. Use it to gate any irreversible action behind an explicit confirm/cancel choice. The same component covers both a standard acknowledgement (`tone="default"`) and a destructive warning (`tone="destructive"`).

### Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `isOpen` | `boolean` | — | Yes | Mounts and shows the dialog when `true`; returns `null` when `false`. |
| `title` | `string` | — | Yes | Short heading displayed at the top of the dialog. Wired to `aria-labelledby`. |
| `description` | `string` | — | Yes | Body copy explaining what the action will do. Wired to `aria-describedby`. |
| `confirmLabel` | `string` | `'Confirm'` | No | Label for the confirm button. |
| `cancelLabel` | `string` | `'Cancel'` | No | Label for the cancel button. |
| `tone` | `'default' \| 'destructive'` | `'default'` | No | `'destructive'` sets `role="alertdialog"` and is appropriate for permanent data changes. |
| `onConfirm` | `() => void` | — | Yes | Called when the user clicks the confirm button. |
| `onCancel` | `() => void` | — | Yes | Called when the user clicks cancel, clicks the backdrop, or presses Escape. |

### Basic usage

```tsx
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function DeleteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete record
      </button>

      <ConfirmDialog
        isOpen={open}
        title="Delete record"
        description="This action cannot be undone. The record will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        tone="destructive"
        onConfirm={() => {
          deleteRecord();
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
```

### Returning focus to the trigger

`ConfirmDialog` does not restore focus automatically — the caller is responsible. Capture the trigger ref and focus it inside both `onConfirm` and `onCancel`:

```tsx
import { useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

function ActionButton() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = () => {
    setOpen(false);
    // Restore focus to the button that opened the dialog
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
        onConfirm={() => { releaseFunds(); close(); }}
        onCancel={close}
      />
    </>
  );
}
```

### Default vs destructive tone

```tsx
{/* Standard confirmation — role="dialog" */}
<ConfirmDialog
  isOpen={open}
  title="Submit milestone"
  description="Send this milestone for client approval."
  confirmLabel="Submit"
  tone="default"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>

{/* Destructive action — role="alertdialog", higher AT urgency */}
<ConfirmDialog
  isOpen={open}
  title="Dispute contract"
  description="Opening a dispute is permanent and cannot be undone."
  confirmLabel="Open dispute"
  tone="destructive"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

`role="alertdialog"` tells screen readers that the dialog requires an immediate response and should be announced assertively. Use it whenever the confirmed action is irreversible or carries significant consequence.

### Background inert behaviour

While open, `ConfirmDialog` walks the DOM tree and sets `aria-hidden="true"` and the `inert` attribute on every sibling outside the dialog. This prevents screen readers and keyboard focus from reaching background content. Both attributes are fully restored on close.

---

## ContractCreationForm

`src/components/ContractCreationForm.tsx`

A modal form dialog for collecting new contract details. Uses `role="dialog"` with a static `aria-labelledby` and manages its own validation state.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(contract: Contract) => void` | Yes | Called with the validated `Contract` object after successful submission. The form does not close itself — the parent controls visibility. |
| `onCancel` | `() => void` | Yes | Called when the user clicks Cancel. The parent is responsible for unmounting. |

### Usage

```tsx
import { useState } from 'react';
import { ContractCreationForm } from '@/components/ContractCreationForm';
import { saveContract, listContracts } from '@/lib/repository';
import type { Contract } from '@/types/domain';

function ContractsPage() {
  const [showForm, setShowForm] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>(() => listContracts());

  const handleSubmit = (contract: Contract) => {
    saveContract(contract);
    setContracts(listContracts());
    setShowForm(false);        // parent closes the dialog
  };

  return (
    <>
      <button type="button" onClick={() => setShowForm(true)}>
        Create Contract
      </button>

      {showForm && (
        <ContractCreationForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
}
```

### Form fields

| Field | Required | Validation |
|-------|----------|------------|
| Contract Name | Yes | Non-empty after trimming; max 200 characters. |
| Total Value | Yes | Must parse to a positive number. |
| Currency | Yes | Non-empty; defaults to `USD`. Options: `USD`, `EUR`, `GBP`, `XLM`. |
| Party Label (per party) | Yes, if address filled | Non-empty; max 100 characters. |
| Party Stellar Address | Yes, if label filled | Must pass `isValidStellarAddress` — 56-character G-address. |

At least two parties with both fields filled are required. The minimum two party rows are always visible; additional rows can be added with "+ Add Another Party" and removed when more than two exist.

### Submitted `Contract` shape

```ts
{
  contractName: string;       // trimmed, max 200 chars
  parties: Array<{ label: string; address: string }>;
  totalValue: number;         // parsed from the string input
  currency: string;
  status: 'Pending';          // always set to Pending on creation
  createdAt: string;          // formatted as "Jun 1, 2025"
  milestoneCount: 0;
}
```

### Constants

```ts
import {
  MAX_CONTRACT_NAME_LENGTH, // 200
  MAX_PARTY_LABEL_LENGTH,   // 100
} from '@/components/ContractCreationForm';
```

---

## MilestoneCreationForm

`src/components/milestones/MilestoneCreationForm.tsx`

A modal form dialog for adding milestones to a contract. Uses `useDialogFocusTrap` with `restoreFocus: true`, so focus automatically returns to the element that was active when the form mounted.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(milestone: Milestone) => void` | Yes | Called with the complete `Milestone` object, including the generated `id`, after the form passes validation. |
| `onCancel` | `() => void` | Yes | Called when the user clicks Cancel or presses Escape. The parent is responsible for unmounting. |
| `contractId` | `string` | No | When provided, stamped onto `milestone.contractId` so `listMilestonesByContract` can associate it back. |

### Usage — standalone milestones page

```tsx
import { useState } from 'react';
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import { saveMilestone, listMilestones } from '@/lib/repository';
import type { Milestone } from '@/types/domain';

function MilestonesPage() {
  const [showForm, setShowForm] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>(() => listMilestones());

  return (
    <>
      <button type="button" onClick={() => setShowForm(true)}>
        Add Milestone
      </button>

      {showForm && (
        <MilestoneCreationForm
          onSubmit={(milestone) => {
            saveMilestone(milestone);
            setMilestones(listMilestones());
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
}
```

### Usage — from a contract detail page

Pass `contractId` to associate the milestone with its parent contract:

```tsx
{showForm && (
  <MilestoneCreationForm
    contractId={contract.id}
    onSubmit={(milestone) => {
      saveMilestone(milestone);
      setMilestones(listMilestonesByContract(contract.id));
      setShowForm(false);
    }}
    onCancel={() => setShowForm(false)}
  />
)}
```

### Form fields

| Field | Required | Default | Validation |
|-------|----------|---------|------------|
| Title | Yes | `''` | Non-empty after trimming; max 200 characters. |
| Payout Amount | Yes | `''` | Must parse to a positive number. |
| Currency | Yes | `USD` | Non-empty. Options: `USD`, `EUR`, `GBP`, `XLM`. |
| Status | No | `Pending` | One of `Pending`, `Active`, `Completed`, `Paid`, `Disputed`. |
| Due Date | No | `''` | Free-text string; blank becomes `undefined` on submit. |

### Generated milestone ID

The `id` is never user-supplied — the form constructs it on submit:

1. Trim the title.
2. Lowercase and replace non-alphanumeric runs with `-`.
3. Strip leading/trailing `-`.
4. Append `-${Date.now()}`.

`"Frontend Development – Sprint 1"` → `"frontend-development-sprint-1-1784635200000"`

The timestamp suffix prevents duplicate titles from colliding within the same session.

### Submitted `Milestone` shape

```ts
{
  id: string;                  // slug-timestamp, e.g. "ui-sprint-1-1784635200000"
  title: string;               // trimmed
  status: Milestone['status']; // from the select; defaults to 'Pending'
  payout: number;              // parsed from the string input
  currency: string;
  dueDate?: string;            // undefined when the field was left blank
  contractId?: string;         // forwarded from props, undefined if omitted
}
```

### Constant

```ts
import { MAX_MILESTONE_TITLE_LENGTH } from '@/components/milestones/MilestoneCreationForm';
// 200
```

---

## useDialogFocusTrap hook

`src/hooks/useDialogFocusTrap.ts`

The shared accessibility primitive used by `ConfirmDialog` and `MilestoneCreationForm`. Manages focus when a modal is open: moves focus to a designated element, traps Tab/Shift+Tab within the dialog, and handles Escape.

### Options

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `isOpen` | `boolean` | — | Yes | Activates or deactivates the trap. |
| `dialogRef` | `RefObject<HTMLElement \| null>` | — | Yes | Ref attached to the outermost dialog container element. |
| `initialFocusRef` | `RefObject<HTMLElement \| null>` | — | Yes | The element that receives focus when the dialog opens. Typically a Cancel button or the first input. |
| `onEscape` | `() => void` | — | Yes | Called when the user presses Escape. Usually the same handler as `onCancel`. |
| `restoreFocus` | `boolean` | `false` | No | When `true`, the element that held focus immediately before opening receives focus back when the dialog unmounts. |

### Usage in a custom dialog

```tsx
import { useRef } from 'react';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';

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
    restoreFocus: true,   // focus returns to the trigger automatically on close
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
      <input ref={firstInputRef} type="text" />
      <button type="button" onClick={onClose}>Close</button>
    </div>
  );
}
```

### Focus trap behaviour

- On open: `initialFocusRef.current?.focus()` is called. The previous `document.activeElement` is saved so it can be restored.
- Tab on the last focusable element: wraps to the first.
- Shift+Tab on the first focusable element: wraps to the last.
- Escape: calls `onEscape()`.
- On cleanup (`isOpen` → `false`, or unmount): if `restoreFocus` is `true`, the saved element is re-focused.

Focusable elements are found with:

```
button:not([disabled]), [href], input:not([disabled]),
select:not([disabled]), textarea:not([disabled]),
[tabindex]:not([tabindex="-1"])
```

---

## Accessibility contract

All three dialog components satisfy the following guarantees:

### ARIA roles

| Component | Default role | Destructive tone |
|-----------|-------------|-----------------|
| `ConfirmDialog` (`tone="default"`) | `role="dialog"` | — |
| `ConfirmDialog` (`tone="destructive"`) | — | `role="alertdialog"` |
| `ContractCreationForm` | `role="dialog"` | — |
| `MilestoneCreationForm` | `role="dialog"` | — |

All dialogs set `aria-modal="true"` and `aria-labelledby` pointing to their visible heading element.

### ARIA attributes

| Attribute | What it references |
|-----------|--------------------|
| `aria-labelledby` | The dialog's `<h2>` heading element (via `useId` in `ConfirmDialog`, static id in form dialogs). |
| `aria-describedby` | The description/body text (`ConfirmDialog` only). |
| `aria-modal` | `"true"` on every dialog — signals that background content is inert to AT. |

### Keyboard interactions

| Key | Behaviour |
|-----|-----------|
| Tab | Moves focus to the next focusable element; wraps from last → first. |
| Shift+Tab | Moves focus to the previous focusable element; wraps from first → last. |
| Escape | Calls the cancel/close handler and closes the dialog. |

### Initial focus

| Component | Initial focus target |
|-----------|---------------------|
| `ConfirmDialog` | Cancel button (`cancelBtnRef`) |
| `ContractCreationForm` | Not trapped via hook — relies on natural tab order |
| `MilestoneCreationForm` | Title `<input>` (`titleInputRef`) |

Placing initial focus on Cancel by default follows the ARIA Authoring Practices Guide (APG) recommendation: for destructive confirmations, defaulting to the safe action prevents accidental confirmation via quick Enter presses.

---

## Focus restoration patterns

### Pattern 1 — hook-managed (`restoreFocus: true`)

`MilestoneCreationForm` sets `restoreFocus: true`. The hook records `document.activeElement` at open time and re-focuses it on cleanup automatically. No additional code is needed in the caller.

```tsx
// The hook handles everything — the caller just mounts/unmounts the form.
{showForm && (
  <MilestoneCreationForm
    onSubmit={handleSubmit}
    onCancel={() => setShowForm(false)}
  />
)}
```

### Pattern 2 — caller-managed ref

`ConfirmDialog` leaves focus restoration to the caller. This is intentional: when multiple confirmation-gated buttons exist on the same page (e.g. Submit Milestone and Release Funds), a caller-held `triggerRef` captures the *exact* button that was clicked rather than always targeting the last-rendered button.

```tsx
const triggerRef = useRef<HTMLButtonElement>(null);

const openDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
  triggerRef.current = e.currentTarget;  // capture at click time
  setOpen(true);
};

const closeDialog = () => {
  setOpen(false);
  triggerRef.current?.focus();           // restore at close time
};
```

This is the pattern `ActionPanel` uses: `handleOpenConfirm` captures `event.currentTarget` into a shared `triggerElementRef`, and both `handleConfirm` and `handleCancel` restore focus through it.

### Pattern 3 — SettingsPanel (inline trap, no hook)

`SettingsPanel` implements its own `keydown` listener without `useDialogFocusTrap`. The logic is equivalent but the panel is a slide-in drawer rather than a centred modal, and uses `requestAnimationFrame` to set initial focus on the Close button after the panel animates in.

---

## Choosing a dialog pattern

| Scenario | Recommended component/pattern |
|----------|-------------------------------|
| Confirm or cancel a single action | `ConfirmDialog` |
| Confirm a destructive / irreversible action | `ConfirmDialog` with `tone="destructive"` |
| Collect multi-field input for a new Contract | `ContractCreationForm` |
| Collect multi-field input for a new Milestone | `MilestoneCreationForm` |
| Build a new custom modal | Use `useDialogFocusTrap` directly (see hook section) |
| Slide-in settings drawer | See `SettingsPanel` — implements an equivalent inline trap |

### When to use `role="alertdialog"` vs `role="dialog"`

Use `role="alertdialog"` when:
- The action is irreversible (delete, release funds, open a dispute).
- The user must explicitly acknowledge a warning before proceeding.
- An immediate, assertive AT announcement is important.

Use `role="dialog"` for all other confirmations and for form modals where the action can be corrected later.

---

## Related documentation

- [`ActionPanel.md`](./ActionPanel.md) — how `ConfirmDialog` is wired into the contract action flow, including focus restoration across multiple triggers
- [`ContractCreationForm.md`](./ContractCreationForm.md) — full field validation rules and `Contract` type details
- [`MilestoneCreationForm.md`](./MilestoneCreationForm.md) — milestone ID generation scheme and parent persistence contract
- [`Accessibility.md`](./Accessibility.md) — project-wide ARIA and keyboard navigation standards
- [`SettingsPanel.md`](./SettingsPanel.md) — drawer dialog pattern that implements its own inline focus trap
