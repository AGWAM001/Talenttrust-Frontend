# Contract Detail Components

This page uses a set of reusable components to present contract metadata, milestone progress, and context-aware actions. The page implements loading and error states via skeleton placeholders and error messaging wired to ActionPanel.

## Components

### `ContractSummary`

Props:
- `contractName: string`
- `parties: { label: string; address: string }[]`
- `totalValue: number`
- `currency: string`
- `status: 'Active' | 'Completed' | 'Disputed' | 'Pending'`
- `createdAt: string`
- `milestoneCount: number`

Description: Displays the contract name, current status badge, total value, creation date, and key parties with middle-truncated addresses.

### `ContractProgress`

Props:
- `milestones: Milestone[]`

Description: Derives escrow metrics directly from the contract's milestone array and renders an accessible progress panel with a `role="progressbar"` indicator and paid/outstanding fund cards. Currency is taken from the milestones themselves — no value is hardcoded on the page. An empty `milestones` array renders a safe zero-state (0 / 0, 0% progress) without throwing.

The component is placed between `ContractSummary` and `MilestonesList` in the left column and wrapped in its own `SafeBoundary`. During data loading a `ContractProgressSkeleton` is shown in its place.

See [`docs/components/ContractProgress.md`](./ContractProgress.md) for the full data-calculation spec and ARIA attribute table.

### `MilestonesList`

Props:
- `milestones: Array<{ id: string; title: string; status: 'Pending' | 'Completed' | 'Paid' | 'Disputed'; payout: number; currency: string; dueDate?: string; }>`
- `contractCurrency?: string` — optional contract-level currency. When provided, milestones whose currency differs (case-insensitive) trigger an accessible `role="alert"` warning banner near the milestones list identifying which and how many milestones mismatch.

Description: Renders a scrollable milestone roster, each showing the title, due date, status, and payout amount. When `contractCurrency` is provided, the component uses `findCurrencyMismatches` from `src/lib/currencyMismatch.ts` to detect and surface currency mismatches.

### `ActionPanel`

Props:
- `status: 'Active' | 'Completed' | 'Disputed' | 'Pending'`
- `onSubmitMilestone?: () => void`
- `onDispute?: () => void`
- `onReleaseFunds?: () => void`
- `onViewSummary?: () => void`
- `disabledReasons?: Partial<Record<ActionKey, string>>`
- `errorMessage?: string`
- `isLoading?: boolean`

Description: Chooses appropriate action buttons based on the current contract status. See `docs/components/ActionPanel.md` for keyboard support, disabled-state reasons, loading, and error guidance.

### `ContractSummarySkeleton`

Description: Renders a placeholder skeleton for `ContractSummary` while contract data is loading. Uses `aria-busy="true"` and `aria-label="Loading contract summary"` for accessibility announcement.

### `ContractProgressSkeleton`

Description: Renders a placeholder skeleton for `ContractProgress` while contract data is loading. Uses `aria-busy="true"` and `aria-label="Loading escrow progress"` for accessibility announcement. Mirrors the visual shape of `ContractProgress` with pulsing grey blocks for the progress bar and both fund cards.

### `MilestonesListSkeleton`

Description: Renders a placeholder skeleton for `MilestonesList` while milestones are loading. Uses `aria-busy="true"` and `aria-label="Loading milestones"` for accessibility announcement.

## Data Resolver

The `resolveContractData` function (in `src/lib/contractResolver.ts`) provides a typed, deterministic async interface for contract data. It accepts an optional config object with `simulateError` and `simulateDelay` flags for testing.

```typescript
export async function resolveContractData(
  id: string,
  options: ResolverOptions = {}
): Promise<ContractData>
```

In production, replace the mock implementation with a real API call. The return type is `ContractData`, which includes all fields needed by `ContractSummary`, `MilestonesList`, and `ActionPanel`.

## Loading and Error States

- **Loading:** While data is resolving, skeleton placeholders display for `ContractSummary` and `MilestonesList`. `ActionPanel` receives `isLoading={true}`, which disables all buttons and announces a reason to screen readers.
- **Error:** If data resolution fails, `ActionPanel` displays an error message with `role="alert"`. Buttons remain disabled. Components are wrapped in `SafeBoundary` to catch render errors.

## Contract-detail action state machine

The detail page treats the contract status as the source of truth for which
actions are available. Loading, wallet, authorization, and persistence
conditions are separate guards; a visible action is not evidence that a wallet
transaction has been submitted.

### States and transitions

| State | Entry trigger | Allowed actions | Terminal outcome |
|---|---|---|---|
| `Loading` | The route is valid and `resolveContractData(id)` is pending | None; all action buttons are disabled | `Active`, `Pending`, `Completed`, or `Disputed` after data resolves; load error leaves actions disabled |
| `Active` | A resolved contract is active | Submit milestone, release funds, open dispute | Submit is currently a placeholder; release transitions to `Completed`; dispute transitions to `Disputed` |
| `Pending` | A resolved contract has a pending lifecycle status | Release funds, open dispute | Release transitions to `Completed`; dispute transitions to `Disputed` |
| `Completed` | Release succeeds or the contract resolves completed | View summary | Terminal for contract actions; no further funding or dispute action is offered |
| `Disputed` | Dispute submission succeeds or the contract resolves disputed | Dispute is shown as the lifecycle action (wallet-gated) | Terminal for release and milestone actions; dispute submission remains policy-controlled |
| `Unavailable` | The resolver fails, the contract is missing, or the route id is invalid | None | Invalid ids call `notFound()`; resolver failures show an alert and keep actions disabled |

### Guard and failure rules

| Condition | User-visible behavior | Retry rule |
|---|---|---|
| Wallet unavailable | Action buttons are disabled and `Connect wallet to perform this action` is shown. Dispute also re-checks the wallet at submit time. | Connect the wallet, then retry the action. No wallet address is persisted by the detail page. |
| Authorization or action restriction | The action is disabled when `disabledReasons` is supplied; the reason is exposed through `aria-describedby`. | Resolve the permission or unmet-condition message, then retry. Do not bypass the guard in the client. |
| Transaction pending | `Pending` exposes only release and dispute actions. This UI does not claim confirmation or poll a chain transaction. | Reload or refetch through the owning API/wallet integration before retrying; do not treat a pending state as success. |
| API conflict / stale write | Optimistic status is rolled back and the alert/toast says `This contract was updated in another session. Please reload and try again.` | Reload to obtain the latest version, then retry. |
| Other persistence failure | Optimistic status is rolled back and the alert/toast says `The contract status could not be persisted. Please try again.` | Retry after the underlying repository or network failure is resolved. |
| Contract not found or invalid id | Invalid route ids call `notFound()` without rendering the raw id. Resolver failures render the error state. | Navigate to a valid contract or reload after the data source is available. |

Successful release and dispute writes announce the new status and show a
success toast. A failed write never leaves the optimistic status in place.
There is no automatic retry, because repeating a release or dispute could
duplicate a wallet/API operation.

### Boundary requirements

- **Wallet boundary:** `ActionPanel` reads connection state from `useWallet`.
  The contract page passes status callbacks but does not treat a connected
  address as proof of transaction confirmation.
- **Network/API boundary:** `resolveContractData` and repository writes are
  fallible. Loading and persistence failures remain explicit UI states; the
  repository version check protects against stale overwrites.
- **Authorization boundary:** Server/API authorization remains authoritative.
  Client-side disabled buttons improve clarity and accessibility but are not a
  security boundary.
- **Cached data boundary:** Repository data is merged by milestone id, with
  persisted records taking precedence. Cached values must not be presented as
  confirmed on-chain transaction results.
- **User-content boundary:** Dispute reasons are trimmed and validated to 500
  characters, then rendered as text. Contract names, party labels, and ids are
  rendered through React text nodes; raw HTML is never injected.

The focused page tests in `src/app/contracts/[id]/__tests__/page.test.tsx`
verify the resolved detail view and optimistic release persistence. Component
tests for `ActionPanel` verify status-specific actions, wallet gating, loading
disabling, dispute validation, and accessible disabled reasons. When a real
wallet/API transaction adapter is introduced, add integration coverage for
transaction confirmation and retry behavior at that adapter boundary.

## Adding a new action type

1. Update the `ActionPanelProps` type to include the callback for the new action.
2. Extend the `getActionButtons` helper inside `ActionPanel.tsx` with the new status-to-action mapping.
3. Add a new button render block in `ActionPanel` that uses the callback and descriptive `aria-label`.
4. Add unit tests in `src/components/__tests__/ActionPanel.test.tsx` to verify the new action appears for the correct status and that the callback triggers.

## Contract ID copy-to-clipboard

The page header displays `Contract #{id}` next to a copy button that uses the `useCopyToClipboard` hook (see [`docs/hooks/useCopyToClipboard.md`](../hooks/useCopyToClipboard.md)).

- **Accessibility:** The button has an `aria-label` that toggles between `"Copy contract ID to clipboard"` (default) and `"Contract ID copied"` (for 2 seconds after copying). The `title` attribute mirrors the label for tooltip display.
- **Success feedback:** A success toast is shown on copy with the text "Contract ID copied."
- **Fallback:** When the Clipboard API is unavailable, the `useCopyToClipboard` hook guards against missing `navigator.clipboard` and shows an error toast with instructions to copy manually.
- **Visual feedback:** The copy icon (clipboard) switches to a green checkmark while in the "copied" state, then reverts after the configured delay (2000ms).

## Route parameter validation

The `id` route parameter is validated by `isValidContractId` (defined in `src/lib/validateContractId.ts`) before it is used anywhere on the page.

Rules enforced:
- **Non-empty** — an empty string is rejected.
- **Allowed charset** — only alphanumeric characters (`a–z`, `A–Z`, `0–9`), hyphens (`-`), and underscores (`_`) are accepted. Slashes, angle brackets, null bytes, and other special characters are all rejected.
- **Max length** — at most 64 characters. Oversized values are rejected.

If the id fails any rule, Next.js `notFound()` is called immediately and the existing not-found UI is shown. The raw param value is never rendered or forwarded.

## Layout

The contract detail page uses a responsive grid:
- Desktop: a two-column layout with summary, escrow progress, and milestones on the left, and a sticky action panel on the right.
- Mobile: stacked content to keep text readable and controls accessible.

Left column order (top → bottom):
1. `ContractSummary` — contract name, status, total value, parties
2. `ContractProgress` — escrow progress bar, paid/outstanding fund cards
3. `MilestonesList` — scrollable per-milestone detail rows

## Accessibility

- Status badges use high contrast color combinations.
- Buttons include descriptive `aria-label` attributes, visible focus rings, and disabled-state descriptions.
- Section headers use semantic landmarks and visible labels.
