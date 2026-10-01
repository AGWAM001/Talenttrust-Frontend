# Forms Component API Reference

> **Issue:** Closes #859 — Add a component API reference for forms.
> **Status:** Authoritative reference for every form-related component in this repository. Each prop table below is verified against the current `main` source.

This entry consolidates the props, types, and minimal usage examples for every form-related React component exposed by the application. It complements the existing per-component documentation under [`docs/components/`](./):

- [`ContractCreationForm.md`](./ContractCreationForm.md) — modal form with a dynamic parties array.
- [`MilestoneCreationForm.md`](./MilestoneCreationForm.md) — modal form for adding milestones (uses shared dialog focus trap).
- [`docs/Walkthrough.md`](../walkthrough.md) — milestones creation flow walkthrough.

Per-page details (validation rules, accessibility narrative, and test catalogue) live in those individual documents. **This file is the single canonical place to look up prop signatures.**

## Components at a glance

| Component | Source | Purpose |
| --- | --- | --- |
| [`FormField`](#formfield) | `src/components/FormField.tsx` | Accessible wrapper that injects `<label>`, `aria-invalid`, `aria-describedby`, and the required indicator into a single form control. |
| [`ErrorSummary`](#errorsummary) | `src/components/ErrorSummary.tsx` | Top-of-form error digest that auto-focuses and links to each invalid field. |
| [`ContractCreationForm`](#contractcreationform) | `src/components/ContractCreationForm.tsx` | Modal form for creating a contract with a dynamic parties list. |
| [`CreateContractForm`](#createcontractform) | `src/components/contracts/CreateContractForm.tsx` | Inline form for creating an escrow contract (single freelancer). |
| [`MilestoneCreationForm`](#milestonecreationform) | `src/components/milestones/MilestoneCreationForm.tsx` | Modal form for creating a milestone. |
| [`WalletAddressInput`](#walletaddressinput) | `src/components/WalletAddressInput.tsx` | Validating Stellar-address input wrapped around `FormField`. |
| [`ConfirmDialog`](#confirmdialog) | `src/components/ConfirmDialog.tsx` | Accessible confirmation prompt that gates destructive form-adjacent actions. |

---

## `FormField`

A wrapper around a single form control (`<input>`, `<select>`, `<textarea>`, etc.). Receives accessibility props through `React.cloneElement` so children inherit the correct `id`, `aria-invalid`, `aria-describedby`, and the required indicator.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | `string` | Yes | Text rendered inside the associated `<label>` (the child receives the matching `id`). |
| `id` | `string` | Yes | Unique identifier used for the `<label htmlFor>`, the helper/error element ids, and the cloned child. |
| `error` | `string` | No | When present, renders a `role="alert"` paragraph, flips `aria-invalid` to `"true"`, and appends `border-red-500`/`focus:ring-red-500` classes to the child. |
| `helperText` | `string` | No | Descriptive text rendered below the input. Joined into `aria-describedby` alongside the error id when both are present. |
| `children` | `React.ReactElement` | Yes | A single interactive form control. The control receives the cloned accessibility props automatically. |
| `required` | `boolean` | No | When true (or when the child declares `required` / `aria-required`), renders a visual `*` indicator (`aria-hidden="true"`) and sets `aria-required="true"` on the child. |

### Accessibility guarantees

1. `<label htmlFor>` is wired to the child's `id`.
2. `aria-describedby` lists both the error id (`${id}-error`) and helper id (`${id}-helper`) when present, space-separated.
3. `aria-invalid` flips between `"true"` and `"false"` based on the `error` prop.
4. The required-indicator `*` is visual-only; `aria-hidden="true"` keeps it out of the screen-reader announcement.
5. Error messages always render with `role="alert"`.

### Minimal usage

```tsx
import { FormField } from '@/components/FormField';

<FormField id="email" label="Email" helperText="We never share your address" required>
  <input type="email" autoComplete="email" />
</FormField>
```

---

## `ErrorSummary`

Top-of-form error digest that becomes visible whenever the parent supplies one or more `{ fieldId, message }` entries. On mount with errors it auto-focuses its inner heading so a screen-reader user hears the digest immediately.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `errors` | `{ fieldId: string; message: string }[]` | Yes | Validation errors collected by the parent. Rendered nothing when the array is empty. |

### Behaviour

- The element renders with `role="alert"`, `aria-labelledby="error-summary-title"`, and `tabIndex={-1}`.
- On mount, when `errors.length > 0`, it calls `.focus()` on its container so assistive technologies announce the summary without manual focus management from the parent form.
- Each error becomes an anchor link (`<a href="#${fieldId}">`) so keyboard users can jump straight to the offending field.

### Minimal usage

```tsx
import { ErrorSummary } from '@/components/ErrorSummary';

const [errors, setErrors] = useState<
  Array<{ fieldId: string; message: string }>
>([]);

<ErrorSummary errors={errors} />
```

---

## `ContractCreationForm`

Modal form that collects contract details and a dynamic list of parties (label + Stellar address). Self-validates on submit and surfaces every failure through `ErrorSummary`.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(contract: Contract) => void` | Yes | Called with the constructed `Contract` when validation passes. The parent controls form dismissal — the modal does not auto-close. |
| `onCancel` | `() => void` | Yes | Called when the user presses the modal **Cancel** button or closes the overlay. |

### Required constants

- `MAX_CONTRACT_NAME_LENGTH = 200` — exported alongside the component.
- `MAX_PARTY_LABEL_LENGTH = 100` — exported alongside the component.
- `ContractFormData` — internal editing shape (string `totalValue` while the user types).

### Minimal usage

```tsx
import { ContractCreationForm } from '@/components/ContractCreationForm';
import type { Contract } from '@/types/domain';

const handleSubmit = (contract: Contract) => {
  // persist + close form here
};

<ContractCreationForm onSubmit={handleSubmit} onCancel={() => setOpen(false)} />
```

See [`docs/components/ContractCreationForm.md`](./ContractCreationForm.md) for the full validation rule list and the `Contract` payload shape.

---

## `CreateContractForm`

Inline (non-modal) variant of the contract form. Built around the shared `validateContract` helper and uses `WalletAddressInput` for the freelancer Stellar address. On success it persists the contract and announces a polite toast before calling back into the parent.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `onSuccess` | `(contract: Contract) => void` | Yes | Called with the persisted `Contract` immediately after `saveContract`. The parent should refresh its own state (e.g. re-reading from localStorage) and dismiss the form. |
| `onCancel` | `() => void` | Yes | Called when the user presses the **Cancel** button. |

### Supported currency options (private)

`['USD', 'XLM', 'EUR', 'GBP']` — defined as the `CURRENCY_OPTIONS` tuple inside the module.

### Minimal usage

```tsx
import CreateContractForm from '@/components/contracts/CreateContractForm';
import type { Contract } from '@/types/domain';

<CreateContractForm
  onSuccess={(contract: Contract) => setContracts((prev) => [...prev, contract])}
  onCancel={() => setShowForm(false)}
/>
```

---

## `MilestoneCreationForm`

Modal form for adding a single milestone to a contract. Mirrors the accessibility pattern of `ContractCreationForm` and shares `useDialogFocusTrap`, including focus restoration after close.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `onSubmit` | `(milestone: Milestone) => void` | Yes | Called with the constructed `Milestone` when validation passes. |
| `onCancel` | `() => void` | Yes | Called when the user presses **Cancel** or dismisses the dialog. |
| `contractId` | `string` | No | Stamped onto the constructed `Milestone` so `listMilestonesByContract` can later resolve the milestone back to its parent contract. |

### Required constants

- `MAX_MILESTONE_TITLE_LENGTH = 200` — exported alongside the component.

### Internal options

- `STATUS_OPTIONS`: `'Pending' | 'Active' | 'Completed' | 'Paid' | 'Disputed'`.
- `CURRENCY_OPTIONS`: `'USD' | 'EUR' | 'GBP' | 'XLM'` (defaults to `'USD'`).

### Stable id scheme

The form generates `Milestone.id` from a slug of the sanitized title plus `Date.now()`:
`${slug}-${Date.now()}`. Duplicate titles therefore never collide across sessions.

### Minimal usage

```tsx
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';

<MilestoneCreationForm
  onSubmit={(milestone) => saveMilestone(milestone)}
  onCancel={() => setShowForm(false)}
  contractId={contract.id}
/>
```

See [`docs/components/MilestoneCreationForm.md`](./MilestoneCreationForm.md) for the full status semantics and persistence contract.

---

## `WalletAddressInput`

A `FormField`-wrapped input that performs client-side Stellar address validation on blur and normalizes the value to uppercase. Designed to be used as a drop-in replacement for a manual `<input>` inside any form (currently mounted inside `CreateContractForm`).

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique identifier, propagated to the underlying input. |
| `label` | `string` | Yes | Label text (rendered through `FormField`). |
| `value` | `string` | Yes | Current input value. |
| `onChange` | `(value: string) => void` | Yes | Called on every keystroke and (after blur) once with the normalized address. |
| `error` | `string` | No | Parent-supplied submit-time error. When present, it takes precedence over any blur error tracked locally. |
| `helperText` | `string` | No | Helper text rendered below the input. |
| `required` | `boolean` | No | Marks the field visually and semantically required. |
| `placeholder` | `string` | No | Placeholder text. Defaults to `'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'`. |
| `onValidation` | `(fieldId: string, error: string \| null) => void` | No | Called after every blur event so the parent can mirror the validation result into a central `ErrorSummary` errors array. |

### Validation rules

On blur:

1. **Empty** → reports a required error when `required` is true.
2. **Non-empty but not a valid Stellar address** → reports a "Must be a valid Stellar G… address" error.
3. **Valid** → reports `null`.

On blur, the value is also normalized (uppercased + trimmed) and propagated back through `onChange` if it changed.

### Minimal usage

```tsx
import { WalletAddressInput } from '@/components/WalletAddressInput';

<WalletAddressInput
  id="freelancerAddress"
  label="Freelancer Stellar address"
  value={address}
  onChange={setAddress}
  required
  helperText="Must be a valid Stellar public key starting with G"
  onValidation={(fieldId, error) =>
    setErrors((prev) => {
      const next = prev.filter((e) => e.fieldId !== fieldId);
      return error ? [...next, { fieldId, message: error }] : next;
    })
  }
/>
```

---

## `ConfirmDialog`

Accessible confirmation prompt that gates destructive actions (e.g. Release Funds / Dispute from [`ActionPanel`](./ActionPanel.md)). Not a "form" in the `<form>` sense but is part of the form-adjacent action surface and is therefore included here for completeness.

### Props

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `isOpen` | `boolean` | Yes | Controls mounting of the overlay and dialog body. |
| `title` | `string` | Yes | Dialog heading (id generated via `useId`). |
| `description` | `string` | Yes | Body copy of the dialog (id generated via `useId`). |
| `confirmLabel` | `string` | No | Label of the confirm button. Default: `'Confirm'`. |
| `cancelLabel` | `string` | No | Label of the cancel button. Default: `'Cancel'`. |
| `tone` | `'default' \| 'destructive'` | No | Selects `'dialog'` vs `'alertdialog'`. Default: `'default'`. |
| `onConfirm` | `() => void` | Yes | Called when the confirm button is pressed. |
| `onCancel` | `() => void` | Yes | Called when the cancel button, Escape, or the backdrop click fires. |

### Accessibility guarantees

- Focus is moved to the cancel button when the dialog opens.
- Focus is trapped within the dialog while open.
- Escape triggers `onCancel`.
- While open, all sibling DOM under the body that is not the overlay is marked `aria-hidden="true"` and `inert` so background content is not interactable or announced.
- Title and description ids are generated via `useId`, so multiple stacked dialogs never collide.
- After closing, focus restoration is the caller's responsibility (see [`ActionPanel.md`](./ActionPanel.md) for the canonical pattern).

### Minimal usage

```tsx
import { ConfirmDialog } from '@/components/ConfirmDialog';

<ConfirmDialog
  isOpen={open}
  title="Release funds?"
  description="Released funds cannot be returned to the escrow."
  tone="destructive"
  confirmLabel="Release funds"
  onConfirm={() => releaseFunds()}
  onCancel={() => setOpen(false)}
/>
```

---

## Putting it together — minimal end-to-end forms example

The smallest "forms flow" the app supports is a `CreateContractForm` mounted inline on a contracts page, with `ErrorSummary` and `FormField` wired up by the component itself, and a `ConfirmDialog` gating an irreversible action. The example below is intentionally compact but 100% accurate to the current API.

> **Provider tree assumption:** `CreateContractForm` internally calls `useToast()` for success messaging. Copy-pasting this snippet outside the existing root layout requires the page subtree to be wrapped in [`<ToastProvider>`](./Toast.md) (or the app's default `WalletProvider` → `ToastProvider` → `PreferencesProvider` stack defined in `src/app/layout.tsx`). The example below focuses on the form surface and does not render that provider explicitly.

```tsx
'use client';

import { useState } from 'react';
import CreateContractForm from '@/components/contracts/CreateContractForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import type { Contract } from '@/types/domain';

export function ContractsPage() {
  const [showForm, setShowForm] = useState(true);
  const [confirmingPublish, setConfirmingPublish] = useState<Contract | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  return (
    <>
      {showForm && (
        <CreateContractForm
          onSuccess={(contract) => setConfirmingPublish(contract)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <section aria-label="Publish options" className="mt-6">
        <ErrorSummary
          errors={
            agreedToTerms
              ? []
              : [{ fieldId: 'agree', message: 'You must accept the terms before publishing.' }]
          }
        />
        <FormField id="agree" label="I accept the contract terms" required>
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
          />
        </FormField>
      </section>

      <ConfirmDialog
        isOpen={confirmingPublish !== null}
        title="Publish contract?"
        description="Once published, the contract is visible to the freelancer and immutable."
        tone="destructive"
        confirmLabel="Publish"
        cancelLabel="Keep editing"
        onConfirm={() => {
          // publish to ledger here
          setConfirmingPublish(null);
          setShowForm(false);
        }}
        onCancel={() => setConfirmingPublish(null)}
      />
    </>
  );
}
```

---

## Test catalogue

These components are covered by the existing test suite. When you change a prop signature, update the matching per-component doc and ensure the listed tests still pass.

| Component | Test files |
| --- | --- |
| `FormField` | `src/components/FormValidation.test.tsx`, `src/components/__tests__/FormField.test.tsx`, `src/components/__tests__/FormFieldRequired.test.tsx` |
| `ErrorSummary` | `src/components/FormValidation.test.tsx`, `src/components/__tests__/ErrorSummary.test.tsx` |
| `ContractCreationForm` | `src/components/__tests__/ContractCreationForm.test.tsx` |
| `CreateContractForm` | `src/components/contracts/__tests__/CreateContractForm.test.tsx` |
| `MilestoneCreationForm` | `src/components/milestones/MilestoneCreationForm.test.tsx`, `src/components/__tests__/MilestoneDialogFocus.test.tsx` |
| `WalletAddressInput` | `src/components/__tests__/WalletAddressInput.test.tsx` |
| `ConfirmDialog` | `src/components/__tests__/ConfirmDialog.test.tsx` |
| Cascading validation tests | `src/lib/validateContract.test.ts`, `src/lib/validateLogin.test.ts`, `src/lib/sanitizeUserText.test.ts`, `src/lib/dueSoon.test.ts` |

A docs-coverage test (`src/components/__tests__/FormsApiDocs.test.tsx`) walks this file at test time and asserts every required prop and component listed above still resolves against the current source — see "Keeping this doc accurate" below.

---

## Keeping this doc accurate

When any component listed above gains, removes, or renames a prop, **update both this table and the relevant per-component doc in the same PR**. The change is incomplete if either file is out of sync with `src/components/`.

Recommended checks before opening a docs PR:

```bash
npm run lint
npm test -- src/components/__tests__/FormsApiDocs.test.tsx
npm test
npm run build
```

If any of these fail because the API drifted, regenerate the table above first; the docs-coverage test will surface the missing entry.
