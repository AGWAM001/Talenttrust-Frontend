/**
 * formatRelativeTime.test.ts
 *
 * Tests for the formatRelativeTime and toISOString helpers.
 *
 * All time-sensitive assertions use a fixed reference `now` value so the
 * suite is deterministic regardless of when it runs.
 *
 * Fixed clock: 2026-07-27T12:00:00.000Z (noon UTC, Monday)
 */

import { formatRelativeTime, toISOString } from '../formatRelativeTime';

// ---------------------------------------------------------------------------
// Fixed clock
// ---------------------------------------------------------------------------

/** Noon UTC on the day this feature was authored — stable across all runs. */
const NOW = new Date('2026-07-27T12:00:00.000Z');

/** Helper: returns a Date that is `ms` milliseconds before NOW. */
function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

const S = 1_000;
const MIN = 60 * S;
const H = 60 * MIN;
const D = 24 * H;
const W = 7 * D;
const MO = 30 * D;
const Y = 365 * D;

// ---------------------------------------------------------------------------
// 1. Null / undefined / invalid inputs
// ---------------------------------------------------------------------------

describe('formatRelativeTime – null / undefined / invalid inputs', () => {
  it('returns null for null', () => {
    expect(formatRelativeTime(null, NOW)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(formatRelativeTime(undefined, NOW)).toBeNull();
  });

  it('returns null for an unparseable string', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(formatRelativeTime('', NOW)).toBeNull();
  });

  it('returns null for NaN epoch', () => {
    expect(formatRelativeTime(NaN, NOW)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. "just now" threshold (< 45 seconds)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – just now threshold', () => {
  it('returns "just now" at exactly 0 ms ago (same timestamp as now)', () => {
    expect(formatRelativeTime(NOW, NOW)).toBe('just now');
  });

  it('returns "just now" at 1 second ago', () => {
    expect(formatRelativeTime(ago(1 * S), NOW)).toBe('just now');
  });

  it('returns "just now" at 44 seconds ago', () => {
    expect(formatRelativeTime(ago(44 * S), NOW)).toBe('just now');
  });

  it('does NOT return "just now" at 45 seconds ago', () => {
    expect(formatRelativeTime(ago(45 * S), NOW)).not.toBe('just now');
  });

  it('returns "just now" for a future timestamp (defensive — clamps to zero)', () => {
    const future = new Date(NOW.getTime() + 10 * S);
    expect(formatRelativeTime(future, NOW)).toBe('just now');
  });
});

// ---------------------------------------------------------------------------
// 3. Minutes (45 s – 44 min 59 s)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – minutes', () => {
  it('returns "1 minute ago" at 1 minute ago', () => {
    expect(formatRelativeTime(ago(1 * MIN), NOW)).toBe('1 minute ago');
  });

  it('returns "5 minutes ago" at 5 minutes ago', () => {
    expect(formatRelativeTime(ago(5 * MIN), NOW)).toBe('5 minutes ago');
  });

  it('returns "30 minutes ago" at 30 minutes ago', () => {
    expect(formatRelativeTime(ago(30 * MIN), NOW)).toBe('30 minutes ago');
  });

  it('returns "44 minutes ago" at 44 minutes ago', () => {
    expect(formatRelativeTime(ago(44 * MIN), NOW)).toBe('44 minutes ago');
  });

  it('does NOT return a minutes string at exactly 45 minutes', () => {
    const result = formatRelativeTime(ago(45 * MIN), NOW);
    expect(result).not.toMatch(/minute/);
  });
});

// ---------------------------------------------------------------------------
// 4. Hours (45 min – 21 h 59 min)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – hours', () => {
  it('returns "1 hour ago" at 1 hour ago', () => {
    expect(formatRelativeTime(ago(1 * H), NOW)).toBe('1 hour ago');
  });

  it('returns "2 hours ago" at 2 hours ago', () => {
    expect(formatRelativeTime(ago(2 * H), NOW)).toBe('2 hours ago');
  });

  it('returns "12 hours ago" at 12 hours ago', () => {
    expect(formatRelativeTime(ago(12 * H), NOW)).toBe('12 hours ago');
  });

  it('returns "21 hours ago" at 21 hours ago', () => {
    expect(formatRelativeTime(ago(21 * H), NOW)).toBe('21 hours ago');
  });

  it('does NOT return an hours string at 22 hours ago', () => {
    const result = formatRelativeTime(ago(22 * H), NOW);
    expect(result).not.toMatch(/hour/);
  });
});

// ---------------------------------------------------------------------------
// 5. Days (22 h – 25 d 23 h)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – days', () => {
  it('returns "yesterday" or "1 day ago" at 1 day ago', () => {
    // Intl.RelativeTimeFormat numeric:"auto" may produce "yesterday"
    const result = formatRelativeTime(ago(1 * D), NOW);
    expect(result).toMatch(/yesterday|1 day ago/i);
  });

  it('returns "2 days ago" at 2 days ago', () => {
    expect(formatRelativeTime(ago(2 * D), NOW)).toBe('2 days ago');
  });

  it('returns "7 days ago" at 7 days ago', () => {
    expect(formatRelativeTime(ago(7 * D), NOW)).toBe('7 days ago');
  });

  it('returns "14 days ago" at 14 days ago', () => {
    expect(formatRelativeTime(ago(14 * D), NOW)).toBe('14 days ago');
  });

  it('does NOT return a days string at 26 days ago', () => {
    const result = formatRelativeTime(ago(26 * D), NOW);
    expect(result).not.toMatch(/\d+ days? ago/);
  });
});

// ---------------------------------------------------------------------------
// 6. Weeks (26 d – 6 w 6 d)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – weeks', () => {
  it('returns "4 weeks ago" at 26 days ago (rounds to 4 weeks)', () => {
    expect(formatRelativeTime(ago(26 * D), NOW)).toBe('4 weeks ago');
  });

  it('returns "5 weeks ago" at 5 weeks ago', () => {
    expect(formatRelativeTime(ago(5 * W), NOW)).toBe('5 weeks ago');
  });

  it('does NOT return a weeks string at 7 weeks ago', () => {
    const result = formatRelativeTime(ago(7 * W), NOW);
    expect(result).not.toMatch(/week/);
  });
});

// ---------------------------------------------------------------------------
// 7. Months (7 w – 10 mo 29 d)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – months', () => {
  it('returns "2 months ago" at 2 months ago', () => {
    expect(formatRelativeTime(ago(2 * MO), NOW)).toBe('2 months ago');
  });

  it('returns "6 months ago" at 6 months ago', () => {
    expect(formatRelativeTime(ago(6 * MO), NOW)).toBe('6 months ago');
  });

  it('returns "10 months ago" at 10 months ago', () => {
    expect(formatRelativeTime(ago(10 * MO), NOW)).toBe('10 months ago');
  });

  it('does NOT return a months string at 11 months ago', () => {
    const result = formatRelativeTime(ago(11 * MO), NOW);
    expect(result).not.toMatch(/month/);
  });
});

// ---------------------------------------------------------------------------
// 8. Years (>= 11 months)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – years', () => {
  it('returns "last year" or "1 year ago" at 1 year ago', () => {
    const result = formatRelativeTime(ago(1 * Y), NOW);
    expect(result).toMatch(/last year|1 year ago/i);
  });

  it('returns "2 years ago" at 2 years ago', () => {
    expect(formatRelativeTime(ago(2 * Y), NOW)).toBe('2 years ago');
  });

  it('returns "5 years ago" at 5 years ago', () => {
    expect(formatRelativeTime(ago(5 * Y), NOW)).toBe('5 years ago');
  });
});

// ---------------------------------------------------------------------------
// 9. Input type variants (string, number, Date)
// ---------------------------------------------------------------------------

describe('formatRelativeTime – input type variants', () => {
  const fiveMinAgo = ago(5 * MIN);

  it('accepts a Date object', () => {
    expect(formatRelativeTime(fiveMinAgo, NOW)).toBe('5 minutes ago');
  });

  it('accepts an ISO-8601 string', () => {
    expect(formatRelativeTime(fiveMinAgo.toISOString(), NOW)).toBe('5 minutes ago');
  });

  it('accepts a millisecond epoch number', () => {
    expect(formatRelativeTime(fiveMinAgo.getTime(), NOW)).toBe('5 minutes ago');
  });

  it('accepts `now` as a number (epoch ms)', () => {
    expect(formatRelativeTime(fiveMinAgo, NOW.getTime())).toBe('5 minutes ago');
  });
});

// ---------------------------------------------------------------------------
// 10. toISOString helper
// ---------------------------------------------------------------------------

describe('toISOString', () => {
  it('returns the ISO string for a Date object', () => {
    expect(toISOString(NOW)).toBe('2026-07-27T12:00:00.000Z');
  });

  it('returns the ISO string for an ISO string input', () => {
    expect(toISOString('2026-07-27T12:00:00.000Z')).toBe('2026-07-27T12:00:00.000Z');
  });

  it('returns the ISO string for an epoch number', () => {
    expect(toISOString(NOW.getTime())).toBe('2026-07-27T12:00:00.000Z');
  });

  it('returns an empty string for null', () => {
    expect(toISOString(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(toISOString(undefined)).toBe('');
  });

  it('returns an empty string for an unparseable string', () => {
    expect(toISOString('not-a-date')).toBe('');
  });

  it('returns an empty string for NaN', () => {
    expect(toISOString(NaN)).toBe('');
  });
});
