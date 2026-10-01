# Wallet Concurrency & State Invariants

This document details the concurrency controls, state model, and failure recovery mechanisms implemented for `src/app/wallet/page.tsx` and `src/hooks/useOptimisticWalletMutation.ts` (Issue #1267).

---

## 1. Concurrency Model & State Invariants

`WalletPage` manages assets, security credentials, and escrow keys. The hardening guarantees determinism under adverse conditions including racing requests, rapid double clicks, network jitter, concurrent edits and deletions, and unmount/remount lifecycles.

### Core Invariants

1. **In-Flight Mutex (`isMutatingRef`)**:
   - Only one state-modifying operation (delete or inline save) may execute at any given time.
   - Any re-entrant or duplicate request initiated while an operation is in flight is rejected deterministically with code `OPERATION_IN_PROGRESS` or blocked at the UI trigger.
   - The confirmation modal displays loading indicators (`isLoading={isMutating}`) and disables double submits.

2. **Selection Subset Invariant (`selectedIds ⊆ {item.id | item ∈ items}`)**:
   - `selectedIds` is strictly maintained as a subset of valid current items.
   - Whenever items are deleted or updated, `selectedIds` is automatically pruned of any ID that no longer exists in `items`.
   - Prevents stale IDs from polluting bulk actions (delete, export) or corrupting `selectedCount`.

3. **Lockstep State Synchronization (`itemsRef`)**:
   - `itemsRef.current` is updated synchronously alongside queued React state updates via `commitItems`.
   - Prevents stale closure capture when multiple actions occur in rapid succession before React flushes renders.
   - Rollback isolation: On persistence failure, rollback restores the exact pre-mutation snapshot without overwriting concurrent edits made to unrelated items.

4. **Edit vs. Delete Conflict Resolution**:
   - If an item is in active edit mode (`editingId === 'w-1'`) and is deleted (via single or bulk delete), edit mode is automatically cancelled (`editingId` reset to `null`) and edit controls are unmounted.
   - If an item was deleted in another session or prior action, attempting to save an edit on it fails gracefully with an informative error toast without modifying or corrupting state.

5. **Idempotent Mounting & Seeding**:
   - Under React StrictMode or concurrent rendering, initial mount effects can execute multiple times.
   - `isMountedRef` and repository deduplication guarantee that default sample items (`SAMPLE_WALLET_ITEMS`) are seeded at most once.

6. **Version-Aware Persistence**:
   - `WalletItem` carries an optional monotonic `version?: number` counter.
   - `upsertWalletItem` and `getWalletItemVersion` provide optimistic concurrency control with stale-overwrite detection (`stale: true`).

---

## 2. Typed Mutation Outcomes

The `useOptimisticWalletMutation` hook returns typed `WalletOptimisticResult`:

| Code | Meaning | User Feedback |
| --- | --- | --- |
| `OPERATION_IN_PROGRESS` | Another mutation is actively running | "Another wallet operation is already in progress. Please wait." |
| `STALE_VERSION` | Version conflict with newer stored data | "This wallet item was updated in another session. Please reload and try again." |
| `PERSISTENCE_FAILED` | Local storage write failed | "Failed to delete wallet items. Changes have been rolled back." / "Failed to save wallet item changes." |
| `WALLET_ITEM_NOT_FOUND` | Update target is absent from current state | "Wallet item not found in the current list. Please reload and try again." |
| `DELETE_TARGET_NOT_FOUND` | Target items already deleted or missing | "No wallet items were found to delete. Please reload and try again." |

---

## 3. Observability and Privacy

- **User-visible notifications**: All failures surface clear, actionable messages via `useToast` (`showError`).
- **Data protection**: Error logs and notifications never expose cryptographic keys, secrets, balances, or raw wallet addresses.
- **Diagnostics**: Errors are reported through `reportError` tagged with `[WalletPage]` or `[useOptimisticWalletMutation]`.
