import type { ValidationError } from './validateLogin';

/**
 * The raw string values captured from the inline-edit form fields for a
 * reputation event. All values are strings because HTML inputs yield strings.
 */
export interface ReputationEventFormValues {
  type: string;
  summary: string;
  date: string;
}

/**
 * Validates the inline-edit fields for a single reputation event.
 *
 * Rules:
 * - `type`: required (non-empty after trim).
 * - `summary`: required (non-empty after trim).
 * - `date`: required (non-empty after trim); must be a parseable ISO-8601
 *   date string when non-empty.
 *
 * The function is pure and side-effect-free so it can be called from both
 * the component and unit tests.
 *
 * @param values - The raw string values from the inline-edit inputs.
 * @returns An array of `ValidationError` objects. An empty array means the
 *          fields are valid and can be saved.
 */
export function validateReputationEvent(
  values: ReputationEventFormValues,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!values.type.trim()) {
    errors.push({ fieldId: 'type', message: 'Type is required' });
  }

  if (!values.summary.trim()) {
    errors.push({ fieldId: 'summary', message: 'Summary is required' });
  }

  if (!values.date.trim()) {
    errors.push({ fieldId: 'date', message: 'Date is required' });
  } else if (Number.isNaN(Date.parse(values.date.trim()))) {
    errors.push({ fieldId: 'date', message: 'Date must be a valid date' });
  }

  return errors;
}
