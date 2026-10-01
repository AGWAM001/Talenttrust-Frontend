# Reputation page recovery

The page reads a complete, validated local history snapshot before replacing
its displayed profile. The existing default score/level and named
`ReputationPageContent` export are unchanged. Existing repository APIs retain
their legacy empty-array fallback; the page uses the additive, synchronous
`readReputationHistory` helper so failures can be distinguished from valid
empty history.

Missing storage and legacy snapshots without `reputationEvents` are valid empty
history. Corrupt JSON, invalid event fields, duplicate event IDs and invalid
versions reject the whole snapshot. IDs, types and summaries must be nonempty
strings; dates must be parseable; optional versions must be positive safe
integers. Previously stored events without a version remain supported. Invalid
records are never silently dropped or automatically repaired.

Initial failures show an accessible error and a retry button. Refresh failures
retain the last successful profile and keep its child components mounted,
preserving their in-memory state. Successful retries replace history only
after complete validation. Loading disables the control, and a synchronous
request lock also suppresses duplicate clicks before React commits that state.
Unmount/StrictMode cleanup invalidates the old request; an obsolete completion
cannot replace a current snapshot, release its lock or report an old error.

Reads, failures and retries never write or delete persisted data. For denied
storage access, restore browser storage access and retry. For invalid saved
history, repair the invalid saved records or restore a known-good backup before
retrying; the page intentionally does not clear it.
Refresh/retry is read-only and introduces no network or authorization changes.

Failure reports use `ReputationPage.load` and the bounded reason
`storage-unavailable`, `invalid-data` or `read-failed`. Raw storage exceptions,
JSON parsing messages and persisted history are not passed to the reporter or
shown to users. The existing render error boundary permits retrying child
rendering while the page retains its successful snapshot.
