import { sanitizeUserText } from './sanitizeUserText';
import { ValidationError } from './validateLogin';

/**
 * The maximum allowed length for a milestone title. Mirrors the create form's
 * rule so inline-edit and create flows enforce identical ceilings — a 201-char
 * pasted title is rejected in both surfaces instead of silently truncated.
 *
 * Constant lives here (in the validator) rather than in the form component so
 * no helper or test has to import a constant out of a JSX file. The create
 * form re-exports it for back-compat.
 */
export const MAX_MILESTONE_TITLE_LENGTH = 200;

/**
 * Raw string values captured from the inline milestone-edit form fields.
 *
 * All values are strings because HTML inputs always yield strings; the helper
 * itself never touches the DOM, so callers are responsible for converting
 * numeric outputs to a `number` after validation succeeds.
 */
export interface MilestoneEditFormValues {
  /** The display title for the milestone. */
  title: string;
  /**
   * The payout as a string from the number input. Parsed to a float during
   * validation; kept as a raw string here so we mirror the exact DOM value.
   */
  payout: string;
  /** The ISO 4217 currency code (e.g. "USD", "XLM"). */
  currency: string;
}

/**
 * Validates the inline milestone-edit form fields.
 *
 * Rules (mirrored from `MilestoneCreationForm` so edit and create stay
 * consistent across the app):
 *
 * - `title`: required (non-empty after trim + control-char normalisation); the
 *   *unbounded-sanitised* length must not exceed
 *   {@link MAX_MILESTONE_TITLE_LENGTH} — over-long input is rejected rather
 *   than silently truncated so the user is told to shorten it.
 * - `payout`: required; must parse as a finite number greater than zero.
 * - `currency`: required (non-empty after trim).
 *
 * Validation order per field is **required → length → format** so the most
 * actionable error is surfaced first (a whitespace-only title surfaces the
 * required error before the over-length error).
 *
 * The function is intentionally pure and side-effect-free so it can be called
 * from both the React form component and unit tests without any React
 * context.
 *
 * @param values - The raw string values from the form inputs.
 * @returns An array of `ValidationError` objects. An empty array means the
 *          form is valid and can be saved.
 */
export function validateMilestoneEdit(values: MilestoneEditFormValues): ValidationError[] {
  const errors: ValidationError[] = [];

  const sanitizedTitle = sanitizeUserText(values.title, MAX_MILESTONE_TITLE_LENGTH);
  const unboundedTitle = sanitizeUserText(values.title, Number.MAX_SAFE_INTEGER);
  if (!sanitizedTitle) {
    errors.push({ fieldId: 'milestone-edit-title', message: 'Title is required' });
  } else if (unboundedTitle.length > MAX_MILESTONE_TITLE_LENGTH) {
    errors.push({
      fieldId: 'milestone-edit-title',
      message: `Title must be no more than ${MAX_MILESTONE_TITLE_LENGTH} characters`,
    });
  }

  const trimmedPayout = values.payout.trim();
  const numericPayout = parseFloat(trimmedPayout);
  if (!trimmedPayout) {
    errors.push({ fieldId: 'milestone-edit-payout', message: 'Payout amount is required' });
  } else if (isNaN(numericPayout) || !isFinite(numericPayout) || numericPayout <= 0) {
    errors.push({ fieldId: 'milestone-edit-payout', message: 'Payout must be a positive number' });
  }

  if (!values.currency.trim()) {
    errors.push({ fieldId: 'milestone-edit-currency', message: 'Currency is required' });
  }

  return errors;
}

/**
 * Field id constants used by the inline edit form.
 *
 * Centralising these prevents the validator, the row component, and the tests
 * from drifting out of sync — every reference resolves to the same literal.
 */
export const MILESTONE_EDIT_FIELD_IDS = {
  title: 'milestone-edit-title',
  payout: 'milestone-edit-payout',
  currency: 'milestone-edit-currency',
} as const;

/**
 * Validates the inline milestone-edit form fields.
 *
 * Rules (mirrored from `MilestoneCreationForm` so edit and create stay
 * consistent across the app):
 *
 * - `title`: required (non-empty after trim + control-char normalisation); the
 *   *unbounded-sanitised* length must not exceed
 *   {@link MAX_MILESTONE_TITLE_LENGTH} — over-long input is rejected rather
 *   than silently truncated so the user is told to shorten it.
 * - `payout`: required; must parse as a finite number greater than zero.
 * - `currency`: required (non-empty after trim).
 *
 * Note: `status` is intentionally NOT validated here — the inline `<select>`
 * only renders the canonical `StatusType` options, so the value is bounded by
 * the UI rather than a runtime check. `dueDate` is also intentionally NOT
 * validated — it is an optional free-text field by design.
 *
 * Validation order per field is **required → length → format** so the most
 * actionable error is surfaced first (a whitespace-only title surfaces the
 * required error before the over-length error).
 *
 * The function is intentionally pure and side-effect-free so it can be called
 * from both the React form component and unit tests without any React
 * context.
 *
 * @param values - The raw string values from the form inputs.
 * @returns An array of `ValidationError` objects. An empty array means the
 *          form is valid and can be saved.
 */
