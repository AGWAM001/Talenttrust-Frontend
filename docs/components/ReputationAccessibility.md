# Reputation Accessibility

Accessibility contract for the Reputation module. Every statement in this
document is derived directly from the current source code. No accessibility
features are described that are not implemented.

**Files covered:**

| File | Role |
|------|------|
| `src/components/ReputationProfile.tsx` | Main profile component |
| `src/app/reputation/page.tsx` | Route-level page shell |
| `src/app/reputation/ReputationPageClient.tsx` | Client wrapper — focus on mount |
| `src/app/reputation/loading.tsx` | Suspense skeleton |
| `src/app/reputation/ReputationLoadingClient.tsx` | Client wrapper for loading state |
| `src/components/ConfirmDialog.tsx` | Bulk-delete confirmation dialog |

---

## Overview

The Reputation module renders a user's trust score, level badge, level legend,
and history of reputation events. It is composed of a presentational component
(`ReputationProfile`) wrapped by a client component (`ReputationPageClient`)
that manages focus on navigation. An App Router Suspense skeleton
(`ReputationLoadingClient` / `loading.tsx`) covers the loading state.

Interactive controls allow filtering and sorting history events, selecting
individual events or all events at once, exporting selected events, and
deleting selected events via a confirmation dialog.

---

## Semantic Structure

### Page shell (`ReputationPageClient`)

```html
<main tabIndex="-1">
  <!-- ReputationPageContent -->
</main>
```

- The `<main>` element is the sole page landmark. It carries `tabIndex="-1"`
  so it can receive programmatic focus on navigation.
- No nested `<main>` elements are introduced by `ReputationProfile`.

### Profile component (`ReputationProfile`)

```
<section aria-labelledby="profile-heading">
  <h2 class="sr-only" id="profile-heading">Reputation profile for {name}</h2>

  <!-- Avatar block -->
  <h1>{name}</h1>               ← visible heading inside the section

  <!-- Score / level / explanation tiles -->
  <p id="reputation-score-label">Reputation score</p>
  <p aria-labelledby="reputation-score-label">
    <span role="meter" …>{score}</span>
  </p>

  <p id="reputation-level-label">Level</p>
  <p aria-labelledby="reputation-level-label">{level}</p>

  <!-- Level legend (only when score is present) -->
  <h2 id="reputation-legend-title">Reputation Level Legend</h2>
  <ul id="reputation-legend" aria-labelledby="reputation-legend-title">
    <li>…</li> × 5
  </ul>

  <!-- History card -->
  <h2>Reputation history</h2>
  <ol>
    <li>…</li> × N   ← one per event
  </ol>
</section>
```

### Loading skeleton (`loading.tsx` / `ReputationLoadingClient`)

```html
<main tabIndex="-1" aria-busy="true">
  <span role="status" aria-live="polite" aria-atomic="true" class="sr-only">
    Loading reputation…
  </span>
  <!-- shimmer blocks, all aria-hidden="true" -->
</main>
```

---

## Roles and ARIA Attributes

### Landmark and section labelling

| Element | Attribute | Value | Source |
|---------|-----------|-------|--------|
| `<section>` | `aria-labelledby` | `"profile-heading"` | `ReputationProfile.tsx` |
| `<h2 id="profile-heading">` | `class` | `sr-only` | `ReputationProfile.tsx` |
| `<main>` | `tabIndex` | `-1` | `ReputationPageClient.tsx` |
| `<main>` (loading) | `aria-busy` | `"true"` | `ReputationLoadingClient.tsx` |

### Score meter

| Element | Attribute | Value |
|---------|-----------|-------|
| `<span>` | `role` | `"meter"` |
| `<span>` | `aria-valuenow` | numeric score |
| `<span>` | `aria-valuemin` | `0` |
| `<span>` | `aria-valuemax` | `maxScore` (default `5`) |
| `<span>` | `aria-labelledby` | `"reputation-score-label"` |
| `<span>` | `aria-describedby` | `"reputation-legend"` |

The `<span>` also contains two visually-hidden `<span class="sr-only">`
children that produce the announcement `"Reputation score {score} out of
{maxScore}"` for assistive technology.

The score meter only renders when `score` is a number `>= 0`. When no score
is present, the tile displays the text "No reputation yet" with no meter role.

### Level tile

| Element | Attribute | Value |
|---------|-----------|-------|
| `<p id="reputation-level-label">` | — | label anchor |
| `<p aria-labelledby="reputation-level-label">` | — | value element |

A visually-hidden `<span class="sr-only">Level </span>` prefix is inserted
before the level text so screen readers announce "Level Trusted Partner"
rather than the bare label text.

### Level legend list

| Element | Attribute | Value |
|---------|-----------|-------|
| `<h2 id="reputation-legend-title">` | — | section heading |
| `<ul>` | `id` | `"reputation-legend"` |
| `<ul>` | `aria-labelledby` | `"reputation-legend-title"` |

The legend only renders when a score is present. Each `<li>` contains the
score range and band label as plain text. No additional ARIA attributes are
applied to the list items.

### Selection checkboxes

| Element | `aria-label` value |
|---------|-------------------|
| Select-all `<input type="checkbox">` | `"Select all reputation items"` |
| Per-item `<input type="checkbox">` | `"Select reputation item {event.type}: {event.summary}"` |

The select-all checkbox also uses the `indeterminate` DOM property (set via a
`ref` callback) when some but not all items are selected.

### Live regions

| Element | `aria-live` | `aria-atomic` | Content | When active |
|---------|------------|--------------|---------|-------------|
| `<p class="sr-only">` | `polite` | `true` | Action result message | After export, delete, or clear-selection |
| `<div class="sr-only">` | `polite` | absent | Filter result count | When history is present and filter/sort changes |
| `<span role="status" class="sr-only">` | `polite` | `true` | `"Loading reputation…"` | During Suspense loading |

The action announcement `<p>` outputs messages such as:

- `"Deleted 3 reputation items."`
- `"Exported 1 reputation item."`
- `"Selection cleared."`

The filter count `<div>` outputs messages such as:

- `"Showing 4 events, newest first"`
- `"Showing 2 events of type Verification, oldest first"`

### Loading skeleton

All shimmer placeholder blocks in `loading.tsx` carry `aria-hidden="true"`.
They are purely decorative and produce no accessible content.

### Confirmation dialog (`ConfirmDialog`)

The dialog is opened when the user activates "Delete selected" with one or
more items selected.

| Element | Attribute | Value |
|---------|-----------|-------|
| Dialog `<div>` | `role` | `"alertdialog"` (tone is `"destructive"`) |
| Dialog `<div>` | `aria-modal` | `"true"` |
| Dialog `<div>` | `aria-labelledby` | unique ID on `<h2>` (via `useId`) |
| Dialog `<div>` | `aria-describedby` | unique ID on `<p>` (via `useId`) |
| Backdrop `<div>` | `aria-hidden` | `"true"` |
| Error `<div>` | `role` | `"alert"` |
| Success `<div>` | `role` | `"status"` |

While the dialog is open, all sibling elements outside the dialog are given
`aria-hidden="true"` and the `inert` attribute to prevent background
interaction. These attributes are cleaned up when the dialog closes.

---

## Keyboard Support

All interactive controls in `ReputationProfile` are native HTML elements.
No custom `onKeyDown` or `onKeyUp` handlers are implemented in the component.

| Control | Element | Keyboard behaviour |
|---------|---------|-------------------|
| Filter by type | `<select id="history-type-filter">` | Arrow keys change option; Enter/Space confirm |
| Sort direction | `<select id="history-sort-dir">` | Arrow keys change option; Enter/Space confirm |
| Select all | `<input type="checkbox">` | Space toggles checked/indeterminate/unchecked |
| Per-item select | `<input type="checkbox">` | Space toggles checked state |
| Export selected | `<button type="button">` | Enter or Space activates; disabled when no items selected |
| Delete selected | `<button type="button">` | Enter or Space opens ConfirmDialog; disabled when no items selected |
| Clear selection | `<button type="button">` | Enter or Space clears all selections; disabled when no items selected |

### Disabled state

"Export selected", "Delete selected", and "Clear selection" buttons carry the
native `disabled` attribute when `selectedCount === 0`. Disabled buttons are
excluded from the tab order by the browser and receive `cursor-not-allowed`
and `opacity-50` visual treatment.

### Confirmation dialog keyboard behaviour

The `ConfirmDialog` component uses the `useDialogFocusTrap` hook, which
provides:

| Key | Behaviour |
|-----|-----------|
| `Tab` | Moves focus forward through focusable elements; wraps from last to first |
| `Shift+Tab` | Moves focus backward; wraps from first to last |
| `Escape` | Closes the dialog and calls `onCancel` |

---

## Focus Management

### Page navigation (`ReputationPageClient`)

When the reputation page mounts, `ReputationPageClient` runs a `useEffect`
that:

1. Captures `document.activeElement` into a ref (`previousFocusRef`).
2. After a 100 ms delay, focuses the `<main tabIndex="-1">` element.

This gives keyboard and screen-reader users a predictable entry point at the
top of the page content on each navigation.

Focus restoration on navigation away from the page is handled by the global
`RouteAnnouncer` component, not by `ReputationPageClient`.

### Loading state (`ReputationLoadingClient`)

`ReputationLoadingClient` applies the same focus-on-mount behaviour as
`ReputationPageClient` while the Suspense boundary is active. The `<main>`
also carries `aria-busy="true"` during this period.

### Confirmation dialog (`ConfirmDialog`)

- **On open:** focus moves to the Cancel button (configured as
  `initialFocusRef` in `useDialogFocusTrap`).
- **While open:** focus is trapped within the dialog. Tab and Shift+Tab wrap
  at the boundaries.
- **On close:** `restoreFocus: true` is set, so `useDialogFocusTrap` returns
  focus to the element that was active when the dialog opened — in practice,
  the "Delete selected" button that triggered it.

---

## Screen Reader Behaviour

### No reputation state

The score tile reads: `"No reputation yet"` (plain text, no meter role).
The level tile reads: `"Pending"` (plain text, no level prefix).
The history section shows a paragraph: `"No reputation history available yet."`.
No legend, no ordered list, and no selection toolbar are rendered.

### Partial reputation state (score present, no history)

The score tile announces: `"Reputation score {score} out of {maxScore}"` via
the sr-only prefix and suffix spans combined with the visible numeral.
The level tile announces: `"Level {resolvedLevel}"` via the sr-only prefix.
An amber-coloured banner reads: `"Partial reputation data"` followed by an
explanation paragraph. This banner is a plain `<div>` with no live-region
role; it is not automatically announced when it appears — it is read only
when focus reaches it or when a screen reader browses the page.

### Full reputation state (score and history present)

History events are rendered in an `<ol>`. Each `<li>` contains:

- A labeled `<input type="checkbox">` with the accessible name
  `"Select reputation item {type}: {summary}"`.
- The event type as a `<span>`.
- The event summary as a `<span>`.
- A `<time>` element. When the `date` value passes `Date.parse`, the element
  has a `dateTime` attribute set to the ISO string. When it does not parse,
  `dateTime` is omitted and only the raw text is rendered.

### Level legend

The legend `<ul>` is labelled `"Reputation Level Legend"` via
`aria-labelledby`. Each `<li>` contains the score range (e.g.
`"0.0 - 1.0"`) and the band label (e.g. `"Newcomer"`) as plain text. The
currently active band is highlighted visually via CSS class changes; there is
no programmatic indicator (no `aria-current`, `aria-selected`, or
`aria-pressed`) on the list items.

### Action announcements

After bulk actions, the polite live region announces the outcome:

| Action | Announcement |
|--------|-------------|
| Export 1 item | `"Exported 1 reputation item."` |
| Export N items | `"Exported N reputation items."` |
| Delete 1 item | `"Deleted 1 reputation item."` |
| Delete N items | `"Deleted N reputation items."` |
| Clear selection | `"Selection cleared."` |

A toast notification is also shown after a successful delete (via
`useToast().showSuccess`), but this fires only when the toast context is
available. The live-region announcement fires regardless of context
availability.

---

## Interactive Elements

The table below lists every interactive control in the rendered Reputation
page and its accessible properties.

| Control | Element | Accessible name source | Disabled when |
|---------|---------|----------------------|---------------|
| Filter by event type | `<select>` | `<label htmlFor="history-type-filter">` | Never |
| Sort direction | `<select>` | `<label htmlFor="history-sort-dir">` | Never |
| Select all checkbox | `<input type="checkbox">` | `aria-label="Select all reputation items"` | No events in filtered list |
| Per-event checkbox | `<input type="checkbox">` | `aria-label="Select reputation item …"` | Never |
| Export selected | `<button>` | Button text "Export selected" | `selectedCount === 0` |
| Delete selected | `<button>` | Button text "Delete selected" | `selectedCount === 0` |
| Clear selection | `<button>` | Button text "Clear selection" | `selectedCount === 0` |
| Dialog Cancel | `<button>` | Button text (default `"Cancel"`) | Never |
| Dialog Delete selected | `<button>` | Button text `"Delete selected"` | Never |

The filter and sort controls are only rendered when `history.length > 0`.
The selection toolbar (checkboxes and action buttons) is only rendered when
the filtered history list is non-empty.

---

## Accessibility Notes

- **`jest-axe` coverage.** The `no reputation`, `full score + history`,
  `partial (score, no history)`, and `null score` states are all audited
  with axe-core in `src/components/__tests__/a11y.test.tsx` and pass with
  zero violations.

- **Reduced motion.** The loading skeleton's shimmer animation is applied
  with the `animate-shimmer` Tailwind utility and `motion-reduce:animate-none`
  inline. The global CSS `@media (prefers-reduced-motion: reduce)` rule in
  `globals.css` also halts `.animate-shimmer` unconditionally, so the
  skeleton renders as a static placeholder under reduced-motion preferences.

- **`<time>` element.** Dates that pass `Date.parse` receive a machine-readable
  `dateTime` attribute. Dates that do not parse omit `dateTime` so the element
  remains valid HTML. The visible text is always the raw `event.date` string.

- **Avatar initial.** The avatar block (`<div>` containing
  `name.slice(0, 1).toUpperCase()`) has no `aria-label` or `aria-hidden`.
  It is a presentational character rendered in a styled div, and screen
  readers will read the letter aloud.

- **Privacy badge.** The "Visible" / "Private by default" badge is a
  `<span>` with no ARIA role or label beyond its text content.

- **`useToast` defensive call.** `showSuccess` is obtained inside a
  `try/catch` so the component does not throw when rendered outside a
  `ToastProvider`. In that case only the live-region announcement fires;
  no toast is shown.

---

## Known Limitations

1. **Duplicate `<h1>` on the reputation page.** `ReputationProfile` renders
   `<h1>{name}</h1>` as the visible user name inside the profile card.
   `ReputationPageContent` also renders `<h1 className="text-2xl font-bold mb-6">Reputation</h1>`
   as the page heading. This results in two `<h1>` elements on the same page,
   which breaks the heading hierarchy expected by screen readers and violates
   WCAG 1.3.1 (Info and Relationships). The inner heading in
   `ReputationProfile` should be demoted to `<h2>` or lower.

2. **Active legend item not programmatically indicated.** The currently active
   reputation band in the level legend is highlighted visually (indigo border
   and background) but carries no `aria-current`, `aria-selected`, or other
   ARIA state attribute. Screen reader users browsing the legend list receive
   no indication of which band is active.

3. **Partial-data banner is not a live region.** The amber "Partial reputation
   data" banner is a plain `<div>`. It is not announced automatically by
   assistive technology when it appears; a screen reader user must navigate
   to it manually.

4. **Avatar initial is read aloud.** The avatar `<div>` renders a single
   uppercase letter with no `aria-hidden="true"`. Screen readers will read the
   character (e.g. "A") when they reach it, which may sound abrupt without
   context. The accessible name of the nearby `<h1>` partially mitigates this,
   but the two are not programmatically associated.

5. **Filter result count live region has no `aria-atomic`.** The
   `aria-live="polite"` div that announces the filter count does not set
   `aria-atomic="true"`. Some screen reader / browser combinations may read
   only the changed portion of the region rather than the full message.

6. **No skip link within the profile.** The page-level skip link
   (`#main-content`) moves focus to `<main>`. There is no in-page skip
   mechanism to jump directly to the history list or the action toolbar,
   which may require significant Tab navigation for keyboard users when the
   score, legend, and filter controls precede the history list.

7. **Focus restoration source is not the trigger.** `ReputationPageClient`
   captures the previously focused element into a ref but does not restore
   focus to it on unmount. Focus restoration on page navigation away is
   delegated to the global `RouteAnnouncer`. This means if `RouteAnnouncer`
   is absent or fails, the previously stored element is silently discarded.

---

## Related Documentation

| Topic | File |
|-------|------|
| Component API reference | [`docs/components/ReputationProfile.md`](./ReputationProfile.md) |
| Page rendering states and data flow | [`docs/components/ReputationPage.md`](./ReputationPage.md) |
| Global accessibility testing setup | [`docs/components/Accessibility.md`](./Accessibility.md) |
| Confirmation dialog accessibility | [`docs/components/Dialogs.md`](./Dialogs.md) |
| `useDialogFocusTrap` hook | [`docs/components/Dialogs.md`](./Dialogs.md) |
| Route announcer and skip link | [`docs/components/Accessibility.md`](./Accessibility.md) |
