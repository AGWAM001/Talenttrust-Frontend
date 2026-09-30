# Forms Usage Guide

## Overview

TalentTrust provides a set of accessible, validated form components for creating contracts, milestones, and authenticating users. All forms share a common design system built around `FormField` for input wrapping and `ErrorSummary` for accessible error reporting.

This guide covers every form component in the application, their props, validation rules, common patterns, and integration with the persistence layer.

---

## Table of Contents

1. [Shared Components](#shared-components)
   - [FormField](#formfield)
   - [ErrorSummary](#errorsummary)
2. [Form Components](#form-components)
   - [ContractCreationForm](#contractcreationform)
   - [CreateContractForm (inline)](#createcontractform-inline)
   - [MilestoneCreationForm](#milestonecreationform)
   - [Sign-in Form](#sign-in-form-home-page)
3. [Validation Utilities](#validation-utilities)
4. [Common Patterns](#common-patterns)

---

## Shared Components

### FormField

A reusable wrapper for form controls that provides accessible labels, helper text, required markers, and error messages.

#### Location

`src/components/FormField.tsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | Yes | Text content for the `<label>` element |
| `id` | `string` | Yes | Unique identifier, linked with the label's `htmlFor` attribute |
| `error` | `string` | No | Error message. Sets `aria-invalid="true"`, applies error styling, and renders a `role="alert"` message |
| `helperText` | `string` | No | Descriptive text about the field's purpose or constraints |
| `children` | `React.ReactElement` | Yes | The single interactive form control (input, select, textarea, etc.) |
| `required` | `boolean` | No | If true, renders a visual `*` indicator (hidden from screen readers via `aria-hidden="true"`) |

#### Accessibility Prop Injection

`FormField` clones the child element and automatically injects:

| Child Prop | Injected Value | Condition |
|------------|----------------|-----------|
| `id` | The `id` prop value | Always |
| `aria-describedby` | `"{id}-error {id}-helper"` | When `error` and/or `helperText` are provided |
| `aria-invalid` | `"true"` or `"false"` | `"true"` when `error` is present |
| `aria-required` | `"true"` or `"false"` | `"true"` when `required` is true or child has `required`/`aria-required` attribute |
| `className` | Merged with `border-red-500 focus:ring-red-500 focus:border-red-500` | Only when `error` is present |

#### Usage Examples

**Basic input:**

```tsx
<FormField label="Contract Name" id="contractName" required>
  <input
    type="text"
    value={name}
    onChange={e => setName(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2"
    placeholder="e.g., Website Redesign"
  />
</FormField>
```

**With error state:**

```tsx
<FormField
  label="Email"
  id="email"
  error={errors.find(e => e.fieldId === 'email')?.message}
  required
>
  <input
    type="email"
    value={email}
    onChange={e => setEmail(e.target.value)}
    className="w-full px-4 py-2.5 rounded-xl border border-slate-200"
    placeholder="you@example.com"
  />
</FormField>
```

**With helper text:**

```tsx
<FormField
  label="Stellar Address"
  id="party-address-0"
  helperText="56-character address starting with G"
  required
>
  <input
    type="text"
    value={address}
    onChange={e => setAddress(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
    placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  />
</FormField>
```

**Select dropdown:**

```tsx
<FormField label="Currency" id="currency" required>
  <select
    value={currency}
    onChange={e => setCurrency(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2"
  >
    <option value="USD">USD</option>
    <option value="EUR">EUR</option>
    <option value="GBP">GBP</option>
    <option value="XLM">XLM</option>
  </select>
</FormField>
```

---

### ErrorSummary

An accessible error summary component rendered at the top of forms when validation fails. It provides anchor links to each invalid field for keyboard and screen-reader navigation.

#### Location

`src/components/ErrorSummary.tsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `errors` | `{ fieldId: string; message: string }[]` | Yes | Array of validation errors. Empty array renders nothing |

#### Behavior

- **Renders nothing** when `errors` is an empty array (`null` returned).
- **`role="alert"`** — ARIA live region so screen readers announce errors immediately.
- **`tabIndex={-1}` + auto-focus** — a `useEffect` calls `focus()` whenever `errors.length` transitions from 0 to positive, or when the error list changes.
- **Anchor links** — each error renders an `<a href="#fieldId">` pointing to the associated input for quick navigation.
- **Visual styling** — red left border, light red background, bold heading "There is a problem".

#### Integration Pattern

Every form in the application follows the same pattern:

```tsx
const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  const validationErrors = validateForm();
  setErrors(validationErrors);
  if (validationErrors.length > 0) return;

  // Proceed with submission...
};

return (
  <form onSubmit={handleSubmit} noValidate>
    <ErrorSummary errors={errors} />
    {/* Form fields... */}
  </form>
);
```

---

## Form Components

### ContractCreationForm

An accessible modal form for creating new contracts. Collects contract name, parties (with Stellar addresses), total value, and currency.

#### Location

`src/components/ContractCreationForm.tsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(contract: Contract) => void` | Yes | Called with validated contract data on successful submit |
| `onCancel` | `() => void` | Yes | Called when the user cancels |

#### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Contract Name | Text | Yes | Non-empty after trim; max 200 characters |
| Total Value | Text (numeric) | Yes | Must be a positive number |
| Currency | Select | Yes | Options: USD, EUR, GBP, XLM (default: USD) |
| Parties (min 2) | Dynamic list | Yes | Each party needs label + valid Stellar address; "Add Another Party" button; removal when > 2 |

#### Usage Example

```tsx
import { useState } from 'react';
import { ContractCreationForm } from '@/components/ContractCreationForm';
import { saveContract, listContracts } from '@/lib/repository';

function ContractsPage() {
  const [showForm, setShowForm] = useState(false);
  const [contracts, setContracts] = useState(() => listContracts());

  const handleSubmit = (contract) => {
    saveContract(contract);
    setContracts(listContracts());
    setShowForm(false);
  };

  return (
    <>
      <button onClick={() => setShowForm(true)}>Create Contract</button>

      {showForm && (
        <ContractCreationForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
}
```

#### Data Shape (Submitted Contract)

```typescript
{
  contractName: string;       // Trimmed, sanitized
  parties: {                  // Filtered to filled entries only
    label: string;
    address: string;          // Validated Stellar G... address
  }[];
  totalValue: number;         // Parsed from string
  currency: string;           // One of: USD, EUR, GBP, XLM
  status: 'Pending';
  createdAt: string;          // Formatted as "MMM DD, YYYY"
  milestoneCount: 0;
}
```

#### Accessibility Features

- Modal `role="dialog"` with `aria-modal="true"` and `aria-labelledby`
- `ErrorSummary` receives focus on validation failure
- Field-level `aria-invalid` and `aria-describedby`
- Party remove buttons labeled with `aria-label`
- Keyboard-navigable modal overlay

---

### CreateContractForm (inline)

An accessible, validated inline form for creating a TalentTrust escrow contract. Uses `WalletAddressInput` for Stellar address validation and fires a toast notification on success.

#### Location

`src/components/contracts/CreateContractForm.tsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSuccess` | `(contract: Contract) => void` | Yes | Called with the persisted contract after successful submission |
| `onCancel` | `() => void` | Yes | Called when the user presses Cancel |

#### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Contract Name | Text | Yes | Non-empty after trim |
| Freelancer Stellar Address | Text (with WalletAddressInput) | Yes | Must be a valid Stellar G... address (56 chars, base32 alphabet); validated on blur |
| Total Value | Number | Yes | Must be a positive number; `min="0.01"`, `step="any"` |
| Currency | Select | Yes | Options: USD, XLM, EUR, GBP (default: USD) |

#### Usage Example

```tsx
import { useState } from 'react';
import CreateContractForm from '@/components/contracts/CreateContractForm';
import type { Contract } from '@/types/domain';

function ContractPage() {
  const [showForm, setShowForm] = useState(true);

  return (
    <>
      {showForm && (
        <CreateContractForm
          onSuccess={(contract: Contract) => {
            // Update parent state, dismiss form
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
}
```

#### Key Differences from ContractCreationForm

| Aspect | ContractCreationForm | CreateContractForm |
|--------|---------------------|-------------------|
| Layout | Modal dialog | Inline section |
| Address input | Plain text input with `isValidStellarAddress` | `WalletAddressInput` with blur validation + normalization |
| Validation | Inline in component | Delegated to `validateContract()` pure function |
| Error aggregation | `handleWalletValidation` callback syncs `WalletAddressInput` blur errors with `ErrorSummary` |
| Success feedback | No toast | `useToast().showSuccess()` after persistence |

#### WalletAddressInput Component

`src/components/WalletAddressInput.tsx` is a specialized Stellar address input that wraps `FormField` and adds:
- Real-time validation on blur (empty → required error; invalid format → format error)
- Address normalization to uppercase on blur
- Internal error state management that syncs with parent via `onValidation` callback
- `maxLength={56}` to prevent over-typing

```tsx
<WalletAddressInput
  id="freelancerAddress"
  label="Freelancer Stellar address"
  helperText="Must be a valid Stellar public key starting with G"
  value={freelancerAddress}
  onChange={setFreelancerAddress}
  error={errors.find(e => e.fieldId === 'freelancerAddress')?.message}
  required
  onValidation={handleWalletValidation}
/>
```

---

### MilestoneCreationForm

An accessible modal form for creating a new milestone. Generates a unique `id` from the title slug plus a timestamp.

#### Location

`src/components/milestones/MilestoneCreationForm.tsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(milestone: Milestone) => void` | Yes | Called with the validated milestone object |
| `onCancel` | `() => void` | Yes | Called when the user cancels |
| `contractId` | `string` | No | Parent contract id. When supplied, stamped onto the milestone |

#### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Title | Text | Yes | Non-empty after trim; max 200 characters |
| Payout Amount | Text (decimal) | Yes | Must be a positive number |
| Currency | Select | Yes | Options: USD, EUR, GBP, XLM (default: USD) |
| Status | Select | No | Options: Pending, Active, Completed, Paid, Disputed (default: Pending) |
| Due Date | Text | No | Optional; blank values become `undefined` |

#### ID Generation

On successful submit, the milestone `id` is built from the title slug plus the current timestamp:

1. Trim the title
2. Lowercase it
3. Replace non-alphanumeric runs with `-`
4. Remove leading/trailing `-`
5. Append `-${Date.now()}`

Example: `Frontend Development - Sprint 1` → `frontend-development-sprint-1-1784635200000`

#### Usage Example

```tsx
import { useState } from 'react';
import { MilestoneCreationForm } from '@/components/milestones/MilestoneCreationForm';
import { listMilestones, saveMilestone } from '@/lib/repository';

function MilestonesPage() {
  const [showForm, setShowForm] = useState(false);
  const [milestones, setMilestones] = useState(() => listMilestones());

  return (
    <>
      <button type="button" onClick={() => setShowForm(true)}>
        Add Milestone
      </button>

      {showForm && (
        <MilestoneCreationForm
          onSubmit={(milestone) => {
            saveMilestone(milestone);
            setMilestones(listMilestones());
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </>
  );
}
```

**With contract context:**

```tsx
<MilestoneCreationForm
  contractId="contract-123"
  onSubmit={(milestone) => {
    saveMilestone(milestone);
    setShowForm(false);
  }}
  onCancel={() => setShowForm(false)}
/>
```

#### Accessibility Features

- Dialog focus trapping via `useDialogFocusTrap` hook
- Initial focus on the Title input
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Focus restoration to trigger element on unmount
- Escape key invokes `onCancel`

---

### Sign-in Form (Home Page)

A validated login form with exponential-backoff throttle protection, located on the home page.

#### Location

`src/app/page.tsx`

#### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Email | Email | Yes | Non-empty after trim; max 254 characters; must contain `@` |
| Password | Password | Yes | Min 8 characters; max 128 characters |

#### Validation Rules

Validated by `validateLogin(email, password)` from `src/lib/validateLogin.ts`:

| Condition | Error |
|-----------|-------|
| Email is empty/whitespace-only | "Email is required" |
| Email exceeds 254 characters | "Email must be no more than 254 characters" |
| Email has no `@` | "Email must be valid" |
| Password is empty | "Password is required" |
| Password exceeds 128 characters | "Password must be no more than 128 characters" |
| Password under 8 characters | "Password must be at least 8 characters" |

#### Throttle Protection

The form uses exponential backoff from `src/lib/loginThrottle.ts`:

| Attempt | Cooldown |
|---------|----------|
| 1st | Immediate |
| 2nd | 5 s |
| 3rd | 25 s |
| 4th | 125 s |
| 5th+ | 300 s (capped) |

- Attempts are persisted via `safeStorage` across page reloads
- Submit button shows remaining cooldown in seconds
- `aria-live="polite"` region announces cooldown to screen readers
- Successful submission resets the throttle counter

#### Usage Example

```tsx
import { useState } from 'react';
import { FormField } from '@/components/FormField';
import { ErrorSummary } from '@/components/ErrorSummary';
import { validateLogin } from '@/lib/validateLogin';
import { useToast } from '@/components/toast/toast-provider';

function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState([]);
  const { showSuccess } = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateLogin(email, password);
    setErrors(newErrors);

    if (newErrors.length === 0) {
      showSuccess({ title: 'Form submitted successfully!' });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Sign in">
      <ErrorSummary errors={errors} />
      <FormField label="Email" id="email" error={/* ... */} required>
        <input type="email" /* ... */ />
      </FormField>
      <FormField label="Password" id="password" error={/* ... */} required>
        <input type="password" /* ... */ />
      </FormField>
      <button type="submit">Sign In</button>
    </form>
  );
}
```

---

## Validation Utilities

### validateContract

Pure function for CreateContractForm field validation.

**Location:** `src/lib/validateContract.ts`

```typescript
validateContract({
  contractName: string;
  freelancerAddress: string;
  totalValue: string;
  currency: string;
}): ValidationError[]
```

**Rules:**
- `contractName` — required (non-empty after trim)
- `freelancerAddress` — required and must pass `isValidStellarAddress`
- `totalValue` — required and must parse as a finite number > 0
- `currency` — required (non-empty after trim)

---

### validateLogin

Pure function for sign-in form validation.

**Location:** `src/lib/validateLogin.ts`

```typescript
validateLogin(email: string, password: string): ValidationError[]
```

**Constants:**
- `MAX_EMAIL_LENGTH = 254` (RFC 5321 §4.5.3.1)
- `MAX_PASSWORD_LENGTH = 128`

---

### sanitizeUserText

Produces display-safe, consistently formatted user text.

**Location:** `src/lib/sanitizeUserText.ts`

```typescript
sanitizeUserText(value: string, maxLength: number): string
```

**Processing order:**
1. Remove C0/C1 control characters
2. Trim surrounding whitespace
3. Collapse internal whitespace runs to single spaces
4. Slice to `maxLength`

**Field-specific caps:**

| Field | Maximum cleaned length |
|-------|----------------------:|
| Contract name | 200 |
| Party label | 100 |
| Milestone title | 200 |

---

### isValidStellarAddress

Structural validation for Stellar public keys.

**Location:** `src/lib/stellarAddress.ts`

```typescript
isValidStellarAddress(value: string): boolean
```

**Acceptance rules:**
- After trimming and uppercasing, exactly 56 characters
- Starts with `G`
- Remaining characters are base32 alphabet (A–Z and 2–7)

**Note:** This is a structural check only — no checksum (StrKey) verification. Suitable for UI-level validation; replace with full SDK validation for production-grade verification.

---

## Common Patterns

### Form State Management

All forms use local React state with `useState` hooks for field values and a shared errors array:

```tsx
const [errors, setErrors] = useState<{ fieldId: string; message: string }[]>([]);
```

### Validation on Submit

Every form validates on submit, not on every keystroke. Validation functions are `useCallback`-wrapped pure functions:

```tsx
const validateForm = useCallback((): ValidationError[] => {
  const errs: ValidationError[] = [];
  // Validate each field...
  return errs;
}, [dependencies]);
```

### Error Handling with ErrorSummary

```tsx
const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  const validationErrors = validateForm();
  setErrors(validationErrors);
  if (validationErrors.length > 0) return;

  // Submit...
};
```

### Retrieving Individual Field Errors

```tsx
const getFieldError = (fieldId: string): string | undefined =>
  errors.find(e => e.fieldId === fieldId)?.message;
```

### Integration with Repository (Persistence)

All forms use `src/lib/repository.ts` for persistence:

```tsx
import { saveContract, listContracts, saveMilestone, listMilestones } from '@/lib/repository';

// After successful form submission:
saveContract(contract);
setContracts(listContracts());
setShowForm(false);
```

### Integration with Toast Notifications

`CreateContractForm` demonstrates the toast integration pattern:

```tsx
const { showSuccess } = useToast();

// After successful persistence:
showSuccess({
  title: 'Contract created',
  description: `"${contract.contractName}" has been saved.`,
});
onSuccess(contract);
```

### Text Sanitization Pattern

Forms that accept user text use `sanitizeUserText` for validation and submission:

```tsx
const sanitized = sanitizeUserText(rawValue, MAX_LENGTH);
const unbounded = sanitizeUserText(rawValue, Number.MAX_SAFE_INTEGER);

if (!sanitized) {
  // Error: required field is empty
} else if (unbounded.length > MAX_LENGTH) {
  // Error: exceeds maximum length
} else {
  // Valid — use sanitized value
}
```

### Currency Options

All currency selectors share the same options:

| Code | Currency |
|------|----------|
| USD | US Dollar |
| EUR | Euro |
| GBP | British Pound |
| XLM | Stellar Lumen |

---

## Testing

### Form Component Tests

| Component | Test File | Coverage |
|-----------|-----------|----------|
| FormField | `src/components/__tests__/FormField.test.tsx` | Rendering, error states, required markers, accessibility prop injection |
| FormField (required) | `src/components/__tests__/FormFieldRequired.test.tsx` | Required marker behavior, aria-required injection |
| ContractCreationForm | `src/components/__tests__/ContractCreationForm.test.tsx` | Rendering, validation, party management, submission, accessibility |
| MilestoneCreationForm | `src/components/__tests__/MilestoneCreationForm.test.tsx` | Rendering, validation, ID generation, submission, cancel, accessibility |
| CreateContractForm | `src/components/contracts/__tests__/CreateContractForm.test.tsx` | Rendering, validation, persistence, toast |
| Form validation | `src/components/FormValidation.test.tsx` | Cross-cutting validation behavior |
| Accessibility | `src/components/__tests__/a11y.test.tsx` | axe-core audits for FormField states |
| Milestone dialog focus | `src/components/__tests__/MilestoneDialogFocus.test.tsx` | Focus trapping, tab wrapping, Escape handler |

### Validation Utility Tests

| Module | Test File |
|--------|-----------|
| `validateContract` | `src/lib/validateContract.test.ts` |
| `validateLogin` | `src/lib/validateLogin.test.ts` |
| `sanitizeUserText` | `src/lib/sanitizeUserText.test.ts` |

### Running Tests

```bash
# Run all tests
npm test

# Run form-specific tests
npm test -- --testPathPattern=ContractCreationForm
npm test -- --testPathPattern=MilestoneCreationForm
npm test -- --testPathPattern=CreateContractForm
npm test -- --testPathPattern=FormField
npm test -- --testPathPattern=FormValidation
npm test -- --testPathPattern=validateContract
npm test -- --testPathPattern=validateLogin
```

### Accessibility Testing

```bash
# Run axe-core audits for all components
npm test -- --testPathPattern=a11y
```
