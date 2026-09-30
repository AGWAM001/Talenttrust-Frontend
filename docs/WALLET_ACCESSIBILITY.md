# Wallet Components Accessibility (a11y) Notes

This document provides accessibility guidelines, interactive patterns, and focus management behavior for the **Wallet** components in Talenttrust-Frontend.

## Overview

The wallet module components are built to ensure compatibility with screen readers, keyboard-only navigation, and assistive technology tools. This documentation covers the accessibility contract for all wallet-related components.

---

## Component: WalletConnectButton

**Source:** `src/components/WalletConnectButton.tsx`

### ARIA Roles and Attributes

| Element | Role/Attribute | Value | Purpose |
|---------|----------------|-------|---------|
| Connect button | `aria-label` | `"Connect wallet"` | Describes the button's action for screen readers |
| Connecting spinner | `aria-hidden` | `"true"` | Hides decorative spinner from assistive technology |
| Connected container | `tabIndex` | `-1` | Makes container programmatically focusable without adding to tab order |
| Status indicator | `aria-hidden` | `"true"` | Hides decorative green dot from screen readers |
| Density toggle button | `aria-label` | Dynamic (`"Switch to comfortable view"` or `"Switch to compact view"`) | Describes the density toggle action |
| Copy button | `aria-label` | `"Copy address to clipboard"` | Describes the copy action |
| Disconnect button | `aria-label` | `"Disconnect wallet"` | Describes the disconnect action |
| Error retry button | `aria-label` | `"Retry wallet connection"` | Describes the retry action |
| All SVG icons | `aria-hidden` | `"true"` | Hides decorative icons from screen readers |

### Keyboard Navigation & Interactions

| Key | Behavior |
|-----|----------|
| `Tab` | Navigates between connect button, density toggle, copy button, and disconnect button in logical order |
| `Shift + Tab` | Navigates backward through the button group |
| `Enter` / `Space` | Activates the focused button (connect, toggle density, copy, disconnect) |
| `Escape` | No specific behavior (handled by parent components if needed) |

### Focus Management

**Focus Transitions (via `useWalletFocus` hook):**

- **Connection established:** When wallet connects, focus moves programmatically to the connected address container (`connectedElementRef`)
- **Disconnection:** When wallet disconnects, focus moves programmatically to the connect button (`connectButtonRef`)
- **Initial render:** No automatic focus; component relies on page-level focus management

**Visible Focus States:**

- All buttons use `focus:outline-none focus:ring-2 focus:ring-blue-500` (or `focus:ring-red-500` for disconnect/error states)
- Focus rings are high-contrast and clearly visible against all backgrounds
- The connected container has `tabIndex={-1}` to receive programmatic focus without being in the natural tab order

### Reduced Motion Support

- **Connecting spinner:** Uses `animate-spin` class, which is halted by the global `@media (prefers-reduced-motion: reduce)` rule in `globals.css`
- **Static indicator:** When motion is reduced, the spinner SVG remains visible as a static loading indicator
- **Text label:** "Connecting..." text remains visible regardless of motion state
- **Transitions:** Button hover/focus transitions are preserved but duration is collapsed to 0.01ms by CSS media query

---

## Component: WalletAddressInput

**Source:** `src/components/WalletAddressInput.tsx`

### ARIA Roles and Attributes

| Element | Role/Attribute | Value | Purpose |
|---------|----------------|-------|---------|
| Input | `aria-invalid` | `"true"` / `"false"` | Indicates validation state to screen readers |
| Input | `aria-describedby` | `"{id}-helper {id}-error"` | Links input to helper text and error message |
| Input | `aria-required` | `"true"` / `"false"` | Indicates whether the field is required |
| Error paragraph | `role` | `"alert"` | Ensures immediate screen-reader announcement of errors |
| Label | `htmlFor` | `{id}` | Associates label with input for screen readers |

*Note: These attributes are automatically injected by the `FormField` wrapper component.*

### Keyboard Navigation & Interactions

| Key | Behavior |
|-----|----------|
| `Tab` | Moves focus to the next form control |
| `Shift + Tab` | Moves focus to the previous form control |
| `Enter` | Submits the parent form (if in a form) |
| Character keys | Enters Stellar address characters (input is auto-capitalize off) |

### Focus Management

**Validation Focus Behavior:**

- **Blur validation:** Validation triggers on blur event
- **Error focus:** When validation fails, the `role="alert"` error paragraph is announced immediately by screen readers
- **Error clearing:** Errors are cleared when the user begins typing again

**Visible Focus States:**

- Input uses `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`
- Error state adds red border and focus ring via `FormField` error classes
- Focus rings are high-contrast and clearly visible

### Validation & Error Announcement

**Validation Rules (applied on blur):**

| Condition | Error Message | Screen Reader Announcement |
|-----------|---------------|----------------------------|
| Empty value and `required={true}` | `"${label} is required"` | Announced via `role="alert"` error paragraph |
| Non-empty value fails `isValidStellarAddress` | `"${label} must be a valid Stellar G... address"` | Announced via `role="alert"` error paragraph |
| Valid address | No error | Value is normalized to uppercase |

**Error Communication:**

- Errors are rendered in a paragraph with `role="alert"` for immediate announcement
- The error paragraph is linked to the input via `aria-describedby`
- Parent forms can use the `onValidation` callback to aggregate errors into an `ErrorSummary`

---

## Component: WalletBulkToolbar

**Source:** `src/components/wallet/WalletBulkToolbar.tsx`

### ARIA Roles and Attributes

| Element | Role/Attribute | Value | Purpose |
|---------|----------------|-------|---------|
| Toolbar container | `role` | `"toolbar"` | Identifies the element as a toolbar landmark |
| Toolbar container | `aria-label` | `"Bulk actions toolbar"` | Provides accessible name for the toolbar |
| Clear selection button | `aria-label` | `"Clear item selection"` | Describes the clear action |
| Export button | `aria-label` | Dynamic (`"Export {n} selected item(s)"`) | Describes the export action with count |
| Delete button | `aria-label` | Dynamic (`"Delete {n} selected item(s)"`) | Describes the delete action with count |
| All SVG icons | `aria-hidden` | `"true"` | Hides decorative icons from screen readers |
| Toolbar container | `data-wallet-toolbar` | (present) | Attribute for forced-colors/high-contrast targeting |

### Keyboard Navigation & Interactions

| Key | Behavior |
|-----|----------|
| `Tab` | Navigates through toolbar buttons in order: Clear selection → Export → Delete |
| `Shift + Tab` | Navigates backward through toolbar buttons |
| `Enter` / `Space` | Activates the focused toolbar button |
| `Escape` | Clears the current selection (global window listener) |

### Focus Management

**Escape Key Handling:**

- Escape key is handled via a global `window.addEventListener('keydown')` listener
- When Escape is pressed and items are selected, `onClearSelection()` is called
- The listener is cleaned up on component unmount

**Visible Focus States:**

- All buttons use `focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500` (or `outline-rose-500` for delete)
- Focus rings are high-contrast and clearly visible
- Toolbar uses `focus-visible:outline` pattern for keyboard-only focus indication

### Reduced Motion Support

- **Toolbar transitions:** Uses `transition-all` class, which is preserved but duration collapsed to 0.01ms by CSS media query
- **Button transitions:** Action buttons use `transition` class, also collapsed by CSS
- **No elements removed:** All interactive elements remain in the DOM; only motion is halted

### High Contrast / Forced Colors Support

- **`data-wallet-toolbar` attribute:** Present on the toolbar container for CSS forced-colors targeting
- **Native form controls:** Uses standard `<button>` elements which inherit OS high-contrast styling
- **Descriptive labels:** All buttons have clear text labels that remain visible in high-contrast mode

---

## Component: WalletItemList

**Source:** `src/components/wallet/WalletItemList.tsx`

### ARIA Roles and Attributes

| Element | Role/Attribute | Value | Purpose |
|---------|----------------|-------|---------|
| Table | `aria-label` | `"Wallet items table"` | Provides accessible name for the table |
| Table header cells | `scope` | `"col"` | Identifies header cells for column navigation |
| Select-all checkbox | `aria-label` | Dynamic (`"Select all wallet items"` / `"Deselect all wallet items"`) | Describes the select-all action |
| Item checkbox | `aria-label` | Dynamic (`"Select {item.name}"`) | Describes the individual item selection |
| Delete button | `aria-label` | Dynamic (`"Delete {item.name}"`) | Describes the delete action |
| Status badges | `data-wallet-status` | Dynamic (`"Active"`, `"Pending"`, `"Archived"`) | Attribute for forced-colors styling |
| Table container | `data-wallet-table` | (present) | Attribute for forced-colors targeting |
| Selected rows | `data-selected` | `"true"` (when selected) | Attribute for forced-colors highlighting |
| All SVG icons | `aria-hidden` | `"true"` | Hides decorative icons from screen readers |

### Keyboard Navigation & Interactions

| Key | Behavior |
|-----|----------|
| `Tab` | Navigates through checkboxes and delete buttons in table order |
| `Shift + Tab` | Navigates backward through interactive elements |
| `Enter` / `Space` | Toggles checkbox state or activates delete button |
| `Arrow keys` | Standard table navigation (if using screen reader table mode) |

### Focus Management

**Checkbox Indeterminate State:**

- The select-all checkbox uses the native `indeterminate` property when some but not all items are selected
- This is set via a `useEffect` that monitors `selectedIds.size`
- Screen readers announce the indeterminate state appropriately

**Visible Focus States:**

- Checkboxes use `focus:ring-2 focus:ring-blue-500` for visible focus indication
- Delete buttons use `focus:outline-none focus:ring-2 focus:ring-rose-500`
- Focus rings are high-contrast and clearly visible against all backgrounds

**Row Selection Visual Feedback:**

- Selected rows receive `bg-blue-50/40 dark:bg-slate-800/60` background color
- The `data-selected` attribute is set for forced-colors targeting
- Hover states use `transition-colors` for smooth feedback (collapsed under reduced motion)

### Reduced Motion Support

- **Row transitions:** Uses `transition-colors` class, preserved but duration collapsed by CSS media query
- **Button transitions:** Delete button uses `transition` class, also collapsed by CSS
- **No elements removed:** All interactive elements remain in the DOM; only motion is halted

### High Contrast / Forced Colors Support

- **`data-wallet-table` attribute:** Present on table container for CSS forced-colors targeting
- **`data-selected` attribute:** Set on selected rows for forced-colors highlighting
- **`data-wallet-status` attribute:** Set on status badges for forced-colors styling
- **Native form controls:** Uses standard `<input type="checkbox">` elements which inherit OS high-contrast styling
- **Status badges:** Text labels remain visible in high-contrast mode; color is supplementary

---

## Hook: useWalletFocus

**Source:** `src/hooks/useWalletFocus.ts`

### Purpose

Manages programmatic focus transitions between wallet connection states to ensure keyboard users don't lose context when the UI changes.

### Focus Behavior

| State Transition | Focus Target | Timing |
|-----------------|---------------|--------|
| Disconnected → Connected | Connected address container (`connectedElementRef`) | `queueMicrotask` after state update |
| Connected → Disconnected | Connect button (`connectButtonRef`) | Immediate on state update |
| Connecting state | No focus change (spinner is decorative) | — |

### Implementation Details

- Uses `useRef` to track the previous address for comparison
- Uses `queueMicrotask` to schedule focus after React's render cycle
- Skips focus management while `isConnecting` is true to avoid focus thrashing
- Returns refs for both the connect button and connected container

---

## Testing Coverage

### Existing Accessibility Tests

| Test File | Coverage |
|-----------|----------|
| `src/components/__tests__/wallet-a11y-motion-contrast.test.tsx` | Reduced motion, high-contrast, forced-colors for WalletItemList and WalletBulkToolbar |
| `src/components/__tests__/WalletConnectButton.test.tsx` | General component behavior |
| `src/components/__tests__/WalletAddressInput.test.tsx` | Validation and error handling |
| `src/hooks/__tests__/useWalletFocus.test.tsx` | Focus management behavior |

### axe-core Compliance

All wallet components are tested with `jest-axe` to ensure WCAG 2.1 AA compliance:

- **WalletConnectButton:** No violations in all states (disconnected, connecting, error, connected)
- **WalletAddressInput:** No violations in default and error states
- **WalletBulkToolbar:** No violations with selections present
- **WalletItemList:** No violations with items populated and selected

### Manual Testing Checklist

When making changes to wallet components, verify:

- [ ] All buttons have descriptive `aria-label` attributes
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] Focus rings are visible and high-contrast
- [ ] Keyboard navigation follows logical tab order
- [ ] Screen readers announce state changes (connection, errors, selection)
- [ ] Reduced motion is respected (spinner halts, transitions snap)
- [ ] High-contrast mode preserves all interactive elements
- [ ] Form validation errors are announced via `role="alert"`
- [ ] Focus transitions work correctly when connecting/disconnecting

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [`docs/components/Wallet.md`](./components/Wallet.md) | General wallet component documentation |
| [`docs/components/WalletConnectButton.md`](./components/WalletConnectButton.md) | Detailed WalletConnectButton reference |
| [`docs/components/WalletAddressInput.md`](./components/WalletAddressInput.md) | Detailed WalletAddressInput reference |
| [`docs/components/Accessibility.md`](./components/Accessibility.md) | Overall accessibility patterns and testing setup |
| [`docs/contexts/wallet-session.md`](./contexts/wallet-session.md) | Wallet session lifecycle and persistence |

---

## Design Principles

1. **Semantic HTML:** Use native elements (`<button>`, `<input>`, `<table>`) with proper ARIA augmentation
2. **Keyboard-first:** All interactions must be possible via keyboard alone
3. **Visible focus:** All focusable elements have clear, high-contrast focus indicators
4. **Screen-reader friendly:** Use descriptive labels and live regions for dynamic content
5. **Motion respect:** Halt non-essential animations via `prefers-reduced-motion`
6. **High-contrast compatible:** Use data attributes for forced-colors targeting
7. **Focus management:** Programmatic focus transitions when UI state changes
