# PR Description: Add Copy-to-Clipboard Affordance for Contract Identifiers

## Overview

This PR adds an accessible copy-to-clipboard control for contract identifiers on the contract detail page, enabling users to quickly copy a contract's ID to their system clipboard with visual and toast-based feedback. The implementation uses the existing `useCopyToClipboard` hook (proven in `WalletConnectButton` and `ContractSummary`) and integrates with the application's Toast notification system for success and error feedback.

**Issue:** Closes #838 — Contracts identifiers can't be copied easily. This issue adds a copy control with a toast and fallback.

---

## Problem Statement

**Issue #838:** Contract identifiers displayed in the page header (`Contract #{id}`) were static text with no mechanism to copy them. Users who needed the contract ID (e.g., for sharing, API calls, or cross-referencing) had to manually select and copy the text — an inefficient and error-prone process, particularly on mobile devices or when the ID is long.

Existing copy-to-clipboard patterns existed elsewhere in the application (`WalletConnectButton`, `ContractSummary` party addresses), but the contract detail page lacked this affordance for its primary identifier.

---

## Solution

### Implementation Details

An accessible copy button was added adjacent to the `Contract #{id}` heading in the contract detail page header (`src/app/contracts/[id]/page.tsx`). The implementation follows the established patterns from `WalletConnectButton.tsx` and `ContractSummary.tsx`:

1. **Clipboard Integration:** Uses the existing `useCopyToClipboard` hook (from `src/hooks/useCopyToClipboard.ts`) which provides:
   - SSR-safe guards against environments where `navigator.clipboard` is unavailable
   - Configurable delay (2000ms) for the `copied` visual state
   - `onSuccess` and `onError` callbacks for toast integration
   - Proper timer cleanup on unmount and rapid re-click scenarios

2. **Accessibility:** The copy button follows WCAG best practices:
   - **`aria-label`** toggles between `"Copy contract ID to clipboard"` (default) and `"Contract ID copied"` (temporary 2-second state), ensuring screen reader users always have accurate context
   - **`title`** attribute mirrors the label for sighted users hovering the button
   - **Native `<button>` element** ensures keyboard operability (Enter/Space to activate)
   - **Focus ring** (`focus:ring-2 focus:ring-blue-500`) provides a visible keyboard focus indicator
   - **Transition** animation provides smooth hover and focus state changes

3. **Visual Feedback:** The button uses SVG icons that toggle based on copy state:
   - **Default:** Clipboard icon (outline SVG) indicating copy action
   - **Copied (2s):** Green checkmark icon providing immediate visual confirmation
   - **Color change:** Icon color shifts from slate-500 (default) to green-600 (copied state)

4. **Toast Notifications:** Three distinct feedback paths:
   - **Success:** `"Contract ID copied"` — displayed when clipboard write succeeds
   - **Not supported:** `"Copy not supported"` with message `"Your browser does not support clipboard access. Please copy the ID manually."` — displayed when `navigator.clipboard` is unavailable (e.g., insecure context, older browser)
   - **Generic failure:** `"Copy failed"` with message `"Unable to copy the contract ID to your clipboard. Please try again."` — displayed for any other clipboard write error

---

## Files Changed

### `src/app/contracts/[id]/page.tsx`
- **Added import:** `useCopyToClipboard` from `@/hooks/useCopyToClipboard`
- **Added hook usage:** `const { copied, copy } = useCopyToClipboard({...})` with `onSuccess` and `onError` callbacks wired to `showSuccess`/`showError` toasts
- **Added JSX:** Copy button with conditional rendering for copied state, toggling icon (clipboard ↔ checkmark), `aria-label`, and `title`
- **Layout adjustment:** Wrapped heading in a flex container to accommodate the button inline with the title

### `src/app/contracts/[id]/__tests__/page.test.tsx`
- **Added helper functions:** `installClipboard()` and `removeClipboard()` for controlling the clipboard mock environment (consistent with `ContractSummary.test.tsx` patterns)
- **Added `afterEach`:** Clipboard restoration to prevent cross-test interference
- **Added 4 new tests:**
  1. **"copies the contract id to the clipboard and shows a success toast"** — Verifies clicking the copy button calls `navigator.clipboard.writeText` with the correct contract ID
  2. **"shows the check icon and updated label when the contract id is copied"** — Verifies the UI transitions to the copied state (checkmark icon, aria-label update) after a successful copy
  3. **"shows error toast when clipboard API is not supported"** — Verifies the application gracefully handles clipboard-unavailable environments (button stays in default state)
  4. **"handles clipboard write failure gracefully"** — Verifies the application handles clipboard write rejection without crashing (button stays in default state)
- **Updated existing test:** Added assertion for the copy button existence in the `"renders the resolved contract details and action panel"` test
- **Total tests:** 44 (all passing)

### `docs/components/ContractDetail.md`
- Added "Contract ID copy-to-clipboard" documentation section covering:
  - Accessibility considerations (aria-label, title attributes)
  - Success feedback (toast message)
  - Fallback behavior (clipboard-unavailable error toast)
  - Visual feedback (icon state toggle, green checkmark)
  - Cross-reference to `docs/hooks/useCopyToClipboard.md`

---

## Test Coverage

### Test Results
```
Test Suites: 1 passed, 1 total
Tests:       44 passed, 44 total
Time:        14.132 s
```

### Coverage for Impacted Module (`src/app/contracts/[id]/page.tsx`)
- **Statements:** 91.66%
- **Branch:** 77.27%
- **Functions:** 88.23%
- **Lines:** 91.42%
- **Uncovered lines:** 117-123, 167-168 (pre-existing code paths: `handleViewSummary` placeholder and the `useOptimisticContractStatus` error handler — not related to the copy feature)

### Test Cases
| Test Name | Category | Verifies |
|-----------|----------|----------|
| renders the resolved contract details... | Integration | Copy button is present in the DOM |
| copies the contract id to the clipboard... | Success path | `clipboard.writeText` called with correct ID |
| shows the check icon and updated label... | Visual state | UI transition from default to copied state |
| shows error toast when clipboard API... | Fallback | Graceful handling of unsupported clipboard |
| handles clipboard write failure... | Fallback | Graceful handling of clipboard write rejection |

---

## Accessibility

The copy button passes the following accessibility checks:
- **Keyboard-operable:** Native `<button>` element with Enter/Space activation
- **Descriptive label:** `aria-label` accurately reflects the current state (copy vs. copied)
- **Focus indication:** Visible `focus-visible` ring with custom ring color
- **Screen reader announcements:** Toast notifications use `role="status"`/`role="alert"` for live region announcements
- **Reduced motion:** All CSS transitions respect `@media (prefers-reduced-motion: reduce)` via the global stylesheet

---

## Security Considerations

- **No sensitive data exposure:** The contract ID is already displayed in the page header and breadcrumbs; the copy button does not expose any new information
- **Sanitization not required:** Unlike wallet addresses (handled in `ContractSummary` with `sanitizeAddress`), contract IDs are validated server-side by `isValidContractId` (alphanumeric + hyphens + underscores only, max 64 chars) before rendering
- **Clipboard API guard:** The `useCopyToClipboard` hook inherently protects against:
  - SSR environments (returns false without crashing)
  - Insecure contexts where clipboard API is unavailable
  - Permission-denied errors
  - No sensitive data is logged to console on failure

---

## Verification Checklist

- [x] `npm run lint` — passes (pre-existing errors in unrelated files only)
- [x] `npm test` — 44/44 tests passing for the impacted test suite
- [x] `npx tsc --noEmit` — passes (pre-existing TS6305 build-cache warnings only)
- [x] Module test coverage ≥ 91% for the impacted file
- [x] Clipboard API fallback tested (unsupported environment + write rejection)
- [x] Keyboard navigation verified (focus ring, Enter/Space activation)
- [x] Screen reader labels tested (aria-label toggle)
- [x] Documentation updated

---

## How to Test

1. Navigate to `http://localhost:3000/contracts/123` (or any valid contract ID)
2. Locate the copy icon (📋) next to the `Contract #{id}` heading
3. Click the copy button
4. Verify:
   - Icon changes to a green checkmark (✓)
   - A success toast appears: "Contract ID copied"
   - After 2 seconds, the button reverts to the copy icon
5. To test fallback: Disable clipboard in browser settings or use an insecure context
6. Verify error toast appears with appropriate message

---

## Links

- **GitHub Issue:** https://github.com/Talenttrust/Talenttrust-Frontend/issues/838
- **Upstream Repo (main branch):** https://github.com/Talenttrust/Talenttrust-Frontend/tree/main
- **Fork/Branch:** https://github.com/Ade-Pheebs/Talenttrust-Frontend/tree/feature/contracts-52-copyid

---

## Commit Message

```
feat(contracts): add copy-to-clipboard for ids

Add an accessible copy button next to the contract identifier in the
contract detail page header using the existing useCopyToClipboard hook
with toast notifications for success and fallback scenarios.

- Clipboard API integration with SSR-safe guards
- Success/error toasts via existing ToastProvider
- Keyboard-operable with clear aria-label toggle
- Visual state feedback (clipboard icon ↔ green checkmark)
- 4 new tests covering success, copied state, and fallback paths

Closes #838
```

