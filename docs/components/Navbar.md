# Navigation components

This guide covers the current navigation primitives used throughout TalentTrust:

- `Navbar` for the primary global links
- `Breadcrumbs` for page-level navigation context
- `RouteAnnouncer` for screen-reader announcements after client-side route changes

## Quick start

A typical app-shell layout mounts these components once near the top of the tree:

```tsx
import Navbar from '@/components/Navbar';
import Breadcrumbs from '@/components/Breadcrumbs';
import RouteAnnouncer from '@/components/RouteAnnouncer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-[var(--background)]">
        <Navbar />
      </header>

      <main tabIndex={-1} className="mx-auto max-w-6xl p-6">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Contracts', href: '/contracts' },
            { label: 'Contract #42' },
          ]}
        />
        {children}
      </main>

      <RouteAnnouncer />
    </>
  );
}
```

## Navbar

### Overview

`Navbar` renders the primary application links for `/contracts`, `/milestones`, and `/reputation`. It uses `next/link` and `usePathname` from `next/navigation` to highlight the current route with `aria-current="page"`.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| None | — | — | `Navbar` accepts no props. The route list is internal and fixed. |

### Example

```tsx
<header>
  <Navbar />
</header>
```

### Accessibility and behavior

- Wrapping element: `<nav aria-label="Primary">`
- Active item: `aria-current="page"`
- Focus style: `focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1`
- Layout: links wrap naturally via `flex-wrap`, so the navigation stays usable on narrow screens without a hamburger menu

## Breadcrumbs

### Overview

`Breadcrumbs` renders an accessible breadcrumb trail. Ancestor items are links and the final item is plain text marked with `aria-current="page"`.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `BreadcrumbItem[]` | Yes | Ordered list of crumbs from root to current page |

### `BreadcrumbItem`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Visible text shown for the crumb |
| `href` | `string` | No | Link target for ancestor crumbs. Omit this on the final crumb so it renders as the current page |

### Example

```tsx
<Breadcrumbs
  items={[
    { label: 'Dashboard', href: '/' },
    { label: 'Contracts', href: '/contracts' },
    { label: 'Contract #42' },
  ]}
/>
```

### Accessibility and behavior

- Root landmark: `<nav aria-label="Breadcrumb">`
- Separator: `/` is rendered with `aria-hidden="true"`
- Final crumb: rendered as text with `aria-current="page"`
- Fallback link target: omitted `href` values on ancestor items fall back to `/`

## RouteAnnouncer

### Overview

`RouteAnnouncer` is a client component that improves screen-reader feedback after client-side navigation. When the pathname changes, it focuses the first `<main>` landmark (if present) and announces the new page title from the first `<h1>` on the page, or falls back to `Page: <pathname>`.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| None | — | — | `RouteAnnouncer` accepts no props. |

### Example

```tsx
<RouteAnnouncer />
```

### Accessibility and behavior

- Announcements are emitted through a visually hidden `role="status"` region
- The component intentionally does nothing on the initial mount to avoid announcing the page before navigation has occurred
- It expects the page to provide a `<main>` element with `tabIndex={-1}` so focus can move predictably

## Common patterns

- Mount `Navbar` once inside the shared header and keep the same route list everywhere.
- Use `Breadcrumbs` on page-level views such as contract detail pages, where the trail is specific to the current context.
- Mount `RouteAnnouncer` once near the root layout so route changes are announced consistently across the app.
- Ensure the page has a single `<h1>` and a focusable `<main>` landmark for the best screen-reader experience.

## Related files

- Component: `src/components/Navbar.tsx`
- Component: `src/components/Breadcrumbs.tsx`
- Component: `src/components/RouteAnnouncer.tsx`
- Tests: `src/components/__tests__/Navbar.test.tsx`, `src/components/__tests__/Breadcrumbs.test.tsx`, `src/components/__tests__/RouteAnnouncer.test.tsx`