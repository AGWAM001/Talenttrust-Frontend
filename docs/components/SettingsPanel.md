# SettingsPanel

A full-screen drawer that lets users manage their TalentTrust preferences. The settings experience is composed of two pieces: `SettingsTrigger` for the built-in floating gear button and `SettingsPanel` for the drawer content itself. Both components rely on `PreferencesProvider` so the current values are available and persisted automatically.

## Quick start

```tsx
import { PreferencesProvider } from '@/lib/preferences';
import { SettingsTrigger } from '@/components/settings/SettingsTrigger';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      {children}
      <SettingsTrigger />
    </PreferencesProvider>
  );
}
```

## Controlled usage

If you need a custom trigger, keep the drawer state in a parent component and pass it to `SettingsPanel`:

```tsx
'use client';

import { useState } from 'react';
import { PreferencesProvider } from '@/lib/preferences';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export function SettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <PreferencesProvider>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <SettingsPanel isOpen={open} onClose={() => setOpen(false)} />
    </PreferencesProvider>
  );
}
```

## Component API

| Component | Props | Notes |
|-----------|-------|-------|
| `SettingsTrigger` | none | Renders the floating button and manages the open/close state internally. |
| `SettingsPanel` | `isOpen`, `onClose` | Renders the drawer when `isOpen` is true. The parent is responsible for closing it. |

## Common patterns

- Mount `PreferencesProvider` once at the application root so `usePreferences()` has a stable source of truth.
- Use `SettingsTrigger` for the default experience and a custom trigger when you want the button to live in a different location.
- Prefer `updatePreference('theme', value)` and related calls to keep the drawer UI and persisted values in sync.
- When rendering currency values, use `formatAmount(amount, currency)` from `usePreferences()` so the label respects the user’s selected amount format.

---

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls whether the panel is rendered and visible |
| `onClose` | `() => void` | Yes | Callback invoked when the panel should close (Escape, backdrop click, Close button, Done button) |

---

## Usage

```tsx
import { SettingsTrigger } from '@/components/settings/SettingsTrigger';

// SettingsTrigger manages isOpen state and renders SettingsPanel internally.
// Place it once at the app/layout level.
export default function Layout({ children }) {
  return (
    <>
      {children}
      <SettingsTrigger />
    </>
  );
}
```

To use `SettingsPanel` standalone:

```tsx
import { useState } from 'react';
import { SettingsPanel } from '@/components/settings/SettingsPanel';

export function MyComponent() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open settings</button>
      <SettingsPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

---

## Keyboard Interactions

### Focus Management
- **Initial Focus**: When the dialog opens, focus is automatically set to the close button (`aria-label="Close settings"`)
- **Focus Trap**: Keyboard focus is trapped within the dialog and cannot leave to the page behind it
- **Focus Restoration**: Managed by parent component (SettingsTrigger) to restore focus to the element that opened the dialog

### Key Bindings
| Key | Action | Test Coverage |
|-----|--------|---------------|
| `Tab` | Move focus to the next interactive element inside the panel. Wraps from the last element back to the first. | ✅ Comprehensive |
| `Shift + Tab` | Move focus to the previous interactive element. Wraps from the first element to the last. | ✅ Comprehensive |
| `Escape` | Close the panel (only when dialog is open). | ✅ Edge cases tested |
| `Enter` / `Space` | Activate the focused button, radio button, or toggle switch. | ✅ Through click interactions |
| `Arrow Keys` | Navigate between radio buttons within radiogroups (browser default). | ✅ ARIA roles validated |

### Focus Trap Behavior
- **Forward Tab Wrapping**: Pressing Tab on the last focusable element moves focus to the first element
- **Reverse Tab Wrapping**: Pressing Shift+Tab on the first focusable element moves focus to the last element
- **Focusable Elements**: Includes all buttons (close, theme, currency, toast density, done), toggle switches, and any interactive controls
- **No Escape When Closed**: Escape key does not trigger onClose when dialog is not rendered

---

## ARIA Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `"dialog"` | Identifies the drawer as a modal dialog to assistive technologies |
| `aria-modal` | `"true"` | Tells screen readers that content behind the dialog is inert |
| `aria-labelledby` | `"settings-panel-title"` | Associates the dialog with its visible "Settings" heading |

---

## Focus Management

### On open
- The close button (`aria-label="Close settings"`) receives focus immediately, so keyboard users know where they are.

### Focus trap
- `Tab` and `Shift+Tab` are intercepted via a `keydown` listener on `document`. Focus cycles through all non-disabled focusable elements inside the dialog and never reaches the page behind it.

### On close
- Managed by `SettingsTrigger`: a `useRef` holds a reference to the gear-icon trigger button. After the panel unmounts, `requestAnimationFrame` restores focus to that button, satisfying WCAG 2.4.3 Focus Order.

---

## Preferences Managed

| Preference | Options |
|------------|---------|
| Theme | `light` / `dark` / `system` |
| Currency Display | `usd` / `ngn` / `compact` |
| Toast Density | `relaxed` / `compact` |
| Quiet Mode | on / off (toggle) |

Preferences are persisted to `localStorage` under the key `talenttrust-user-preferences` via the `usePreferences` hook (`@/lib/preferences`).

---

## Testing

Tests live in `src/components/settings/__tests__/SettingsPanel.test.tsx` and provide comprehensive coverage of:

### Keyboard Accessibility & Focus Management
- Initial focus on close button when dialog opens
- Escape-to-close behavior while dialog is open
- Forward Tab wrapping from last to first focusable element
- Reverse Shift+Tab wrapping from first to last focusable element
- Focus trap implementation with multiple focusable elements
- Edge cases: no focus wrapping when no focusable elements, no escape handling when closed

### Preference Updates
- Theme preference updates (light, dark, system)
- Currency display preference updates (usd, ngn, compact)
- Toast density preference updates (relaxed, compact)
- Quiet mode toggle updates
- LocalStorage persistence for all preference changes
- Restoration of preferences from localStorage on remount

### Accessibility Compliance
- WCAG 2.1 AA compliance validation using jest-axe
- Dialog semantics: `role="dialog"`, `aria-modal="true"`
- Proper ARIA labeling: `aria-labelledby` pointing to Settings heading
- All interactive controls have `focus-visible` ring classes
- Proper ARIA roles and labels for all preference controls (radiogroups, switches)

### Component States
- Closed state: renders no dialog content
- Open state: renders all settings sections and controls
- Backdrop click to close
- Done button click to close
- Close button click to close

### Validation
- All preference controls are properly labeled with ARIA attributes
- Focus management works correctly with the actual DOM focusable elements
- Accessibility audits pass with no violations

Run:

```bash
npm test -- --testPathPattern=SettingsPanel
```
