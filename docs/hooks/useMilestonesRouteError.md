# `useMilestonesRouteError`

Recovery + reporting state machine for the `/milestones` route error boundary
([`src/app/milestones/error.tsx`](../../src/app/milestones/error.tsx)).

**Module:** [`src/hooks/useMilestonesRouteError.ts`](../../src/hooks/useMilestonesRouteError.ts)
**Consumer:** [`src/app/milestones/error.tsx`](../../src/app/milestones/error.tsx)

## Why this exists

Next.js hands a route error boundary an `error` and a `reset()` callback. Naive
wiring (`useEffect(() => reportError(error), [error])` plus `onClick={reset}`)
violates several invariants:

- a re-render that changes the `error` reference can emit **duplicate telemetry**;
- rapid clicks can issue **overlapping resets**;
- a `reset()` that throws **re-crashes the boundary** and can strand the user;
- reporting the raw error can **leak messages/stacks** into logs.

The hook owns the state machine that prevents all four.

## API

```ts
function useMilestonesRouteError(
  error: unknown,
  reset: () => void,
  digest?: unknown,
): {
  status: 'idle' | 'recovering' | 'failed';
  isRetryDisabled: boolean;
  recoveryNotice: string | null;
  handleRetry: () => void;
};
```

## Invariants

1. **Report once per distinct failure.** A failure is identified by its `digest`
   when present (a stable digest suppresses duplicates even if the boundary
   hands over a fresh error object), otherwise by error object identity. A new
   identity/digest re-arms recovery and reports again.
2. **Single-flight reset.** `handleRetry` is guarded synchronously, so repeated
   activations in the same event loop cannot overlap. A short cooldown
   (`MILESTONES_RETRY_COOLDOWN_MS`) keeps the guard effective across ticks, then
   re-arms so a persistent failure stays recoverable rather than locking the
   user out.
3. **Throwing `reset` degrades gracefully.** The call is wrapped; on throw the
   hook reports with a phase-tagged, sanitized payload, shows a safe notice
   (`MILESTONES_RESET_FAILURE_NOTICE`), and re-arms immediately for another try.
4. **No sensitive leakage.** Reported metadata always comes from
   [`buildMilestonesRouteErrorMeta`](../lib/milestonesRouteError.md) — a public
   code, the error `name`, and a validated `digest` only. Messages, stacks, and
   custom properties are never copied.
5. **Clean teardown.** A pending cooldown timer is cleared on unmount and when a
   new failure arrives, so no state updates outlive the boundary.

## Observability contract

| Report | Context | Level | Metadata |
| --- | --- | --- | --- |
| Caught route failure | `Milestones page` | `error` | `{ code: 'MILESTONES_ROUTE_FAILED', name, digest? }` |
| Reset failure | `Milestones page` | `error` | `{ code, name, digest?, phase: 'reset' }` |

`code` is stable across minification; `name`/`digest` are length-clamped and
pattern-validated. The reporter still receives the original error as its first
argument, consistent with the rest of the app; the metadata channel is the
safe, structured one.

## Tests

- [`src/hooks/__tests__/useMilestonesRouteError.test.ts`](../../src/hooks/__tests__/useMilestonesRouteError.test.ts)
  — mount reporting, identity/digest de-duplication, re-arm on new failure,
  single-flight reset, cooldown re-arm, throwing/non-function reset handling,
  no-leak assertion, and timer cleanup on unmount.
- [`src/app/milestones/__tests__/route-states.test.tsx`](../../src/app/milestones/__tests__/route-states.test.tsx)
  — end-to-end wiring: recoverable error state, one reset for rapid activation,
  `aria-disabled` during recovery, and graceful degradation when `reset` throws.
