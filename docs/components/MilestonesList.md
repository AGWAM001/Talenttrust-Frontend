# MilestonesList Component

## Overview

The `MilestonesList` component displays the list of milestones associated with a contract. It renders each milestone's status, payout amount, and due date. Per-row view/edit behavior (roles, keyboard contract, focus management) is documented separately in [MilestoneRow.md](./MilestoneRow.md) — this document covers the list-level shell: header, status tally, currency-mismatch warning, due-soon banner, density toggle, pagination, and the scrollable region that hosts the rows.

## Accessibility

### Roles

| Element | Role / attribute | Purpose |
|---------|-------------------|---------|
| Root | `<section aria-labelledby="milestones-title">` | Names the whole widget from the visible "Milestones" heading. |
| Heading | `<h2 id="milestones-title">` | The accessible name source for both the section and the scroll region below. |
| Density toggle | `aria-pressed={isCompact}` | Exposes the comfortable/compact toggle as a two-state button rather than a plain click target, so assistive technology announces its current state. |
| Density change live region | `role="status"` implicit via `aria-live="polite"` `<span>` (sr-only) | Announces "Milestones density set to compact/comfortable" after a toggle, since the visual-only spacing change has no other AT signal. |
| Status tally | `role="list"` / `role="listitem"` per chip, `aria-label="Milestone status summary"` | Exposes the per-status counts (e.g. "Completed 1") as a labelled list rather than an unordered visual row of pills. |
| Currency-mismatch warning | `role="alert"` | Interrupts to tell the user which milestones use a currency other than the contract's, since this is a correctness issue that needs prompt attention. |
| Due-soon banner | `role="status"` | Announces (politely, on next render) that N milestones are due within the reminder window, without interrupting other speech. |
| Save/save-failure announcements | `role="status"`, `aria-live="polite"`, `aria-atomic="true"` (sr-only, `data-testid="milestones-announcement"`) | Reports the outcome of an inline row edit (see [MilestoneRow.md](./MilestoneRow.md)) back to assistive technology, since the row itself renders no live region of its own. |
| Scroll region | `role="region"` (only when non-empty), `aria-labelledby="milestones-title milestones-count"`, `tabIndex={0}` | Makes the internally-scrolling milestone list keyboard-reachable and announces both the section name and the live item count when focused (e.g. "Milestones, 3 total — region"). |

### Keyboard interactions

| Key | Context | Behavior |
|-----|---------|----------|
| Tab | Header | Reaches the density toggle button, then leaves the header for the tally/warning/banner controls in document order. |
| Enter / Space | Density toggle | Flips `preferences.milestonesDensity` between `comfortable` and `compact` and fires the live-region announcement. |
| Tab | Due-soon banner | Reaches each milestone link (`#milestone-${id}` anchors), then the dismiss (×) button. |
| Enter / Space | Due-soon dismiss | Hides the banner and moves focus to the scroll region (see Focus behavior). |
| Tab | Scroll region | The region itself is a single tab stop (`tabIndex={0}`); arrow keys scroll it like any native scrollable container. Tabbing again moves into the first row's controls — see [MilestoneRow.md](./MilestoneRow.md#keyboard-interactions) for in-row behavior. |
| Enter / Space | "Load More" button | Appends the next `pageSize` (default `PAGE_SIZE_DEFAULT = 5`) milestones to `displayCount` without losing the current scroll position. |

### Focus behavior

- **Dismissing the due-soon banner:** `handleDismiss` sets `isDismissed` and immediately calls `listContainerRef.current?.focus()`, moving focus to the scroll region so a keyboard user never loses their place when the control they were on (the dismiss button) disappears (WCAG 2.1.1).
- **Pagination:** clicking "Load More" only grows `displayCount` — it never moves focus, since the button stays mounted (relabelled with the new remaining count) until every milestone is visible.
- **Filter/list changes:** a `useEffect` keyed on `[milestones, pageSize]` resets `displayCount` back to `pageSize` whenever the incoming list changes (e.g. a status filter narrows the results), so a filtered view always starts back at page one rather than preserving a stale offset.
- **Row-level focus** (entering/exiting inline edit, Escape-to-cancel, Save/Cancel focus restoration) is owned entirely by `MilestoneRow` and documented in [MilestoneRow.md](./MilestoneRow.md#focus-behavior) — `MilestonesList` does not intervene in it beyond rendering the shared save/failure live region.

## Due-Soon Reminder Banner

An accessible, dismissible banner is surfaced above the milestones list when there are milestones approaching their deadlines. This banner alerts both freelancers and clients about imminent payout dates, ensuring time-sensitive work is not missed.

### Features

- **Configurable Window**: Surfaces milestones due within a configurable timeframe defined by a named constant (default: `7` days).
- **Status Exclusions**: Excludes milestones that are already in terminal statuses (`Paid` or `Completed`).
- **Date Handling**: Uses a robust local-time date parser to prevent UTC-to-local shifts, ensuring that boundaries are computed accurately against local calendar days.
- **Keyboard accessibility**:
  - The banner container has `role="status"` to announce updates to screen readers.
  - Links inside the banner target the specific milestone element ID (`#milestone-${id}`) to allow users to jump or scroll directly to the milestone card.
  - Dismiss and in-list links use `focus-visible` rings so keyboard focus is visible without changing layout.
  - Focus is programmatically restored to the scrollable milestones list container when the banner is dismissed, preventing loss of keyboard focus (WCAG 2.1.1).
  - Enter and Space activate the dismiss control; Tab reaches links, dismiss, then the scroll region.

## Implementation Details

- **File**: [src/components/MilestonesList.tsx](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/components/MilestonesList.tsx)
- **Helper**: [src/lib/dueSoon.ts](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/lib/dueSoon.ts)
- **Constant**: `REMINDER_WINDOW_DAYS = 7`

## Testing

Comprehensive test coverage is provided in [MilestonesList.test.tsx](file:///c:/Users/USER/Desktop/Talenttrust-Frontend/src/components/__tests__/MilestonesList.test.tsx):
- Renders banner when due-soon milestones exist.
- Correct pluralization (e.g., "1 milestone is due..." vs "2 milestones are due...").
- Exclusion of terminal statuses.
- Proper handling of due-date boundaries (exactly today, exactly 7 days from now).
- Graceful skipping of invalid/unparseable due date strings.
- Dismiss interaction and focus restoration checking.
- Accessibility validation using `axe`.

Run tests with:
```bash
npx jest src/components/__tests__/MilestonesList.test.tsx
```

## Reduced-Motion & High-Contrast Support (WCAG 2.1 AA / WCAG 2.3.3)

- **prefers-reduced-motion**: Halts pulse/shimmer loading skeleton animations (`MilestonesListSkeleton`) and collapses state transitions so elements snap instantly into place without non-essential motion.
- **forced-colors (High Contrast Mode)**: Enforces explicit 1px high-contrast borders around status badge pills (`.status-badge`), summary chips (`[role="listitem"]`), filter radio options, and progress bar tracks (`[role="progressbar"]`), ensuring full visual separation and legibility when forced-colors mode is enabled by the OS or browser.

## URL Status Filtering

The milestones page synchronizes the active status filter with the URL query parameter `?status=`.

- **Initial State**: Read from the `?status=` URL query parameter using `useSearchParams`. Defaults to `'All'` if omitted or invalid.
- **Filter Changes**: When a user selects a filter option, `router.replace` updates the URL query string without creating extra history entries.
- **Accessibility**: Preserves the `aria-live` announcement for screen readers on filter change.

