/**
 * Reusable field validation functions for real-time client-side validation.
 * 
 * Each validator returns:
 * - `null` when the field is valid
 * - An error message string when invalid
 * 
 * These validators are designed to be passed to the `validate` prop of `FormField`
 * for inline, accessible error feedback as users interact with forms.
 */

import { isValidStellarAddress } from './stellarAddress';

/**
 * Creates a required field validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @returns A validator function that checks if the field is non-empty after trimming
 */
export function validateRequired(fieldName: string) {
  return (value: string): string | null => {
    if (!value.trim()) {
      return `${fieldName} is required`;
    }
    return null;
  };
}

/**
 * Creates a maximum length validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @param maxLength - The maximum allowed length
 * @returns A validator function that checks if the field exceeds max length
 */
export function validateMaxLength(fieldName: string, maxLength: number) {
  return (value: string): string | null => {
    if (value.length > maxLength) {
      return `${fieldName} must be no more than ${maxLength} characters`;
    }
    return null;
  };
}

/**
 * Creates a minimum length validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @param minLength - The minimum required length
 * @returns A validator function that checks if the field is too short
 */
export function validateMinLength(fieldName: string, minLength: number) {
  return (value: string): string | null => {
    if (value.trim() && value.length < minLength) {
      return `${fieldName} must be at least ${minLength} characters`;
    }
    return null;
  };
}

/**
 * Creates a positive number validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @returns A validator function that checks if the value is a positive number
 */
export function validatePositiveNumber(fieldName: string) {
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Let required validator handle empty
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
      return `${fieldName} must be a positive number`;
    }
    return null;
  };
}

/**
 * Creates a number range validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns A validator function that checks if the number is within range
 */
export function validateNumberRange(fieldName: string, min: number, max: number) {
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Let required validator handle empty
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed) || !isFinite(parsed)) {
      return `${fieldName} must be a valid number`;
    }
    if (parsed < min || parsed > max) {
      return `${fieldName} must be between ${min.toLocaleString()} and ${max.toLocaleString()}`;
    }
    return null;
  };
}

/**
 * Creates a decimal places validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @param maxDecimals - Maximum allowed decimal places
 * @returns A validator function that checks decimal precision
 */
export function validateDecimalPlaces(fieldName: string, maxDecimals: number) {
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Let required validator handle empty
    }
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1) {
      const decimalPlaces = value.length - decimalIndex - 1;
      if (decimalPlaces > maxDecimals) {
        return `${fieldName} must have at most ${maxDecimals} decimal place${maxDecimals === 1 ? '' : 's'}`;
      }
    }
    return null;
  };
}

/**
 * Creates an email format validator.
 * 
 * @returns A validator function that checks basic email format
 */
export function validateEmail() {
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Let required validator handle empty
    }
    if (!value.trim().includes('@')) {
      return 'Email must be valid';
    }
    return null;
  };
}

/**
 * Creates a Stellar address validator.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @returns A validator function that checks Stellar address format
 */
export function validateStellarAddress(fieldName: string) {
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Let required validator handle empty
    }
    if (!isValidStellarAddress(value)) {
      return `${fieldName} must be a valid Stellar G... address`;
    }
    return null;
  };
}

/**
 * Creates a validator that checks if a value is in an allowed list.
 * 
 * @param fieldName - The human-readable field name for error messages
 * @param allowedValues - Array of allowed values
 * @returns A validator function that checks if value is in the allowed list
 */
export function validateAllowedValues(fieldName: string, allowedValues: readonly string[]) {
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Let required validator handle empty
    }
    if (!allowedValues.includes(value.trim())) {
      return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  };
}

/**
 * Creates a date format validator for milestone due dates.
 * Expected format: "Jun 1, 2025" or "June 01, 2025"
 * 
 * @returns A validator function that checks date format
 */
export function validateDueDate() {
  const DUE_DATE_REGEX =
    /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},\s+\d{4}$/i;
  
  return (value: string): string | null => {
    if (!value.trim()) {
      return null; // Due date is optional
    }
    if (!DUE_DATE_REGEX.test(value.trim())) {
      return 'Due date must be in the format "Jun 1, 2025"';
    }
    return null;
  };
}

/**
 * Combines multiple validators into a single validator function.
 * Validators are run in order; the first error encountered is returned.
 * 
 * @param validators - Array of validator functions to run in sequence
 * @returns A combined validator function
 * 
 * @example
 * ```ts
 * const validateContractName = combineValidators([
 *   validateRequired('Contract name'),
 *   validateMaxLength('Contract name', 200),
 * ]);
 * ```
 */
export function combineValidators(validators: Array<(value: string) => string | null>) {
  return (value: string): string | null => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) {
        return error;
      }
    }
    return null;
  };
}
