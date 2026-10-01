# ActionPanel Component

`ActionPanel` renders the contract actions available from the escrow detail page. The component is intentionally built from native `button` controls so actions remain reachable and operable by keyboard without custom key handling.

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `'Active' \| 'Completed' \| 'Disputed' \| 'Pending'` | Yes | Determines which actions are shown and their tab order. |
| `onSubmitMilestone` | `() => void` | No | Callback for submitting milestone work for approval. |
| `onDispute` | `(reason: string) => void` | No | Callback for confirming a dispute with a trimmed, non-empty reason. |
| `onReleaseFunds` | `() => void` | No | Callback for releasing escrow funds. |
| `onViewSummary` | `() => void` | No | Callback for viewing the completed contract summary. |
| `disabledReasons` | `ActionPanelDisabledReasons` | No | Disables specific visible actions globally and exposes the provided reason through `aria-describedby` (e.g. `submitMilestone`, `releaseFunds`, `dispute`, `viewSummary`). |
| `errorMessage` | `string` | No | Announces transient API or network errors with a `role="alert"` region rendered above the actions. |
| `isLoading` | `boolean` | No | Disables all visible actions while contract or wallet state is loading, providing a universal screen-reader loading reason. |
| `disableMutations` | `boolean` | No | Disables submit/release/dispute while offline or viewing stale cached data. `viewSummary` stays enabled. |
| `disputeFlow` | `'inline' \| 'confirm'` | No | Accepted for backwards compatibility. The inline reason form is currently the only wired dispute surface, so this value does not change the rendered flow. |
| `onBlockedAction` | `(detail: ActionBlockedDetail) => void` | No | Observer notified whenever the panel refuses to dispatch an action. The payload is `{ action, code }` only — safe to forward to analytics. |

## Aria Descriptions & Disabled Reasons

The `ActionPanel` manages accessibility heavily through `aria-describedby` for disabled buttons, allowing screen reader users to understand *why* an action cannot be performed:

- **`isLoading`**: When `true`, it renders a hidden span with `id="action-panel-loading-reason"` containing "Action is disabled while contract data is loading." All visible buttons point to this ID via `aria-describedby`.
- **`disabledReasons`**: If `isLoading` is false, the panel checks `disabledReasons` for each action key (e.g., `submitMilestone`). If a reason string is provided, a hidden span is rendered with `id="action-panel-${key}-reason"`, and the button points to this ID via `aria-describedby`.

**Note on Wallet Gating**: Buttons are automatically disabled and receive a `title` (tooltip) if `isWalletConnected` is false, overriding individual `disabledReasons` visually but still preserving the accessible structure.

The inline dispute form also re-checks the wallet connection at submit time before invoking `onDispute(reason)`. This protects the mid-flow disconnect case where a user opens the form while connected, then the wallet session expires or disconnects before the final submit. When blocked, the form keeps focus on the reason field and announces the wallet error through the existing `role="alert"` dispute validation region.

## Validation Boundaries

Three input boundaries cross this component. All three are validated by the component rather than trusted, and the decisions are made by the pure policy module [`src/lib/actionPanelPolicy.ts`](../../src/lib/actionPanelPolicy.ts), which is unit-tested on its own.

**1. Props (untrusted at runtime).** `status` is typed as a union but usually arrives from the network or `localStorage`, so it is normalised. An unrecognised status degrades to the read-only "View Summary" surface and can never expose a mutation. `isLoading`, `disableMutations`, `disabledReasons` and the wallet address are session/authorization inputs.

**2. User input.** The dispute reason is clamped to `DISPUTE_REASON_MAX_LENGTH` (500), rejected when empty or whitespace-only, and the value forwarded to `onDispute` is the trimmed string that passed `validateDisputeReason`. Over-long input (an over-sized paste, or an IME/autofill commit that bypasses `maxLength`) is **truncated to the first 500 characters** rather than discarded, so the user keeps a usable reason instead of an unexpectedly empty field.

**3. Callbacks.** No callback runs unless the action is allowed *at dispatch time*, and each opened surface dispatches at most once.

### The action gate

`evaluateActionGate` is the single source of truth for "may this action run?". It is evaluated twice — once for the `disabled` attribute and once inside the handler that performs the mutation — because a `disabled` attribute is a rendering hint, not an authorization control. A surface opened while a wallet was connected can still be open after the wallet drops, and a parent can revoke `disabledReasons` mid-flow.

Rules are evaluated in a fixed order; the first match wins, so the surfaced message never depends on how many gates happen to be closed at once:

| Order | `code` | Blocks | User-visible message |
|-------|--------|--------|----------------------|
| 1 | `unknown_action` | unknown action id | *(none — internal)* |
| 2 | `status_not_available` | action not offered by the current status | This action is no longer available for the current contract status. |
| 3 | `loading` | every action | Action is disabled while contract data is loading. |
| 4 | `mutations_disabled` | mutations only | Actions are disabled while offline or viewing stale data. |
| 5 | `caller_disabled` | the action with a `disabledReasons` entry | the caller-supplied reason, verbatim |
| 6 | `wallet_disconnected` | mutations only | Connect wallet to perform this action (dispute: Connect your wallet before submitting a dispute.) |
| 7 | `form_open` | the Dispute trigger while its own form is open | A dispute form is already open. Finish or cancel it first. |
| — | `duplicate_submission` | a surface that already dispatched | *(none — reported only)* |

A missing callback is deliberately **not** gated: a panel rendered without handlers keeps its enabled buttons and simply dispatches nothing. Use `disabledReasons` to express "action unavailable".

### Failure-mode behaviour

- **Refusals are non-destructive.** The confirmation dialog stays open with a `role="alert"` explaining the refusal, and the inline dispute form keeps the typed reason and refocuses the textarea. Nothing is silently discarded, so the user can fix the problem (reconnect, go back online, retry after a permission is granted) and submit again on the same surface.
- **A refusal is not sticky.** Refused attempts do not consume the surface token, so a later retry on the same surface succeeds.
- **Duplicate submissions cannot escape.** Each opened surface takes a monotonically increasing token that is consumed synchronously — before the state update that closes the surface flushes — so a double click, a double tap, or Enter-then-click dispatches exactly one mutation. Re-opening mints a fresh token, so a deliberate second action is never blocked.
- **Cross-surface duplicates remain the caller's job.** Re-triggering an action after its surface closed is governed by the status state machine and `isLoading`, which the parent owns.

### Observability

Every refusal is reported through `reportError(..., 'warn', { action, code })` (see [`src/lib/errorReporter.ts`](../../src/lib/errorReporter.ts), a no-op in production unless a reporter is injected) and through the optional `onBlockedAction` prop. The payload is only the action id and a `code` from the table above — never the dispute reason, the wallet address, or a contract id — so failures are diagnosable in logs/metrics without exposing sensitive data.

## Accessibility

- Buttons use browser-native keyboard support for `Tab`, `Enter`, and `Space`.
- Visible focus rings use high-contrast Tailwind `focus-visible:outline` utilities and are not removed in any state.
- Actions are rendered in contract workflow order: submit milestone, release funds, dispute, then summary when applicable.
- Submit Milestone opens the shared confirmation dialog before invoking the callback, then shows a success toast once the action is confirmed.
- Dispute opens an inline reason form. The submitted reason is validated using the shared `validateDisputeReason` utility from [disputeReason.ts](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/lib/disputeReason.ts), which enforces `DISPUTE_REASON_MAX_LENGTH` (500 characters). The submitted reason is trimmed, must be non-empty, and is only passed to `onDispute` while a wallet address is still connected.
- Unavailable actions stay visible as disabled buttons with an accessible reason. Use `disabledReasons` for states such as no wallet, missing permissions, pending API responses, or unmet milestone conditions.
- Loading states disable all visible actions and describe that contract data is still loading.
- Error states are announced through `role="alert"` without moving focus or changing the action order.
- **Dispute Reason Character Counter**: The character counter in the inline dispute form is associated with the textarea via `aria-describedby` (`id="dispute-reason-counter"`). The current character count is announced to screen reader users using the format `"X of 500 characters"` in an `aria-live` region:
  - **Debouncing/Throttling**: To avoid screen reader spam, updates are debounced by `1000ms` when typing non-boundary characters. Immediate announcements occur when pausing typing, or when crossing meaningful boundaries (multiples of 50, multiples of 10 when remaining count is $\le 50$, or every character when $\le 10$).
  - **Assertive Escalation**: The live region defaults to `aria-live="polite"`, but escalates to `aria-live="assertive"` when within the threshold of $50$ characters or fewer remaining.
  - **Clean State**: The live region is only rendered when the form is open, ensuring it remains quiet when closed.

## Focus Restoration

When a confirmation-gated action (Submit Milestone or Release Funds) opens the `ConfirmDialog`, focus moves into the dialog per the ARIA dialog pattern. When the dialog closes — by confirming, cancelling, or pressing Escape — focus is restored to the button that originally opened it. The Dispute action uses an inline form instead; cancelling or submitting that form restores focus to the Dispute button, while validation failures keep focus on the textarea.

**Implementation detail:** `handleOpenConfirm` captures `event.currentTarget` into a `triggerElementRef` at the moment the button is clicked. Both `handleConfirm` and `handleCancel` call `triggerElementRef.current?.focus()` after clearing the dialog state. This is intentionally done via event capture rather than static `ref` props on each button, which would cause the last-rendered button to always win when multiple confirmation-gated buttons are visible at the same time (e.g. Release Funds and Dispute on `Active`/`Pending` status).

```
User clicks "Release Funds"
  → handleOpenConfirm('release', event)
  → triggerElementRef.current = event.currentTarget  ← captured here
  → dialog opens, focus moves to Cancel button

User clicks Cancel (or presses Escape)
  → handleCancel()
  → setConfirmAction(null)       ← dialog unmounts
  → triggerElementRef.current?.focus()  ← focus back to Release Funds ✓
```

This satisfies WCAG 2.1 SC 3.2.2 (On Input) and the WAI-ARIA Authoring Practices Guide dialog pattern requirement that focus returns to the triggering element after dialog dismissal.



| Status | Visible actions |
|--------|-----------------|
| `Active` | Submit Milestone, Release Funds, Dispute |
| `Pending` | Release Funds, Dispute |
| `Disputed` | Dispute |
| `Completed` | View Summary |

## Usage Example

```tsx
import ActionPanel from '@/components/ActionPanel';

export default function ContractDetail({ contractData, isLoading, errorMessage }) {
  const handleSubmitMilestone = () => { /* ... */ };
  const handleReleaseFunds = () => { /* ... */ };
  const handleDispute = () => { /* ... */ };
  const handleViewSummary = () => { /* ... */ };

  return (
    <ActionPanel
      status={contractData?.status || 'Active'}
      onSubmitMilestone={handleSubmitMilestone}
      onReleaseFunds={handleReleaseFunds}
      onDispute={handleDispute}
      onViewSummary={handleViewSummary}
      isLoading={isLoading}
      errorMessage={errorMessage}
      disabledReasons={{
        submitMilestone: !contractData?.canSubmit ? 'You do not have permission to submit milestones.' : undefined,
      }}
    />
  );
}
```

## Testing Notes

The component tests cover:

- Action rendering and callback behavior for active and completed contracts.
- Confirmable Submit Milestone, including success toast feedback and cancel/disconnected-wallet cases.
- Logical button order for keyboard navigation.
- Visible focus ring classes on every enabled action.
- Disabled action semantics and screen-reader descriptions.
- Loading, slow-network error, and missing-handler edge cases.
- Inline dispute validation: empty reason, whitespace-only reason, 500-character cap, trimmed valid submission, disconnect-then-submit wallet guard, and reconnect-then-submit recovery.
- **Focus restoration:** After cancel, confirm, or Escape on each confirmation-gated action, focus lands on the exact button that opened the dialog; the inline dispute form also restores focus to the Dispute trigger after cancel or valid submit.

### Validation-boundary suites

`src/components/__tests__/ActionPanelValidation.test.tsx` and `src/lib/__tests__/actionPanelPolicy.test.ts` cover the boundary contract:

- **Accepted input** — trimmed reasons, a reason at exactly the 500-character ceiling, and input whose raw length is at the ceiling but whose trimmed length is under it.
- **Rejected input** — permission revoked mid-flow, going offline mid-flow, wallet disconnect inside an open dialog, the contract completing while a dialog is open, and loading transitions; each asserts the callback did *not* run, the surface stayed recoverable, and the reason was reported.
- **Duplicate submissions** — doubled dispatch of the dispute form, the release dialog and the submit dialog (both events in a single React batch, reproducing the real double-click window), plus regression tests proving a re-opened or previously cancelled surface is not locked out.
- **Boundary values** — 500 vs 501 characters, per-keystroke clamping, whitespace-only input, and unrecognised statuses degrading to the read-only surface.
- **Observability** — the `onBlockedAction` payload shape, and an assertion that the logged payload contains neither the typed dispute reason nor the wallet address.
