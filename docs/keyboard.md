# Keyboard Interaction Reference

A comprehensive reference of keyboard shortcuts, focus-trap behaviours, and screen-reader announcement patterns in the TalentTrust frontend.

---

## Global shortcuts

| Shortcut | Action | Component |
|----------|--------|-----------|
| `Ctrl/Cmd + K` | Open / close command palette | `CommandPalette` (`src/components/CommandPalette.tsx:168`) |
| `Ctrl/Cmd + Enter` | Submit create-stream form | `CreateStreamForm` (`src/components/CreateStreamForm.tsx:212`) |
| `Ctrl + Space` | Toggle contract row selection | `ContractRowItem` (`src/components/contracts/ContractRowItem.tsx:53`) |
| `Escape` | Clear bulk selection (wallet) | `WalletBulkToolbar` (`src/components/wallet/WalletBulkToolbar.tsx:37`) |
| `Escape` | Clear bulk selection (milestones) | `BulkActionToolbar` (`src/components/milestones/BulkActionToolbar.tsx:59`) |
| `Escape` | Cancel stream creation | `CreateStreamForm` (`src/components/CreateStreamForm.tsx:216`) |

---

## Dialog focus-trap behaviour

All modal dialogs use the shared `useDialogFocusTrap` hook or an equivalent inline implementation. The core behaviour is:

| Key | Behaviour |
|-----|-----------|
| `Escape` | Closes the dialog / cancels the action |
| `Tab` | Cycles focus to next focusable element within the dialog |
| `Shift + Tab` | Cycles focus to previous focusable element within the dialog |

Focus is moved to an initial element when the dialog opens (`initialFocusRef`). When `restoreFocus` is enabled, focus returns to the element that triggered the dialog on close.

### Components using `useDialogFocusTrap`

All in `src/hooks/useDialogFocusTrap.ts`.

| Component | Initial focus | `restoreFocus` | Source |
|-----------|---------------|----------------|--------|
| `ConfirmDialog` | Cancel button | Yes | `src/components/ConfirmDialog.tsx:70` |
| `CommandPalette` | Search input | Yes | `src/components/CommandPalette.tsx:160` |
| `ContractCreationForm` | First field | No | `src/components/ContractCreationForm.tsx:50` |
| `MilestoneCreationForm` | First field | No | `src/components/milestones/MilestoneCreationForm.tsx:129` |

### Self-contained focus traps (inline)

| Component | Behaviour | Source |
|-----------|-----------|--------|
| `SettingsPanel` | Initial focus on Close button; Tab/Shift+Tab wrap; Escape closes; restores focus to previously focused element on close | `src/components/settings/SettingsPanel.tsx:136` |
| `ToastProvider` | Soft trap: Tab/Shift+Tab cycle inside the toast viewport (users can Tab out to browser chrome) | `src/components/toast/toast-provider.tsx:674` |

### Background confinement

When `ConfirmDialog` is open, all sibling elements are marked `aria-hidden="true"` and `inert` (with restoration on close) — see `src/components/ConfirmDialog.tsx:80`.

---

## Inline editing

| Shortcut | Behaviour | Component |
|----------|-----------|-----------|
| `Escape` | Cancel inline edit of contract name | `EditableContractRow` (`src/components/EditableContractRow.tsx:69`) |
| `Escape` | Cancel inline edit of milestone | `MilestoneRow` (`src/components/milestones/MilestoneRow.tsx:158`) |

---

## Toolbar arrow-key navigation

The `BulkActionToolbar` implements the [WAI-ARIA toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) once a selection is active:

| Key | Behaviour |
|-----|-----------|
| `ArrowRight` / `ArrowDown` | Move focus to the next toolbar item (wraps) |
| `ArrowLeft` / `ArrowUp` | Move focus to the previous toolbar item (wraps) |
| `Home` | Move focus to the first toolbar item |
| `End` | Move focus to the last toolbar item |
| `Escape` | Clear selection (dismisses toolbar) |

Source: `src/components/milestones/BulkActionToolbar.tsx:51`.

---

## Radio group arrow-key navigation

The `RadioGroup` component in `SettingsPanel` implements standard radio-group keyboard navigation:

| Key | Behaviour |
|-----|-----------|
| `ArrowRight` / `ArrowDown` | Select and focus the next radio option |
| `ArrowLeft` / `ArrowUp` | Select and focus the previous radio option |
| `Enter` / `Space` | Select the focused option (on individual radio buttons) |

Source: `src/components/settings/SettingsPanel.tsx:28`.

---

## Command palette navigation

| Key | Behaviour |
|-----|-----------|
| `ArrowDown` | Move selection to the next result |
| `ArrowUp` | Move selection to the previous result |
| `Enter` | Activate the selected command (navigates or calls `onSelect`) |
| `Escape` | Close palette (via `useDialogFocusTrap`) |
| `Ctrl/Cmd + K` | Toggle open / close (global) |

Source: `src/components/CommandPalette.tsx:185`.

---

## List / row navigation

| Shortcut | Behaviour | Component |
|----------|-----------|-----------|
| `Enter` | Open / navigate to contract row details | `ContractRowItem` (`src/components/contracts/ContractRowItem.tsx:78`) |

---

## Screen-reader announcement model

The app uses several patterns to communicate dynamic changes to assistive technology without visual disruption.

### `useFormAnnouncer` hook

A dedicated hook in `src/hooks/useFormAnnouncer.ts` provides debounced live-region announcements for async form results:

- **`politeMessage`** — rendered in `aria-live="polite"` (success outcomes, queued when reader is idle)
- **`assertiveMessage`** — rendered in `aria-live="assertive"` (error outcomes, interrupts current speech)
- **Debounce** — rapid calls within 300ms (default) coalesce: only the last call fires
- **Auto-clear** — messages clear after 5000ms (default) to prevent stale re-reads

Usage example:
```tsx
const { politeMessage, assertiveMessage, announce } = useFormAnnouncer();

// On success:
announce({ message: 'Form submitted successfully.', type: 'success' });
// On error:
announce({ message: 'Submission failed.', type: 'error' });

// In JSX:
<div aria-live="polite" aria-atomic="true" className="sr-only">{politeMessage}</div>
<div aria-live="assertive" aria-atomic="true" className="sr-only">{assertiveMessage}</div>
```

### `ToastAnnouncer`

Rendered in `src/components/toast/toast-provider.tsx:244`. Three screen-reader-only live regions:

| Region | `aria-live` | Content |
|--------|-------------|---------|
| Latest success toast | `polite` | Title + description of the most recent success toast |
| Latest error toast | `assertive` | Title + description of the most recent error toast |
| Aggregate status | `polite` | Notification count summary (e.g. "3 notifications (2 errors, 1 success)"), debounced by 500ms |

### Wallet connection announcements

`WalletContext` (`src/contexts/WalletContext.tsx`) uses an inline `role="status"` live region:

- Announces `"Wallet connected"` or `"Wallet connection failed"` after a 150ms debounce
- Rendered as `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">`

### `ContractStatusAnnouncer`

`src/components/ContractStatusAnnouncer.tsx` — announces contract status transitions:

- Only announces changes (skips the initial status on mount)
- Format: `"Contract status changed to {status}."`
- Uses `aria-live="polite"` with `role="status"`

### Inline live regions

| Component | Trigger | Source |
|-----------|---------|--------|
| `EditableContractRow` | Announces `"Edit cancelled."` or `"Contract \"{name}\" updated."` after editing | `src/components/EditableContractRow.tsx:52` |
| `ActionPanel` | Announces character count for dispute reason (switches to `assertive` near the limit) | `src/components/ActionPanel.tsx:471` |

### `KbdHint` component

`src/components/KbdHint.tsx` — a reusable component for rendering keyboard shortcut hints:

- Each key is a semantic `<kbd>` element
- `+` separators are `aria-hidden="true"`
- The wrapper has `role="img"` with a synthesised `aria-label` (e.g. `"Ctrl+Enter — to submit"`)
- Supports `srOnly` mode for screen-reader-only hints

---

## ARIA roles and patterns

| Role | Used in | Purpose |
|------|---------|---------|
| `dialog` | `ConfirmDialog`, `CommandPalette`, `SettingsPanel` | Modal dialog container |
| `alertdialog` | `ConfirmDialog` (when `tone="destructive"`) | Destructive-action confirmation |
| `radiogroup` | `SettingsPanel` `RadioGroup` | Group of radio options |
| `radio` | `SettingsPanel` radio buttons, Form Density | Individual radio option |
| `switch` | `SettingsPanel` Quiet Mode toggle | Binary on/off control |
| `toolbar` (implied) | `BulkActionToolbar` | Toolbar with arrow-key navigation |
| `listbox` | `CommandPalette` results list | List of selectable commands |
| `option` | `CommandPalette` result items | Individual command option |
| `combobox` | `CommandPalette` search input | Search input with listbox |
| `status` | `ContractStatusAnnouncer`, `ToastAnnouncer`, wallet announcer | Live region for status updates |
| `alert` | `ConfirmDialog` error message, `SettingsPanel` `ThemeErrorBoundary` | Time-sensitive important message |
| `img` | `KbdHint` wrapper | Treats keyboard shortcut as a single meaningful unit |

---

## `FOCUSABLE_SELECTORS`

The CSS selector used to identify focusable elements within dialogs and panels:

```
button:not([disabled]), [href], input:not([disabled]),
select:not([disabled]), textarea:not([disabled]),
[tabindex]:not([tabindex="-1"])
```

Used by `useDialogFocusTrap` (`src/hooks/useDialogFocusTrap.ts:5`) and `SettingsPanel` (`src/components/settings/SettingsPanel.tsx:8`). The `ToastProvider` variant in `src/components/toast/toast-provider.tsx` uses an equivalent selector.
