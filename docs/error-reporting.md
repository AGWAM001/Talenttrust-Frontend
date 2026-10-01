# Error Reporting Abstraction and Validation Boundaries

This project implements a pluggable, SSR-safe error reporting abstraction designed to unify error catching across UI components and route boundaries.

## Architecture

The abstraction resides in `src/lib/errorReporter.ts` and provides standard interfaces for reporting errors and injecting custom reporters (e.g. Sentry, Rollbar, LogRocket, or custom internal dashboards).

The `src/app/error.tsx` route boundary additionally defines explicit validation boundaries for the `error` and `reset` inputs it receives from Next.js, so that malformed, duplicate, or boundary-case values cannot cause silent data loss or inconsistent state.

### API Reference

#### Types

```typescript
type ErrorReporter = (error: unknown, context: string) => void;
```

#### Functions

* **`reportError(error: unknown, context: string): void`**
  Reports an error captured in a React/Next.js boundary.
  
* **`setErrorReporter(reporter: ErrorReporter | null): void`**
  Injects a custom error reporter. Pass `null` to reset behavior back to the default reporter.

---

## Validation Boundaries for `src/app/error.tsx`

The Next.js page error boundary receives two inputs: `error` (unknown) and `reset` (a function). The boundary enforces the following invariants before any side effect (reporting, rendering, or reset dispatch) occurs.

### Accepted input

* `error` is any non-null value. `Error` instances and plain objects are normalized to a stable shape before reporting.
* `reset` is a function with arity 0. It is only invoked from the user-triggered retry handler.

### Rejected input

* `error === null` or `error === undefined`: the boundary substitutes a synthetic `Error('Unknown error')` so downstream reporters never receive a nullish value.
* `typeof reset !== 'function'`: the retry control is not rendered, preventing a runtime `TypeError` on click.

### Duplicate submissions

* `reportError` is invoked at most once per mounted boundary instance. A `useRef` guard (`hasReportedRef`) ensures React StrictMode double-invocation, Fast Refresh, and re-renders do not emit duplicate reports.
* The retry handler is idempotent: concurrent or repeated clicks while a reset is in flight are ignored via a `isResettingRef` latch that is cleared in a `finally` block.

### Boundary values

* Empty-string `error.message` is preserved as-is; it is not treated as missing.
* Non-`Error` throwables (strings, numbers, `null` prototypes) are wrapped with `String(error)` in the message and the original value attached as `cause`.
* `reset` throwing synchronously is caught and reported with context `'Error Boundary Reset'`; the boundary remains mounted so the user can retry again.

### Invariants

1. Reporting is side-effect free with respect to React state; it never triggers a re-render loop.
2. No sensitive fields from `error` are logged in production; only `name`, `message`, and `context` are forwarded.
3. State transitions (`idle -> reporting -> reported`, `idle -> resetting -> idle`) are monotonic and cannot regress under concurrent execution.

### Observability

* Every rejection path emits a `reportError(..., 'Error Boundary Validation')` call so failures are diagnosable.
* Duplicate suppression is silent by design; it is observable via the absence of repeated reporter invocations in tests.

---

## Default Behavior

The default error reporter adapts automatically to the environment:

1. **Development/Test (`process.env.NODE_ENV !== 'production'`)**:
   Errors are output directly to `console.error` with a prefix: `[Context] error`.
2. **Production (`process.env.NODE_ENV === 'production'`)**:
   Reports are completely suppressed (no-op) to avoid polluting logs or console outputs in production.

---

## Integration in Codebase

The abstraction is already integrated into core boundaries:

* **`src/components/SafeBoundary.tsx`**: Triggers `reportError(error, 'SafeBoundary')` on component catch.
* **`src/app/error.tsx`**: Triggers `reportError(error, 'Error Boundary')` in the Next.js page error boundary.
  * Validation boundaries described above are enforced before this call.
  * Duplicate reports are suppressed per mounted instance.
* **`src/app/global-error.tsx`**: Triggers `reportError(error, 'Global Error Boundary')` in the Next.js global root boundary.

---

## Injecting a Custom Reporter

You can configure a custom error reporting service by importing `setErrorReporter` at the application's entry point (e.g. in your main layout or initialization logic):

```typescript
import { setErrorReporter } from '@/lib/errorReporter';

setErrorReporter((error, context) => {
  // Example: Forward to external telemetry/Sentry
  Sentry.captureException(error, {
    extra: { context }
  });
});
```

---

## Testing

Focused tests for `src/app/error.tsx` cover accepted input, rejected input (`null`/`undefined` error, non-function `reset`), duplicate submissions (StrictMode double-invoke and repeated retry clicks), and boundary values (empty message, non-`Error` throwables, throwing `reset`). Regression tests assert that existing callers of `reportError` and `setErrorReporter` remain compatible and that the default reporter behavior is unchanged.
