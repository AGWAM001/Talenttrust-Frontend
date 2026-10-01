# MilestoneCreationForm Component

## Overview

`MilestoneCreationForm` renders the modal used by the milestones page to collect and validate a new milestone before the parent persists it.

## Location

`src/components/milestones/MilestoneCreationForm.tsx`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(milestone: Milestone) => void` | Yes | Called after the form passes validation. Receives the complete milestone object, including the generated `id`. |
| `onCancel` | `() => void` | Yes | Called when the user chooses Cancel. The component does not clear storage, save a draft, or close itself; the parent owns that behavior. |

## Fields

| Field | Initial value | Required | Submitted value |
|-------|---------------|----------|-----------------|
| Title | Empty string | Yes | Trimmed string assigned to `milestone.title`. |
| Payout Amount | Empty string | Yes | Parsed with `parseFloat` and assigned to `milestone.payout`. |
| Currency | `USD` | Yes | Trimmed string assigned to `milestone.currency`. Options are `USD`, `EUR`, `GBP`, and `XLM`. |
| Status | `Pending` | No | One of `Pending`, `Active`, `Completed`, `Paid`, or `Disputed`. |
| Due Date | Empty string | No | Trimmed string assigned to `milestone.dueDate`; blank values become `undefined`. |

## Validation Rules

- Title must contain non-whitespace text.
- Payout Amount must contain a value.
- Payout Amount must parse to a positive number greater than `0`.
- Currency must contain non-whitespace text.
- Status and Due Date do not block submission.

Validation runs on submit only. Invalid submissions update the shared `ErrorSummary`, keep the form open, and do not call `onSubmit`.

## Generated Milestone ID

On successful submit, the component builds `milestone.id` from the title slug plus the current timestamp:

1. Trim the title.
2. Lowercase it.
3. Replace every run of non-alphanumeric characters with `-`.
4. Remove leading and trailing `-` characters.
5. Append `-${Date.now()}`.

For example, `Frontend Development - Sprint 1` becomes an id shaped like `frontend-development-sprint-1-1784635200000`. The timestamp suffix prevents duplicate titles from colliding during a session.

## Accessibility

- The modal root uses `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="create-milestone-title"`.
- `ErrorSummary` exposes validation failures through `role="alert"` and links each error back to its field id.
- `FormField` applies required markers, `aria-invalid`, `aria-describedby`, and error styling for invalid fields.
- All controls are native form inputs, selects, or buttons, so keyboard operation follows browser defaults (Tab, Enter, Space).
- Cancel and Submit expose a visible `focus-visible` outline so keyboard users can track focus without layout changes.
- The Cancel button is `type="button"` so it never submits the form.

## Parent Contract

The form only reports user intent. The parent component should:

- Render or unmount the modal based on local state.
- Persist the submitted milestone inside `onSubmit`.
- Refresh any milestone list from the source of truth after persistence.
- Close the modal in `onSubmit` or `onCancel` when appropriate.

The milestones page follows this pattern by calling `saveMilestone(milestone)`, re-reading `listMilestones()`, and then hiding the form.

## Usage Example

```tsx
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import { listMilestones, saveMilestone } from '@/lib/repository';

function MilestonesPage() {
  const [showForm, setShowForm] = useState(false);
  const [milestones, setMilestones] = useState(() => listMilestones());

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

## Testing

The dedicated test suite lives at:

```
src/components/__tests__/MilestoneCreationForm.test.tsx
```

### Test coverage areas

| Area | What is verified |
|------|-----------------|
| **Rendering** | Dialog present, all field labels, accessible `role="dialog"` / `aria-modal` / `aria-labelledby`, default `currency=USD`, default `status=Pending`, no `ErrorSummary` on initial render |
| **Required-field validation** | Empty form shows errors for title and payout; whitespace-only title; whitespace-only payout; `onSubmit` never called on invalid submit |
| **Payout validation** | Non-numeric string rejected; zero rejected; negative number rejected; valid decimal accepted; `onSubmit` not called on invalid payout |
| **Currency validation** | Empty currency string produces "Currency is required" error; all four currency options selectable |
| **ID generation** | Slug derived from title (lowercased, hyphenated); two submissions with the same title produce different ids (via `jest.useFakeTimers` + `advanceTimersByTime`); slug strips leading/trailing hyphens; slug contains only `[a-z0-9-]` characters |
| **Successful submission** | Correct `Milestone` shape returned; strings trimmed; blank `dueDate` becomes `undefined`; `contractId` forwarded when supplied, `undefined` when omitted; errors cleared on valid resubmit |
| **Cancel behaviour** | `onCancel` fires exactly once; `onSubmit` never fires on cancel; cancel button has `type="button"` |
| **ErrorSummary / a11y** | `role="alert"` present after invalid submit; `tabIndex="-1"` on summary; anchor links target field IDs (`#milestone-title`, `#milestone-payout`); `aria-invalid="true"` on failing inputs; `border-red-500` error styling applied |
| **Status field** | All five status options selectable; chosen status included in submission payload |

### Running the tests

```bash
npm test -- --testPathPattern=MilestoneCreationForm
```

To check coverage for the component specifically:

```bash
npm test -- --coverage --collectCoverageFrom='src/components/milestones/MilestoneCreationForm.tsx' --testPathPattern=MilestoneCreationForm
```

### Mocking guidance

- **`Date.now()`** — Use `jest.useFakeTimers()` and `jest.advanceTimersByTime(1)` between submissions to assert that two ids with the same title slug are distinct.
- No external modules are mocked; the component has no third-party dependencies beyond React and the shared `FormField` / `ErrorSummary` components which are exercised directly.
