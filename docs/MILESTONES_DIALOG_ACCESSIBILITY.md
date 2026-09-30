# Milestones creation dialog accessibility

The milestones creation form is a modal dialog opened from the board's
`Add Milestone` actions. A modal changes the keyboard user's navigation scope:
while it is open, focus must stay in the dialog, Escape must provide a clear
exit, and closing must return the user to the control that opened the dialog.

This document describes the behavior implemented for issue #1100 and the
contracts that should be preserved when the form changes.

## Interaction contract

When the form opens:

1. The element focused immediately before the form mounted is remembered.
2. Focus moves to the title field, the first useful input in the form.
3. The dialog exposes its title through `aria-labelledby` and declares
   `aria-modal="true"`.
4. The backdrop is available as a mouse or touch close target.

While open:

- `Tab` moves through enabled controls in the dialog only.
- `Shift+Tab` moves backward through enabled controls in the dialog only.
- Forward Tab from the last enabled control wraps to the first.
- Backward Tab from the first enabled control wraps to the last.
- If focus is unexpectedly outside the dialog, the next Tab or Shift+Tab
  returns it to the appropriate dialog edge.
- Escape calls the current close callback and prevents the browser's default
  Escape behavior.

When the form closes:

- focus returns to the opener when that element is still in the document;
- if the opener was removed as part of the action, focus falls back to the
  page's focusable `h1` or `main` landmark;
- the document-level keydown listener is removed.

The final fallback is important for the milestones empty state: submitting a
new milestone can replace the empty-state `Add Milestone` button with the
list, so the exact opener no longer exists to receive focus.

## DOM structure

`MilestoneCreationForm` renders a single dialog root:

```text
fixed overlay [role=dialog, aria-modal=true, aria-labelledby=...]
└── scrollable panel [clicks stopped here]
    ├── h2#... [accessible name]
    └── form
        ├── title input
        ├── payout input
        ├── currency select
        ├── status select
        ├── due date input
        └── cancel and submit buttons
```

The overlay root has `tabIndex={-1}`. This is a defensive target if a dialog
ever has no enabled controls during a future loading or validation state. The
normal initial focus remains the title input, so adding the root tabindex does
not change the normal user flow.

The panel stops click propagation. Consequently, clicking the dimmed area
closes the modal, while clicking a label, field, button, or other panel content
does not accidentally close it. The implementation uses the existing form
visual treatment and does not add an animation or alter the panel dimensions.

## Shared hook design

`useDialogFocusTrap` owns behavior that is common to the form and other
dialogs. It accepts:

| Option | Purpose |
| --- | --- |
| `isOpen` | Enables focus management only while the dialog is present. |
| `dialogRef` | Defines the focus containment boundary. |
| `initialFocusRef` | Identifies the first control to focus on open. |
| `onEscape` | Receives Escape so the owner controls close state. |
| `restoreFocus` | Enables opener restoration on cleanup. |

The hook deliberately keeps one document listener for the whole open session.
The latest Escape callback is stored in a ref and updated separately. This
matters for React callers that create a new inline callback on each render:
typing into a controlled form must not tear down the listener, restore focus,
and install it again on every keystroke.

The listener queries focusable descendants at keydown time rather than caching
the initial list. Validation summaries, disabled submit states, and future
conditional fields can therefore change the focusable set without leaving a
stale boundary.

The supported selector covers native controls, enabled buttons, links, and
explicitly tabbable elements. Disabled controls are excluded. Elements with
`tabIndex="-1"` are not in the Tab sequence, although the dialog root remains
programmatically focusable as a defensive fallback.

## Why the outside-focus guard exists

A normal browser Tab sequence should never place focus outside an open modal,
but programmatic focus, browser extensions, devtools, and assistive technology
can do so. A trap that only checks whether the active element is exactly the
first or last control silently does nothing in that case. The outside-focus
guard treats the next Tab as an explicit request to re-enter the dialog:

- forward Tab focuses the first control;
- backward Tab focuses the last control.

This keeps the modal invariant true even after an unexpected focus move and
does not interfere with normal traversal inside the dialog.

## Escape behavior

Escape is handled on `document` rather than on individual inputs. This makes
the behavior consistent for text fields, selects, the error summary, and any
future control that stops propagation. The event is prevented so browser or
host-level Escape behavior does not compete with the modal close action.

The hook calls the owner callback; it does not unmount the form itself. This
keeps the state transition in the parent, which owns the `showForm` flag and
can decide whether a cancel, successful submit, or error should close the
dialog.

## Focus restoration lifecycle

The opener is captured when the `isOpen` effect begins, before initial focus is
moved. Cleanup runs when the dialog unmounts or `isOpen` becomes false. Cleanup
first removes the keydown listener, then restores focus if requested.

Restoration checks `document.contains(trigger)` before calling `focus()`. If a
successful submission replaced the empty state, the old button is detached;
calling focus on it would not help the user. The hook then finds the first
reasonable page fallback (`main`, a focusable `h1`, or any `h1`). The milestones
page heading already has `tabIndex={-1}`, so it is the preferred fallback for
that flow.

The hook does not attempt to restore focus when `restoreFocus` is false. This
allows a parent that has its own focus transition to opt out without fighting
the shared lifecycle.

## ARIA requirements

The modal root must retain:

- `role="dialog"`;
- `aria-modal="true"`;
- `aria-labelledby` referencing the visible `h2`.

The title is a visible heading rather than a visually hidden duplicate. This
gives sighted keyboard users and screen-reader users the same dialog name.
The root is not given an `aria-label` that would override the heading name.

Form field labels remain associated through the existing `FormField` component.
Validation failures use the existing `ErrorSummary` and inline field semantics;
focus trapping must not prevent a user from moving to those errors.

No error details from storage or validation internals are added by the focus
implementation. The dialog's content is user-facing form copy and validation
copy supplied by the existing typed validators.

## Test matrix

The implementation is covered at two levels.

### Form integration tests

`src/components/__tests__/MilestoneDialogFocus.test.tsx` renders the actual
`MilestoneCreationForm` and verifies:

- opening focuses the title input;
- forward and backward traversal wraps;
- Escape invokes the owner callback;
- Cancel and external close restore the opener;
- successful submit restores focus even when the opener is replaced;
- the dialog contains several enabled controls.

Issue #1100 adds explicit checks for the remaining public contract:

- the dialog's accessible name is the visible title;
- `aria-modal` remains true;
- clicking the overlay closes;
- clicking inside the panel does not close;
- a focus event that starts outside is pulled back inside;
- controls retain their existing visual structure.

### Hook unit tests

`src/hooks/__tests__/useDialogFocusTrap.test.tsx` isolates the shared behavior
with a minimal dialog and verifies:

1. initial focus;
2. forward wrapping;
3. backward wrapping;
4. forward outside-focus entry;
5. backward outside-focus entry;
6. latest Escape callback behavior;
7. opener restoration;
8. missing-ref defensive behavior.

Testing the hook independently prevents changes to one dialog's form fields
from masking a regression in the shared keydown and cleanup lifecycle.

## Manual QA

Use a keyboard only:

1. Focus an `Add Milestone` trigger and activate it.
2. Confirm the title field receives focus immediately.
3. Press Tab repeatedly through every enabled field and button.
4. Confirm forward Tab from Submit returns to Title.
5. Confirm Shift+Tab from Title returns to Submit.
6. Trigger a validation error and repeat the traversal with the error summary.
7. Press Escape from each kind of control and confirm the dialog closes.
8. Confirm focus returns to the original trigger.
9. Open from the empty state, submit a valid milestone, and confirm focus is on
   the page heading after the trigger is replaced.
10. Click the dimmed overlay and confirm it closes.
11. Click inside the white panel and confirm it stays open.
12. Use a screen reader to confirm the dialog is announced by “Add Milestone”.

Repeat the checks at a narrow viewport. The panel remains scrollable and the
focusable controls remain inside the same dialog root when fields wrap.

## Maintenance rules

When adding a control to the form, keep it inside the dialog root and use a
native focusable element unless there is a documented reason not to. The hook
will include it automatically if it is enabled and matches the selector.

When adding a nested interactive widget, test its focus behavior at both edges.
If the widget owns a nested focus model, document how it hands focus back to
the parent dialog. Nested modals are out of scope for this component.

Do not move the backdrop click handler onto the panel. Doing so would make every
click inside the form look like an overlay click and would close the form while
users enter data.

Do not put a second document keydown listener in the form. Use the shared hook
so Escape, Tab wrapping, cleanup, and callback freshness stay consistent with
the other dialogs in the application.

If the opener is conditionally rendered, preserve a focusable page fallback.
The hook's fallback query is intentionally broad enough for the app shell, but
the owning page should still provide a meaningful heading or landmark.

## Verification commands

Run the focused integration and hook suites first:

```bash
npm test -- --runInBand \
  src/components/__tests__/MilestoneDialogFocus.test.tsx \
  src/hooks/__tests__/useDialogFocusTrap.test.tsx \
  src/components/__tests__/DialogLabelledByTitle.test.tsx
```

Then run the repository gates:

```bash
npm run lint
npm test -- --runInBand
npm run build
```

The focused tests prove this dialog contract. The repository-wide commands are
still required before merge because the hook is shared by other dialogs.

## Behavior decision table

| Situation | Expected result | Owner |
| --- | --- | --- |
| Form mounts after trigger activation | Title input receives focus | Shared hook |
| Title is disabled by a future state | Dialog root receives focus | Shared hook |
| Focus is on the last enabled field and Tab is pressed | First enabled field receives focus | Shared hook |
| Focus is on the first enabled field and Shift+Tab is pressed | Last enabled field receives focus | Shared hook |
| Focus is outside while Tab is pressed | First dialog control receives focus | Shared hook |
| Focus is outside while Shift+Tab is pressed | Last dialog control receives focus | Shared hook |
| Escape is pressed in any control | Owner close callback runs once | Shared hook |
| Backdrop receives a click | Form cancel callback runs | Form overlay |
| Panel receives a click | Form remains open | Form panel |
| Opener is still mounted after close | Opener receives focus | Shared hook |
| Opener was replaced after submit | Page heading or main receives focus | Shared hook |

This table is intentionally small enough to use as a review checklist. Any
future change to the form should either preserve these outcomes or update the
issue-specific acceptance criteria, tests, and documentation together.

The table also makes keyboard behavior reviewable without relying on a
particular browser's native tab order. The hook owns the invariant; the form
owns only the visual overlay and its close callback.
