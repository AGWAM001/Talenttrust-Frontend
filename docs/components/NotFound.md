# NotFound Component

The `NotFound` component is the application's 404 page. It helps users recover from broken or expired URLs — such as stale contract detail links — by providing quick navigation to the three primary sections of TalentTrust.

## Overview

This is a Next.js App Router page component located at `src/app/not-found.tsx`. It has no props and renders automatically whenever a route is not matched.

## State Invariants

The 404 page is a pure presentational route. It must not introduce mutable state, fetch data, or perform side effects, because Next.js may render it during static generation, on the server for a missed route, and again during client hydration. The following invariants are enforced by the component and covered by tests:

| Invariant | Rationale | Enforced by |
|---|---|---|
| Render is deterministic and pure | Server and client output must match to avoid hydration mismatches and silent UI corruption. | No props, no `state`, no `useEffect`, no date/random/locale dependencies. |
| No data fetching or mutation | A 404 must not cause partial failure, retries, or concurrent effects that could leave state inconsistent. | No `fetch`, no SWR/React Query, no form submission, no auth checks. |
| No authorization decisions | The 404 page is public and must not leak whether a resource exists or whether the viewer is authorized. | No auth guards, no user-specific content, constant link targets. |
| No sensitive data in errors or logs | Failures must be diagnosable without exposing tokens, emails, or resource IDs. | Static copy only; no dynamic error messages or query params rendered. |
| All links are sttable and known | Navigation must not depend on the current URL or session. | Hard-coded `href` values that are validated in tests. |

These invariants are documented in code with a leading comment block so future editors do not accidentally add state or data dependencies.

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
- **Decorative content**: The `404` text has `aria-hidden="true".
- **Focus states**: All links include `focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2` for visible keyboard focus indicators (WCAG 2.1 AA — Success Criterion 2.4.7).
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

### Invariant and adverse-case coverage

In addition to the rendering tests above, the suite exercises the state invariants and failure modes:

| Scenario | Type | What it verifies |
|---|---|---|
| Render twice with identical inputs | Determinism | Output is byte-identical; no hidden non-determinism |
| Render after a failed route resolution | Regussion | Page still renders without throwing or fetching |
| Render with a stale `/contracts/[did]` URL | Boundary | No contract ID or query param leaks into the DOM |
| No `fetch`, `useEffect`, or `state` in the module | Security | Static analysis asserts the component is pure and side-effect free |
| All `href` values are absolute and known | Authorization | No session- or role-dependent navigation targets |
| No sensitive strings in rendered text | Data integrity | No tokens, emails, or resource IDs present in the DOM |

Failures are surfaced through the standard test runner output only; the component itself emits no logs or metrics and renders no dynamic error details, so no sensitive data can be exposed through the 404 route.
