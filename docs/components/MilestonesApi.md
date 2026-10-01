# Milestones Component API Reference

> **Issue:** Closes #844 — Add a component API reference for milestones.
> **Status:** Authoritative reference for the milestone-related React components in this repository. Each prop table below is verified against the current source.

This entry consolidates the props, shared types, and minimal usage examples for the milestone-related UI components exposed by the application. It complements the existing per-component docs under [docs/components/](./).

- [MilestonesList.md](./MilestonesList.md) — list shell, inline edit workflow, density toggle, and pagination.
- [MilestoneRow.md](./MilestoneRow.md) — row-level view/edit behavior and accessibility contract.
- [MilestoneFilter.md](./MilestoneFilter.md) — status filter radiogroup semantics.
- [MilestoneCreationForm.md](./MilestoneCreationForm.md) — modal form to create milestones.

## Components at a glance

| Component | Source | Purpose |
| --- | --- | --- |
| [`MilestonesList`](#milestoneslist) | `src/components/MilestonesList.tsx` | Scrollable milestone list with status summary, currency warning, due-soon banner, and inline row editing. |
| [`MilestoneRow`](#milestonerow) | `src/components/milestones/MilestoneRow.tsx` | Row-level view/edit switcher for an individual milestone. |
| [`MilestoneFilter`](#milestonefilter) | `src/components/milestones/MilestoneFilter.tsx` | Accessible status filter control for narrowing the list. |
| [`MilestoneCreationForm`](#milestonecreationform) | `src/components/milestones/MilestoneCreationForm.tsx` | Modal form for creating a new milestone. |

---

## `MilestonesList`

The list shell that renders milestone rows, the status tally, the currency-mismatch banner, and the due-soon reminder. It owns the inline edit lifecycle and delegates the row-specific UI to [MilestoneRow](./MilestoneRow.md).

### Shared type

```ts
export type Milestone = {
  id: string;
  title: string;
  status: StatusType;
  payout: number;
  currency: string;
  dueDate?: string;
  contractId?: string;
};
```

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `milestones` | `Milestone[]` | Yes | The milestones to render. |
| `contractCurrency` | `string` | No | Optional contract currency used to surface a mismatch banner when milestones use another currency. |
| `onUpdateMilestone` | `(id: string, patch: Partial<Milestone>) => boolean` | No | Called after a row save; returning `false` shows an inline save-failure message. |
| `pageSize` | `number` | No | Initial number of rows shown before the list reveals a load-more action. Defaults to `5`. |

### Minimal usage

```tsx
import MilestonesList from '@/components/MilestonesList';

<MilestonesList
  milestones={milestones}
  contractCurrency={contract.currency}
  onUpdateMilestone={(id, patch) => updateMilestone(id, patch)}
/>
```

---

## `MilestoneRow`

A single milestone row that can render either in view mode or inline-edit mode. The parent controls whether the row is editing, while the row handles validation, save/cancel behavior, and focus restoration.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `milestone` | `Milestone` | Yes | The milestone record to render. |
| `isEditing` | `boolean` | Yes | Whether this row is currently in edit mode. |
| `onRequestEdit` | `() => void` | Yes | Fired when the user activates edit mode from the row. |
| `onSave` | `(id: string, patch: Partial<Milestone>) => void` | Yes | Called after the row passes validation and is saved. |
| `onCancel` | `() => void` | Yes | Called when the row exits edit mode via cancel, Escape, or an invalid attempt. |
| `onAnnounce` | `(message: string) => void` | No | Optional callback to announce the save status to the parent live region. |

### Minimal usage

```tsx
import MilestoneRow from '@/components/milestones/MilestoneRow';

<MilestoneRow
  milestone={milestone}
  isEditing={editingId === milestone.id}
  onRequestEdit={() => setEditingId(milestone.id)}
  onSave={(id, patch) => updateMilestone(id, patch)}
  onCancel={() => setEditingId(null)}
/>
```

---

## `MilestoneFilter`

Accessible status filter that renders a radiogroup for narrowing the milestone list. The component is fully controlled: the parent provides the selected value and handles changes.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `selected` | `'All' \| 'Active' \| 'Pending' \| 'Completed' \| 'Paid' \| 'Disputed'` | Yes | The currently active filter option. |
| `onChange` | `(filter: MilestoneStatusFilter) => void` | Yes | Called whenever the user selects a different filter. |
| `resultCount` | `number` | Yes | The number of milestones matching the current filter, used for the live-region announcement. |

### Minimal usage

```tsx
import MilestoneFilter from '@/components/milestones/MilestoneFilter';

<MilestoneFilter
  selected={filter}
  onChange={setFilter}
  resultCount={filteredMilestones.length}
/>
```

---

## `MilestoneCreationForm`

Modal form for creating a milestone. It validates the input locally, generates an ID, and submits a fully-constructed milestone object to the parent.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(milestone: Milestone) => void` | Yes | Called with the constructed milestone when validation passes. |
| `onCancel` | `() => void` | Yes | Called when the user cancels or dismisses the dialog. |
| `contractId` | `string` | No | Optional parent contract id stamped onto the milestone for later contract resolution. |

### Minimal usage

```tsx
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';

<MilestoneCreationForm
  onSubmit={(milestone) => saveMilestone(milestone)}
  onCancel={() => setShowForm(false)}
  contractId={contract.id}
/>
```
