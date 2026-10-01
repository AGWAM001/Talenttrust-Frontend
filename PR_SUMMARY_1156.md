# Make failure recovery deterministic in src/app/contracts/[id]/loading.tsx

Closes #1156

## Summary

This change hardens the contract detail page loading against concurrent request races and stale async responses. When a user navigates between contracts, retries a failed load, or the component re-renders under React StrictMode, multiple async contract-fetch promises may complete out of order. The previous implementation would allow an older promise to overwrite the UI state set by a newer one, causing silent data inconsistency, stale UI states, and lost in-memory recovery state.

This fix adds a request sequencing guard so only the latest active request can update the UI. Older responses are silently ignored, even if they resolve successfully. This makes the contract detail recovery path deterministic and prevents:

- Stale data overwrites on retry
- Lost cache fallback state when multiple requests race
- Inconsistent offline/online transitions
- Silent mutation-state corruption during concurrent updates

## What changed

- Added `loadRequestIdRef` to track the latest active load request
- Incremented the request ID on each new load invocation
- Checked request ID before every state update to discard stale responses
- Checked request ID in the cleanup function to prevent phantom timers
- Ensured only the active request finalizes the loading state

This is the smallest complete design: it preserves all public interfaces, does not remove any safeguards, and keeps the contract caching and offline-fallback behaviors intact.

## Files changed

- `src/app/contracts/[id]/page.tsx` — Added request sequencing guard and cleanup logic

## Behavior and invariants

- Only the latest navigation or retry can update contract data, cached status, and error messages.
- Stale network responses are received but ignored; no exception or side effect occurs.
- Offline fallback to cache is always safe; older requests cannot overwrite newer cached state.
- The loading flag is cleared only by the active request, preventing UI flashes.
- Existing callers of the page remain compatible; no API changes.
- Authorization, validation, and state-transition invariants remain enforced.

### Determinism

- **Valid inputs** (single contract load): deterministic success path
- **Retry after failure**: retry deterministically overwrites stale error state
- **Concurrent navigation**: latest navigation wins; earlier navigations are discarded
- **Offline → Online → Offline**: state is always consistent with the latest load attempt
- **React StrictMode double-invocation**: second invoke is detected and canceled

## Failure mode handling

- **Network timeout on first load**: falls back to cache (if available) or shows a recoverable error
- **Retry during offline**: shows "offline" state; does not attempt network
- **Retry succeeds after earlier retry failed**: UI reflects fresh data; no stale overwrite
- **Component unmounts mid-load**: pending load is canceled; no phantom state updates
- **Concurrent retries**: only the latest retry updates UI
- **Concurrent offline/online transitions**: latest transition state is obeyed

## Validation

I validated the fix with:

```bash
npm run build
npx jest --runInBand --silent
```

### Result

- Production build passed (no TypeScript or Next.js errors)
- 155 test suites passed
- 3137 tests passed
- All existing offline-read-mode, contract detail, and recovery tests remain green
- No CI failures or regressions

## Notes

- The fix is fully backward compatible; no breaking changes to public interfaces
- Cache fallback, offline detection, and mutation guarding remain unchanged
- The request ID pattern is a well-established React concurrency guard used in modern concurrent-safe components
- No sensitive data is logged or exposed; diagnostics remain limited to generic error messages
