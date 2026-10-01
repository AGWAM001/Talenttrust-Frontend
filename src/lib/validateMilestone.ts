import { sanitizeUserText } from './sanitizeUserText';
import type { ValidationError } from './validateLogin';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The maximum number of characters a milestone title may contain after
 * sanitisation (control-char removal + whitespace normalisation).
 *
 * Kept in sync with `MAX_MILESTONE_TITLE_LENGTH` exported from
 * `MilestoneCreationForm` — the form component uses this value so both
 * the UI hint and the validator agree on the ceiling.
 */
export const MAX_MILESTONE_TITLE_LENGTH = 200;

/**
 * The maximum allowed payout value for a single milestone.
 *
 * Set to 10 000 000 (ten million) — a safe upper bound that prevents
 * accidental multi-zero entry while leaving room for large contracts.
 * Mirror this limit on any server-side handler that persists payouts.
 */
export const MAX_PAYOUT_VALUE = 10_000_000;

/**
 * The maximum number of decimal places allowed in a payout value.
 * Two decimal places matches the smallest fiat currency subdivision
 * (cents). XLM supports 7 decimal places natively; we use 2 here to
 * keep the UI consistent with fiat currencies — increase if needed.
 */
export const MAX_PAYOUT_DECIMAL_PLACES = 2;

/**
 * Allowed currency codes the validator will accept.
 * Mirrors the `CURRENCY_OPTIONS` array in `MilestoneCreationForm`.
 */
export const ALLOWED_CURRENCIES = ['USD', 'EUR', 'GBP', 'XLM'] as const;

/**
 * Allowed milestone status values.
 * Mirrors the `STATUS_OPTIONS` array in `MilestoneCreationForm`.
 */
export const ALLOWED_STATUSES = [
  'Pending',
  'Active',
  'Completed',
  'Paid',
  'Disputed',
] as const;

/**
 * Due-date format accepted by the validator.
 *
 * The field is a free-text input that displays the placeholder
 * "Jun 1, 2025". We accept two canonical variants:
 *   - "Jun 1, 2025"  (abbreviated month, single-digit day)
 *   - "Jun 01, 2025" (abbreviated month, zero-padded day)
 *   - "June 1, 2025" (full month name)
 *
 * The regex is intentionally lenient on leading zeros and full-vs-short
 * month names; it rejects clearly garbage strings (e.g. "yesterday",
 * "asap", purely numeric strings) while accepting the valid formats that
 * the UI documents.
 */
const DUE_DATE_REGEX =
  /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}$/i;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The raw string values captured from the Milestone creation form.
 * All values are strings because HTML inputs always yield strings.
 */
export interface MilestoneFormValues {
  /** The display title for the milestone. */
  title: string;
  /**
   * The payout amount as a raw string from the input.
   * Kept as a string to mirror the raw DOM value without pre-transforming.
   */
  payout: string;
  /** The ISO 4217 currency code or blockchain token symbol (e.g. "USD", "XLM"). */
  currency: string;
  /**
   * Optional due date in human-readable format (e.g. "Jun 1, 2025").
   * An empty or whitespace-only string is treated as "not provided" and
   * passes validation.
   */
  dueDate?: string;
  /** Optional status value. When provided it must be one of {@link ALLOWED_STATUSES}. */
  status?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates the milestone creation form fields.
 *
 * Rules applied per field (in priority order — most actionable error first):
 *
 * **title**
 *   1. Required (non-empty after sanitisation).
 *   2. Must not exceed {@link MAX_MILESTONE_TITLE_LENGTH} characters
 *      after sanitisation (over-long → reject, not truncate).
 *
 * **payout**
 *   1. Required (non-empty after trim).
 *   2. Must parse as a finite, positive number.
 *   3. Must not exceed {@link MAX_PAYOUT_VALUE}.
 *   4. Must have at most {@link MAX_PAYOUT_DECIMAL_PLACES} decimal places.
 *
 * **currency**
 *   1. Required (non-empty after trim).
 *   2. Must be one of {@link ALLOWED_CURRENCIES}.
 *
 * **dueDate** (optional)
 *   - When provided and non-empty, must match {@link DUE_DATE_REGEX}
 *     (e.g. "Jun 1, 2025").
 *
 * **status** (optional)
 *   - When provided and non-empty, must be one of {@link ALLOWED_STATUSES}.
 *
 * The function is pure and side-effect-free, safe to call from both the
 * React form component and unit tests without any React context.
 *
 * Time complexity:  O(1) — field count is fixed; all checks are constant-time.
 * Space complexity: O(1) — returned errors array is bounded by the fixed
 *                   number of fields.
 *
 * @param values - Raw string values from the form inputs.
 * @returns An array of {@link ValidationError} objects. An empty array means
 *          the form is valid and can be submitted.
 *
 * @example
 * ```ts
 * validateMilestone({ title: '', payout: '', currency: 'USD' });
 * // [
 * //   { fieldId: 'milestone-title',  message: 'Title is required' },
 * //   { fieldId: 'milestone-payout', message: 'Payout amount is required' },
 * // ]
 *
 * validateMilestone({ title: 'Sprint 1', payout: '5000', currency: 'USD' });
 * // []
 * ```
 */
export function validateMilestone(values: MilestoneFormValues): ValidationError[] {
  const errors: ValidationError[] = [];

  // ── Title ────────────────────────────────────────────────────────────────
  const sanitizedTitle = sanitizeUserText(values.title, MAX_MILESTONE_TITLE_LENGTH);
  // Check the uncapped sanitised value to detect over-length titles rather
  // than silently truncating them (mirrors the inline form logic).
  const fullSanitizedTitle = sanitizeUserText(values.title, Number.MAX_SAFE_INTEGER);

  if (!sanitizedTitle) {
    errors.push({ fieldId: 'milestone-title', message: 'Title is required' });
  } else if (fullSanitizedTitle.length > MAX_MILESTONE_TITLE_LENGTH) {
    errors.push({
      fieldId: 'milestone-title',
      message: `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
    });
  }

  // ── Payout ───────────────────────────────────────────────────────────────
  const rawPayout = (values.payout ?? '').trim();

  if (!rawPayout) {
    errors.push({ fieldId: 'milestone-payout', message: 'Payout amount is required' });
  } else {
    // Require the value to be a purely numeric string (optional leading minus,
    // optional decimal point) before parsing. This rejects inputs like "12abc"
    // that parseFloat would otherwise accept by silently discarding the suffix.
    const NUMERIC_RE = /^-?\d+(\.\d*)?$/;
    const numericPayout = parseFloat(rawPayout);

    if (!NUMERIC_RE.test(rawPayout) || isNaN(numericPayout) || !isFinite(numericPayout) || numericPayout <= 0) {
      errors.push({
        fieldId: 'milestone-payout',
        message: 'Payout must be a positive number',
      });
    } else if (numericPayout > MAX_PAYOUT_VALUE) {
      errors.push({
        fieldId: 'milestone-payout',
        message: `Payout must be no more than ${MAX_PAYOUT_VALUE.toLocaleString()}`,
      });
    } else {
      // Check decimal precision: count digits after the decimal point
      const decimalIndex = rawPayout.indexOf('.');
      if (decimalIndex !== -1) {
        const decimalPlaces = rawPayout.length - decimalIndex - 1;
        if (decimalPlaces > MAX_PAYOUT_DECIMAL_PLACES) {
          errors.push({
            fieldId: 'milestone-payout',
            message: `Payout must have at most ${MAX_PAYOUT_DECIMAL_PLACES} decimal places`,
          });
        }
      }
    }
  }

  // ── Currency ─────────────────────────────────────────────────────────────
  const trimmedCurrency = (values.currency ?? '').trim();

  if (!trimmedCurrency) {
    errors.push({ fieldId: 'milestone-currency', message: 'Currency is required' });
  } else if (!(ALLOWED_CURRENCIES as readonly string[]).includes(trimmedCurrency.toUpperCase())) {
    errors.push({
      fieldId: 'milestone-currency',
      message: `Currency must be one of: ${ALLOWED_CURRENCIES.join(', ')}`,
    });
  }

  // ── Due Date (optional) ──────────────────────────────────────────────────
  const trimmedDueDate = (values.dueDate ?? '').trim();

  if (trimmedDueDate && !DUE_DATE_REGEX.test(trimmedDueDate)) {
    errors.push({
      fieldId: 'milestone-dueDate',
      message: 'Due date must be in the format "Jun 1, 2025"',
    });
  }

  // ── Status (optional) ────────────────────────────────────────────────────
  const trimmedStatus = (values.status ?? '').trim();

  if (trimmedStatus && !(ALLOWED_STATUSES as readonly string[]).includes(trimmedStatus)) {
    errors.push({
      fieldId: 'milestone-status',
      message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }

  return errors;
}
