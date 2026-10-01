# NotFound Component

The `NotFound` component is the application's 404 page. It helps users recover from broken or expired URLs — such as stale contract detail links — by providing quick navigation to the three primary sections of TalentTrust.

## Overview

This is a Next.js App Router page component located at `src/app/not-found.tsx`. It has no props and renders automatically whenever a route is not matched.

It is a **thin renderer**: the recovery links, home route, and support address come from the validated compatibility contract in [`src/lib/notFoundContent.ts`](../../src/lib/notFoundContent.ts). Behavioural changes belong in that module, not here.

## Compatibility contract

The 404 page is the only recovery surface the app guarantees after a broken or expired link, so its public behaviour is pinned and validated:

- **Source of truth**: `DEFAULT_NOT_FOUND_QUICK_LINKS` defines the routes, copy, and order rendered below.
- **Validation**: only root-relative, whitespace-free, backslash-free hrefs with non-empty labels/descriptions are accepted. Absolute and protocol-relative URLs are rejected, so the page cannot become an open-redirect vector.
- **Determinism**: duplicate hrefs keep the first occurrence; the list is capped at `MAX_NOT_FOUND_QUICK_LINKS`; normalization never throws.
- **Fail-safe**: malformed or empty upstream data falls back to the documented defaults, so a recovery path always exists.
- **Observability**: normalization reports rejected/duplicate/truncated counts without echoing offending content.

See [`docs/lib/notFoundContent.md`](../lib/notFoundContent.md) for the full API and invariants.

## UI Sections

### 1. Decorative 404

A large `404` displayed purely for visual context. It is marked `aria-hidden="true"` so screen readers skip it.

### 2. Heading and Description

| Element | Content |
|---|---|
| `h1` | "Page Not Found" |
| `<p>` | "This page doesn't exist or the link may have expired. Here are a few places to get back on track." |

Copy follows the [Copywriting Guide](../COPYWRITING_GUIDE.md): direct, second-person, no technical jargon.

### 3. Quick Links (`<nav>`)

A `<nav aria-label="Quick links">` section with three links to the primary routes:

| Label | Route | Description shown |
|---|---|---|
| View Contracts | `/contracts` | "Pick up where you left off" |
| Track Milestones | `/milestones` | "See your project checkpoints" |
| My Reputation | `/reputation` | "Check your work history" |

### 4. Footer Actions

| Label | Target |
|---|---|
| Go Home | `/` |
| Contact Support | `mailto:support@talenttrust.io` |

## Accessibility

- **Heading hierarchy**: `h1` is the only top-level heading. The quick links section uses a visually hidden `h2` (`sr-only`) so screen reader users can navigate to it by heading.
- **Landmark navigation**: `<nav aria-label="Quick links">` creates a named navigation landmark.
- **Decorative content**: The `404` text has `aria-hidden="true"`.
- **Focus states**: All links include `focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2` for visible keyboard focus indicators (WCAG 2.1 AA — Success Criterion 2.4.7).
- **Keyboard navigation**: All interactive elements are native `<a>` elements, reachable via Tab in DOM order.

## Responsive Behaviour

- Quick links stack vertically on mobile; the separator (`—`) is hidden below `sm` breakpoint.
- Footer action buttons stack vertically on mobile (`flex-col`) and sit side by side from `sm` upward (`sm:flex-row`).

## Styling

Uses Tailwind CSS utility classes consistent with the rest of the app. No custom CSS. Background uses the global CSS variable `--background`.

## Testing

Tests live in `src/app/not-found.test.tsx` and cover:

| Test | What it verifies |
|---|---|
| `h1` heading renders | Correct heading level and text |
| Descriptive paragraph | Recovery copy is present |
| `aria-hidden` on 404 | Decorative element hidden from assistive tech |
| `<nav>` landmark | Named navigation region exists |
| Contracts link | `href="/contracts"` |
| Milestones link | `href="/milestones"` |
| Reputation link | `href="/reputation"` |
| Go Home link | `href="/"` |
| Contact Support link | `href="mailto:support@talenttrust.io"` |
| All links keyboard reachable | All 5 links are `<a>` elements |
| Rendered links match the contract | Hrefs/order equal `getNotFoundQuickLinks()` |
| Documented defaults render | Labels and descriptions match the frozen default list |
| Contract home/support hrefs | Constants drive the Go Home and Contact Support links |
| No off-site anchor | No `http(s):` or `//` href can render |
| Axe scan | No detectable accessibility violations |
| Snapshot | Regression guard on rendered output |

Contract unit tests live in `src/lib/notFoundContent.test.ts` and cover success, rejection, duplicate, boundary, fallback, purity, and freezes.
