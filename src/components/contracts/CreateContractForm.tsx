'use client';

import React, { useCallback, useRef, useState } from 'react';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { WalletAddressInput } from '@/components/WalletAddressInput';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { useToast } from '@/components/toast/toast-provider';
import { saveContract } from '@/lib/repository';
import { normalizeStellarAddress } from '@/lib/stellarAddress';
import { validateContract } from '@/lib/validateContract';
import { combineValidators, validateRequired, validatePositiveNumber } from '@/lib/fieldValidators';
import type { ValidationError } from '@/lib/validateLogin';
import type { Contract } from '@/types/domain';

/**
 * Props for the `CreateContractForm` component.
 */
export interface CreateContractFormProps {
  /**
   * Called with the newly constructed and persisted `Contract` object
   * immediately after a successful form submission.
   * The parent is responsible for updating its own state (e.g. re-reading
   * from localStorage) and dismissing the form.
   */
  onSuccess: (contract: Contract) => void;
  /**
   * Called when the user presses the Cancel button without submitting.
   * The parent is responsible for hiding the form.
   */
  onCancel: () => void;
}

/** Supported currency options presented in the currency selector. */
const CURRENCY_OPTIONS = ['USD', 'XLM', 'EUR', 'GBP'] as const;

/**
 * `CreateContractForm` — an accessible, validated modal form for creating
 * a new TalentTrust escrow contract.
 *
 * Accessibility contract:
 * - It renders as a `role="dialog"` / `aria-modal="true"` overlay.
 * - Focus is trapped inside the dialog and cycles through all focusable
 *   elements via Tab / Shift+Tab.
 * - Pressing Escape calls `onCancel`.
 * - On close, focus returns to the trigger element that opened the form.
 * - The form is labelled by a visible `<h2>` via `aria-labelledby`.
 * - Every field is wrapped in `FormField`, which wires `<label>`,
 *   `aria-invalid`, and `aria-describedby` automatically.
 * - On validation failure, `ErrorSummary` is rendered and auto-focused
 *   via its own internal `useEffect`, moving screen reader focus to the
 *   error digest without an explicit `ref` here.
 * - Success is communicated through a polite `useToast` notification;
 *   no `alert()` is used.
 */
const CreateContractForm: React.FC<CreateContractFormProps> = ({ onSuccess, onCancel }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const contractNameRef = useRef<HTMLInputElement>(null);
  const { showSuccess } = useToast();

  useDialogFocusTrap({
    isOpen: true,
    dialogRef,
    initialFocusRef: contractNameRef,
    onEscape: onCancel,
    restoreFocus: true,
  });

  const [contractName, setContractName] = useState('');
  const [freelancerAddress, setFreelancerAddress] = useState('');
  const [totalValue, setTotalValue] = useState('');
  const [currency, setCurrency] = useState<string>(CURRENCY_OPTIONS[0]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Inline validators for real-time validation
  const validateContractName = combineValidators([
    validateRequired('Contract name'),
  ]);

  const validateTotalValueField = combineValidators([
    validateRequired('Total value'),
    validatePositiveNumber('Total value'),
  ]);

  const validateCurrencyField = combineValidators([
    validateRequired('Currency'),
  ]);

  /**
   * Called by WalletAddressInput on blur to update the parent's errors
   * state so ErrorSummary stays in sync with the inline error.
   */
  const handleWalletValidation = useCallback(
    (fieldId: string, error: string | null) => {
      setErrors((prev) => {
        const filtered = prev.filter((e) => e.fieldId !== fieldId);
        if (error) {
          return [...filtered, { fieldId, message: error }];
        }
        return filtered;
      });
    },
    []
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasSubmitted(true);

    const validationErrors = validateContract({
      contractName,
      freelancerAddress,
      totalValue,
      currency,
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear any previous errors before persisting.
    setErrors([]);

    const contract: Contract = {
      id: crypto.randomUUID(),
      contractName: contractName.trim(),
      parties: [
        { label: 'Client', address: 'TalentTrust Client' },
        { label: 'Freelancer', address: normalizeStellarAddress(freelancerAddress) },
      ],
      totalValue: parseFloat(totalValue),
      currency,
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      updatedAt: new Date().toISOString(),
      milestoneCount: 0,
    };

    saveContract(contract);
    showSuccess({ title: 'Contract created', description: `"${contract.contractName}" has been saved.` });
    onSuccess(contract);
  };

  // Check if the form has any validation errors to disable submit button
  const hasErrors = () => {
    if (!hasSubmitted) return false;
    
    const allErrors = validateContract({
      contractName,
      freelancerAddress,
      totalValue,
      currency,
    });
    
    return allErrors.length > 0;
  };

  const inputClass =
    'w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition';

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-contract-heading"
      onClick={onCancel}
    >
      {/* Stop click propagation so clicking inside the form does not dismiss */}
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="create-contract-heading"
          className="text-xl font-semibold text-slate-900 mb-6"
        >
          Create a new contract
        </h2>

        <ErrorSummary errors={errors} />

        <form onSubmit={handleSubmit} noValidate>
          <FormField
            id="contractName"
            label="Contract name"
            error={errors.find((e) => e.fieldId === 'contractName')?.message}
            validate={validateContractName}
            required
          >
            <input
              ref={contractNameRef}
              type="text"
              value={contractName}
              onChange={(e) => {
                setContractName(e.target.value);
                setErrors((prev) => prev.filter((err) => err.fieldId !== 'contractName'));
              }}
              placeholder="e.g. Website Redesign"
              autoComplete="off"
              className={inputClass}
            />
          </FormField>

          <WalletAddressInput
            id="freelancerAddress"
            label="Freelancer Stellar address"
            helperText="Must be a valid Stellar public key starting with G"
            value={freelancerAddress}
            onChange={setFreelancerAddress}
            error={errors.find((e) => e.fieldId === 'freelancerAddress')?.message}
            required
            onValidation={handleWalletValidation}
          />

          <FormField
            id="totalValue"
            label="Total value"
            error={errors.find((e) => e.fieldId === 'totalValue')?.message}
            validate={validateTotalValueField}
            required
          >
            <input
              type="number"
              value={totalValue}
              onChange={(e) => {
                setTotalValue(e.target.value);
                setErrors((prev) => prev.filter((err) => err.fieldId !== 'totalValue'));
              }}
              placeholder="0.00"
              min="0.01"
              step="any"
              className={inputClass}
            />
          </FormField>

          <FormField
            id="currency"
            label="Currency"
            error={errors.find((e) => e.fieldId === 'currency')?.message}
            validate={validateCurrencyField}
            required
          >
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setErrors((prev) => prev.filter((err) => err.fieldId !== 'currency'));
              }}
              className={inputClass}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FormField>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={hasSubmitted && hasErrors()}
              className="rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Contract
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateContractForm;
