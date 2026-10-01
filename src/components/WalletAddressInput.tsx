'use client';

import React, { useCallback, useState } from 'react';
import { FormField } from './FormField';
import { isValidStellarAddress, normalizeStellarAddress } from '@/lib/stellarAddress';

/** A Stellar public key is always exactly 56 characters. */
const STELLAR_ADDRESS_LENGTH = 56;

/**
 * Props for the `WalletAddressInput` component.
 */
export interface WalletAddressInputProps {
  /** The unique identifier for the form control. */
  id: string;
  /** The text content for the label. */
  label: string;
  /** The current value of the input. */
  value: string;
  /** Called when the input value changes. */
  onChange: (value: string) => void;
  /**
   * Optional inline error message from the parent form (e.g. from
   * submit-time validation). When provided, it takes precedence over
   * any internally tracked blur error.
   */
  error?: string;
  /** Optional helper text displayed below the input. */
  helperText?: string;
  /** If true, marks the field as required visually and semantically. */
  required?: boolean;
  /** Placeholder text for the input. */
  placeholder?: string;
  /**
   * Called after every blur event with the current validation result.
   * The parent can use this callback to update its central errors state
   * (e.g. for `ErrorSummary` aggregation).
   */
  onValidation?: (fieldId: string, error: string | null) => void;
}

/**
 * `WalletAddressInput` — a client-side validated wallet address input.
 *
 * Wraps `FormField` and adds real-time Stellar address validation on blur,
 * mirroring the server-side `isValidStellarAddress` checks:
 *
 * 1. **Empty** → "must be provided" (translated to required error)
 * 2. **Format error** → "Must be a valid Stellar G... address"
 * 3. **Valid** → no error
 *
 * Accessibility:
 * - `FormField` wires `aria-invalid`, `aria-describedby`, and a
 *   `role="alert"` error paragraph automatically.
 * - The input normalizes the address to uppercase on blur for
 *   consistency with on-chain representation.
 */
export function WalletAddressInput({
  id,
  label,
  value,
  onChange,
  error: parentError,
  helperText,
  required,
  placeholder = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  onValidation,
}: WalletAddressInputProps) {
  const [internalError, setInternalError] = useState<string | null>(null);

  const handleBlur = useCallback(() => {
    const trimmed = value.trim();
    let validationError: string | null = null;

    if (!trimmed) {
      validationError = required ? `${label} is required` : null;
    } else if (!isValidStellarAddress(value)) {
      validationError = `${label} must be a valid Stellar G... address`;
    }

    setInternalError(validationError);

    // Normalize the address on blur (uppercase, trimmed) so the
    // displayed value matches on-chain representation.
    if (trimmed) {
      const normalized = normalizeStellarAddress(value);
      if (normalized !== value) {
        onChange(normalized);
      }
    }

    onValidation?.(id, validationError);
  }, [value, required, label, onChange, onValidation, id]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (internalError) {
        setInternalError(null);
      }
      onValidation?.(id, null);
      onChange(e.target.value);
    },
    [onChange, internalError, onValidation, id]
  );

  const effectiveError = parentError ?? internalError ?? undefined;

  return (
    <FormField
      id={id}
      label={label}
      error={effectiveError}
      helperText={helperText}
      required={required}
    >
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        maxLength={STELLAR_ADDRESS_LENGTH}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className={
          'w-full rounded-2xl border px-4 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition'
        }
      />
    </FormField>
  );
}

export default WalletAddressInput;
