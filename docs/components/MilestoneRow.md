# MilestoneRow — accessibility contract

`MilestoneRow` renders a single milestone as a view-mode summary card that can be
switched, in place, into an inline edit form. It is rendered once per item by
`MilestonesList` (see [MilestonesList.md](./MilestonesList.md)), which owns which
row (if any) is currently being edited.

**Source:** `src/components/milestones/MilestoneRow.tsx`
**Tests:** `src/components/__tests__/MilestoneRow.test.tsx`, `src/components/__tests__/MilestoneDialogFocus.test.tsx`

---

## Roles

| Element | Role / attribute | Purpose |
|---------|-------------------|---------|
| Row root (`<article>`) | `id="milestone-${id}"` | Anchor target for the due-soon banner's in-list links (see MilestonesList.md). Present in both view and edit mode so the id is stable while editing. |
| Row root, edit mode | `aria-label="Editing milestone {title}"` | Announces that the row is currently in its edit variant, since the visual change (border, ring) is not conveyed to assistive technology on its own. |
| Edit button | `aria-label="Edit milestone {title}"` | Disambiguates the button when multiple rows render an identically-labelled "Edit" affordance. |
| Edit form | native `<form onSubmit>`, `noValidate` | Native form semantics give Enter-to-submit for free; `noValidate` defers all validation to the component's own `validateMilestoneEdit` + `ErrorSummary` so error presentation is consistent with the rest of the app. |
| Validation errors | `ErrorSummary` (`role="alert"`) | Same shared primitive used by `MilestoneCreationForm`; see [MilestoneCreationForm.md](./MilestoneCreationForm.md#accessibility) for its contract. |
| Each field | `FormField` (`aria-invalid`, `aria-describedby`, required marker) | Shared primitive — not reimplemented here. |

No custom ARIA widget roles (`dialog`, `tab`, etc.) are used — the row is a plain
document-flow region that swaps its rendered content, so native form and button
semantics are sufficient.

## Keyboard interactions

| Context | Key | Behavior |
|---------|-----|----------|
| View mode | Tab | Reaches the row's "Edit" button in normal document order (`StatusBadge` is non-interactive and skipped). |
| View mode | Enter / Space on Edit | Activates `onRequestEdit`, which the parent (`MilestonesList`) resolves into `isEditing=true` for this row only. |
| Edit mode | Tab | Moves through Title → Payout → Currency → Status → Due Date → Cancel → Save, in source order. None of the fields are removed from tab order. |
| Edit mode | Enter (inside any field) | Submits the form (native `<form>` behavior), triggering the same validate → save path as clicking Save. |
| Edit mode | Escape (anywhere inside the row) | Cancels the edit — discards local field state, clears validation errors, and calls `onCancel`. Implemented via a `keydown` listener attached to `document` for the duration of `isEditing`, with `stopPropagation()` so it does not leak into any other Escape handler mounted higher in the tree (e.g. a dialog focus trap). |
| Edit mode | Click/activate Cancel | Same effect as Escape. |
| Edit mode | Click/activate Save | Validates via `validateMilestoneEdit`; on success calls `onSave(id, patch)` and announces via `onAnnounce`; on failure keeps edit mode open with `ErrorSummary` populated and does **not** call `onSave` or `onAnnounce`. |

## Focus behavior

- **Entering edit mode:** a `useEffect` keyed on `isEditing` defers focus to the
  Title input with `window.setTimeout(..., 0)`, after local field state is synced
  from the `milestone` prop. The timer is cleared on unmount/re-run so a rapid
  double-toggle can't land a stale focus call.
- **Leaving edit mode (Save):** `focusEditButton()` runs inside
  `requestAnimationFrame` so it fires after the row has re-rendered back into
  view mode and the Edit button exists in the DOM again, then focuses it. This
  satisfies WCAG 2.4.3 (Focus Order) — keyboard users never lose their place
  just because they toggled a row.
- **Leaving edit mode (Cancel / Escape):** same `focusEditButton()` restoration
  path as Save, so cancelling is not a focus dead-end either.
- **Invalid Save attempt:** focus is intentionally **not** moved. The row stays
  in edit mode with `ErrorSummary` rendered (`role="alert"`), so the keyboard
  user's focus remains exactly where they left it (the Save button, or wherever
  they were) and they can immediately correct the flagged field.

## Parent contract

`MilestoneRow` is fully controlled: it never decides *which* row is in edit
mode. `MilestonesList` passes `isEditing={editingId === milestone.id}` and swaps
`editingId` so opening one row's editor always closes any other row's editor
first — there is never more than one dirty, unsaved edit form competing for
focus or screen-reader output at a time.

Saving and cancelling both flow back through `MilestonesList`, which owns the
polite live region that announces save / save-failure to assistive technology
(see [MilestonesList.md](./MilestonesList.md#accessibility)) — `MilestoneRow`
itself renders no live region of its own.
