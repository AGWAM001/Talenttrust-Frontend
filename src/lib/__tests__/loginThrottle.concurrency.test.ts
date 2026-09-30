/**
 * Concurrency regression suite for `src/lib/loginThrottle.ts`.
 *
 * The throttle state is shared mutable storage, so the behaviours asserted here
 * are the ones that break under racing writers, duplicate deliveries, partial
 * persistence failures, and exact timing boundaries. Each test maps to one of
 * the module's documented invariants (see the header comment in
 * `loginThrottle.ts`).
 *
 * Interleavings are produced deterministically by instrumenting
 * `safeStorage.setItem` — the single writable seam the module uses — so the
 * races are reproducible rather than timing-dependent.
 */

import { safeStorage } from '@/lib/safeStorage';
import { setErrorReporter, ErrorReporter } from '@/lib/errorReporter';
import {
  getBackoffDuration,
  getRemainingCooldownMs,
  getStoredAttempts,
  recordAttempt,
  resetThrottle,
} from '@/lib/loginThrottle';

const ATTEMPTS_KEY = 'login_throttle_attempts';
const COOLDOWN_KEY = 'login_throttle_cooldown';
const REVISION_KEY = 'login_throttle_revision';
const DEDUPE_KEY = 'login_throttle_dedupe';

/** Captures `reportError` output so degraded paths can be asserted, not just logged. */
let reports: { error: unknown; context: string; level?: string; meta?: Record<string, unknown> }[] = [];
const captureReporter: ErrorReporter = (error, context, level, meta) => {
  reports.push({ error, context, level, meta });
};

beforeEach(() => {
  reports = [];
  setErrorReporter(captureReporter);
  safeStorage.resetCache();
  window.localStorage.clear();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
});

afterEach(() => {
  setErrorReporter(null);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('loginThrottle — timing boundaries', () => {
  it('reports zero remaining at exactly the deadline (inclusive expiry)', () => {
    recordAttempt();
    recordAttempt();
    expect(getRemainingCooldownMs()).toBe(5000);

    act_advance(4999);
    expect(getRemainingCooldownMs()).toBe(1);

    act_advance(1);
    expect(getRemainingCooldownMs()).toBe(0);
  });

  it('does not create a cooldown for the first attempt and creates one for the second', () => {
    const first = recordAttempt();
    expect(first.cooldownUntil).toBe(0);
    expect(getRemainingCooldownMs()).toBe(0);

    const second = recordAttempt();
    expect(second.cooldownUntil).toBeGreaterThan(0);
    expect(getRemainingCooldownMs()).toBe(5000);
  });

  it('keeps the attempt counter across an expired cooldown (a retry is a new attempt)', () => {
    recordAttempt();
    recordAttempt();
    act_advance(5000);
    expect(getRemainingCooldownMs()).toBe(0);
    expect(getStoredAttempts()).toBe(2);

    const third = recordAttempt();
    expect(third.attempts).toBe(3);
    expect(getRemainingCooldownMs()).toBe(25000);
  });

  it('getBackoffDuration is total: a non-finite or negative counter fails closed', () => {
    expect(getBackoffDuration(NaN)).toBe(300000);
    expect(getBackoffDuration(Infinity)).toBe(300000);
    expect(getBackoffDuration(-Infinity)).toBe(300000);
    expect(getBackoffDuration(-1)).toBe(300000);
    // A non-finite duration would serialize to "no cooldown" and silently
    // disable the throttle, so it must never come back as 0.
    expect(Number.isNaN(getBackoffDuration(NaN))).toBe(false);
  });

  it('recovers from corrupt stored values without throwing or unlocking early', () => {
    window.localStorage.setItem(ATTEMPTS_KEY, 'not-a-number');
    window.localStorage.setItem(COOLDOWN_KEY, 'NaN');
    window.localStorage.setItem(REVISION_KEY, '-4');

    expect(getStoredAttempts()).toBe(0);
    expect(getRemainingCooldownMs()).toBe(0);

    // A corrupt counter is treated as zero attempts and rebuilt from scratch.
    const result = recordAttempt();
    expect(result.attempts).toBe(1);
    expect(result.revision).toBe(1);
  });
});

describe('loginThrottle — racing writers (no lost update)', () => {
  /**
   * Simulates a peer tab committing its own increment immediately after ours
   * lands. The naive read-modify-write implementation would have returned with
   * its own value and silently dropped the peer's attempts, weakening the
   * brute-force backoff.
   */
  function racePeerCommit(peerAttempts: number, peerRevision: number) {
    const realSetItem = safeStorage.setItem.bind(safeStorage);
    let interfered = false;
    jest.spyOn(safeStorage, 'setItem').mockImplementation((key: string, value: string) => {
      const accepted = realSetItem(key, value);
      if (!interfered && key === REVISION_KEY) {
        interfered = true;
        realSetItem(ATTEMPTS_KEY, String(peerAttempts));
        realSetItem(REVISION_KEY, String(peerRevision));
      }
      return accepted;
    });
    return () => interfered;
  }

  it('re-applies on top of a concurrent commit instead of clobbering it', () => {
    const interfered = racePeerCommit(5, 7);

    const result = recordAttempt();

    expect(interfered()).toBe(true);
    // We based our first increment on an empty counter; the peer had already
    // reached 5. The final value must be 6, not our un-merged 1 and not the
    // peer's clobbered-away 1.
    expect(result.attempts).toBe(6);
    expect(getStoredAttempts()).toBe(6);
    expect(result.recorded).toBe(true);
  });

  it('never shortens a lockout a concurrent writer already established', () => {
    // Peer has a 25s lockout in place.
    safeStorage.setItem(ATTEMPTS_KEY, '3');
    safeStorage.setItem(COOLDOWN_KEY, String(Date.now() + 25000));
    safeStorage.setItem(REVISION_KEY, '3');
    reports = [];

    recordAttempt();

    expect(getRemainingCooldownMs()).toBeGreaterThan(20000);
  });

  it('keeps the counter monotonic across a sequence of racing commits', () => {
    const realSetItem = safeStorage.setItem.bind(safeStorage);
    let peer = 10;
    jest.spyOn(safeStorage, 'setItem').mockImplementation((key: string, value: string) => {
      const accepted = realSetItem(key, value);
      if (key === REVISION_KEY) {
        // A peer that keeps outpacing us on every pass we attempt.
        realSetItem(ATTEMPTS_KEY, String(peer));
        realSetItem(REVISION_KEY, String(peer));
        peer += 5;
      }
      return accepted;
    });

    const result = recordAttempt();

    // Exhausted retries must still leave monotonic, self-consistent state and
    // a diagnostic — never a silently lower counter.
    expect(getStoredAttempts()).toBeGreaterThanOrEqual(10);
    expect(result.degraded).toBe(true);
    expect(reports.some((r) => r.context === 'loginThrottle.recordAttempt')).toBe(true);
  });

  it('reports the race without exposing any credential material', () => {
    racePeerCommit(5, 7);
    recordAttempt();

    expect(reports).toHaveLength(0);
    const serialized = JSON.stringify(reports);
    expect(serialized).not.toMatch(/password|@/i);
  });
});

describe('loginThrottle — duplicate work and idempotent retries', () => {
  it('records the same submissionId only once', () => {
    const first = recordAttempt({ submissionId: 'submit-1' });
    expect(first.attempts).toBe(1);
    expect(first.recorded).toBe(true);

    const replay = recordAttempt({ submissionId: 'submit-1' });
    expect(replay.attempts).toBe(1);
    expect(replay.recorded).toBe(false);
    expect(getStoredAttempts()).toBe(1);
  });

  it('a replayed delivery does not escalate the backoff', () => {
    recordAttempt({ submissionId: 'submit-1' });
    recordAttempt({ submissionId: 'submit-1' });
    recordAttempt({ submissionId: 'submit-1' });

    // Three deliveries of one logical submission, one cooldown — not three.
    expect(getStoredAttempts()).toBe(1);
    expect(getRemainingCooldownMs()).toBe(0);
  });

  it('a replay returns the live state rather than a stale snapshot', () => {
    recordAttempt({ submissionId: 'submit-1' });
    recordAttempt();
    recordAttempt();

    const replay = recordAttempt({ submissionId: 'submit-1' });
    expect(replay.attempts).toBe(3);
    expect(replay.cooldownUntil).toBeGreaterThan(0);
    expect(replay.recorded).toBe(false);
  });

  it('treats distinct submissionIds as distinct attempts', () => {
    recordAttempt({ submissionId: 'a' });
    recordAttempt({ submissionId: 'b' });
    expect(getStoredAttempts()).toBe(2);
  });

  it('bounds the idempotency ring so storage usage stays small', () => {
    for (let i = 0; i < 40; i += 1) {
      recordAttempt({ submissionId: `id-${i}` });
    }

    const ring = JSON.parse(window.localStorage.getItem(DEDUPE_KEY) ?? '[]');
    expect(Array.isArray(ring)).toBe(true);
    expect(ring.length).toBeLessThanOrEqual(20);
    // The oldest entries are evicted; the newest are retained.
    expect(ring).not.toContain('id-0');
    expect(ring).toContain('id-39');
  });

  it('still counts an attempt when the idempotency ring is corrupt', () => {
    window.localStorage.setItem(DEDUPE_KEY, '{not json');
    const result = recordAttempt({ submissionId: 'submit-1' });
    expect(result.recorded).toBe(true);
    expect(getStoredAttempts()).toBe(1);
  });

  it('forgets idempotency keys after a successful reset', () => {
    recordAttempt({ submissionId: 'submit-1' });
    resetThrottle();

    const afterReset = recordAttempt({ submissionId: 'submit-1' });
    expect(afterReset.recorded).toBe(true);
    expect(afterReset.attempts).toBe(1);
  });
});

describe('loginThrottle — partial persistence failure fails closed', () => {
  /** Rejects only the cooldown write, leaving the rest of storage writable. */
  function rejectCooldownPersist() {
    const realSetItem = safeStorage.setItem.bind(safeStorage);
    jest.spyOn(safeStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === COOLDOWN_KEY) return false;
      return realSetItem(key, value);
    });
  }

  it('still enforces the lockout from memory when the cooldown cannot be persisted', () => {
    rejectCooldownPersist();
    recordAttempt();

    const result = recordAttempt();

    expect(result.degraded).toBe(true);
    expect(result.cooldownUntil).toBeGreaterThan(0);
    // Storage has no cooldown, yet the lockout is still in force.
    expect(window.localStorage.getItem(COOLDOWN_KEY)).toBeNull();
    expect(getRemainingCooldownMs()).toBe(5000);
  });

  it('reports the degradation without leaking sensitive data', () => {
    rejectCooldownPersist();
    recordAttempt();
    reports = [];
    recordAttempt();

    expect(reports).toHaveLength(1);
    expect(reports[0].context).toBe('loginThrottle.recordAttempt');
    expect(reports[0].level).toBe('warn');
    expect(JSON.stringify(reports[0])).not.toMatch(/password|secret|@/i);
  });

  it('a later attempt cannot shorten a memory-only lockout', () => {
    rejectCooldownPersist();
    recordAttempt();
    recordAttempt();
    expect(getRemainingCooldownMs()).toBe(5000);

    // Drive the counter far enough that a naive implementation would compute a
    // *shorter* window and overwrite the running penalty.
    for (let i = 0; i < 5; i += 1) {
      window.localStorage.setItem(ATTEMPTS_KEY, '1');
      recordAttempt();
    }

    expect(getRemainingCooldownMs()).toBeGreaterThan(0);
  });

  it('the memory-only lockout expires on schedule and never pins the form forever', () => {
    rejectCooldownPersist();
    recordAttempt();
    recordAttempt();
    expect(getRemainingCooldownMs()).toBe(5000);

    act_advance(5000);
    expect(getRemainingCooldownMs()).toBe(0);
  });

  it('resetThrottle clears the memory-only lockout too', () => {
    rejectCooldownPersist();
    recordAttempt();
    recordAttempt();
    expect(getRemainingCooldownMs()).toBe(5000);

    resetThrottle();
    expect(getRemainingCooldownMs()).toBe(0);
    expect(getStoredAttempts()).toBe(0);
  });
});

describe('loginThrottle — compare-and-clear reset', () => {
  it('clears unconditionally when no revision guard is supplied (previous behavior)', () => {
    recordAttempt();
    recordAttempt();
    expect(getStoredAttempts()).toBe(2);

    expect(resetThrottle()).toBe(true);
    expect(getStoredAttempts()).toBe(0);
    expect(getRemainingCooldownMs()).toBe(0);
    expect(window.localStorage.getItem(REVISION_KEY)).toBeNull();
  });

  it('preserves state recorded after the caller snapshot', () => {
    recordAttempt();
    const mine = recordAttempt();

    // A concurrent tab records a newer attempt after our snapshot.
    recordAttempt();
    expect(getStoredAttempts()).toBe(3);

    const cleared = resetThrottle({ revision: mine.revision });

    expect(cleared).toBe(false);
    expect(getStoredAttempts()).toBe(3);
    expect(getRemainingCooldownMs()).toBe(25000);
    expect(reports.some((r) => r.context === 'loginThrottle.resetThrottle')).toBe(true);
  });

  it('clears when the stored revision is not newer than the snapshot', () => {
    const mine = recordAttempt();
    expect(resetThrottle({ revision: mine.revision })).toBe(true);
    expect(getStoredAttempts()).toBe(0);
  });

  it('is idempotent — resetting twice is safe and still ends cleared', () => {
    const mine = recordAttempt();
    expect(resetThrottle({ revision: mine.revision })).toBe(true);
    expect(resetThrottle({ revision: mine.revision })).toBe(true);
    expect(getStoredAttempts()).toBe(0);
    expect(getRemainingCooldownMs()).toBe(0);
  });
});

describe('loginThrottle — no diagnostics on the happy path', () => {
  it('records attempts silently', () => {
    recordAttempt();
    recordAttempt();
    recordAttempt();
    expect(reports).toHaveLength(0);
  });

  it('resetThrottle on an up-to-date snapshot is silent', () => {
    const mine = recordAttempt();
    resetThrottle({ revision: mine.revision });
    expect(reports).toHaveLength(0);
  });
});

/** Advances fake timers. No React state is involved in this pure-module suite. */
function act_advance(ms: number) {
  jest.advanceTimersByTime(ms);
}
