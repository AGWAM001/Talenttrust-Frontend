# Persistence API and Data Model Guide

## Overview
The client-side persistence layer for TalentTrust, located in `src/lib/repository.ts`, acts as the single source of truth for contracts and milestones. It provides a synchronous, SSR-safe mechanism for storing data in the browser's `localStorage` using a centralized namespace. This document details the data shape, security semantics, and how different pages in the application consume the repository API.

## Storage Namespace and AppData Shape
The repository uses a single `localStorage` key to store the complete state:
- **`STORAGE_KEY`**: `'talenttrust_app_data'`

The data adheres to the following `AppData` interface shape defined in the repository:
```typescript
interface AppData {
  contracts: Contract[];
  milestones: Milestone[];
}
```

The constituent types (`Contract` and `Milestone`) are strictly defined in `src/types/domain.ts` and represent the canonical structure used throughout the frontend components.

### Linking milestones to a parent contract
`Milestone` carries an optional `contractId?: string` field (defined alongside the rest of the shape in `src/components/MilestonesList.tsx`) that associates a milestone with the `Contract` it belongs to. The field is optional so existing milestones created without a contract context (e.g. the standalone [Milestones Page](../src/app/milestones/page.tsx) flow) remain valid.

`MilestoneCreationForm` (`src/components/milestones/MilestoneCreationForm.tsx`) accepts an optional `contractId` prop; when a caller renders the form from a contract detail context and passes that contract's id, the constructed `Milestone` is stamped with it on submit so it can later be resolved via `listMilestonesByContract`.

## SSR Safety & Resilience
The repository is designed to be fully safe for Server-Side Rendering (SSR) in Next.js:
- **`window` existence checks**: All access to `localStorage` is guarded by verifying that `typeof window !== 'undefined'`. This ensures Next.js server builds and prerendering processes do not crash.
- **Empty-state fallback**: When the storage key is missing, unparseable, or during SSR, the repository gracefully catches any errors and returns a resilient empty fallback: `{ contracts: [], milestones: [] }`.

## Public API

The repository exposes a synchronous public API that can be consumed directly by React components, forms, and hooks. 

### Contracts API

#### `listContracts(): Contract[]`
Returns all persisted contracts. If `localStorage` is unavailable or corrupt, returns an empty array.
```typescript
import { listContracts } from '@/lib/repository';
const contracts = listContracts();
```
*Consumed by: [Contracts Page](../src/app/contracts/page.tsx)*

#### `saveContract(contract: Contract): void`
Appends a contract to the persisted list.
```typescript
import { saveContract } from '@/lib/repository';
saveContract({
  contractName: 'Design Sprint',
  parties: [{ label: 'Client', address: 'GAI3GJ2Q3B35AOZJ36C4ANE3HSS4NK7DV6JHBFMMOBJ3K27U6IGCUQ4A' }],
  totalValue: 5000,
  currency: 'USD',
  status: 'Active',
  createdAt: '2025-01-01',
  milestoneCount: 3,
});
```

### Milestones API

#### `listMilestones(): Milestone[]`
Returns all persisted milestones.
```typescript
import { listMilestones } from '@/lib/repository';
const milestones = listMilestones();
```
*Consumed by: [Milestones Page](../src/app/milestones/page.tsx)* (which implements a fallback to sample data when the repository is empty).

#### `listMilestonesByContract(contractId: string): Milestone[]`
Returns every persisted milestone whose `contractId` matches the given `contractId`. Milestones saved without a `contractId` (legacy records, or ones created outside a contract context) never match, since `undefined` cannot equal a supplied `contractId` string — including when an empty string is passed.
```typescript
import { listMilestonesByContract } from '@/lib/repository';
const milestones = listMilestonesByContract('contract-123');
```
*Consumed by: [Contract Detail Page](../src/app/contracts/[id]/page.tsx)*, which merges these with the milestones returned by `resolveContractData` (de-duplicated by `id`, persisted records taking precedence) before rendering `MilestonesList` and feeding the combined list into `useContractProgress`.

#### `saveMilestone(milestone: Milestone): void`
Appends a milestone to the persisted list.
```typescript
import { saveMilestone } from '@/lib/repository';
saveMilestone({
  id: 'ms-1',
  title: 'Project Kickoff',
  status: 'Pending',
  payout: 1000,
  currency: 'USD',
  dueDate: 'Jun 1, 2025',
  contractId: 'contract-123',
});
```

### Update Operations
The public API includes both additive writes (appending to arrays) and atomic upserts.

#### `upsertContract(contract: Contract): UpsertResult`
Inserts or updates a contract in the persisted list:
- **Append branch**: When no contract matches the same `contractName`, the contract is appended to the end of the array.
- **Replace branch**: When an existing contract matches the same `contractName`, it is replaced in-place, preserving the existing array order and avoiding duplicates. In the case of multiple same-name candidates, only the first matching contract is replaced.
- **Stale-overwrite guard**: Every contract carries an internal `version` field that starts at `1` for new contracts and increments on each successful upsert. Before writing, the function compares the incoming contract's version against the currently stored version. If the stored version is higher, the write is rejected with `{ success: false, stale: true }`. This prevents one tab from silently overwriting a status change made in another tab.
- **Milestones isolation**: Milestones data and other contracts are preserved completely unchanged.
- **Error reporting**: If `window.localStorage.setItem` throws (e.g. storage quota exceeded) or in SSR contexts, the failure is reported to the central `reportError` reporter and `{ success: false, stale: false }` is returned.

```typescript
import { upsertContract } from '@/lib/repository';
const result = upsertContract({ ...existingContract, status: 'Completed', version: 0 });
if (!result.success && result.stale) {
  // Another session modified this contract — reload to get the latest.
}
```

#### `getContractVersion(contractName: string): number`
Returns the current persistence-layer version for the contract matching `contractName`, or `0` if the contract has never been persisted. Callers use this to construct the `Contract` object with the correct baseline version before calling `upsertContract`, ensuring the stale-overwrite guard compares against the right baseline.

```typescript
import { getContractVersion, upsertContract } from '@/lib/repository';

const version = getContractVersion('Design Sprint');
const result = upsertContract({ ...existingContract, status: 'Completed', version });
```

---

### Maintenance Helpers

The following helpers provide safe, SSR-aware paths for resetting persisted state. They route through the same `isBrowser()` guard and `reportError` plumbing as every other repository operation and **never throw**.

#### `clearAppData(): boolean`
Removes the single `STORAGE_KEY` (`talenttrust_app_data`) entry, effectively resetting all persisted contracts **and** milestones in a single call.

- Returns `true` when the item is successfully removed (including when the key did not exist — `removeItem` is idempotent).
- Returns `false` in SSR contexts (no `window`) or when `localStorage.removeItem` throws; errors are forwarded to the central `reportError` reporter.

```typescript
import { clearAppData } from '@/lib/repository';

// User clicks “Reset all data”
const ok = clearAppData();
if (!ok) toast.error('Could not clear persisted data.');
```

**Typical use cases:** unit-test teardown, demo resets, and user-initiated “start over” flows.

#### `clearByPrefix(prefix: string): number`
Removes every `localStorage` key whose name **starts with** the given `prefix` and returns the count of keys that were successfully deleted.

- Iterates over a **snapshot** of the key list so that removing a key during iteration can never cause index-shift bugs.
- Never touches keys that do not start with `prefix` — prefix scoping is strictly enforced.
- Returns `0` in SSR contexts or when no keys match the prefix.
- Individual removal errors are reported via `reportError`; the function continues with the remaining keys and does not count failed removals.

```typescript
import { clearByPrefix } from '@/lib/repository';

// Remove every TalentTrust key (e.g. during integration-test teardown)
const removed = clearByPrefix('talenttrust_');
console.log(`Cleared ${removed} localStorage entries.`);
```

> **Warning:** Passing an empty string (`''`) will match **all** localStorage keys.
> Always use an intentionally scoped prefix.

## Security Profile
- **Non-sensitive data only:** Only display-level, non-sensitive metadata (contract names, statuses, public wallet addresses) is persisted. 
- **No private keys or PII:** Absolutely no private keys, passwords, or Personally Identifiable Information (PII) are stored in this layer.
- **Client-only boundaries:** Data never leaves the device through this module, making it secure against cross-origin data leakage given the frontend's strict CSP boundaries.
- **Prefix scoping:** `clearByPrefix` strictly checks `String.prototype.startsWith` and never removes keys outside the supplied prefix. Callers must supply a meaningful prefix; an empty string `''` will match every localStorage key.
