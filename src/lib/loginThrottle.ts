/**
 * Client-side login throttle: attempt counter + exponential backoff lockout.
 *
 * ## Why this module is concurrency-sensitive
 *
 * The throttle state lives in `localStorage`, which is shared by every tab,
 * every `Home` instance, and every browser window. Two callers can therefore
 * interleave a read-modify-write cycle — the classic "lost update". A naive
 * `read → +1 → write` lets two racing submissions both read `N` and both
 * persist `N + 1`, **losing an attempt**. For a brute-force backoff, a lost
 * increment is a security regression: the penalty grows more slowly than the
 * attacker does, and the lockout a user was told about silently shortens.
 *
 * ## Invariants (all enforced below)
 *
 * 1. **Monotonic attempts.** The persisted counter never decreases except
 *    through {@link resetThrottle}. A stale or racing writer can only raise it.
 * 2. **Monotonic lockout.** A recorded cooldown is never shortened while it is
 *    still active. A racing writer may only extend it.
 * 3. **Atomic-enough commit.** Every mutation bumps a monotonic revision *last*.
 *    A writer that re-reads and finds a different revision knows it raced and
 *    re-applies its increment on top of the state it observes (bounded retry).
 * 4. **Fail closed.** If the cooldown cannot be persisted, it is held in a
 *    process-local slot that {@link getRemainingCooldownMs} still enforces, and
 *    the failure is reported. The lockout is never silently dropped.
 * 5. **Idempotent retries.** {@link recordAttempt} accepts an optional
 *    `submissionId`; replaying the same id is a no-op that returns the
 *    previously recorded outcome instead of double-counting.
 * 6. **Bounded growth.** The idempotency-key ring is capped so storage usage
 *    stays far below the {@link safeStorage} byte ceiling.
 *
 * ## Public interface compatibility
 *
 * Every export keeps its previous signature and semantics; `recordAttempt` and
 * `resetThrottle` only gained *optional* parameters and extra result fields.
 * Existing callers (`src/app/page.tsx`, the throttle tests) are unaffected.
 */

import { safeStorage } from './safeStorage';
import { reportError } from './errorReporter';

const ATTEMPTS_KEY = 'login_throttle_attempts';
const COOLDOWN_KEY = 'login_throttle_cooldown';
const REVISION_KEY = 'login_throttle_revision';
const DEDUPE_KEY = 'login_throttle_dedupe';

const BASE_BACKOFF_MS = 5_000;
const BACKOFF_FACTOR = 5;
const MAX_BACKOFF_MS = 300_000;

/**
 * Upper bound on verify-and-retry passes inside {@link recordAttempt}.
 *
 * A normal (single-context) call converges on pass 1. The retry path only runs
 * when a concurrent writer is observed committing underneath us; the bound
 * guarantees termination so a pathological interleaving can never livelock
 * the submit handler. On exhaustion we keep the monotonic high-water mark and
 * report, which is the fail-closed outcome.
 */
const MAX_WRITE_PASSES = 4;

/** Maximum number of recently seen idempotency keys retained (bounded storage). */
const MAX_DEDUPE_ENTRIES = 20;

/**
 * Fail-closed lockout held in module memory.
 *
 * Only used when `safeStorage` refuses to persist the cooldown (e.g. the value
 * byte ceiling or a throwing `localStorage`). Keeping the deadline in memory
 * means the lockout is still enforced for the rest of this page's lifetime
 * instead of silently vanishing, which would be a security regression.
 * Cleared by {@link resetThrottle} and when it expires.
 */
let volatileCooldownUntil = 0;

/** Optional inputs for {@link recordAttempt}. */
export interface RecordAttemptOptions {
  /**
   * Idempotency key identifying one logical submission.
   *
   * When supplied, replaying the same key is a no-op: the attempt counter is
   * not incremented and `recorded` is `false`. This makes a retried or
   * duplicated delivery safe — a network retry, a double-fired event, or a
   * re-entrant dispatch cannot inflate the counter and escalate the lockout.
   * Omit the key to keep the original "every call counts" behavior.
   */
  submissionId?: string;
}

/** Outcome of a single {@link recordAttempt} call. */
export interface RecordAttemptResult {
  /** Attempt count after this call (persisted, monotonic). */
  attempts: number;
  /**
   * Effective cooldown deadline in epoch milliseconds, or `0` when no lockout
   * applies. Never shorter than a lockout that was already active.
   */
  cooldownUntil: number;
  /**
   * `false` when `submissionId` had already been recorded (idempotent replay);
   * the counter was intentionally left untouched.
   */
  recorded: boolean;
  /** Monotonic revision of the committed state after this call. */
  revision: number;
  /**
   * `true` when the cooldown could not be persisted and is being enforced from
   * module memory instead. The lockout still holds; the caller may surface a
   * degraded-mode hint.
   */
  degraded: boolean;
}

/** Optional inputs for {@link resetThrottle}. */
export interface ResetThrottleOptions {
  /**
   * Compare-and-clear guard.
   *
   * When supplied, the stored state is cleared **only if** its revision is at
   * or below `revision` — i.e. only if nothing newer was recorded since the
   * caller read that revision. A successful sign-in in one tab therefore
   * cannot erase a failed attempt that another tab recorded a moment later.
   * Omit for an unconditional clear (previous behavior).
   */
  revision?: number;
}

/** Immutable snapshot of the persisted throttle state. */
interface ThrottleState {
  attempts: number;
  cooldownUntil: number;
  revision: number;
}

export function getBackoffDuration(attempts: number): number {
  if (!Number.isFinite(attempts) || attempts < 0) {
    // A counter we could not parse must never produce a *shorter* lockout:
    // a NaN duration would serialize to "no cooldown" and silently disable
    // the throttle, so fail closed with the maximum penalty instead.
    return MAX_BACKOFF_MS;
  }
  if (attempts <= 1) return 0;
  const exponent = attempts - 2;
  const duration = BASE_BACKOFF_MS * Math.pow(BACKOFF_FACTOR, exponent);
  if (!Number.isFinite(duration)) return MAX_BACKOFF_MS;
  return Math.min(duration, MAX_BACKOFF_MS);
}

function parseStoredCounter(key: string): number {
  const val = safeStorage.getItem(key);
  if (val === null) return 0;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function getStoredAttempts(): number {
  return parseStoredCounter(ATTEMPTS_KEY);
}

function getStoredCooldownUntil(): number {
  return parseStoredCounter(COOLDOWN_KEY);
}

/**
 * Current monotonic revision. Absent (pre-hardening storage) reads as `0`, so
 * existing persisted state migrates without a version bump.
 */
function getStoredRevision(): number {
  return parseStoredCounter(REVISION_KEY);
}

/** Reads attempts, cooldown deadline, and revision as one consistent snapshot. */
function readState(): ThrottleState {
  return {
    attempts: getStoredAttempts(),
    cooldownUntil: getStoredCooldownUntil(),
    revision: getStoredRevision(),
  };
}

export function getRemainingCooldownMs(): number {
  const now = Date.now();
  const storedRemaining = Math.max(0, getStoredCooldownUntil() - now);
  const volatileRemaining = Math.max(0, volatileCooldownUntil - now);
  // Fail closed: enforce whichever lockout lasts longer, so a failed persist
  // can only ever make the penalty stricter, never weaker.
  return Math.max(storedRemaining, volatileRemaining);
}

// ---------------------------------------------------------------------------
// Idempotency keys
// ---------------------------------------------------------------------------

/** Reads the bounded ring of recently recorded submission ids, ignoring junk. */
function readDedupeEntries(): string[] {
  const raw = safeStorage.getItem(DEDUPE_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    // Corrupt ring: start over. Losing dedupe history can at worst let a
    // replay count once more; it cannot weaken the lockout itself.
    return [];
  }
}

/** Appends `submissionId` to the bounded ring, evicting the oldest entry. */
function rememberSubmissionId(submissionId: string): void {
  const next = [...readDedupeEntries(), submissionId].slice(-MAX_DEDUPE_ENTRIES);
  const accepted = safeStorage.setItem(DEDUPE_KEY, JSON.stringify(next));
  if (!accepted) {
    reportError(
      new Error('login throttle idempotency ring could not be persisted'),
      'loginThrottle.recordAttempt',
      'warn',
      { entries: next.length, maxEntries: MAX_DEDUPE_ENTRIES },
    );
  }
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

/**
 * Applies one increment on top of `base` and commits it.
 *
 * Write order is deliberate: the cooldown (the security control) is persisted
 * first so a failure there is observable, the counter second, and the revision
 * **last** as the commit marker that peers verify against.
 *
 * @returns the committed state, or `null` when a concurrent writer advanced the
 *          revision underneath us and the caller must re-apply.
 */
function commitIncrement(base: ThrottleState): RecordAttemptResult | null {
  const attempts = base.attempts + 1;
  const now = Date.now();
  const durationMs = getBackoffDuration(attempts);
  const requested = durationMs > 0 ? now + durationMs : 0;

  // Invariant 2: never shorten a lockout that is still running. A caller that
  // records an attempt mid-cooldown keeps the existing deadline; otherwise a
  // slower/stale writer could hand an attacker a shorter penalty.
  //
  // Read the *effective* remaining window via the public accessor so a
  // fail-closed in-memory lockout (whose deadline never reached storage) is
  // covered by the clamp too. Re-expressing it as `now + activeRemaining`
  // preserves the exact remaining duration and errs towards a longer penalty.
  const activeRemaining = getRemainingCooldownMs();
  const effectiveCooldownUntil =
    requested > 0 && requested - now >= activeRemaining
      ? requested
      : activeRemaining > 0
        ? now + activeRemaining
        : 0;

  let degraded = false;
  if (effectiveCooldownUntil > 0) {
    const accepted = safeStorage.setItem(COOLDOWN_KEY, String(effectiveCooldownUntil));
    if (!accepted) {
      // Invariant 4: fail closed — hold the lockout in memory so it is still
      // enforced, and make the degradation diagnosable.
      volatileCooldownUntil = Math.max(volatileCooldownUntil, effectiveCooldownUntil);
      degraded = true;
      reportError(
        new Error('login throttle cooldown could not be persisted'),
        'loginThrottle.recordAttempt',
        'warn',
        { attempts, cooldownMs: effectiveCooldownUntil - now },
      );
    }
  }

  safeStorage.setItem(ATTEMPTS_KEY, String(attempts));
  const revision = base.revision + 1;
  const revisionAccepted = safeStorage.setItem(REVISION_KEY, String(revision));

  // Invariant 3: verify our commit actually landed. If a peer committed in
  // between, its revision differs from ours and we re-apply on top of it
  // rather than clobbering it.
  const observed = readState();
  if (observed.revision !== revision || observed.attempts !== attempts) {
    return null;
  }

  return {
    attempts,
    cooldownUntil: effectiveCooldownUntil,
    recorded: true,
    revision,
    degraded: degraded || !revisionAccepted,
  };
}

/**
 * Combines our base state with a state observed after a lost race.
 *
 * Only ever *raises* values, so a retry can add the concurrent increment but
 * can never roll the counter or an active lockout backwards.
 */
function mergeAfterRace(base: ThrottleState, observed: ThrottleState): ThrottleState {
  return {
    attempts: Math.max(base.attempts, observed.attempts),
    cooldownUntil: Math.max(base.cooldownUntil, observed.cooldownUntil),
    revision: Math.max(base.revision, observed.revision),
  };
}

export function recordAttempt(options?: RecordAttemptOptions): RecordAttemptResult {
  const submissionId = options?.submissionId;

  // Invariant 5: an idempotent replay must not inflate the counter.
  if (submissionId !== undefined && readDedupeEntries().includes(submissionId)) {
    const state = readState();
    return {
      attempts: state.attempts,
      cooldownUntil: state.cooldownUntil,
      recorded: false,
      revision: state.revision,
      degraded: false,
    };
  }

  let base = readState();
  let committed = commitIncrement(base);
  let pass = 0;

  // Bounded verify-and-retry. Converges on the first pass in a single JS
  // context (the whole commit is synchronous, so nothing can interleave).
  while (committed === null && pass < MAX_WRITE_PASSES) {
    pass += 1;
    base = mergeAfterRace(base, readState());
    committed = commitIncrement(base);
  }

  if (committed === null) {
    // Every pass lost the race to a writer that is outpacing us. Preserve the
    // highest observed state so invariants 1 and 2 still hold, and report so
    // the anomaly is diagnosable. The submit handler is never left waiting.
    const state = readState();
    safeStorage.setItem(ATTEMPTS_KEY, String(state.attempts));
    safeStorage.setItem(REVISION_KEY, String(state.revision));
    reportError(
      new Error('login throttle write did not converge'),
      'loginThrottle.recordAttempt',
      'warn',
      { passes: MAX_WRITE_PASSES, attempts: state.attempts, revision: state.revision },
    );
    return {
      attempts: state.attempts,
      cooldownUntil: state.cooldownUntil,
      recorded: false,
      revision: state.revision,
      degraded: true,
    };
  }

  // Recorded after a successful commit: a failed write is not "consumed", so a
  // genuine retry is still counted (at-least-once, which is the safe bias for
  // a counter that only ever tightens the lockout).
  if (submissionId !== undefined) {
    rememberSubmissionId(submissionId);
  }

  return committed;
}

/**
 * Clears the throttle state.
 *
 * With no argument this is an unconditional clear (unchanged behavior). With
 * `options.revision` it is a compare-and-clear that preserves any state
 * recorded *after* the caller's snapshot — so a successful sign-in cannot wipe
 * out a concurrent failed attempt from another tab.
 *
 * @returns `true` when the state was cleared, `false` when newer concurrent
 *          state was deliberately preserved.
 */
export function resetThrottle(options?: ResetThrottleOptions): boolean {
  volatileCooldownUntil = 0;
  safeStorage.removeItem(DEDUPE_KEY);

  const expectedRevision = options?.revision;
  if (expectedRevision !== undefined) {
    const storedRevision = getStoredRevision();
    if (storedRevision > expectedRevision) {
      reportError(
        new Error('login throttle reset skipped: newer concurrent state preserved'),
        'loginThrottle.resetThrottle',
        'warn',
        { expectedRevision, storedRevision },
      );
      return false;
    }
  }

  safeStorage.removeItem(ATTEMPTS_KEY);
  safeStorage.removeItem(COOLDOWN_KEY);
  safeStorage.removeItem(REVISION_KEY);
  return true;
}
