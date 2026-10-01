# Offline Milestones

TalentTrust is a fully client-side app: milestone data is persisted in `localStorage` via `src/lib/repository.ts` (there is no backend). The `/milestones` route supports working while the browser is **offline** by deferring mutations to a persistent queue that flushes automatically on reconnect.

This document explains the offline behavior, the queue, conflict handling, and how error codes map to the safe, user-facing messages shown to users.

---

## Behaviour overview

- **Online** → a milestone mutation (`create` / `update` / `delete` / `status`) is applied immediately to the repository, exactly as before this feature existed.
- **Offline** → the mutation is captured into a **persistent queue** (backed by `safeStorage`); the authoritative store is left untouched. The optimistic change is kept locally so the board still reflects the user's intent.
- **Reconnect** → the queue is flushed to the store **in the exact order it was recorded**, and the page re-reads authoritative repository state.

The `window.online` event and the mount are the two triggers that flush+reconcile. A module-level flush lock guarantees only one flush runs at a time, so a burst of `online` events never replays a mutation twice.

---

## Architecture

```
page.tsx
  │  useOfflineMilestones(onReconcile)
  │    ├── useOnlineStatus()          → isOnline boolean
  │    └── mutate(mutation)           → online ? applyImmediate : enqueue
  └── useOfflineMilestones → coordinator (offlineMilestoneCoordinator.ts)
         ├── applyImmediate()         online path → write straight to repository
         ├── enqueue()                offline path → offlineMilestoneQueue.enqueueMutation()
         └── flushPending()           reconnect → offlineMilestoneQueue.flushQueue()
                                        + returns reconciled flag for page to re-read
```

### Files

| File | Role |
|------|------|
| `src/lib/offlineMilestoneQueue.ts` | Persistent mutation queue: persistence, replay, flush lock, error normalization |
| `src/lib/offlineMilestoneCoordinator.ts` | Connectivity decision seam the page calls (online/offline/reconnect) |
| `src/hooks/useOfflineMilestones.ts` | React hook wiring `useOnlineStatus` to the coordinator and the page |
| `src/hooks/useOnlineStatus.ts` | Shared, hydration-safe browser online/offline detection |

---

## The queue

Every queued mutation carries a stable `id` generated at enqueue time (`createMutationId()` → `crypto.randomUUID` with a fallback).

Because `MilestoneCreationForm` derives milestone `id`s from title + timestamp, `create` is made **idempotent on replay**: it first checks whether a milestone with that id already exists before writing, eliminating duplicate creates if a flush was interrupted between applying a write and persisting its removal.

**Removal ordering:** a mutation is removed from the persistent queue *only after* its repository write succeeds. A crash mid-flush can therefore never cause a mutation to be lost or applied twice.

The queue is capped at `MAX_QUEUED_MUTATIONS` (200). Beyond that, enqueues are rejected with a stable persistence error.

---

## Conflict handling

Replaying an `update` goes through `upsertMilestone`'s version guard. If the authoritative store holds a *newer* version than the one the offline edit was based on (`baseVersion`), the write is rejected as stale. That becomes a **`MUTATION_CONFLICT`** error and is surfaced to the user — the mutation **stays in the queue** so it is never silently dropped.

When a mutation fails during replay, processing stops there (later mutations may depend on it, so ordering is preserved). The failed mutation remains queued and is reported via the flush result's `failed` errors.

---

## Error codes → user messages

Failures are normalized into `MilestoneMutationError` objects with a stable `code` and a `retryable` flag. UI callers map codes to safe, user-facing messages (never raw exceptions or stack traces). Below is the canonical mapping used across flush/coordinator messages.

### `MUTATION_CONFLICT`
- `retryable`: `false`
- **User message:** `"One of your offline changes conflicts with newer data. Review your milestones."`

### `MUTATION_REPLAY_FAILED`
- `retryable`: `true` by default; `false` when the target milestone no longer exists
- **User message:** `"Some offline changes could not be synchronized. Review the affected milestones."` (retryable) / `"This milestone no longer exists and could not be updated."` (target missing)

### `OFFLINE_QUEUE_PERSIST_FAILED`
- `retryable`: `true`
- **User message:** `"Your change could not be saved offline. Please try again."`, or `"Too many pending offline changes. Connect to the internet to continue."` when the queue cap is hit

### `OFFLINE_QUEUE_INVALID_ENTRY`
- Malformed/corrupt persisted data is **discarded safely** on load; the queue falls back to only the valid entries. Never crashes.

### `RECONCILIATION_FAILED` / `QUEUE_FLUSH_IN_PROGRESS`
- Internal markers; the flush lock turns a duplicate/concurrent flush into a harmless no-op (`{ flushed: 0 }`) rather than an error.

---

## User-facing notices

The page renders an amber banner (`data-testid="offline-status-banner"`) when any of the following is true: the browser is offline, a flush is in progress, there are pending changes, or a notice is set. Messages are intentionally brief and safe:

| Case | Message |
|------|---------|
| Offline (browser) | `"You're offline — milestone changes are saved on this device and will sync automatically when you reconnect."` |
| Flush in progress | `"Synchronizing your pending milestones…"` |
| Offline change saved to queue | `"Saved offline — will synchronize when you are back online."` |
| Flush succeeded (n > 0) | `"Your offline changes were synchronized."` |
| Flush failed with a conflict | `"One of your offline changes conflicts with newer data. Review your milestones."` |
| Flush failed (other) | `"Some offline changes could not be synchronized. Review the affected milestones."` |

Transient notices auto-clear after ~6 seconds so stale messages do not linger.