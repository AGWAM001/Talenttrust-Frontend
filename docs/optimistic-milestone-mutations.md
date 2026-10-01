# Optimistic milestone mutations

Issue #1097 makes milestone edits feel immediate while preserving the
repository as the source of truth. The behavior is shared by the milestones
page and contract detail page through
`useOptimisticMilestoneMutation`.

## Mutation lifecycle

Each create, update, or delete follows the same sequence:

1. Capture the current list as a rollback snapshot.
2. Update the local list synchronously, before persistence returns.
3. Persist through the repository's version-aware operation.
4. Reconcile the successful object with its canonical version.
5. Restore the exact prior list on failure and return a typed failure code.

The hook keeps an internal ref synchronized with queued state updates. This is
important for rapid edits: React may batch multiple event handlers before a
render, so the second patch must be based on the first optimistic object rather
than the last committed prop value.

## Version and stale-write behavior

Updates read the stored milestone version before writing. The repository
rejects an incoming version older than the stored version and returns a stable
stale result. The hook maps that result to `STALE_VERSION`, restores the local
snapshot, and provides a retry-safe message without exposing storage details.

Successful updates write the incremented version back into local state. A
successful create receives version one. The canonical reconciliation is a
separate state write after persistence, so the UI cannot remain on an
unversioned optimistic object.

The hook does not merge server conflicts or queue offline writes. Those are
explicitly outside this issue. A stale result is surfaced so the user can
reload and intentionally resolve the conflict.

## Typed outcomes

`OptimisticResult` uses a discriminated `ok` field. Failed operations also
carry one of these stable codes:

| Code                      | Meaning                                  | UI behavior                   |
| ------------------------- | ---------------------------------------- | ----------------------------- |
| `STALE_VERSION`           | Another session wrote a newer object     | Roll back and request reload  |
| `PERSISTENCE_FAILED`      | Repository could not save the mutation   | Roll back and offer retry     |
| `MILESTONE_NOT_FOUND`     | Update target is absent from local state | Keep list unchanged           |
| `DELETE_TARGET_NOT_FOUND` | Delete found no matching records         | Restore list and offer reload |

The pages translate these results into existing toast messages. The row only
announces a successful save when its callback does not explicitly return
`false`; this prevents an error from being announced as a success. Failure
messages use the existing polite live region and remain accessible to screen
readers.

## Unrelated updates and immutability

Optimistic state updates create new arrays and only replace the targeted
milestone. Untouched milestone objects retain their identity. Rollback restores
the pre-mutation array exactly, including fields that were not displayed in the
board. This protects unrelated changes from accidental field loss and makes a
failed edit visually indistinguishable from the pre-edit state.

The ref-based queue handling is deliberately local to the hook. Parent-owned
state remains the public source of truth, and a later parent refresh replaces
the ref before the next mutation. No global store or cross-contract conflict
merging is introduced.

## Test coverage

Unit tests cover immediate create/update/delete state writes, canonical version
reconciliation, exact rollback, stale failures, typed error codes, missing
targets, immutability, and two rapid edits before a render. Existing component
tests cover the polite live-region structure and inline edit behavior.

The focused hook test command is:

```text
npm test -- --runInBand src/hooks/__tests__/useOptimisticMilestoneMutation.test.ts
```

The full application test, lint, and build commands remain the final CI gate.
This change deliberately keeps server conflict merging and offline queueing out
of the client mutation contract.
