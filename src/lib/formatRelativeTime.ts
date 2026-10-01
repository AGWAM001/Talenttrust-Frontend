/**
 * formatRelativeTime.ts
 *
 * Produces a human-readable relative time string (e.g. "2 minutes ago",
 * "just now") from a given timestamp, relative to an optional reference time
 * (defaults to `Date.now()`).
 *
 * ## Design decisions
 *
 * - Uses `Intl.RelativeTimeFormat` for locale-aware output instead of a
 *   hand-rolled string table, so the format is consistent across browsers
 *   and automatically handles pluralisation.
 * - The `now` parameter makes the function deterministic in tests: pass a
 *   fixed `Date` (or millisecond number) and the output is stable regardless
 *   of when the test runs.
 * - Thresholds mirror those used by most social platforms:
 *   - < 45 s  → "just now"
 *   - < 45 min → "N minutes ago"
 *   - < 22 h  → "N hours ago"
 *   - < 26 d  → "N days ago"
 *   - < 45 d  → "a month ago" / "N months ago" (up to 10)
 *   - < 11 mo → "N months ago"
 *   - else    → "N years ago"
 *
 * @module
 */

/** Seconds in common time units — avoids magic numbers throughout. */
const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats `timestamp` as a relative time string like "3 minutes ago".
 *
 * @param timestamp - The past point in time to describe. Accepts a `Date`,
 *   an ISO-8601 string, or a millisecond epoch number. Pass `null` or
 *   `undefined` to receive `null` back.
 * @param now - Reference "current" time. Defaults to `new Date()`.
 *   Inject a fixed value in tests for deterministic output.
 * @returns A localised relative-time string, or `null` when `timestamp` is
 *   absent or cannot be parsed.
 *
 * @example
 * // 2 minutes ago (relative to now)
 * formatRelativeTime(new Date(Date.now() - 2 * 60_000));
 *
 * @example
 * // Deterministic in tests
 * const now = new Date('2026-07-27T12:00:00Z');
 * const ts  = new Date('2026-07-27T11:55:00Z');
 * formatRelativeTime(ts, now); // "5 minutes ago"
 */
export function formatRelativeTime(
  timestamp: Date | string | number | null | undefined,
  now: Date | number = new Date(),
): string | null {
  if (timestamp == null) return null;

  // Normalise timestamp to a Date.
  const date =
    timestamp instanceof Date
      ? timestamp
      : new Date(timestamp);

  if (isNaN(date.getTime())) return null;

  const nowMs = now instanceof Date ? now.getTime() : now;
  const diffMs = nowMs - date.getTime();

  // Future timestamps or zero-diff both read as "just now".
  if (diffMs < 45 * SECOND) return 'just now';

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (diffMs < 45 * MINUTE) {
    return rtf.format(-Math.round(diffMs / MINUTE), 'minute');
  }
  if (diffMs < 22 * HOUR) {
    return rtf.format(-Math.round(diffMs / HOUR), 'hour');
  }
  if (diffMs < 26 * DAY) {
    return rtf.format(-Math.round(diffMs / DAY), 'day');
  }
  if (diffMs < 7 * WEEK) {
    return rtf.format(-Math.round(diffMs / WEEK), 'week');
  }
  if (diffMs < 11 * MONTH) {
    return rtf.format(-Math.round(diffMs / MONTH), 'month');
  }
  return rtf.format(-Math.round(diffMs / YEAR), 'year');
}

/**
 * Returns the ISO-8601 string representation of `timestamp` for use in a
 * `<time dateTime="...">` attribute, or an empty string when the input is
 * absent or invalid.
 *
 * @param timestamp - Same accepted types as {@link formatRelativeTime}.
 */
export function toISOString(
  timestamp: Date | string | number | null | undefined,
): string {
  if (timestamp == null) return '';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return isNaN(date.getTime()) ? '' : date.toISOString();
}
