# Dialogs Component API Reference

> **Issue:** Closes #864 — Add a component API reference for dialogs.
> **Status:** Authoritative reference for the dialog-view React components in this repository. Each prop table below is verified against the current source.

This entry consolidates the props, shared types, and minimal usage examples for the dialog-view UI components. It complements the existing [Dialogs.md](./Dialogs.md) usage guide which covers the `ConfirmDialog`, `ContractCreationForm`, `MilestoneCreationForm`, and `useDialogFocusTrap` patterns.

- [Dialogs.md](./Dialogs.md) — unified dialog usage guide (modal patterns, focus trap, accessibility).

## Components at a glance

| Component | Source | Purpose |
| --- | --- | --- |
| [`DialogsList`](#dialogslist) | `src/components/dialogs/DialogsList.tsx` | Filterable list of dialog records with accessible CSV/JSON export controls and per-item copy-ID button. |
| [`DialogLastUpdated`](#dialoglastupdated) | `src/components/dialogs/DialogLastUpdated.tsx` | Relative-time stamp ("Updated 5 minutes ago") that auto-advances while visible. |
| [`DialogsViewSkeleton`](#dialogsviewskeleton) | `src/components/dialogs/DialogsViewSkeleton.tsx` | Animated loading placeholder mirroring the dialogs list layout. |
| [`DialogIdBadge`](#dialogidbadge) | `src/components/DialogIdBadge.tsx` | Accessible copy-to-clipboard control for dialog/entity identifiers. |

### Shared types

The `DialogsList` component re-exports types from `src/lib/exportDialogs.ts`:

```ts
export type DialogStatus = 'All' | 'Open' | 'Closed' | 'Pending';

export interface DialogRecord {
  id: string;
  title: string;
  description: string;
  status: Exclude<DialogStatus, 'All'>;
  createdAt: string;
  resolvedAt?: string | null;
}
```

---

## `DialogsList`

Filterable list of dialog records with accessible CSV/JSON export controls. Supports loading, error, empty, and success states — mutually exclusive, with loading taking precedence over error.

### Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `dialogs` | `DialogRecord[]` | Yes | — | The full list of dialog records to display and export. |
| `isLoading` | `boolean` | No | `false` | When `true`, an animated skeleton is shown instead of the list. |
| `error` | `string \| null` | No | `null` | When provided, an error alert is rendered instead of the list. |

### Export utilities

Also exported from `DialogsList.tsx`:

| Export | Signature | Description |
| --- | --- | --- |
| `execCommandFallback` | `(text: string) => boolean` | Fallback clipboard copy via `document.execCommand('copy')` for environments where the Clipboard API is unavailable. |

The underlying CSV/JSON serialisation helpers are in `src/lib/exportDialogs.ts`:

| Export | Signature | Description |
| --- | --- | --- |
| `downloadDialogsCsv` | `(dialogs: DialogRecord[], filename?: string) => void` | Serialises `dialogs` to RFC-4180 CSV and triggers a client-side download. |
| `downloadDialogsJson` | `(dialogs: DialogRecord[], filename?: string) => void` | Serialises `dialogs` to pretty-printed JSON and triggers a client-side download. |
| `dialogsToCsv` | `(dialogs: DialogRecord[]) => string` | Returns the CSV string without triggering a download. |
| `dialogsToJson` | `(dialogs: DialogRecord[]) => string` | Returns the JSON string without triggering a download. |
| `csvEscape` | `(value: unknown) => string` | RFC 4180 field escaping with formula-injection neutralisation. |
| `triggerDownload` | `(content: string, filename: string, mimeType: string) => void` | Low-level Blob-URL download trigger. |

### State behaviour

| State | Condition | Renders |
| --- | --- | --- |
| Loading | `isLoading === true` | Animated skeleton (`aria-busy="true"`), all other UI hidden. |
| Error | `error` is truthy | `role="alert"` with the error message. |
| Empty | `filteredDialogs.length === 0` | Contextual empty-state message. |
| Success | otherwise | Filtered list with export controls. |

### Minimal usage

```tsx
import { DialogsList } from '@/components/dialogs/DialogsList';
import type { DialogRecord } from '@/lib/exportDialogs';

<DialogsList
  dialogs={dialogs}
  isLoading={isFetching}
  error={fetchError}
/>
```

---

## `DialogLastUpdated`

Relative-time stamp (e.g. "Updated 5 minutes ago") that automatically re-renders on a configurable interval to keep the displayed value fresh.

### Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `updatedAt` | `Date \| string \| number` | Yes | — | A timestamp compatible with `formatRelativeTime`. |
| `className` | `string` | No | `''` | Additional CSS class names for the wrapper `<p>` element. |

### Constant

```ts
import { DIALOG_LAST_UPDATED_TICK_MS } from '@/components/dialogs/DialogLastUpdated';
// 60_000 (60 seconds)
```

### Minimal usage

```tsx
import { DialogLastUpdated } from '@/components/dialogs/DialogLastUpdated';

<DialogLastUpdated updatedAt={dialog.updatedAt} />
<DialogLastUpdated updatedAt={dialog.updatedAt} className="mb-4" />
```

---

## `DialogsViewSkeleton`

Animated loading placeholder that mirrors the dialogs list layout to minimise cumulative layout shift (CLS). Respects `prefers-reduced-motion` via the project's global CSS.

### Props

None.

### Minimal usage

```tsx
import { DialogsViewSkeleton } from '@/components/dialogs/DialogsViewSkeleton';

<DialogsViewSkeleton />
```

---

## `DialogIdBadge`

Accessible copy-to-clipboard control for dialog or entity identifiers. Renders a `label: id` pair with an icon button that copies the identifier to the clipboard.

### Props

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | `string` | Yes | — | The identifier string to display and copy. |
| `label` | `string` | No | `'ID'` | Human-readable label rendered before the identifier and used in accessible button labels and toast messages. |
| `className` | `string` | No | — | Additional CSS class names applied to the root `<span>`. |

### Minimal usage

```tsx
import { DialogIdBadge } from '@/components/DialogIdBadge';

<DialogIdBadge id={contract.id} label="Contract ID" />
<DialogIdBadge id={dispute.id} label="Dispute ID" />
```

---

## Related documentation

- [Dialogs.md](./Dialogs.md) — unified dialog usage guide for modal patterns (ConfirmDialog, ContractCreationForm, MilestoneCreationForm, useDialogFocusTrap).
- [Accessibility.md](./Accessibility.md) — project-wide ARIA and keyboard navigation standards.
- [useDialogFocusTrap.md](../hooks/useDialogFocusTrap.md) — focus-trap hook used by all modal dialogs.
