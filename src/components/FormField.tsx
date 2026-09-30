'use client';

import React from 'react';
import { usePreferences } from '@/lib/preferences';

/**
 * Props for the FormField component.
 */
interface FormFieldProps {
  /** The text content for the label element. */
  label: string;
  /** The unique identifier for the form control. Linked with the label's htmlFor attribute. */
  id: string;
  /** Optional error message. If provided, sets aria-invalid to 'true', applies error styles, and renders a role="alert" message. */
  error?: string;
  /** Optional helper text describing the form field's purpose or constraints. */
  helperText?: string;
  /** The single interactive form element (input, select, textarea, etc.) that will have accessibility props injected. */
  children: React.ReactElement;
  /** If true, renders a visual '*' indicator within the label, hidden from screen readers via aria-hidden="true". */
  required?: boolean;
  /**
   * Optional validation function called on blur and input change.
   * Returns an error message string if invalid, or null if valid.
   * This enables real-time client-side validation with inline error display.
   */
  validate?: (value: string) => string | null;
  /**
   * When true, validation runs on every input change (keystroke).
   * When false (default), validation only runs on blur.
   * Use onChange validation sparingly to avoid disrupting typing flow.
   */
  validateOnChange?: boolean;
}

/**
 * A wrapper component for form fields that provides accessible labels,
 * helper text, and error messages.
 *
 * Accessibility Guarantees & Prop Injection:
 * 1. Child element receives the `id` prop to associate it with the `<label>`'s `htmlFor`.
 * 2. Child element receives `aria-describedby` pointing to the helper text and/or error message IDs when present.
 * 3. Child element's `aria-invalid` attribute flips to `"true"` when there is an error, and `"false"` otherwise.
 * 4. Merges the child's existing `className` and appends error border/ring classes (`border-red-500` etc.) only if an error is present.
 * 5. Appends a visual required indicator (`*`) which is hidden from screen readers with `aria-hidden="true"`.
 * 6. Renders the error message with `role="alert"` for direct announcements to assistive technologies.
 */
const SPACING = {
  comfortable: {
    field: 'mb-4',
    label: 'mb-1',
    message: 'mt-1',
  },
  compact: {
    field: 'mb-2',
    label: 'mb-0.5',
    message: 'mt-0.5',
  },
} as const;

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id,
  error,
  helperText,
  children,
  required,
  validate,
  validateOnChange = false,
}) => {
  const { preferences } = usePreferences();
  const spacing = SPACING[preferences.formDensity];
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const [internalError, setInternalError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (error !== undefined) {
      setInternalError(null);
    }
  }, [error]);
  
  // Prefer parent-provided error over internal validation error
  const effectiveError = error || internalError || undefined;
  
  // Combine IDs for aria-describedby
  const describedBy = [
    effectiveError ? errorId : null,
    helperText ? helperId : null,
  ]
    .filter(Boolean)
    .join(' ');

  // Detect if the field is required via FormField prop or child element attributes
  const isRequired = !!(
    required ||
    (children.props as any).required ||
    (children.props as any)['aria-required'] === 'true' ||
    (children.props as any)['aria-required'] === true
  );

  // Handle blur validation
  const handleBlur = React.useCallback((e: React.FocusEvent<HTMLElement>) => {
    if (validate) {
      const value = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
      const validationError = validate(value);
      setInternalError(validationError);
    }
    // Call original onBlur if it exists
    if ((children.props as any).onBlur) {
      (children.props as any).onBlur(e);
    }
  }, [validate, children.props]);

  // Handle change validation (if enabled)
  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLElement>) => {
    if (validate && validateOnChange) {
      const value = (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
      const validationError = validate(value);
      setInternalError(validationError);
    } else if (internalError) {
      // Clear error on change so user gets immediate feedback when fixing
      setInternalError(null);
    }
    // Call original onChange if it exists
    if ((children.props as any).onChange) {
      (children.props as any).onChange(e);
    }
  }, [validate, validateOnChange, internalError, children.props]);

  // Inject accessibility props and validation handlers into the child element
  const child = React.cloneElement(children, {
    id,
    'aria-describedby': describedBy || undefined,
    'aria-invalid': effectiveError ? 'true' : 'false',
    'aria-required': isRequired ? 'true' : undefined,
    className: `${(children.props as any).className || ''} ${
      effectiveError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
    }`.trim(),
    onBlur: handleBlur,
    onChange: handleChange,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <div className={`${spacing.field} w-full`}>
      <label
        htmlFor={id}
        className={`block text-sm font-medium text-gray-700 ${spacing.label}`}
      >
        {label}
        {isRequired && (
          <span className="text-red-500 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {child}
      {helperText && (
        <p id={helperId} className={`${spacing.message} text-sm text-gray-500`}>
          {helperText}
        </p>
      )}
      {effectiveError && (
        <p id={errorId} className={`${spacing.message} text-sm text-red-600 font-medium`} role="alert">
          {effectiveError}
        </p>
      )}
    </div>
  );
};
