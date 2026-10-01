# Milestones Components — Usage Guide

A comprehensive guide for composing the milestones-related components into a
functional milestones page or widget.

---

## Table of Contents

1. [Overview](#overview)
2. [When to use](#when-to-use)
3. [Component inventory](#component-inventory)
4. [Import examples](#import-examples)
5. [Basic usage](#basic-usage)
6. [Complete example](#complete-example)
7. [Props reference](#props-reference)
8. [Optional props and defaults](#optional-props-and-defaults)
9. [Common composition patterns](#common-composition-patterns)
10. [Styling and customization](#styling-and-customization)
11. [Accessibility considerations](#accessibility-considerations)
12. [Best practices](#best-practices)
13. [Common mistakes to avoid](#common-mistakes-to-avoid)
14. [Limitations and implementation details](#limitations-and-implementation-details)
15. [Troubleshooting](#troubleshooting)

---

## Overview

The milestones components provide a complete, accessible UI for displaying,
filtering, creating, and editing milestones tied to contracts. The set is
composed of:

| Component | Responsibility |
|-----------|---------------|
| `MilestonesList` | Scrollable list shell with status tally, currency warning, due-soon banner, density toggle, and pagination |
| `MilestoneRow` | Single milestone card with view mode and inline edit mode |
| `MilestoneFilter` | Accessible radiogroup for filtering milestones by status |
| `MilestoneCreationForm` | Modal dialog form for creating a new milestone |
| `MilestonesErrorBoundary` | Error boundary that catches render errors in the milestones section and surfaces a retry affordance |
| `MilestoneTimestamp` | Relative-time clock for milestone `updatedAt` / `createdAt` dates |
| `MilestonesListSkeleton` | Shimmer loading placeholder that mirrors the `MilestonesList` layout |
| `BulkActionToolbar` | Sticky toolbar for bulk operations (status update, export, delete) when milestones are selected |

The components are designed to work together out of the box, but each can be
used independently when the full composition is not needed.

---

## When to use

Use the milestones components when you need to display a list of contract
milestones with the ability to:

- Filter by status (All, Active, Pending, Completed, Paid, Disputed)
- View milestone details (title, due date, status badge, formatted payout)
- Edit individual milestones inline without leaving the list
- Create new milestones via a modal form
- Handle loading and error states gracefully

The entire composition is used on the `/milestones` route
(`src/app/milestones/page.tsx`). Individual components can be dropped into any
other page or widget that manages milestone data.

---

## Component inventory

### MilestonesList (`src/components/MilestonesList.tsx`)

Scrollable list container. Owns the inline edit lifecycle and delegates
row-level UI to `MilestoneRow`. Renders status tally chips, a currency-mismatch
warning banner, a due-soon reminder banner, a density toggle, and a "Load More"
pagination button.

### MilestoneRow (`src/components/milestones/MilestoneRow.tsx`)

Single milestone row with view mode and inline edit mode. The parent controls
which row is editing; the row handles validation, save/cancel behaviour, and
focus restoration.

### MilestoneFilter (`src/components/milestones/MilestoneFilter.tsx`)

Accessible status filter radiogroup. Fully controlled — the parent provides the
selected value and handles changes. Announces result counts via an `aria-live`
region.

### MilestoneCreationForm (`src/components/milestones/MilestoneCreationForm.tsx`)

Modal form for creating a new milestone. Validates input locally, generates a
stable `id`, and submits the complete `Milestone` object to the parent.

### MilestonesErrorBoundary (`src/components/milestones/MilestonesErrorBoundary.tsx`)

Scoped error boundary for the milestones section. Catches render errors in
descendants, reports them via `reportError`, and renders an accessible fallback
with a "Try again" button.

### MilestoneTimestamp (`src/components/milestones/MilestoneTimestamp.tsx`)

Renders a relative-time label (e.g. "2 hours ago") with an absolute
`<time>` element for machine-readable timestamp precision. Updates every
minute by default.

### MilestonesListSkeleton (`src/components/MilestonesListSkeleton.tsx`)

Shimmer loading placeholder. Mirrors the `MilestonesList` layout with
skeleton cards. Used in the loading state (`src/app/milestones/loading.tsx`).

### BulkActionToolbar (`src/components/milestones/BulkActionToolbar.tsx`)

Sticky toolbar that appears when bulk-selected milestones are present.
Provides status update, export, and delete actions with keyboard navigation
(arrow keys, Home, End, Escape).

---

## Import examples

```tsx
// MilestonesList — the list shell
import MilestonesList from '@/components/MilestonesList';
import type { Milestone } from '@/components/MilestonesList';

// MilestoneRow — row-level view/edit
import MilestoneRow from '@/components/milestones/MilestoneRow';
import type { MilestoneRowProps } from '@/components/milestones/MilestoneRow';

// MilestoneFilter — status filter radiogroup
import MilestoneFilter, {
  type MilestoneStatusFilter,
} from '@/components/milestones/MilestoneFilter';

// MilestoneCreationForm — modal creation form
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import { MAX_MILESTONE_TITLE_LENGTH } from '@/components/milestones/MilestoneCreationForm';

// MilestonesErrorBoundary — error handling for the milestones section
import MilestonesErrorBoundary from '@/components/milestones/MilestonesErrorBoundary';

// MilestoneTimestamp — relative-time date display
import { MilestoneTimestamp } from '@/components/milestones/MilestoneTimestamp';

// MilestonesListSkeleton — loading placeholder
import { MilestonesListSkeleton } from '@/components/MilestonesListSkeleton';

// BulkActionToolbar — bulk selection operations
import { BulkActionToolbar } from '@/components/milestones/BulkActionToolbar';
import type { BulkActionToolbarProps } from '@/components/milestones/BulkActionToolbar';
```

---

## Basic usage

### MilestonesList with controlled edition

```tsx
'use client';

import { useState, useCallback } from 'react';
import MilestonesList, { type Milestone } from '@/components/MilestonesList';

function MyMilestones() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const handleUpdateMilestone = useCallback(
    (id: string, patch: Partial<Milestone>) => {
      // persist patch to your data layer
      return true; // return false to surface a save-failure announcement
    },
    [],
  );

  return (
    <MilestonesList
      milestones={milestones}
      onUpdateMilestone={handleUpdateMilestone}
    />
  );
}
```

### MilestoneFilter standalone

```tsx
'use client';

import { useState } from 'react';
import MilestoneFilter, { type MilestoneStatusFilter } from '@/components/milestones/MilestoneFilter';

function MyFilter() {
  const [filter, setFilter] = useState<MilestoneStatusFilter>('All');
  const items: Milestone[] = []; // your data

  return (
    <MilestoneFilter
      selected={filter}
      onChange={setFilter}
      resultCount={items.length}
    />
  );
}
```

### MilestoneCreationForm standalone

```tsx
'use client';

import { useState } from 'react';
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';

function MyMilestoneCreator() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Add Milestone
      </button>

      {open && (
        <MilestoneCreationForm
          onSubmit={(milestone) => {
            // persist milestone
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

---

## Complete example

The following mirrors the composition used on the `/milestones` route.

```tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MilestonesList, { type Milestone } from '@/components/MilestonesList';
import MilestoneFilter, { type MilestoneStatusFilter } from '@/components/milestones/MilestoneFilter';
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import MilestonesErrorBoundary from '@/components/milestones/MilestonesErrorBoundary';
import { listMilestones, saveMilestone, updateMilestone } from '@/lib/repository';
import { listMilestonesByContract } from '@/lib/repository';
import { useToast } from '@/components/toast/toast-provider';
import type { MilestoneStatusFilter } from '@/components/milestones/MilestoneFilter';

const UNPAGINATED_LIST_SIZE = 9999;

const VALID_STATUSES: MilestoneStatusFilter[] = [
  'All', 'Pending', 'Completed', 'Paid', 'Disputed',
];

function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [statusFilter, setStatusFilter] = useState<MilestoneStatusFilter>('All');
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showError } = useToast();

  // URL sync — read initial filter from ?status=
  // (In a real page, use useEffect to read searchParams.get('status'))

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return milestones;
    return milestones.filter((m) => m.status === statusFilter);
  }, [milestones, statusFilter]);

  const handleAddMilestone = useCallback(() => setShowForm(true), []);

  const handleSubmitMilestone = useCallback(
    (milestone: Milestone) => {
      saveMilestone(milestone);
      setMilestones(listMilestones());
      setShowForm(false);
    },
    [],
  );

  const handleCancelForm = useCallback(() => setShowForm(false), []);

  const handleUpdateMilestone = useCallback(
    (id: string, patch: Partial<Milestone>): boolean => {
      const result = updateMilestone(id, patch);
      if (!result.ok) {
        showError({ title: 'Unable to update milestone' });
        return false;
      }
      return true;
    },
    [showError],
  );

  return (
    <MilestonesErrorBoundary>
      <div className="min-h-screen p-8">
        <h1>Milestones</h1>

        <MilestoneFilter
          selected={statusFilter}
          onChange={setStatusFilter}
          resultCount={filtered.length}
        />

        <button type="button" onClick={handleAddMilestone}>
          Add Milestone
        </button>

        {filtered.length === 0 ? (
          <p>No milestones match this filter.</p>
        ) : (
          <MilestonesList
            milestones={filtered}
            onUpdateMilestone={handleUpdateMilestone}
            pageSize={UNPAGINATED_LIST_SIZE}
          />
        )}

        {showForm && (
          <MilestoneCreationForm
            onSubmit={handleSubmitMilestone}
            onCancel={handleCancelForm}
          />
        )}
      </div>
    </MilestonesErrorBoundary>
  );
}

export default MilestonesPage;
```

---

## Props reference

### `MilestonesList`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `milestones` | `Milestone[]` | Yes | — | The milestones to render. |
| `contractCurrency` | `string` | No | — | When provided, surfaces a currency-mismatch banner for milestones using a different currency. |
| `onUpdateMilestone` | `(id: string, patch: Partial<Milestone>) => boolean` | No | — | Called after a row save; returning `false` shows a save-failure announcement. |
| `pageSize` | `number` | No | `5` | Number of rows shown before the list reveals a "Load More" button. |

### `Milestone` type (exported from `MilestonesList`)

```ts
export type Milestone = {
  id: string;
  title: string;
  status: StatusType;
  payout: number;
  currency: string;
  dueDate?: string;
  contractId?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
};
```

`StatusType` is imported from `@/components/StatusBadge` and is
`'Pending' | 'Active' | 'Completed' | 'Paid' | 'Disputed'`.

### `MilestoneRow`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `milestone` | `Milestone` | Yes | The milestone record to render. |
| `isEditing` | `boolean` | Yes | Whether this row is currently in inline-edit mode. |
| `onRequestEdit` | `() => void` | Yes | Fired when the user activates edit mode. |
| `onSave` | `(id: string, patch: Partial<Milestone>) => void` | Yes | Called after the row passes validation and is saved. |
| `onCancel` | `() => void` | Yes | Called when the row exits edit mode via Cancel, Escape, or an invalid attempt. |
| `onAnnounce` | `(message: string) => void` | No | Optional callback for save-status announcements. Defaults to a no-op. |

### `MilestoneFilter`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `selected` | `MilestoneStatusFilter` | Yes | The currently active filter option. |
| `onChange` | `(filter: MilestoneStatusFilter) => void` | Yes | Called when the user selects a different filter option. |
| `resultCount` | `number` | Yes | The number of milestones matching the current filter. Used in the `aria-live` announcement. |

`MilestoneStatusFilter` is `'All' | 'Active' | 'Pending' | 'Completed' | 'Paid' | 'Disputed'`.

### `MilestoneCreationForm`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(milestone: Milestone) => void` | Yes | Called with the complete milestone object after validation passes. |
| `onCancel` | `() => void` | Yes | Called when the user cancels or dismisses the dialog. |
| `contractId` | `string` | No | Optional parent contract id stamped onto `milestone.contractId`. |

### `MilestonesErrorBoundary`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Content to protect. |
| `fallback` | `ReactNode` | No | Optional custom fallback UI that replaces the built-in accessible fallback entirely. |
| `onError` | `(error: Error, info: React.ErrorInfo) => void` | No | Optional callback fired after an error is caught, in addition to the internal `reportError` call. |

### `MilestoneTimestamp`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `date` | `Date \| string \| null \| undefined` | Yes | — | The date to display. When falsy, renders `—` with `aria-label="No date available"`. |
| `className` | `string` | No | `'text-sm text-slate-500'` | CSS class applied to the `<time>` element. |
| `updateInterval` | `number` | No | `60000` | Milliseconds between relative-time refreshes. |
| `labelPrefix` | `string` | No | `'Last updated:'` | Prefix for the `aria-label` on the `<time>` element. |

### `MilestonesListSkeleton`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | — | — | The component accepts no props. It renders a fixed skeleton layout mirroring `MilestonesList`. |

### `BulkActionToolbar`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `selectedCount` | `number` | Yes | The count of currently selected milestones. The toolbar renders nothing when `0`. |
| `totalCount` | `number` | Yes | The total number of milestones in the list. |
| `onClearSelection` | `() => void` | Yes | Called when the user clicks Clear or presses Escape. |
| `onExport` | `() => void` | Yes | Called when the user clicks Export. |
| `onStatusUpdate` | `(status: StatusType) => void` | Yes | Called with the selected status when the user picks a status from the dropdown. |
| `onDelete` | `() => void` | Yes | Called when the user clicks Delete. |

---

## Optional props and default behavior

### MilestonesList defaults

- `pageSize` defaults to `5` (`PAGE_SIZE_DEFAULT`). The user sees the first 5 rows, then a "Load More" button appends further items in increments of the same `pageSize`.
- If `contractCurrency` is omitted, the currency-mismatch banner is never rendered.
- If `onUpdateMilestone` is omitted, row saves are treated as successful (no failure announcement).

### MilestoneRow defaults

- When `onAnnounce` is omitted, the row defaults to a no-op — it works in isolation without a parent live region.
- `dueDate` is optional on the `Milestone` type; when absent, the row renders "TBD" in the view-mode summary.

### MilestoneCreationForm defaults

- `currency` defaults to `'USD'`.
- `status` defaults to `'Pending'`.
- `dueDate` defaults to an empty string, which becomes `undefined` on submit.
- The `contractId` prop is optional; when omitted, the milestone is created without a contract association.

### MilestonesErrorBoundary defaults

- When no `fallback` prop is supplied, the built-in accessible fallback is rendered on error: a red-bordered container with role `alert`, an `aria-live="assertive"` region, and an auto-focused "Try again" button.
- When no `onError` callback is provided, the error is still reported through `reportError`.

### MilestoneTimestamp defaults

- `className` defaults to `'text-sm text-slate-500'`.
- `updateInterval` defaults to `60000` (1 minute).
- `labelPrefix` defaults to `'Last updated:'`.

---

## Common composition patterns

### Pattern 1 — Full milestones page

Wrap the entire milestones UI in `MilestonesErrorBoundary`. Place `MilestoneFilter` above `MilestonesList`, and render `MilestoneCreationForm` modally when the user clicks "Add Milestone". Use `MilestonesList` as the primary list container; it owns the inline edit lifecycle.

```
MilestonesErrorBoundary
 └── div.page
      ├── h1 "Milestones"
      ├── MilestoneFilter
      ├── button "Add Milestone"
      ├── MilestonesList
      └── MilestoneCreationForm (modal, conditionally rendered)
```

### Pattern 2 — Embedded list in a contract detail page

On a contract detail page, pass `contractCurrency` to `MilestonesList` so the currency-mismatch banner activates. Use `MilestonesList` with `contractCurrency` and `onUpdateMilestone`. Do not pass `contractId` to `MilestoneCreationForm` if the form should not stamp the contract.

```
div.contract-detail
 ├── ContractHeader
 ├── MilestonesList(milestones, contractCurrency=contract.currency, onUpdateMilestone)
 └── MilestoneCreationForm(contractId=contract.id, ...)
```

### Pattern 3 — Read-only milestones view

Render `MilestonesList` with only `milestones` (no `onUpdateMilestone`, no `contractCurrency`). The rows will be in view mode only; the Edit button is present but `onUpdateMilestone` returning `true` silently succeeds. The filter and creation form can be omitted entirely.

```
MilestonesList(milestones=readOnlyMilestones)
```

### Pattern 4 — Loading → loaded → error lifecycle

Use `MilestonesListSkeleton` as the initial rendering state (typically in a Next.js route `loading.tsx`), swap to `MilestonesList` when data is available, and wrap the whole thing in `MilestonesErrorBoundary` to handle render errors.

```
MilestonesErrorBoundary
 ├── isLoading ? MilestonesListSkeleton : MilestonesList(milestones)
 └── MilestoneCreationForm (modal)
```

### Pattern 5 — Bulk actions with selection

When users can select multiple milestones (e.g. via checkboxes not yet implemented in the current codebase), render `BulkActionToolbar` above `MilestonesList`. The toolbar is visible only when `selectedCount > 0`. The parent owns selection state.

```
div
 ├── BulkActionToolbar(selectedCount, totalCount, onClearSelection, onExport, onStatusUpdate, onDelete)
 └── MilestonesList(milestones)
```

---

## Styling and customization

### Tailwind classes used by each component

All components use Tailwind CSS utility classes directly. No CSS modules or
separate stylesheets are involved. To customize the appearance, override the
Tailwind utilities or extend the theme in `tailwind.config.ts`.

| Component | Key Tailwind classes |
|-----------|---------------------|
| `MilestonesList` | `rounded-3xl`, `border border-slate-200`, `bg-white`, `p-6`, `shadow-sm` |
| `MilestoneRow` (view) | `rounded-3xl`, `border border-slate-200`, `bg-slate-50`, `p-4`, `shadow-sm` |
| `MilestoneRow` (edit) | `rounded-3xl`, `border border-indigo-300`, `bg-white`, `p-4`, `ring-1 ring-indigo-100` |
| `MilestoneFilter` | Uses `bg-indigo-600 / bg-white`, `text-white / text-slate-600`, `border` utilities |
| `MilestoneCreationForm` | `fixed inset-0 bg-black bg-opacity-50`, `bg-white rounded-3xl`, `max-w-lg`, `p-6` |
| `MilestonesErrorBoundary` | `rounded-2xl`, `border border-red-200`, `bg-red-50`, `p-6` |
| `MilestoneTimestamp` | `text-sm text-slate-500` (default `className`) |
| `MilestonesListSkeleton` | `animate-pulse`, `bg-slate-200` shimmer blocks |
| `BulkActionToolbar` | `sticky top-2`, `border border-blue-200`, `bg-blue-50`, `rounded-2xl` |

### Density toggle

`MilestonesList` exposes a density toggle that switches between `comfortable` and `compact` spacing. The preference is persisted via `usePreferences` (stored in `localStorage`). In compact mode, the list uses `space-y-2` and tighter margins; in comfortable mode, `space-y-4`.

The density preference is not a prop of `MilestonesList` — it is read from the `PreferencesProvider` context. To customize density externally, wrap your page in the existing `PreferencesProvider` or use the `usePreferences` hook.

Customization is limited to the Tailwind classes in the component source. If you need a different visual treatment (e.g. card borders, font sizes, or spacing), edit the Tailwind classes in `src/components/MilestonesList.tsx` and `src/components/milestones/MilestoneRow.tsx`.

---

## Accessibility considerations

### Roles and landmarks

| Element | Role / attribute | Purpose |
|---------|-------------------|---------|
| `MilestonesList` root | `<section aria-labelledby="milestones-title">` | Names the widget from the visible heading. |
| Density toggle | `aria-pressed={isCompact}` | Exposes the toggle as a two-state button for assistive technology. |
| Status tally | `role="list"` / `role="listitem"` per chip | Exposes per-status counts as a labelled list. |
| Currency mismatch | `role="alert"` | Interrupts to surface a correctness issue. |
| Due-soon banner | `role="status"` | Announces milestone deadlines politely. |
| Save/save-failure announcement | `role="status"`, `aria-live="polite"`, `aria-atomic="true"` | Reports inline edit outcomes without a live region in `MilestoneRow` itself. |
| Scroll region | `role="region"` (non-empty only), `tabIndex={0}` | Makes the scroller keyboard-reachable with a meaningful accessible name. |
| `MilestonesErrorBoundary` fallback | `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"` | Immediately announces the error to screen readers. |
| `MilestoneCreationForm` dialog | `role="dialog"`, `aria-modal="true"`, `aria-labelledby="create-milestone-title"` | Correct AT announcement for the modal. |
| `MilestoneFilter` | `<fieldset>` + `<legend>` + `role="radiogroup"` | Groups the filter options programmatically per WCAG 1.3.1. |
| `BulkActionToolbar` | `role="toolbar"`, `aria-label="Bulk milestone actions"` | Labels the toolbar for assistive technology. |
| `BulkActionToolbar` count | `aria-live="polite"`, `aria-atomic="true"` | Announces selection count changes. |

### Keyboard interactions

| Component | Key | Behavior |
|-----------|-----|----------|
| `MilestonesList` scroll region | Tab | Enters the scroll region; arrow keys scroll the container. |
| `MilestoneRow` (edit mode) | Escape | Cancels the edit, discards local changes, announces via `onAnnounce`. |
| `MilestoneRow` (edit mode) | Enter (inside any field) | Submits the form (native `<form>` behavior). |
| `MilestoneRow` (edit mode) | Tab | Moves through all fields in source order; none are removed from tab order. |
| `MilestoneCreationForm` | Escape | Calls `onCancel` (managed by `useDialogFocusTrap`). |
| `MilestoneCreationForm` | Tab | Wraps within the dialog focus trap. |
| `BulkActionToolbar` | Arrow keys | Moves focus between toolbar controls. |
| `BulkActionToolbar` | Home / End | Moves focus to the first / last control. |
| `BulkActionToolbar` | Escape | Clears selection (`onClearSelection`). |
| `MilestoneTimestamp` | N/A | Decorative/informational element; not keyboard-interactive. |

### Focus management

- **Entering row edit mode:** focus moves to the Title input field (deferred with `requestAnimationFrame`).
- **Leaving edit mode (Save/Cancel):** focus is restored to the originating Edit button via `requestAnimationFrame`. This satisfies WCAG 2.4.3 (Focus Order).
- **Invalid save attempt:** focus stays in place so the user can immediately correct the flagged field.
- **MilestoneCreationForm:** initial focus moves to the Title input on open; focus returns to the trigger element on close (managed by `useDialogFocusTrap` with `restoreFocus: true`).
- **MilestonesErrorBoundary:** the "Try again" button receives `autoFocus` when the fallback renders.
- **BulkActionToolbar:** when `selectedCount` transitions from `0` to `>0`, focus automatically moves to the Clear button.

### Screen reader announcements

- Filter result counts are announced via an `aria-live="polite"` region.
- Save success/failure is announced via a nonce-bumped `aria-live="polite"` span on `MilestonesList`.
- Density changes are announced via a dedicated `aria-live="polite"` span.
- Currency mismatch warnings use `role="alert"` for assertive announcement.

---

## Best practices

1. **Always wrap the milestones composition in `MilestonesErrorBoundary`** so render errors in any child component are caught and a recoverable fallback is shown.

2. **Use `MilestoneFilter` with a derived `resultCount`.** Pass `filtered.length` (not the unfiltered total) so the live-region announcement matches the visible list.

3. **Control exactly one `MilestoneRow` in edit mode at a time.** `MilestonesList` enforces mutual exclusion via `editingId` state. Do not open multiple rows for editing simultaneously — it creates competing focus traps and confusing screen-reader output.

4. **Persist preferences after edit.** When `onUpdateMilestone` returns `true`, refresh the milestone list from your data source to avoid stale state. When it returns `false`, the component automatically announces the failure.

5. **Use `MilestoneTimestamp` for any date display** in milestone cards. It handles relative-time updates, absolute-time fallbacks, and the `<time>` element with a machine-readable `dateTime` attribute.

6. **Include `contractId` in `MilestoneCreationForm`** when creating milestones from a contract detail context. This ensures `listMilestonesByContract` can resolve the milestone back to its parent.

7. **Respect the `pageSize` prop.** On the `/milestones` route, `UNPAGINATED_LIST_SIZE = 9999` is used to opt out of pagination entirely. Use the default `5` for paginated lists where memory and render performance matter.

8. **Provide a custom `fallback` prop on `MilestonesErrorBoundary`** when you need a branded error UI. The built-in fallback is functional but uses default red styling.

9. **Use `MilestonesListSkeleton` in a Suspense boundary** (`loading.tsx`) for route-level loading states. Do not render it inline as a conditional — it is designed to be a route loading fallback.

10. **Sync filter state to the URL** using `useSearchParams` and `useRouter.replace`. Read `?status=` on mount and write back on filter change (without `push`, to avoid cluttering browser history).

---

## Common mistakes to avoid

### 1. Passing the unfiltered count to `MilestoneFilter.resultCount`

Passing `milestones.length` (the total list length) instead of `filtered.length`
causes the screen-reader announcement to say "Showing all 5 milestones" when
only 2 are actually visible after filtering.

**Correct:**
```tsx
<MilestoneFilter
  selected={statusFilter}
  onChange={setStatusFilter}
  resultCount={filtered.length}
/>
```

### 2. Opening multiple rows into edit mode simultaneously

`MilestonesList` ensures only one row is in edit mode at a time via mutual
exclusion (`editingId`). Manually managing `isEditing` across multiple rows
without coordinating through `editingId` breaks the focus-restoration contract
and creates competing Escape handlers.

**Correct:**
```tsx
<MilestonesList
  milestones={milestones}
  onUpdateMilestone={handleUpdateMilestone}
  // The list owns editingId state internally
/>
```

### 3. Omitting `onUpdateMilestone` when saves need to be persisted

Without `onUpdateMilestone`, row saves are treated as successful (returns
`true` silently) but no persistence occurs. The UI will show the save as
successful while the data reverts on the next render.

**Correct:**
```tsx
<MilestonesList
  milestones={milestones}
  onUpdateMilestone={(id, patch) => {
    const ok = updateMilestone(id, patch);
    return ok; // true = success announcement, false = failure announcement
  }}
/>
```

### 4. Using `MilestoneCreationForm` without a close mechanism

The form does not close itself — the parent must unmount it. Forgetting to
toggle `showForm` to `false` inside `onSubmit` or `onCancel` leaves the modal
open after submission or cancellation.

**Correct:**
```tsx
<MilestoneCreationForm
  onSubmit={(m) => {
    saveMilestone(m);
    setShowForm(false); // ← parent closes the dialog
  }}
  onCancel={() => setShowForm(false)}
/>
```

### 5. Ignoring the `contractId` prop in contract-detail context

When creating milestones from a contract detail page, omitting `contractId`
means the milestone has no association with its parent contract and
`listMilestonesByContract` cannot retrieve it later.

**Correct:**
```tsx
<MilestoneCreationForm
  contractId={contract.id}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
/>
```

### 6. Not wrapping the milestones page in `MilestonesErrorBoundary`

Without the error boundary, a render error in any milestones child component
crashes the entire page with a React error overlay. The error boundary
provides a user-facing "Try again" affordance and logs the error through
the existing `reportError` seam.

**Correct:**
```tsx
<MilestonesErrorBoundary>
  <MilestonesPage />
</MilestonesErrorBoundary>
```

---

## Limitations and implementation details

### MilestonesList pagination

The list's pagination is client-side only. `pageSize` controls how many rows
are rendered initially; a "Load More" button appends the next `pageSize` items.
There is no server-side pagination support. For large datasets, consider
implementing a virtualized list or server-side cursor pagination above
`MilestonesList`.

### Milestone ID generation

`MilestoneCreationForm` generates `milestone.id` as `{slugified-title}-${Date.now()}`. If two milestones are created in the same millisecond with the same title, the IDs will collide. In practice, the timestamp provides sufficient uniqueness for interactive use.

### Inline edit validation

`MilestoneRow` uses `validateMilestoneEdit` for validation, which enforces:
- Title is required and ≤200 characters.
- Payout is required and must parse to a positive number.
- Currency is required.

Status and due date are not validated during edit — they accept all values.

### Currency mismatch detection

The currency-mismatch banner requires `contractCurrency` to be passed to
`MilestonesList`. Without it, the banner is never rendered. On the standalone
`/milestones` page, `contractCurrency` is not passed, so the banner does not
appear — it only activates in the contract detail context.

### Due-soon reminder window

The due-soon banner uses a fixed 7-day window (`REMINDER_WINDOW_DAYS = 7`).
Milestones in terminal statuses (`Paid`, `Completed`) are excluded. The
banner is dismissible and its dismissal is persisted to `localStorage`.

### Density preference persistence

The density toggle (`comfortable` / `compact`) is persisted via the
`PreferencesProvider` context and `localStorage`. The preference key is
`milestonesDensity`. If the preferences context is not available, the list
defaults to `comfortable` density.

### MilestoneTimestamp update interval

`MilestoneTimestamp` refreshes its relative-time label every 60,000 ms by
default. This interval is hardcoded and not configurable via props. To change
the refresh rate, pass `updateInterval` as a prop.

### `BulkActionToolbar` rendering

`BulkActionToolbar` renders nothing (`null`) when `selectedCount === 0`. It
is not currently wired into the `/milestones` page's selection logic — it is
available for composition when a selection mechanism is needed.

### SSR considerations

- `MilestonesList` renders a `role="region"` and `tabIndex={0}` only when
  `milestones.length > 0`. This avoids hydration mismatches between SSR and
  client when the list is empty.
- `listMilestones()` in the repository is guarded by `isBrowser()` so it
  returns `[]` during server rendering.
- `MilestonesListSkeleton` uses `animate-pulse` which is a CSS-only animation
  and works in SSR without JavaScript.

---

## Troubleshooting

### The dense list has no "Load More" button

If `milestones.length <= pageSize`, the "Load More" button is not rendered
because all items fit within the initial page. Increase `pageSize` or pass a
larger list.

### The currency-mismatch banner never appears

Check that `contractCurrency` is passed to `MilestonesList`. The banner only
renders when:
1. `contractCurrency` is a non-empty string.
2. At least one milestone uses a different currency.

On the standalone `/milestones` page, `contractCurrency` is not passed, so
the banner is intentionally absent.

### The due-soon banner is not showing

The banner requires:
1. At least one milestone with a due date within 7 days of today.
2. The milestone's status is not `Paid` or `Completed`.
3. The banner has not been dismissed (`localStorage` flag not set).

If all milestones are in terminal statuses or have due dates more than 7 days
away, the banner will not render.

### Row save appears successful but data reverts

`onUpdateMilestone` must persist the patch to your data source (e.g.
localStorage via `updateMilestone`). If it returns `true` without persisting,
the UI announces success but the next render will show the old data from the
data source.

### Edit mode does not focus the title field

When `isEditing` transitions to `true`, a `useEffect` defers focus to the
Title input using `window.setTimeout(..., 0)`. If the `isEditing` prop
fluctuates rapidly (e.g. toggled twice in the same render cycle), the timer
may be cleared before it fires. Ensure `isEditing` is stable — use a
boolean state rather than an inline expression.

### `MilestoneCreationForm` does not close after submit

The form does not close itself. The parent must set the visibility state to
`false` in the `onSubmit` handler:

```tsx
<MilestoneCreationForm
  onSubmit={(m) => {
    saveMilestone(m);
    setShowForm(false); // ← required
  }}
  onCancel={() => setShowForm(false)} // ← also required
/>
```

### Screen reader does not announce save status

The save announcement is driven by a `aria-live="polite"` span on
`MilestonesList`. If the parent does not pass `onUpdateMilestone`, no
announcement is made. Ensure `onUpdateMilestone` is provided and that the
`MilestoneRow` can call `onAnnounce`. The announcement is also suppressed if
the same message was just announced — the nonce key on the span forces a re-announcement on repeat identical strings.

### `MilestonesErrorBoundary` does not recover on retry

The error boundary resets its state on retry (`this.setState({ hasError: false, error: null })`), which re-mounts all children. If the underlying error persists (e.g. a broken data source), the fallback re-renders. Ensure the root cause of the error is resolved before testing retry.