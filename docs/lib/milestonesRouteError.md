# `milestonesRouteError` — sanitized route-failure metadata

Log-safe metadata for the `/milestones` route error boundary.

**Module:** [`src/lib/milestonesRouteError.ts`](../../src/lib/milestonesRouteError.ts)
**Consumer:** [`src/hooks/useMilestonesRouteError.ts`](../../src/hooks/useMilestonesRouteError.ts)

## Why this exists

Route failures are reported through the shared `reportError` seam. If that
metadata is built ad hoc from the thrown value, a crash can copy an error
message, stack, or custom property straight into telemetry and leak internals.
This module makes the safe subset explicit, bounded, and testable.

## Exports

| Export | Purpose |
| --- | --- |
| `MILESTONES_ROUTE_ERROR_CODE` | `'MILESTONES_ROUTE_FAILED'` — stable public code. |
| `MAX_ERROR_NAME_LENGTH` | Cap (`64`) applied to the error `name`. |
| `MilestonesRouteErrorMeta` | `{ code, name, digest? }` (index-signature compatible with `reportError`). |
| `buildMilestonesRouteErrorMeta(error, digest?)` | Pure, total, frozen metadata builder. |

## Invariants

1. **Only safe fields.** The result contains a public `code`, the error
   constructor `name` (e.g. `Error`, `TypeError`), and an optional Next.js
   `digest`. The `message`, `stack`, and any custom properties are never copied.
2. **Total.** Any `unknown` is accepted — `null`, primitives, plain objects, and
   `Error` subclasses with hostile `name` getters. It never throws.
3. **Validated & bounded.** `name` is trimmed and clamped to
   `MAX_ERROR_NAME_LENGTH`; `digest` is accepted only if it matches a
   conservative token pattern (`[A-Za-z0-9_-]{1,128}`) and is otherwise omitted.
4. **Deterministic.** Identical input yields structurally identical, frozen
   output.

## Tests

[`src/lib/milestonesRouteError.test.ts`](../../src/lib/milestonesRouteError.test.ts)
covers the success path (name/digest), rejection of malformed digests and
non-error values, boundary cases (over-long names, hostile getters, blank
names), no message/stack/custom-property leakage, immutability, and
determinism.
