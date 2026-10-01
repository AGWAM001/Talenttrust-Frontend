# Harden concurrent focus scheduling in reputation loading state

Closes #1242

## Summary

This change hardens the reputation page loading and loaded states against duplicate or concurrent mount effects that could schedule multiple stale focus timers. Under React StrictMode or rapid re-renders, the previous implementation could queue multiple `setTimeout` callbacks, allowing a stale timer to steal focus after the page state had already changed. This created a race-prone loading experience and could lead to inconsistent focus behavior.

It also resolves the CI regressions that surfaced while validating the branch: a TypeScript state mismatch in `MilestonesErrorBoundary`, a nullable-element issue in `useDialogFocusTrap`, a snapshot drift caused by the dialog’s intentional `tabIndex={-1}` focus trap behavior, and a security audit failure caused by outdated dependency versions.

## What changed

- Added a single-flight guard to the reputation loading client.
- Added the same guard to the loaded reputation page client.
- Cleared stale focus timers before scheduling a new one.
- Invalidated older pending focus requests so only the latest request can complete.
- Added regression tests covering duplicate StrictMode mount behavior.
- Fixed the TypeScript build errors in the milestones error boundary and dialog focus trap.
- Updated the affected milestone form snapshot to reflect the intentional focus-trap dialog behavior.
- Upgraded the vulnerable `next` and `sharp` dependency ranges to the patched versions required by the security advisories.

## Files changed

- `src/app/reputation/ReputationLoadingClient.tsx`
- `src/app/reputation/ReputationPageClient.tsx`
- `src/app/reputation/__tests__/ReputationLoadingClient.test.tsx`
- `src/app/reputation/__tests__/ReputationPageClient.test.tsx`
- `src/components/milestones/MilestonesErrorBoundary.tsx`
- `src/hooks/useDialogFocusTrap.ts`
- `src/components/milestones/MilestoneCreationForm.tsx`
- `src/components/milestones/__snapshots__/MilestoneCreationForm.test.tsx.snap`
- `package.json`
- `package-lock.json`

## Behavior and invariants

- Only the latest focus request is allowed to focus the main page area.
- Stale timers are canceled and ignored if they are superseded.
- Cleanup remains safe during unmount.
- Existing public interfaces remain unchanged.
- No sensitive data is exposed; the fix is purely state and timing hardening.
- Dialog focus behavior remains predictable and keyboard-safe.
- Dependency versions now satisfy the patched security requirements.

## Failure mode handling

- Duplicate timers are no longer allowed to win.
- StrictMode double-invocation no longer produces a stale focus race.
- Unmount cleanup clears pending focus timers to avoid phantom updates.
- TypeScript build issues are resolved before merge, preventing CI breakage.
- Security advisories are cleared by bumping the vulnerable packages to patched releases.

## Validation

I validated the exact regression/fix path with:

```bash
npm test -- --runTestsByPath src/app/reputation/__tests__/ReputationLoadingClient.test.tsx src/app/reputation/__tests__/ReputationPageClient.test.tsx src/components/milestones/MilestoneCreationForm.test.tsx --runInBand
npm run build
npm audit --omit=dev --json
```

### Result

- 3 test suites passed
- 34 tests passed
- 2 snapshots passed
- production build passed
- security audit no longer reports the critical/High Next.js advisories that failed the workflow
