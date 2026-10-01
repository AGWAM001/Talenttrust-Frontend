# Contracts Component API Reference

> **Issue:** Closes #839 — Add a component API reference for contracts.
> **Status:** Authoritative reference for the contract-related React components in this repository. Each prop table below is verified against the current source.

This entry consolidates the props and minimal usage examples for the
contract-related UI components exposed by the application. It complements
the existing per-component docs under [docs/components/](./).

- [ContractCreationForm.md](./ContractCreationForm.md) - contract creation modal (top-level, distinct from `CreateContractForm` below).
- [ContractDetail.md](./ContractDetail.md) - contract detail page composition.
- [ContractProgress.md](./ContractProgress.md) - escrow summary and milestone progress panel.

## Components at a glance

| Component | Source | Purpose |
| --- | --- | --- |
| [`ContractsList`](#contractslist) | `src/components/contracts/ContractsList.tsx` | Renders a memoized list of contracts via `ContractListItem`. |
| [`ContractListItem`](#contractlistitem) | `src/components/contracts/ContractListItem.tsx` | A single memoized read-only contract list entry. |
| [`ContractRow`](#contractrow) | `src/components/contracts/ContractRow.tsx` | A contract row with a copy-to-clipboard contract ID control. |
| [`ContractRowItem`](#contractrowitem) | `src/components/contracts/ContractRowItem.tsx` | A selectable contract row with a checkbox, used in bulk-action flows. |
| [`BulkActionToolbar`](#bulkactiontoolbar) | `src/components/contracts/BulkActionToolbar.tsx` | Toolbar shown when one or more contracts are selected for bulk actions. |
| [`ContractsSkeleton`](#contractsskeleton) | `src/components/contracts/ContractsSkeleton.tsx` | Loading placeholder mirroring the /contracts list layout. |
| [`CreateContractForm`](#createcontractform) | `src/components/contracts/CreateContractForm.tsx` | Accessible, validated modal form for creating a new escrow contract. |

---

## `ContractsList`

Renders a list of contracts. Memoized with `React.memo` to avoid re-rendering
when the `contracts` array reference is unchanged; delegates each row to the
also-memoized `ContractListItem`.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `contracts` | `Contract[]` | Yes | Array of contracts to display. |

### Minimal usage

```tsx
import ContractsList from '@/components/contracts/ContractsList';

<ContractsList contracts={contracts} />
```

---

## `ContractListItem`

A single, memoized, read-only contract entry rendered inside `ContractsList`.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `contract` | `Contract` | Yes | The contract record to display. |
| `index` | `number` | Yes | Index of the contract in the list (used for the React key). |

### Minimal usage

```tsx
import ContractListItem from '@/components/contracts/ContractListItem';

<ContractListItem contract={contract} index={0} />
```

---

## `ContractRow`

A contract row with a copy-to-clipboard control for the contract ID
(truncated for display, full value copied). Falls back to `contractName`
as the copy value when `contract.id` is absent.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `contract` | `Contract` | Yes | The contract record to display. |

### Minimal usage

```tsx
import { ContractRow } from '@/components/contracts/ContractRow';

<ContractRow contract={contract} />
```

---

## `ContractRowItem`

A selectable contract row with a checkbox, used in bulk-selection flows
(e.g. paired with `BulkActionToolbar`). Keyboard accessible: the checkbox
can be toggled via mouse or Space/Enter.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `contractName` | `string` | Yes | Name of the contract. |
| `parties` | `ContractParty[]` | Yes | Parties involved in the contract. |
| `totalValue` | `number` | Yes | Numerical value of the contract. |
| `currency` | `string` | Yes | Currency code (e.g. `"USD"`). |
| `status` | `StatusType` | Yes | Current contract status. |
| `createdAt` | `string` | Yes | Creation date string. |
| `milestoneCount` | `number` | Yes | Total count of milestones. |
| `isSelected` | `boolean` | Yes | Whether this row is currently selected. |
| `onSelect` | `(selected: boolean) => void` | Yes | Called when the selection checkbox is toggled. |
| `onRowClick` | `() => void` | No | Called when the row itself is clicked (e.g. to navigate to detail). |

### Minimal usage

```tsx
import { ContractRowItem } from '@/components/contracts/ContractRowItem';

<ContractRowItem
  contractName={contract.contractName}
  parties={contract.parties}
  totalValue={contract.totalValue}
  currency={contract.currency}
  status={contract.status}
  createdAt={contract.createdAt}
  milestoneCount={contract.milestoneCount}
  isSelected={selectedIds.has(contract.id)}
  onSelect={(selected) => toggleSelection(contract.id, selected)}
/>
```

---

## `BulkActionToolbar`

Toolbar shown when one or more contracts are selected, offering select-all,
clear-selection, delete, and export actions. Renders nothing (`null`) when
`isOpen` is false.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `selectedCount` | `number` | Yes | Number of currently selected contracts. |
| `totalCount` | `number` | Yes | Total number of contracts available to select. |
| `onSelectAll` | `() => void` | Yes | Called to select all contracts. |
| `onClearSelection` | `() => void` | Yes | Called to clear the current selection. |
| `onDelete` | `() => void` | Yes | Called to delete the selected contracts. |
| `onExport` | `() => void` | Yes | Called to export the selected contracts. |
| `isOpen` | `boolean` | Yes | Whether the toolbar should render. |

### Minimal usage

```tsx
import { BulkActionToolbar } from '@/components/contracts/BulkActionToolbar';

<BulkActionToolbar
  selectedCount={selected.size}
  totalCount={contracts.length}
  onSelectAll={() => selectAll()}
  onClearSelection={() => clearSelection()}
  onDelete={() => deleteSelected()}
  onExport={() => exportSelected()}
  isOpen={selected.size > 0}
/>
```

---

## `ContractsSkeleton`

Full-page loading placeholder for the `/contracts` list view, mirroring the
real list layout to avoid layout shift. Respects `prefers-reduced-motion`.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `count` | `number` | No | Number of shimmer card rows to render. Defaults to `3`. |

### Minimal usage

```tsx
import ContractsSkeleton from '@/components/contracts/ContractsSkeleton';

<ContractsSkeleton count={3} />
```

---

## `CreateContractForm`

Accessible, validated modal form for creating a new escrow contract.
Distinct from the top-level `ContractCreationForm` (see
[ContractCreationForm.md](./ContractCreationForm.md)).

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `onSuccess` | `(contract: Contract) => void` | Yes | Called with the newly constructed and persisted `Contract` after a successful submission. The parent owns updating its own state and dismissing the form. |
| `onCancel` | `() => void` | Yes | Called when the user presses Cancel without submitting. The parent owns hiding the form. |

### Minimal usage

```tsx
import { CreateContractForm } from '@/components/contracts/CreateContractForm';

<CreateContractForm
  onSuccess={(contract) => handleCreated(contract)}
  onCancel={() => setShowForm(false)}
/>
```
