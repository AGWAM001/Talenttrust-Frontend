# Milestones board resilience

The milestones board is a client-rendered surface backed by browser storage.
It has two particularly visible transient states: the short period before the
client data is ready, and a render failure in one of the board's components.
This document records the resilience contract introduced for issue #1105.

## User contract

Users should get a stable board shape while the route is loading. The loading
state must not look like an empty board, and it must not cause the page heading
or the first card to move when content replaces it.

If an independent board section fails, the rest of the board remains usable.
The failed section presents a plain-language message and a `Try again` action.
The browser error itself is never copied into the UI because messages can
contain implementation details, request data, or credentials from a faulty
dependency.

The retry action resets only the boundary that owns the failure. It does not
reload the document, reset the filter selection, or remove healthy siblings.

## Component map

There are three layers to the implementation:

| Layer | Component | Responsibility |
| --- | --- | --- |
| Route | `app/milestones/loading.tsx` | Supplies the App Router loading state. |
| Shared shell | `MilestonesBoardSkeleton` | Owns the loading geometry and one live announcement. |
| Isolation | `MilestonesErrorBoundary` | Catches, reports, and retries one board subtree. |

The route loading component imports the shared shell rather than maintaining a
second copy of its markup. The page's client-side `Suspense` fallback uses the
same shell. This prevents the route transition and an in-page suspension from
drifting apart over time.

## Loading shell

`MilestonesBoardSkeleton` reserves the following regions:

1. A heading block with the same margin and approximate text width as the page
   heading.
2. Five filter pills in the same wrapping container as `MilestoneFilter`.
3. Two action controls with the same minimum height as the resolved buttons.
4. The existing list shell with three representative milestone cards.

The shell uses `aria-busy="true"` on its board root. A single visually hidden
`role="status"` node announces `Loading milestones…` with polite priority.
Every shimmer block is `aria-hidden="true"`, so screen readers do not count
decorative rectangles as content or controls.

The list skeleton preserves the existing rounded card borders, internal
padding, title line, metadata line, and footer row. The exact data cannot be
known while loading, but these dimensions are sufficient to keep the first
paint visually aligned with the resolved list. `min-h-[42px]` on the toolbar
and its action controls prevents the most noticeable vertical shift when the
buttons mount.

Animation is decorative. The existing reduced-motion utilities remain on all
new shimmer blocks so users who request reduced motion do not receive a
continuously animated loading indicator.

## Error isolation

The page has one boundary around each independent surface:

| Boundary label | Protected surface | Healthy siblings preserved |
| --- | --- | --- |
| `filters` | Status filter controls | Actions and milestone list |
| `actions` | Sort, calendar, and add controls | Filters and milestone list |
| `milestone list` | Empty state or `MilestonesList` | Filters and actions |

The outer page `SafeBoundary` remains as the last-resort page boundary. The
new local boundaries are intentionally narrower. A local render problem should
not escalate to the full-page fallback, while an error outside these board
seams still has the existing global protection.

React error boundaries catch descendant render errors and lifecycle errors.
They do not catch event-handler errors or asynchronous callback errors. Those
paths continue to use the repository's existing toast and error handling. The
boundary is therefore a containment mechanism, not a replacement for normal
operation-level error handling.

## Retry behavior

The boundary stores only `hasError` and a private retry counter. Clicking
`Try again` clears the error state and increments the counter. The children
are rendered inside a keyed fragment, so React gives the recovered subtree a
fresh mount. This is important for sections that read data or initialize
subscriptions during mount.

The retry button is a real button with `type="button"`, a visible focus style,
and `autoFocus` when the fallback appears. The fallback has `role="alert"`,
`aria-live="assertive"`, and `aria-atomic="true"`, so both visual and
assistive-technology users learn that the section needs attention.

When a custom `fallback` is supplied, it remains the complete responsibility
of the caller. This escape hatch is useful for a composition that needs a
different layout, but callers must provide their own retry control if they
want recovery.

## Structured error reporting

Every caught render error is reported through the existing `reportError` seam:

```text
context: MilestonesErrorBoundary
level:   error
code:    MILESTONES_SECTION_FAILED
section: filters | actions | milestone list | milestones
```

The report also contains React's component stack when available. `code` is a
stable machine-readable value for dashboards and alert rules. `section` is a
static label selected by the page composition, not a value derived from the
thrown exception.

The original error remains available to the reporter for diagnostics, but its
message is not rendered. This keeps the UI safe from stack traces, storage
keys, URLs, user data, and accidental secrets. The reporter implementation can
apply the application's existing redaction and transport policy.

The boundary deliberately does not invent a second logger. Using
`reportError` means test and production integrations can replace the reporter
without changing the board UI, and it keeps observability consistent with the
route-level `error.tsx`.

## Test coverage

The resilience tests are split by responsibility:

### Unit tests

`MilestonesErrorBoundary.test.tsx` verifies:

- healthy children pass through;
- a thrown descendant becomes an accessible alert;
- the fallback has an assertive live region and a focused retry button;
- raw internal messages are absent;
- a custom fallback is respected;
- retry remounts a recovered child;
- retrying a persistent failure keeps the fallback;
- `onError` receives React error information;
- `reportError` receives the stable code, safe section, level, and stack.

`MilestonesBoardSkeleton.test.tsx` verifies:

- the board is busy;
- one polite loading announcement is present;
- visual blocks are hidden from assistive technology;
- the list still contains representative card shells;
- toolbar minimum-height hooks exist for the no-shift contract.

### Integration tests

`src/app/milestones/__tests__/resilience.test.tsx` renders the actual page
composition with controlled filter and list probes. It proves that:

- the loading shell can be followed by resolved board content;
- a filter failure leaves actions and the list available;
- a list failure leaves filters and actions available;
- retrying the list boundary recovers that list without losing the filter.

The probes throw from render, which exercises the same React boundary path as
a real child component. The test also asserts that internal error text never
reaches the document.

The existing route-state tests continue to cover the loading route and the
route-level error screen. Existing page and accessibility suites remain the
regression safety net for the resolved board.

## Design decisions

### Why one shared skeleton?

Maintaining a route fallback and a client fallback separately makes it easy
for one to acquire a new control or a different spacing value. A single
component makes geometry a deliberate shared contract.

### Why not wrap the whole page only once?

A single boundary would satisfy recovery only by sacrificing the healthy parts
of the board. Filters and list rendering have different dependencies and user
value, so their failure domains should be independent.

### Why keep `SafeBoundary`?

The local boundaries cover known board seams. `SafeBoundary` still protects
unexpected failures elsewhere in `MilestonesContent` and preserves the page's
existing safety net. This is defense in depth, not duplicate fallback UI for
the normal local failures.

### Why use a stable code instead of an error class?

The thrown value can originate in a third-party component or browser API and
does not reliably have a useful class. A stable string code is serializable,
easy to query, and independent of minification. The original value is still
passed to the reporter for local diagnostics.

### Why avoid a visible error detail toggle?

The issue asks for no leaked internals. A toggle still places sensitive data in
the DOM and creates a second interaction to test. Support diagnostics belong in
the protected reporter channel, not in a public board fallback.

## Manual verification checklist

Use this checklist when changing the board layout or boundary composition:

- Navigate to `/milestones` with an empty storage repository and observe the
  loading shell before content appears.
- Confirm that the heading, toolbar, and first list card do not jump during the
  swap in a throttled browser session.
- Enable a screen reader and confirm that loading is announced once politely.
- Trigger a filter render failure in development and verify the action controls
  and list remain usable.
- Trigger a list render failure and verify the filters remain usable.
- Activate `Try again` with a keyboard and confirm focus lands on the button.
- Resolve the fault and activate retry; verify only the failed subtree returns.
- Confirm that a thrown message, URL, storage key, or stack trace is absent
  from the fallback DOM.
- Test with `prefers-reduced-motion: reduce` and confirm shimmer animation is
  disabled.
- Test narrow and wide viewports so the toolbar's reserved height remains
  stable when controls wrap.

## Maintenance notes

When adding a new independent board region, decide whether it should have its
own boundary. A region deserves a separate boundary when it can fail without
making its siblings unusable and when a short static section label can explain
the fallback.

If a new skeleton block is added, update the resolved component and the shared
shell together. Prefer matching a real element's minimum height and padding
over adding arbitrary whitespace. Keep decorative content hidden and retain a
single status announcement.

If a section label changes, treat it as an observability schema change. Update
the boundary integration test, any dashboard query, and this component map.
Keep the stable error code unchanged unless the meaning of the failure changes.

If the error reporter gains a new required field, add it to the boundary's
structured metadata and its unit test. Do not reintroduce thrown error text to
the fallback while doing so.

## Verification commands

The expected local commands for this feature are:

```bash
npm run lint
npm test -- --runInBand \
  src/components/milestones/__tests__/MilestonesErrorBoundary.test.tsx \
  src/components/milestones/__tests__/MilestonesBoardSkeleton.test.tsx \
  src/app/milestones/__tests__/resilience.test.tsx \
  src/app/milestones/__tests__/route-states.test.tsx
npm test -- --runInBand
npm run build
```

The focused command is useful during iteration because it exercises the
boundary, skeleton, and route seams directly. The full test and build commands
remain the acceptance gate and should be run before merging.
