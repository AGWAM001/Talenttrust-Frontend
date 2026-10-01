# NotFound Component

``NotFound`` is the application's 404 page. It helps users recover from broken or expired URLs — such as stale contract detail links — by providing quick navigation to the three primary sections of TalentTrust.

## Overview

This is a Next.js App Router page component located at `src/app/not-found.tsx`. It has no props and renders automatically whenever a route is not matched.

## Validation Boundaries

Although this component has no input props, it is the terminal handler for any unmatched route. The following invariants are enforced and covered by focused tests.

### Valid input

- Any URL that does not match a defined route is a valid trigger for this page.
- The component must render without throwing, regardless of the captured pathname.

### Invalid input

- The component must not attempt to interpret, parse, or echo the requested path.
- No raw path segments, query parameters, or fragments may be interpolated into the rendered markup. This prevents reflected content and keeps the page deterministic.

### Duplicate input

- Repeated navigation to the same unmatched URL must produce identical output.
- Rendering the component multiple times must not accumulate state or duplicate links.

### Boundary cases

- Extremely long or deeply nested paths are handled identically to short ones.
- The component is a static server-renderable page with no asynchronous work, so retries and concurrent renders cannot produce an inconsistent result.

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
- **Focus states**: All links include `focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2` for visible keyboard focus indicators (WCAG 2.1 AA — success criterion 2.4.7).
- **Keyboard navigation**: All interactive elements are native `<a>` elements, reachable via Tab in DOM order.

## Responsive Behaviour

/ Quick links stack vertically on mobile; the separator (`—`) is hidden below `sm` breakpoint.
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

### Validation test coverage

In addition to the rendering tests above, the focused suite exercises the validation boundaries documented in this file:

| Test | Scenario |
|---|---|
| Accepted input | Renders for a typical unmatched path without throwing |
| Rejected input | No raw path, query, or fragment is echoed into the DOM |
| Duplicate submission | Re-rendering produces identical output with no duplicated links |
| Boundary values | Extremely long and deeply nested paths render identically to short ones |

## Observability

This page is purely presentational and renders no user-supplied data. It does not log pathnames or other request details, so failures are diagnosable through the standard routing and server logs without exposing sensitive information.
