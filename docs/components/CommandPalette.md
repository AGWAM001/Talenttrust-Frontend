# CommandPalette

Keyboard-driven route navigator for the TalentTrust application.

## Overview

`CommandPalette` provides a Cmd+K (Mac) / Ctrl+K (other) command palette
that lets power users jump between contracts, milestones, and reputation
pages without touching the mouse. It renders a modal overlay with a search
input, supports fuzzy filtering across route labels and keywords, and
navigates via arrow keys or mouse.

## File Location

- Component: `src/components/CommandPalette.tsx`
- Tests: `src/components/__tests__/CommandPalette.test.tsx`
- Mounting point: `src/app/layout.tsx`

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| —    | —    | —        | CommandPalette accepts no props. Routes are internal. |

## Usage

```tsx
import CommandPalette from '@/components/CommandPalette';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}
```

## Routes

| Route | Label | Keywords |
|-------|-------|----------|
| `/contracts` | Contracts | contracts, escrow, payments |
| `/milestones` | Milestones | milestones, milestone, tasks |
| `/reputation` | Reputation | reputation, profile, rating |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | Open / toggle the palette |
| `Escape` | Close the palette |
| `↑` / `↓` | Move selection up / down |
| `Enter` | Navigate to the selected route |

## Accessibility

- **`role="dialog"`** with **`aria-modal="true"`** — the palette is announced as a modal dialog.
- **`role="combobox"`** on the search input with **`aria-expanded`**, **`aria-controls`**, and **`aria-activedescendant`** — follows the WAI-ARIA combobox pattern.
- **`role="listbox"`** with **`role="option"`** and **`aria-selected`** — route list is a proper listbox.
- **Focus management** — the input receives focus on open; the previously focused element regains focus on close.
- **Reduced motion** — respects `prefers-reduced-motion: reduce` via the `useMediaQuery` hook, disabling open/close animations.
- **Backdrop click** closes the palette.
- **Footer hints** display keyboard shortcuts for discoverability.

## Styling

The component uses Tailwind CSS utility classes consistent with the
existing design system:

| Element | Classes |
|---------|---------|
| Backdrop | `bg-black/50 backdrop-blur-sm` |
| Panel | `bg-white rounded-xl shadow-2xl border border-slate-200` |
| Active option | `bg-blue-50 text-blue-700` |
| Inactive option | `text-slate-700 hover:bg-slate-50` |
| Input | `bg-transparent text-slate-900 placeholder-slate-400` |

## Dependencies

- `next/navigation` — `useRouter` for client-side navigation
- `@/hooks/useMediaQuery` — detects `prefers-reduced-motion`
- No additional packages required

## Related

- `src/components/Navbar.tsx` — primary navigation links (same routes)
- `src/components/HeaderActions.tsx` — wallet/theme header controls
- `src/app/layout.tsx` — mounting point
