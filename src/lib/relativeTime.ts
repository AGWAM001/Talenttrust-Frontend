/**
 * Formats how long ago a timestamp was, e.g. "5 minutes ago", "yesterday".
 *
 * Backed by the built-in `Intl.RelativeTimeFormat` so pluralization and
 * wording stay correct across locales without hand-rolled string building.
 * Values under a minute collapse to "just now" rather than "0 minutes ago".
 */

/** Fallback returned for invalid or missing input. */
export const INVALID_DATE_FALLBACK = '—';

/**
 * Breakpoints used by {@link formatRelativeTime}, ordered smallest to largest.
 * `secondsInUnit` converts a second-delta into a count of that unit; `max` is
 * the second-delta threshold below which this unit applies (exclusive upper bound).
 */
const RELATIVE_TIME_UNITS: ReadonlyArray<{
  unit: Intl.RelativeTimeFormatUnit;
  secondsInUnit: number;
  max: number;
}> = [
  { unit: 'second', secondsInUnit: 1, max: 60 },
  { unit: 'minute', secondsInUnit: 60, max: 3600 },
  { unit: 'hour', secondsInUnit: 3600, max: 86400 },
  { unit: 'day', secondsInUnit: 86400, max: 604800 },
  { unit: 'week', secondsInUnit: 604800, max: 2629800 },
  { unit: 'month', secondsInUnit: 2629800, max: 31557600 },
  { unit: 'year', secondsInUnit: 31557600, max: Infinity },
];

export interface FormatRelativeTimeOptions {
  /** BCP47 locale tag. Defaults to `'en-US'`. */
  locale?: string;
  /**
   * Reference "current" time. Defaults to `new Date()`.
   * Pass a fixed value in tests to keep results deterministic.
   */
  now?: Date | number;
}

/**
 * Formats how long ago (or, in principle, from now) a value is.
 *
 * Accepts an ISO string, a `Date`, or a Unix millisecond timestamp. Returns
 * {@link INVALID_DATE_FALLBACK} for invalid or missing values.
 */
export function formatRelativeTime(
  value: string | Date | number | null | undefined,
  { locale = 'en-US', now }: FormatRelativeTimeOptions = {},
): string {
  if (value === null || value === undefined || value === '') {
    return INVALID_DATE_FALLBACK;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return INVALID_DATE_FALLBACK;
  }

  const reference = now instanceof Date ? now : now !== undefined ? new Date(now) : new Date();
  if (isNaN(reference.getTime())) {
    return INVALID_DATE_FALLBACK;
  }

  const diffSeconds = (date.getTime() - reference.getTime()) / 1000;
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return 'just now';
  }

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const entry =
      RELATIVE_TIME_UNITS.find((candidate) => absSeconds < candidate.max) ??
      RELATIVE_TIME_UNITS[RELATIVE_TIME_UNITS.length - 1];
    return rtf.format(Math.round(diffSeconds / entry.secondsInUnit), entry.unit);
  } catch {
    return INVALID_DATE_FALLBACK;
  }
}