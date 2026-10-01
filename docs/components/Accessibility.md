# Accessibility Testing

Automated accessibility regression tests catch contrast, role, labeling, and semantic issues before they reach production. The project uses [jest-axe](https://github.com/nickcolley/jest-axe) (axe-core integration for Jest) to audit rendered DOM against [WCAG 2.1 AA](https://www.w3.org/TR/WCAG21/) success criteria.

## Setup

- **jest-axe** is installed as a dev dependency.
- The custom `toHaveNoViolations` matcher is registered in `jest.setup.ts`.
- A shared helper module lives at `src/test-utils/a11y.tsx` with:
  - `testA11y(ui, options?)` — renders a component and asserts zero axe violations.
  - `assertNoA11yViolations(container)` — runs axe on an already-rendered container.
  - `renderWithA11y(ui, options?)` — standard RTL render (alias for convenience).

### Test helper API

```tsx
import { testA11y, renderWithA11y, assertNoA11yViolations } from '@/test-utils/a11y';

// One-shot: render + assert
await testA11y(<MyComponent prop="value" />);

// Two-step: render, run assertions, then check a11y
const { container, getByRole } = renderWithA11y(<MyComponent prop="value" />);
expect(getByRole('heading')).toBeInTheDocument();
await assertNoA11yViolations(container);
```

## Test file

All a11y regression tests are colocated in `src/components/__tests__/a11y.test.tsx`. Each component section covers multiple states that produce meaningfully different DOM output:

| Component | Tested states |
|-----------|---------------|
| `MilestonesList` | Empty, single milestone, multiple statuses, missing optional fields |
| `ContractSummary` | Active + multiple parties, Disputed, Completed with single milestone |
| `ReputationProfile` | No reputation, full score + history, partial (score without history), null score |
| `EmptyState` | Text-only, with illustration variant, with primary action, with both actions |
| `FormField` | Default state, errored state, with helper text, required marker |
| `GlobalError` | Critical root error, interactive reset action, Go Home and Support links |

## Running

```bash
npm test
```

Axe audits run as part of the standard Jest suite. Any violation fails the suite with a detailed report of the rule, selector, and suggested fix.

## CI

The GitHub Actions workflow (`.github/workflows/ci.yml`) already runs `npm test` on every push and pull request to the `main` branch. Adding new a11y tests to `a11y.test.tsx` automatically gates violations in CI.
he
## Skip-to-content link (WCAG 2.4.1 Bypass Blocks)

A visually-hidden skip link is rendered as the **first focusable element** in `<body>` (inside `src/app/layout.tsx`). It lets keyboard and screen-reader users skip the sticky header navigation on every page.

### How it works

```tsx
{/* First child inside WalletProvider — before the header */}
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

- **Visually hidden when blurred**: the `.skip-link` class positions the link off-screen (`top: -9999px`). This keeps it out of the visual flow without removing it from the tab order.
- **Visible on focus**: `:focus` resets `top` to `0`, revealing the link in the top-left corner with the app's primary colour and a matching focus ring (`var(--ring)`).
- **Target**: `<main id="main-content" tabIndex={-1}>` — the `tabIndex={-1}` allows the browser to move focus there programmatically when the link is activated.
- **No header disruption**: the link uses `position: absolute` and `z-index: 9999`, so it overlays without affecting the sticky header or `SettingsTrigger` layout.

### CSS (globals.css)

```css
.skip-link {
  position: absolute;
  top: -9999px;
  left: 0;
  z-index: 9999;
  padding: 0.75rem 1.25rem;
  background: var(--primary);
  color: var(--primary-foreground);
  font-weight: 600;
  border-radius: 0 0 var(--radius) 0;
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
  outline: 3px solid var(--ring);
  outline-offset: 2px;
}
```

### Test file

Tests live in `src/app/__tests__/layout.test.tsx` and cover:

| Test | What is verified |
|------|-----------------|
| Correct link text | `getByRole('link', { name: /skip to main content/i })` |
| `href="#main-content"` | Points to the main landmark |
| `.skip-link` class | CSS hook is applied |
| First focusable element | Skip link precedes all header controls in DOM order |
| `<main id="main-content">` exists | Target element is present |
| `tabIndex={-1}` on `<main>` | Programmatic focus is possible |
| axe clean | No WCAG violations via `jest-axe` |

## RouteAnnouncer — client-side navigation focus and announcement

[`RouteAnnouncer`](../../src/components/RouteAnnouncer.tsx) is mounted in the root layout inside the provider tree. It uses `usePathname` from `next/navigation` to detect route changes and:

1. **Focuses the `<main>` landmark** — the `<main>` element in the layout has `tabIndex={-1}` and `id="main-content"`, making it programmatically focusable. On each navigation, focus moves there so keyboard and screen-reader users start at the top of the new page (WCAG 2.4.3).
2. **Announces the page title** — a visually hidden `role="status"` region (`.sr-only`) is updated with the text of the first `<h1>` on the page, falling back to `"Page: <pathname>"`. Assistive technology reads the announcement automatically.

### Behaviour notes

- **Initial mount**: no focus or announcement fires — the component waits for an actual route change.
- **Same-path re-render**: no spurious announcement — a ref tracks the previous pathname.
- **Missing `<main>` / `<h1>`**: gracefully handled — focus attempt is a no-op, and the pathname is used as fallback text.
- **Skip-link compatibility**: the component targets `<main id="main-content">`, which is the standard skip-link destination. If a skip link is added later, the two will not conflict.

### Test file

Colocated tests live in `src/components/__tests__/RouteAnnouncer.test.tsx` and cover:

| Test | Scenario |
|------|----------|
| Initial mount silence | No announcement before first navigation |
| Title from `<h1>` | Announcement reads the `<h1>` text |
| Focus on navigation | `document.activeElement` is the `<main>` after a route change |
| Pathname fallback | No `<h1>` — uses `"Page: /path"` |
| Same-path stability | Re-render with same pathname produces no announcement |
| Multiple navigations | Correct announcement after several route changes |
| Absent `<main>` | Component does not throw when no `<main>` exists |

## ErrorSummary — form validation focus management

[`ErrorSummary`](../../src/components/ErrorSummary.tsx) is rendered at the top of the sign-in form when validation fails. It is the primary accessibility hook for communicating form errors to assistive-technology users.

### Behaviour

- **`role="alert"`** — the container uses an ARIA live region role so screen readers announce the error summary immediately when it appears in the DOM.
- **`tabIndex={-1}` + programmatic focus** — a `useEffect` calls `ref.current.focus()` whenever `errors.length` transitions from 0 to a positive value, or when the error list changes. This moves keyboard focus to the summary so users do not need to navigate back to find the errors.
- **Anchor links** — each list item renders an `<a href="#fieldId">` pointing to the associated input. Activating the link moves focus directly to the invalid field.
- **Renders nothing when empty** — when `errors` is an empty array the component returns `null`, producing no DOM output.

### Test file

Tests live in `src/components/__tests__/ErrorSummary.test.tsx` and cover:

| Test | What is verified |
|------|-----------------|
| Empty render | `null` returned; no DOM output |
| Alert region | `role="alert"` present and `tabIndex={-1}` set |
| Anchor links | Each error produces an `<a href="#fieldId">` with the message text |
| Focus on mount | `document.activeElement` is the summary after errors transition from empty |
| Re-focus on update | Focus returns to summary when the error list changes |
| Duplicate `fieldId`s | Two entries with the same `fieldId` render without React key warnings |
| Single error | Edge-case with one error renders correctly |
| axe audit (with errors) | No WCAG violations when the summary is visible |
| axe audit (empty) | No WCAG violations when the summary is absent |

## Adding a new component

1. Render every distinct state of the component (empty, populated, error, loading, etc.).
2. Call `await testA11y(<Component ... />)` for each state.
3. If the component depends on a context provider, wrap it in the provider before passing to `testA11y`.

## Single landmark rule (WCAG 2.4.1 Bypass Blocks)

Per WCAG guidelines, a page should have exactly one `<main>` landmark to avoid confusing screen reader users with duplicate navigation targets. The root layout (`src/app/layout.tsx`) provides the single `<main id="main-content">` landmark, so page components must not render nested `<main>` elements.

### Home page landmark and heading hierarchy fix (issue #383)

The home sign-in form (`src/app/page.tsx`) previously had two accessibility issues that undermined the error summary's accessibility and violate WCAG 2.1 AA requirements:

#### Problems fixed

1. **Nested `<main>` landmark** — The page rendered its own `<main>` element while the layout already provided one, creating duplicate landmarks. Screen reader users navigating by landmark would encounter two `<main>` regions, forcing them to choose blindly which one to enter.

2. **Duplicate `<h1>` heading** — The page rendered an `<h1>` "TalentTrust" while the layout header already displayed the same text. This created a broken heading hierarchy where two `<h1>`s existed on the same page, and the second one was buried inside form content rather than at the page's start, violating the logical outline expected by screen readers.

#### Solution implemented

- **Removed the nested `<main>`** from `src/app/page.tsx` and replaced the wrapping element with a standard `<div>`. The layout's `<main id="main-content" tabIndex={-1}>` now serves as the sole page-level landmark.
- **Changed the page heading from `<h1>` to `<h2>`** since the layout header provides the page title. This preserves the hero copy and styling while establishing a correct heading hierarchy: `<h1>` in the header, then `<h2>` for the form section.
- **Added an inline comment** explaining the single-landmark rule and why no nested `<main>` is rendered, helping future maintainers understand the constraint.

#### Why this matters for form accessibility

The `ErrorSummary` component relies on a clean landmark structure to be maximally useful:
- When validation fails, `ErrorSummary` receives focus via a `useEffect` hook and `tabIndex={-1}`.
- If nested `<main>` elements exist, some screen readers may fail to properly announce the focus transition or may treat the nested region as the primary content area.
- Nested `<h1>`s confuse the screen reader's document outline, making it harder for users to navigate the page by heading.

With a single landmark and correct heading hierarchy, the error summary's focus management works as designed: focus moves to the alert region, the screen reader announces "There is a problem" immediately, and users can navigate error links to fix each field.

#### Test coverage

Comprehensive tests in `src/app/page.test.tsx` verify the landmark structure and form accessibility end-to-end:

**Landmark and heading structure:**
- Verifies exactly **one `<main>` landmark** exists (from the layout, not the page)
- Verifies the page has **no `<h1>` elements** (layout header provides it)
- Verifies the form uses `<h2>` for the "TalentTrust" section heading

**Form error flow (jest-axe + manual assertions):**
- `has no accessibility violations on render (empty state)` — form renders with zero WCAG violations when pristine
- `has no accessibility violations when errors are displayed` — ErrorSummary and field errors render with zero WCAG violations
- `has no accessibility violations with valid form data` — valid form state passes axe audit
- `focuses the error summary when errors appear` — `ErrorSummary` ref receives focus immediately on validation failure
- `error summary anchors correctly target form field ids` — each error link in `ErrorSummary` points to the matching input's `id`
- `has inputs that are properly labelled and described by error elements when errors occur` — inputs carry correct `aria-invalid`, `aria-describedby`, and error element IDs

**ErrorSummary focus and field linking (interaction-based):**
- Tests verify that when a form is submitted with missing/invalid data:
  - The `ErrorSummary` becomes focused (`.toHaveFocus()`)
  - Each error link has an `href` matching `#fieldId`
  - The target input element exists and is associated via the link's `href`
  - The field's `aria-describedby` points to the inline error element

**State-branch coverage:**
- Tests separately exercise email-only and password-only error paths
- Tests verify exact error message strings map correctly to field IDs
- Tests cover the success path where `newErrors.length === 0` and the form submission succeeds (no `ErrorSummary` rendered)

All 33 tests pass with 100% axe compliance and zero violations.

## Caveats

- **jest-axe** runs in a JSDOM environment, which does not fully simulate visual rendering. Color-contrast violations are still detected because axe checks computed styles from JSDOM's CSS support.
- Dynamic changes (e.g. after a button click or data fetch) require a separate `testA11y` call after the state change — axe does not auto-observe mutations.
- For full end-to-end a11y coverage, supplement these unit tests with manual screen-reader and keyboard-navigation checks.

## Global Error Fallback Landmark & Title Rule (issue #20)

Per WCAG guidelines, every page (including error fallback layouts) must have a descriptive `<title>` element and all visible content must reside inside an appropriate landmark (such as `<main>`). 

- **Title elements**: The global error fallback `src/app/global-error.tsx` renders its own `<html>`, `<head>`, and `<body>` layout, and therefore must include a `<title>` tag inside the `<head>` (e.g., `<title>Critical Error - TalentTrust</title>`) to satisfy `document-title` audits.
- **Landmark wrapping**: The page content inside the `<body>` must be wrapped in a `<main>` landmark element rather than a standard `<div>` wrapper to ensure compatibility with screen readers and satisfy the `region` landmark rule.
- **Test coverage**: Colocated unit tests in `src/app/global-error.test.tsx` use the `testA11y` helper to verify `jest-axe` compliance for the rendered root fallback layout.


# Accessibility: Dark-theme color contrast audit

**Issue:** a11y/theming-27 — Improve dark-theme color contrast across themed components
**Scope:** `Talenttrust/Talenttrust-Frontend`
**Standard:** WCAG 2.1 AA — 4.5:1 for normal text, 3:1 for large text (≥18pt regular or ≥14pt bold) and UI component boundaries.

## Method

Contrast ratios below were computed directly from the hex values defined in
`src/app/globals.css`, using the standard WCAG relative-luminance formula
(sRGB → linearized → `0.2126R + 0.7152G + 0.0722B`, then
`(L_lighter + 0.05) / (L_darker + 0.05)`). This is the same formula used by
browser dev tools and axe's `color-contrast` check.

Note: `jest-axe` is included in the automated test suite
(`src/components/__tests__/a11y.test.tsx`) to catch ARIA/role/live-region
regressions, but **jsdom does not run a layout/paint engine**, so axe's
`color-contrast` rule does not reliably evaluate colors resolved through
compiled Tailwind classes in this test environment. The ratios in this
document were verified independently and are the authoritative record for
this audit, not the axe run.

## Failures found (before fix)

| Component | Element | Light mode | Dark mode | Status |
|---|---|---|---|---|
| `toast-provider.tsx` | Toast description (`text-slate-600` on `--surface`) | 7.24:1 ✅ | **2.36:1** ❌ | Fails AA (needs 4.5:1) |
| `toast-provider.tsx` | Dismiss button icon (`text-slate-500` on `--surface`) | 4.55:1 ✅ (borderline) | **3.75:1** ❌ | Fails AA (needs 4.5:1) |
| `toast-provider.tsx` | Dismiss button hover bg (`hover:bg-slate-100`, fixed) | n/a (light bg always) | Visually broken — bright patch on dark panel | Not a hard WCAG number, but a real regression |
| `StatusBadge.tsx` | All 5 status pills (`bg-{color}-100 text-{color}-800`, fixed) | 6.37–6.78:1 ✅ | Unaffected by theme — same light pastel chip rendered inside a dark panel | Passes AA numerically, but visually inconsistent with the dark theme |

## Root cause

Both components used **fixed Tailwind utility classes** (`text-slate-600`,
`bg-emerald-100`, etc.) instead of the **CSS variables** already defined in
`globals.css` and toggled by `[data-theme]` via
`src/lib/preferences.tsx`. Fixed classes don't change when the theme
attribute flips, so colors tuned for a light surface get reused, unchanged,
against a dark surface.

## Fix

Added two new sets of theme-aware tokens to `globals.css`:

- **Status/badge tokens** (`--status-success-bg/-foreground`,
  `--status-info-bg/-foreground`, `--status-error-bg/-foreground`,
  `--status-warning-bg/-foreground`) — used by both `StatusBadge.tsx` and
  the toast badges in `toast-provider.tsx`. Light-mode values are
  byte-identical to the original Tailwind hex values, so light mode is
  visually unchanged.
- Reused the **existing** `--muted-foreground` token (already defined,
  already passing AA in both modes) for the toast description text and the
  dismiss button, instead of inventing a new token.

### Verified ratios (after fix)

| Token pair | Light mode | Dark mode |
|---|---|---|
| `--muted-foreground` on `--surface` (toast description, dismiss icon) | 4.55:1 ✅ | 6.96:1 ✅ |
| `--status-success-foreground` on `--status-success-bg` | 6.78:1 ✅ | 5.98:1 ✅ |
| `--status-info-foreground` on `--status-info-bg` | 6.59:1 ✅ | 5.67:1 ✅ |
| `--status-error-foreground` on `--status-error-bg` | 6.68:1 ✅ | 5.30:1 ✅ |
| `--status-warning-foreground` on `--status-warning-bg` | 6.37:1 ✅ | 6.29:1 ✅ |
| Dismiss button hover: `--foreground` on `--accent` | 16.30:1 ✅ | 13.98:1 ✅ |

All pairs clear AA with margin in both themes.

### Badge-vs-panel visual separation (not a WCAG text rule, but checked anyway)

Dark-mode badge backgrounds were also checked against `--surface`
(`#0f172a`) to make sure the chip is visually distinguishable from the
toast panel behind it, not just internally readable:

| Badge background | Ratio vs `--surface` |
|---|---|
| `--status-success-bg` (`#14532d`) | 1.96:1 |
| `--status-info-bg` (`#0c4a6e`) | 1.89:1 |
| `--status-error-bg` (`#7f1d1d`) | 1.78:1 |
| `--status-warning-bg` (`#78350f`) | 1.97:1 |

An earlier draft of these dark badge backgrounds (`#052e1f`, `#3f0d16`) was
rejected at this step — they measured ~1.1–1.2:1 against `--surface` and
were effectively invisible as distinct chips, despite passing the internal
text-contrast check. Flagging this because it's a failure mode that's easy
to miss: a color pair can pass AA's text-contrast formula and still be a
bad fix if the background blends into its container.

## Known pre-existing issue (not introduced by this fix, noted for visibility)

`--muted-foreground` in **light mode** (`#64748b`) measures **4.55:1**
against `--surface` (`#f8fafc`) — it passes AA, but only with a 0.05
margin. This isn't a regression from this PR (the variable already existed
with this value), but it's worth flagging since the issue asked for an
audit of both themes: this pairing has very little headroom and would fail
AA outright if either value drifted even slightly in a future change.

## Components reviewed but not changed

- **`ToastDemo.tsx`** — uses fixed colors (`bg-slate-900 text-white`,
  `bg-white text-rose-700`), but each pair is **self-contained** (fixed
  background + fixed text, not a fixed text color against a *themed*
  surface). Both pairs pass AA regardless of `data-theme`
  (17.85:1 and 6.29:1 respectively). No change made — this is a styling
  preference (the buttons don't visually adapt to theme), not a contrast
  failure, and is out of scope for this issue.

## Testing

- `src/components/__tests__/a11y.test.tsx` renders toast panels (success
  and error) and all five `StatusBadge` statuses in both
  `data-theme='light'` and `data-theme='dark'`, asserting no `jest-axe`
  violations (structural a11y: roles, labels, live regions).
- Additional assertions confirm the fixed `slate-*`/pastel Tailwind classes
  named in this issue are no longer present in the rendered output, and
  that the new CSS-variable-based classes are, as a regression guard for
  this specific fix.

---

## ReputationProfile – Tested Guarantees (issue #135)

**Component:** `src/components/ReputationProfile.tsx`
**Test file:** `src/components/ReputationProfile.test.tsx`

### Rendering branches locked down

| State | Props | Guaranteed outputs |
|-------|-------|--------------------|
| No reputation (undefined score) | `score` omitted | `"No reputation yet"` in score block; `"Pending"` in level block; `"Private by default"` pill; empty history message; **no** amber banner; **no** list items |
| No reputation (null score) | `score={null}` | Same as undefined – `typeof null !== 'number'` so `hasReputation = false` |
| Score = 0 (falsy-but-valid) | `score={0}` | `hasReputation = true`; renders `"0"`; renders level; shows amber partial banner (history empty); **no** `"No reputation yet"` |
| Partial reputation | `score > 0`, `history=[]` | Amber `"Partial reputation data"` banner + explanation; `"Private by default"` pill; empty-history message; **no** list items |
| Full reputation | `score > 0`, `history` non-empty | Each `ReputationEvent` rendered (type, summary, date); `"Visible"` pill; **no** amber banner; **no** empty-history message |
| Single-char initial | `name="A"` or `name="alice"` | Avatar div shows `"A"` (uppercased first character) |
| Default props | `score` provided, no `level`/`history` | `level` defaults to `"Community Member"`; `history` defaults to `[]` |

### Aria contracts verified

| Element | Attribute | Expected value |
|---------|-----------|----------------|
| `<section>` | `aria-labelledby` | `"profile-heading"` |
| `<h2 id="profile-heading">` | `class` | contains `sr-only`; text = `"Reputation profile for {name}"` |
| Score `<p>` | `aria-labelledby` | `"reputation-score-label"` |
| Level `<p>` | `aria-labelledby` | `"reputation-level-label"` |
| Score label `<p>` | `id` | `"reputation-score-label"` |
| Level label `<p>` | `id` | `"reputation-level-label"` |
| `<span>` before score number | `class` | `sr-only`; text = `"Reputation score "` |
| `<span>` after score number | `class` | `sr-only`; text = `" out of 5"` |
| `<span>` before level text | `class` | `sr-only`; text = `"Level "` |

### jest-axe coverage

`assertNoA11yViolations` from `src/test-utils/a11y.tsx` is called for all
four distinct DOM states:

All states pass axe-core with zero violations.

---

## FormField – Tested Guarantees (issue #90)

**Component:** `src/components/FormField.tsx`
**Test files:** `src/components/__tests__/FormField.test.tsx`, `src/components/__tests__/FormFieldRequired.test.tsx`

### Accessibility Prop Injection & Contracts

To ensure robust accessibility structure without requiring boilerplate, `FormField` automatically clones its child form control element (e.g. `<input>`) to inject relevant accessibility and state properties:

| Target Child Prop | Injected / Merged Value | Condition / Context |
|---|---|---|
| `id` | Passes the outer `id` prop | Always injected (links with visual `<label htmlFor={id}>`) |
| `aria-describedby` | Space-separated string of `"{id}-error"` and/or `"{id}-helper"` | Appended if `error` and/or `helperText` are provided; omitted if neither is present |
| `aria-invalid` | `"true"` or `"false"` | `"true"` if `error` is present, `"false"` otherwise |
| `aria-required` | `"true"` or `"false"` | `"true"` if `required` is true, `"false"` otherwise |
| `className` | Merged existing classes with `border-red-500 focus:ring-red-500 focus:border-red-500` | Error classes are only appended if `error` is present; child's original className is always preserved |

### Accessibility Elements and Roles

- **Required Marker & Semantics**: If `required` is true, a visual `*` character (non-color-only cue) is added to the label element and marked with `aria-hidden="true"` to prevent screen readers from reading it redundantly or confusingly (avoiding stray asterisk announcements). The cloned input child also receives `aria-required="true"`, ensuring screen readers announce the field requirement directly and semantically upon focus.
- **Helper text**: Renders as a `<p>` element with `id={id-helper}`.
- **Error message**: Renders as a `<p>` element with `id={id-error}` and carrying the **`role="alert"`** attribute to prompt immediate assistive technology notifications.

### jest-axe coverage

We assert compliance using `testA11y` helper from `src/test-utils/a11y.tsx` across the following states:
1. **Default state**: Basic setup with no helper/error attributes.
2. **Errored & Labelled state**: Loaded with `error`, `helperText`, and `required` parameters.

All test states run against `axe-core` and must produce zero accessibility violations.

---

## Keyboard-Accessible Scroll Regions (WCAG 2.1.1)

A scrollable container with no focusable elements inside is unreachable by keyboard-only users, preventing them from scrolling. To solve this, the container itself is made keyboard-focusable and exposed to assistive technologies.

### Component: `src/components/MilestonesList.tsx`

When the milestone list container is populated, we apply accessibility properties directly to the scroll container:

1. **`role="region"`**: Exposes the element as a landmark region.
2. **`aria-label="Milestones list"`**: Provides a unique, descriptive accessible name. This name is distinct from the outer `<section>`'s name (`"Milestones"`) to satisfy `landmark-unique` rules.
3. **`tabIndex={0}`**: Places the container in the keyboard tab order so users can navigate to it and scroll via arrow keys.
4. **Visible Focus Ring**: Applies styled focus outlines (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2`) so visual keyboard users can track focus.

```tsx
<div
  role={milestones.length > 0 ? 'region' : undefined}
  aria-label={milestones.length > 0 ? 'Milestones list' : undefined}
  tabIndex={milestones.length > 0 ? 0 : undefined}
  className="... overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
>
```

### Design Rationale: Always Applying when List is Populated

Instead of dynamically measuring DOM sizes (e.g. `scrollHeight > clientHeight`) which requires layout execution, we always apply these properties when the list contains items. This guarantees:
1. **Hydration Consistency**: Identical SSR and client-side HTML output, preventing hydration errors and layout shifts.
2. **Deterministic JSDOM Testing**: JSDOM does not calculate visual rendering or scroll heights (metrics default to zero). Always applying the attributes when populated ensures unit tests and automated accessibility audits (e.g. `jest-axe`) can inspect and verify the accessibility tree.

---

## prefers-reduced-motion Support (WCAG 2.3.3 Animation from Interactions)

**Standard:** WCAG 2.3.3 — Motion from interactions can be disabled unless essential to functionality or information.

### Implementation

The application respects the `prefers-reduced-motion: reduce` media query to halt non-essential animations and transitions for users who have requested reduced motion via their OS or browser settings.

#### CSS Rules (src/app/globals.css)

A global `@media (prefers-reduced-motion: reduce)` block applies the following:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }

  .animate-spin {
    animation: none !important;
  }

  .animate-shimmer {
    animation: none !important;
    background-image: none !important;
  }
}
```

**Key behaviors:**
- All CSS animations are collapsed to near-instant (0.01ms) duration and run exactly once
- All CSS transitions snap instantly to their end state (0.01ms duration)
- Smooth scrolling is disabled (`scroll-behavior: auto`)
- Tailwind's `animate-spin` utility is explicitly halted (spinner becomes static)
- The shimmer skeleton animation is frozen (placeholder remains visible but static)

#### Component Implementation

**WalletConnectButton (src/components/WalletConnectButton.tsx)**
- The connecting spinner uses `animate-spin` unconditionally
- When `prefers-reduced-motion: reduce` is active, the CSS rule halts the rotation
- The SVG remains in the DOM and visible as a static loading indicator
- The "Connecting..." text label remains, ensuring the loading state is perceivable without motion

**ToastProvider (src/components/toast/toast-provider.tsx)**
- Toast panels and their dismiss button use the `transition` utility for hover/focus states
- The CSS rule collapses transition durations to 0.01ms, causing instant state changes
- The `transition` class is **not** stripped from the element — removing it would break themed hover/focus styles
- Toasts still render and are fully functional; they simply snap into view instead of animating

### Testing

Comprehensive tests in `src/components/__tests__/a11y.test.tsx` verify reduced-motion behavior:

| Test | Verification |
|------|---------------|
| `matchMedia returns true for the reduced-motion query` | Mock implementation correctly answers the query |
| `spinner SVG remains in the DOM while connecting` | Loading indicator stays visible (static circle) |
| `spinner SVG carries animate-spin class` | Class not stripped — CSS handles the halt |
| `WalletConnectButton has no axe violations under reduced motion` | Structural a11y maintained when motion is reduced |
| `success toast snaps into view with no axe violations` | Toast renders cleanly with instant transitions |
| `error toast snaps into view with no axe violations` | Error toasts also render cleanly |
| `dismiss button retains its transition class` | Class kept for theming; CSS handles duration collapse |
| `toast panel is present in the DOM immediately` | No deferred mount — instant snap behavior |

**Mock implementation:**
The tests use a `mockReducedMotion()` helper that replaces `window.matchMedia` with an implementation that returns `matches: true` only for `(prefers-reduced-motion: reduce)`, simulating a user who has enabled reduced motion in their system preferences.

### Design Philosophy

1. **CSS-first approach:** Motion is gated at the CSS level via media queries, not JavaScript conditionals. This ensures:
   - No layout shift or flash of animated content before JS executes
   - Respects system preferences immediately on page load
   - No additional runtime overhead or conditional rendering logic

2. **Static indicators remain:** Elements that serve as loading indicators (spinner SVG, shimmer skeleton) stay in the DOM and visible. Only the motion is halted, not the presence of the element itself. This ensures users can still perceive loading states without animation.

3. **Transitions snap, don't disappear:** CSS transition classes are retained; the media query collapses their duration. This preserves hover/focus styling that depends on the `transition` utility while eliminating the motion.

### Verification

To verify reduced-motion behavior:
1. Enable reduced motion in your OS (macOS: System Settings → Accessibility → Display → "Reduce motion"; Windows: Settings → Ease of Access → Display → "Show animations")
2. Navigate to the application
3. Trigger a wallet connection — the spinner should appear as a static circle, not rotating
4. Trigger a toast notification — it should appear instantly without slide/fade animation
5. Hover over interactive elements — state changes should be instant, not gradual

All automated tests pass with zero axe violations under reduced-motion conditions.

---

## Shared modal focus trap

Modal dialogs use the shared `useDialogFocusTrap` hook in
`src/hooks/useDialogFocusTrap.ts`. This hook contains the keyboard mechanism
originally used inline by `ConfirmDialog`, so dialog components do not create
slightly different focus-trap implementations.

The hook receives refs for the dialog container and its initial-focus target,
plus the dialog's Escape callback. While the dialog is open it:

1. Moves focus to the configured initial element.
2. Wraps `Tab` from the last enabled focusable element to the first.
3. Wraps `Shift+Tab` from the first enabled focusable element to the last.
4. Prevents the default Escape action and invokes the supplied close callback.
5. Optionally captures and restores the element that had focus immediately
   before the dialog opened.

`ConfirmDialog` now consumes this shared hook while continuing to let its
owning action component restore focus, preserving its existing public
behavior. `MilestoneCreationForm` enables the hook's `restoreFocus` option:
focus initially lands on the Title field, remains inside the modal while
tabbing, Escape calls `onCancel`, and every unmount/close path restores focus
to the button that opened the form.

Regression coverage lives in
`src/components/__tests__/MilestoneDialogFocus.test.tsx`. It covers initial
focus, forward and backward wrapping, Escape, Cancel and parent-controlled
closing, successful submission, a single enabled focus target, missing or
empty dialog containers, and repeated open/close cycles.

## Breadcrumbs — Nav Landmark, aria-current, and Focus Ring (issue #440)

**Component:** `src/components/Breadcrumbs.tsx`
**Test file:** `src/components/__tests__/Breadcrumbs.test.tsx`, plus two `jest-axe` states in `src/components/__tests__/a11y.test.tsx`

### What was already correct

Most of this issue's requirements were already implemented when the issue was
filed: the trail is wrapped in `<nav aria-label="Breadcrumb">` containing an
`<ol>`, the final crumb renders as non-interactive text with
`aria-current="page"` instead of a link, and the `/` separators between
crumbs are marked `aria-hidden="true"`. The one gap was the focus ring on
the ancestor `<Link>` crumbs.

### Problem found

The ancestor links used a hardcoded `focus-visible:outline-blue-500`
(Tailwind's fixed `blue-500`, `#3b82f6`) rather than the app's `--ring`
theme token. Two issues with that:

1. **Wrong color in light mode.** Light mode's own `--ring` token is
   `#2563eb`, not `blue-500`. The hardcoded class happened to render the
   *dark*-mode ring color even when the theme was light.
2. **Not theme-aware.** Every other focus-visible ring in this codebase that
   follows the current convention (`MilestonesList.tsx`,
   `toast-provider.tsx`, `SettingsPanel.tsx`) uses
   `focus-visible:ring-[var(--ring)]` so the color swaps with
   `[data-theme='dark']`. The hardcoded class didn't, so it was already
   inconsistent with the rest of the app even before considering contrast.

### Fix

Replaced the hardcoded outline with the same pattern used elsewhere:

```tsx
className="... rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
```

### Contrast verification

Breadcrumbs are only mounted on the contract detail page
(`src/app/contracts/[id]/page.tsx`), inside a card with a **hardcoded
`bg-white`** container that does not vary with `[data-theme]`. That matters
for this specific check: the ring's *color* is theme-aware (`--ring` swaps
value), but the *background it's drawn against* does not swap, so both
themes' ring colors were checked against the same white card rather than
against `--background`.

| Theme | `--ring` value | Rendered against | Ratio |
|---|---|---|---|
| Light | `#2563eb` | white card (`#ffffff`) | 5.17:1 ✅ |
| Dark | `#3b82f6` | white card (`#ffffff`) — card itself isn't theme-aware | 3.68:1 ✅ |

Both clear the WCAG 2.1 non-text contrast minimum of 3:1 (SC 1.4.11), computed
with the same relative-luminance method used elsewhere in this document.
Dark mode has noticeably less headroom (3.68:1 vs. a 3:1 floor) than light
mode, entirely because the card background doesn't adapt to the theme —
flagging this since it's the kind of narrow-margin pairing this document
has previously called out as worth tracking. Making the contract-detail
card itself theme-aware is a separate, larger change (it touches the whole
page, not just this component) and is out of scope for this issue.

### Testing

- `Breadcrumbs.test.tsx` — structure/ARIA (nav landmark, `<ol>`, one `<li>`
  per crumb), link generation, `aria-current` placement, separator
  `aria-hidden`, dynamic labels, and three new focus-ring assertions: the
  token classes are present on every ancestor link, and the old
  `outline-blue-500` class is confirmed absent (regression guard).
- `a11y.test.tsx` — `jest-axe` audit for a single-crumb trail and a
  three-crumb trail with a current page, both zero violations.

---

## Milestones — Reduced-Motion & High-Contrast Support (issue #755)

**Standard:** WCAG 2.1 AA & WCAG 2.3.3 — Animation from Interactions & High Contrast Legibility.

### Implementation Details

1. **Reduced Motion (`prefers-reduced-motion: reduce`)**:
   - Explicitly halts `.animate-pulse` keyframe animation so skeleton components (`MilestonesListSkeleton`, `ContractProgressSkeleton`) render as static placeholder blocks without continuous movement.
   - Collapses all CSS transitions (`ContractProgress` fill width, `MilestonesList` banner actions, filter pill toggles) to near-instant 0.01ms duration so state updates snap into place immediately without motion.

2. **High-Contrast / Forced-Colors Mode (`@media (forced-colors: active)`)**:
   - `[role="progressbar"]`: Enforces a `1px solid CanvasText` border around the track and sets the indicator fill to `background-color: Highlight !important` with `forced-color-adjust: none`, keeping the completion bar visible when system colors are overridden.
   - Status badge pills (`.status-badge`) and summary list items (`[role="listitem"]`): Applies `1px solid CanvasText` borders to ensure badges remain distinct chips.
   - Filter options (`fieldset label`): Enforces high-contrast borders and applies `Highlight` background and `HighlightText` color to selected radio labels.

### Testing & Verification

- Tested in `src/components/__tests__/a11y.test.tsx` under `a11y: prefers-reduced-motion — milestones` and `a11y: forced-colors / high contrast — milestones`.
- Confirmed zero `jest-axe` violations across all states.

