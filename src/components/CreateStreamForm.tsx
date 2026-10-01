'use client';

import React, { FormEvent, useState } from 'react';
import { Skeleton, SkeletonContainer } from '@/components/Skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a new payment stream as filled in by the form. */
export interface StreamFormValues {
  title: string;
  recipient: string;
  ratePerSecond: string;
  currency: string;
}

export interface CreateStreamFormProps {
  /** Called with validated form values on submit. */
  onSubmit: (values: StreamFormValues) => void;
  /** Called when the user cancels without submitting. */
  onCancel?: () => void;
  /**
   * When `true` the form is replaced by a themed loading skeleton.
   * Use while initial data is being fetched to avoid layout shift.
   * @default false
   */
  isLoading?: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type FormErrors = Partial<Record<keyof StreamFormValues, string>>;

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;
const CURRENCIES = ['XLM', 'USDC', 'EURC'] as const;

/** Maps each field to its input `id`, used to focus the first invalid field on submit. */
const FIELD_IDS: Record<keyof StreamFormValues, string> = {
  title: 'stream-title',
  recipient: 'stream-recipient',
  ratePerSecond: 'stream-rate',
  currency: 'stream-currency',
};

function validateStreamForm(values: StreamFormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'Stream title is required.';
  } else if (values.title.trim().length > 200) {
    errors.title = 'Title must be 200 characters or fewer.';
  }

  const normalised = values.recipient.trim().toUpperCase();
  if (!normalised) {
    errors.recipient = 'Recipient address is required.';
  } else if (!STELLAR_ADDRESS_RE.test(normalised)) {
    errors.recipient = 'Enter a valid Stellar public key (starts with G, 56 characters).';
  }

  const rate = parseFloat(values.ratePerSecond);
  if (!values.ratePerSecond.trim()) {
    errors.ratePerSecond = 'Rate per second is required.';
  } else if (isNaN(rate) || rate <= 0) {
    errors.ratePerSecond = 'Rate must be a positive number.';
  }

  if (!values.currency.trim()) {
    errors.currency = 'Currency is required.';
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Skeleton layout
// ---------------------------------------------------------------------------

/**
 * CreateStreamFormSkeleton — themed shimmer that mirrors the form's visual
 * structure so there is no layout shift when real content loads.
 *
 * Exported separately for use in Next.js `loading.tsx` files or Suspense
 * boundaries if needed.
 */
export const CreateStreamFormSkeleton: React.FC = () => (
  <SkeletonContainer
    label="Loading payment stream form"
    className="w-full max-w-lg rounded-2xl border border-[var(--border,theme(colors.slate.200))] bg-[var(--card,white)] p-6 shadow-sm"
  >
    {/* Heading row */}
    <Skeleton width="w-48" height="h-6" rounded="rounded-lg" className="mb-2" />
    {/* Sub-heading */}
    <Skeleton width="w-72" height="h-3" rounded="rounded-md" className="mb-6" />

    {/* Title field label + input */}
    <Skeleton width="w-24" height="h-3" rounded="rounded-md" className="mb-1" />
    <Skeleton width="w-full" height="h-9" rounded="rounded-lg" className="mb-4" />

    {/* Recipient field label + input */}
    <Skeleton width="w-36" height="h-3" rounded="rounded-md" className="mb-1" />
    <Skeleton width="w-full" height="h-9" rounded="rounded-lg" className="mb-4" />

    {/* Rate + Currency row */}
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <Skeleton width="w-24" height="h-3" rounded="rounded-md" className="mb-1" />
        <Skeleton width="w-full" height="h-9" rounded="rounded-lg" />
      </div>
      <div>
        <Skeleton width="w-20" height="h-3" rounded="rounded-md" className="mb-1" />
        <Skeleton width="w-full" height="h-9" rounded="rounded-lg" />
      </div>
    </div>

    {/* Action row */}
    <div className="flex justify-end gap-3">
      <Skeleton width="w-20" height="h-9" rounded="rounded-lg" />
      <Skeleton width="w-28" height="h-9" rounded="rounded-lg" />
    </div>
  </SkeletonContainer>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function modKey(): string {
  if (typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)) {
    return '⌘';
  }
  return 'Ctrl';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CreateStreamForm — accessible form for initiating a Stellar payment stream.
 *
 * Loading state:
 *   Pass `isLoading={true}` to render `CreateStreamFormSkeleton` while data is
 *   fetching. The skeleton mirrors the form layout to avoid layout shift.
 *
 * Keyboard shortcuts:
 *   `Ctrl/⌘ + Enter` — submit the form from any field.
 *   `Escape`          — invoke `onCancel`.
 *
 * Accessibility:
 *   - Each field has an associated `<label>` linked by `id`.
 *   - Error messages use `role="alert"` and are linked via `aria-describedby`.
 *   - Required fields carry `aria-required="true"` and `aria-invalid` on error.
 *   - The loading skeleton uses `role="status"` + `aria-busy="true"`.
 *   - Keyboard shortcut hint is `aria-hidden` — decorative for sighted users.
 *
 * Design tokens:
 *   Uses `--border`, `--card`, `--muted`, `--muted-foreground` CSS variables
 *   so both form and skeleton adapt to light and dark themes automatically.
 */
export const CreateStreamForm: React.FC<CreateStreamFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [values, setValues] = useState<StreamFormValues>({
    title: '',
    recipient: '',
    ratePerSecond: '',
    currency: 'XLM',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const mod = modKey();

  // ── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return <CreateStreamFormSkeleton />;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const set =
    (field: keyof StreamFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateStreamForm(values);
    setErrors(errs);
    const firstErrorField = (Object.keys(errs) as (keyof StreamFormValues)[])[0];
    if (firstErrorField) {
      document.getElementById(FIELD_IDS[firstErrorField])?.focus();
      return;
    }
    onSubmit({
      title: values.title.trim(),
      recipient: values.recipient.trim().toUpperCase(),
      ratePerSecond: values.ratePerSecond.trim(),
      currency: values.currency,
    });
  };

  /** Global keyboard shortcuts scoped to the section. */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section
      aria-labelledby="create-stream-heading"
      className="w-full max-w-lg rounded-2xl border border-[var(--border,theme(colors.slate.200))] bg-[var(--card,white)] p-6 shadow-sm"
      onKeyDown={handleKeyDown}
    >
      <h2
        id="create-stream-heading"
        className="text-xl font-semibold text-[var(--foreground,theme(colors.slate.900))] mb-1"
      >
        Create Payment Stream
      </h2>
      <p className="text-sm text-[var(--muted-foreground,theme(colors.slate.500))] mb-5">
        Set up a continuous Stellar payment stream to a recipient.
      </p>

      <form onSubmit={handleSubmit} noValidate aria-label="Create payment stream">

        {/* ── Stream title ── */}
        <div className="mb-4">
          <label
            htmlFor="stream-title"
            className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
          >
            Stream title <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="stream-title"
            type="text"
            value={values.title}
            onChange={set('title')}
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'stream-title-error' : undefined}
            placeholder="e.g., Weekly design retainer"
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.title
                ? 'border-red-500 bg-red-50'
                : 'border-[var(--border,theme(colors.slate.300))] bg-white',
            ].join(' ')}
          />
          {errors.title && (
            <p id="stream-title-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.title}
            </p>
          )}
        </div>

        {/* ── Recipient address ── */}
        <div className="mb-4">
          <label
            htmlFor="stream-recipient"
            className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
          >
            Recipient address <span aria-hidden="true" className="text-red-500">*</span>
          </label>
          <input
            id="stream-recipient"
            type="text"
            value={values.recipient}
            onChange={set('recipient')}
            aria-required="true"
            aria-invalid={!!errors.recipient}
            aria-describedby={errors.recipient ? 'stream-recipient-error' : undefined}
            placeholder="GABC…"
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm font-mono',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              errors.recipient
                ? 'border-red-500 bg-red-50'
                : 'border-[var(--border,theme(colors.slate.300))] bg-white',
            ].join(' ')}
          />
          {errors.recipient && (
            <p id="stream-recipient-error" role="alert" className="mt-1 text-xs text-red-600">
              {errors.recipient}
            </p>
          )}
        </div>

        {/* ── Rate + Currency ── */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="stream-rate"
              className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
            >
              Rate / second <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <input
              id="stream-rate"
              type="text"
              inputMode="decimal"
              value={values.ratePerSecond}
              onChange={set('ratePerSecond')}
              aria-required="true"
              aria-invalid={!!errors.ratePerSecond}
              aria-describedby={errors.ratePerSecond ? 'stream-rate-error' : undefined}
              placeholder="e.g., 0.001"
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.ratePerSecond
                  ? 'border-red-500 bg-red-50'
                  : 'border-[var(--border,theme(colors.slate.300))] bg-white',
              ].join(' ')}
            />
            {errors.ratePerSecond && (
              <p id="stream-rate-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.ratePerSecond}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="stream-currency"
              className="block text-sm font-medium text-[var(--foreground,theme(colors.slate.900))] mb-1"
            >
              Currency <span aria-hidden="true" className="text-red-500">*</span>
            </label>
            <select
              id="stream-currency"
              value={values.currency}
              onChange={set('currency')}
              aria-required="true"
              aria-invalid={!!errors.currency}
              aria-describedby={errors.currency ? 'stream-currency-error' : undefined}
              className={[
                'w-full rounded-lg border px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.currency
                  ? 'border-red-500 bg-red-50'
                  : 'border-[var(--border,theme(colors.slate.300))] bg-white',
              ].join(' ')}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.currency && (
              <p id="stream-currency-error" role="alert" className="mt-1 text-xs text-red-600">
                {errors.currency}
              </p>
            )}
          </div>
        </div>

        {/* ── Action row ── */}
        <div className="flex items-center justify-between mt-6 gap-3">
          {/* Keyboard shortcut hint — decorative, hidden from AT */}
          <p
            className="hidden sm:block text-xs text-[var(--muted-foreground,theme(colors.slate.500))]"
            aria-hidden="true"
          >
            <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded border border-[var(--border,theme(colors.slate.200))] bg-[var(--card,white)] font-mono text-[0.65rem] shadow-[0_1px_0_var(--border,theme(colors.slate.200))]">
              {mod}
            </kbd>
            {' + '}
            <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded border border-[var(--border,theme(colors.slate.200))] bg-[var(--card,white)] font-mono text-[0.65rem] shadow-[0_1px_0_var(--border,theme(colors.slate.200))]">
              Enter
            </kbd>
            {' to submit'}
          </p>
          {/* Screen-reader-only equivalent of the decorative kbd hint above. */}
          <span className="sr-only" role="img" aria-label={`${mod} plus Enter to submit`} />

          <div className="flex gap-3 ml-auto">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-[var(--border,theme(colors.slate.300))] text-sm font-medium text-[var(--foreground,theme(colors.slate.700))] hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition"
            >
              Create Stream
            </button>
          </div>
        </div>

      </form>
    </section>
  );
};

export default CreateStreamForm;
