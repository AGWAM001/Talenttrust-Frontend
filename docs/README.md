# TalentTrust Frontend — Documentation Index

Reference documentation for components, hooks, contexts, and library utilities.

---

## Components

| Document | What it covers |
|----------|----------------|
| [Accessibility.md](./components/Accessibility.md) | ARIA standards, axe-core audit setup, skip link, route announcer, dark-theme contrast audit |
| [ActionPanel.md](./components/ActionPanel.md) | Contract action buttons, disabled reasons, inline dispute form, focus restoration |
| [ContractCreationForm.md](./components/ContractCreationForm.md) | Contract creation modal — props, validation rules, submitted shape |
| [ContractDetail.md](./components/ContractDetail.md) | Contract detail page component composition |
| [ContractProgress.md](./components/ContractProgress.md) | Escrow summary and milestone progress panel |
| [ContractsApi.md](./components/ContractsApi.md) | Contracts component API reference — props and minimal usage examples |
| [**Dialogs.md**](./components/Dialogs.md) | **Unified dialog usage guide** — `ConfirmDialog`, `ContractCreationForm`, `MilestoneCreationForm`, `useDialogFocusTrap` hook, focus restoration patterns |
| [**DialogsApi.md**](./components/DialogsApi.md) | **Dialogs component API reference** — `DialogsList`, `DialogLastUpdated`, `DialogsViewSkeleton`, `DialogIdBadge`, props, shared types, minimal usage examples |
| [EmptyState.md](./components/EmptyState.md) | Empty-state placeholder component |
| [HeaderActions.md](./components/HeaderActions.md) | Header action buttons |
| [MilestoneCreationForm.md](./components/MilestoneCreationForm.md) | Milestone creation modal — props, ID generation, validation |
| [MilestoneFilter.md](./components/MilestoneFilter.md) | Status filter radiogroup, `aria-live` result count |
| [MilestonesApi.md](./components/MilestonesApi.md) | Milestones component API reference — props, shared types, minimal usage examples |
| [MilestonesUsageGuide.md](./components/MilestonesUsageGuide.md) | Milestones components usage guide — composition patterns, props, accessibility, troubleshooting |
| [MilestonesList.md](./components/MilestonesList.md) | Milestone list rendering, accessibility contract (roles, keyboard, focus), density toggle, pagination |
| [MilestoneRow.md](./components/MilestoneRow.md) | Milestone row view/edit modes — accessibility contract (roles, keyboard, focus) |
| [Navbar.md](./components/Navbar.md) | Global navigation, keyboard support |
| [NotFound.md](./components/NotFound.md) | 404 page |
| [Preferences.md](./components/Preferences.md) | `PreferencesProvider`, `usePreferences`, `formatAmount` |
| [ReputationAccessibility.md](./components/ReputationAccessibility.md) | Reputation accessibility contract — semantic structure, ARIA roles, keyboard support, focus management, live regions, known limitations |
| [ReputationPage.md](./components/ReputationPage.md) | Reputation score display, level bands |
| [ReputationProfile.md](./components/ReputationProfile.md) | Reputation profile component API reference — props, rendering states, helpers |
| [SettingsPanel.md](./components/SettingsPanel.md) | Settings drawer — preferences UI, focus trap, Escape handling |
| [StatusBadge.md](./components/StatusBadge.md) | Contract/milestone status pill |
| [Toast.md](./components/Toast.md) | Toast notification system — quiet mode, density, auto-dismiss, action button |
| [WalletConnectButton.md](./components/WalletConnectButton.md) | Wallet connect/disconnect button |
| [WalletContext.md](./components/WalletContext.md) | `WalletProvider`, `useWallet`, idle auto-disconnect |
| [WALLET_ACCESSIBILITY.md](./WALLET_ACCESSIBILITY.md) | Wallet components accessibility contract (roles, keyboard, focus) |

---

## Hooks

| Document | What it covers |
|----------|----------------|
| [**ContractsHooks.md**](./hooks/ContractsHooks.md) | **Contracts hooks usage reference** — `useContractProgress` / `calculateContractProgress` (escrow metrics, memoization contract) and `useOptimisticContractStatus` (optimistic status writes, rollback, stale detection) with inputs, returns, and states |
| [**MilestonesHooks.md**](./hooks/MilestonesHooks.md) | **Milestones hooks usage reference** — `useOptimisticMilestoneMutation` (optimistic create, update, delete, rollback) with inputs, returns, and states |
| [useCopyToClipboard.md](./hooks/useCopyToClipboard.md) | Clipboard copy with status management |
| [useDialogFocusTrap.md](./hooks/useDialogFocusTrap.md) | Focus management for dialogs |
| [useFormAnnouncer.md](./hooks/useFormAnnouncer.md) | ARIA announcements for forms |
| [useMediaQuery.md](./hooks/useMediaQuery.md) | SSR-safe media query hook |

> The `useDialogFocusTrap` hook is documented in [Dialogs.md](./components/Dialogs.md#usedialogfocustrap-hook).

---

## Contexts

| Document | What it covers |
|----------|----------------|
| [wallet-session.md](./contexts/wallet-session.md) | Wallet session lifecycle, persistence, idle auto-disconnect |

---

## Library utilities

| Document | What it covers |
|----------|----------------|
| [currencyMismatch.md](./lib/currencyMismatch.md) | Currency mismatch detection helper |
| [dueSoon.md](./lib/dueSoon.md) | Due-soon date helpers |
| [milestoneStatusTally.md](./lib/milestoneStatusTally.md) | Milestone status count helper |
| [validate-login.md](./lib/validate-login.md) | Login form validation |

---

## Architecture and guides

| Document | What it covers |
|----------|----------------|
| [keyboard.md](./keyboard.md) | Keyboard shortcuts, focus-trap behaviours, screen-reader announcement model |
| [COPYWRITING_GUIDE.md](./COPYWRITING_GUIDE.md) | Voice, tone, and copy standards |
| [data-model.md](./data-model.md) | Domain types, `Contract`, `Milestone`, optional `contractId` |
| [error-reporting.md](./error-reporting.md) | Pluggable error reporting abstraction |
| [persistence.md](./persistence.md) | `safeStorage`, `localStorage` fallback, SSR safety |
| [preferences.md](./preferences.md) | `PreferencesProvider` hydration, theme application, amount formatting |
| [security-headers.md](./security-headers.md) | CSP, `X-Frame-Options`, and other HTTP response headers |
| [stellar-address.md](./stellar-address.md) | `isValidStellarAddress`, `normalizeStellarAddress` |
| [walkthrough.md](./walkthrough.md) | Cumulative change log — reputation legend, ActionPanel hotfix, milestone docs, dialog docs |

---

## Implementation notes

| Document | What it covers |
|----------|----------------|
| [implementation/ISSUE_383_IMPLEMENTATION.md](./implementation/ISSUE_383_IMPLEMENTATION.md) | Issue #383 implementation summary |
