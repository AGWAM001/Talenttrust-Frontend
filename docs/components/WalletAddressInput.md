# WalletAddressInput

A client-side validated Stellar wallet address input built on `FormField`. Provides real-time address validation on blur, automatic normalization, and parent-form error integration.

**Source:** `src/components/WalletAddressInput.tsx`
**Tests:** `src/components/__tests__/WalletAddressInput.test.tsx`

---

## Exports

| Export | Kind | Description |
|---|---|---|
| `WalletAddressInput` | Component (named) | The address input component |
| `WalletAddressInput` | Component (default) | Re-exported as default |
| `WalletAddressInputProps` | TypeScript type | Prop shape |

---

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string` | Yes | — | Unique form control ID |
| `label` | `string` | Yes | — | Visible label text |
| `value` | `string` | Yes | — | Current input value |
| `onChange` | `(value: string) => void` | Yes | — | Change handler |
| `error` | `string` | No | — | Parent form error override (takes precedence over internal blur error) |
| `helperText` | `string` | No | — | Helper text displayed below the input |
| `required` | `boolean` | No | — | If true, marks the field required and validates empty values on blur |
| `placeholder` | `string` | No | `'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'` | Input placeholder |
| `onValidation` | `(fieldId: string, error: string \| null) => void` | No | — | Called after every blur event with the field ID and validation result |

---

## Usage

```tsx
import { WalletAddressInput } from '@/components/WalletAddressInput';

function WalletForm() {
  const [address, setAddress] = useState('');

  return (
    <WalletAddressInput
      id="wallet-address"
      label="Stellar wallet address"
      value={address}
      onChange={setAddress}
      helperText="56-character public key starting with G"
      required
    />
  );
}
```

### With a parent form error

```tsx
function WalletForm() {
  const [address, setAddress] = useState('');
  const [submitError, setSubmitError] = useState<string | undefined>();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (!address) setSubmitError('Address is required for submission');
    }}>
      <WalletAddressInput
        id="wallet-address"
        label="Stellar wallet address"
        value={address}
        onChange={(v) => { setAddress(v); setSubmitError(undefined); }}
        error={submitError}
        required
      />
    </form>
  );
}
```

### With `onValidation` callback for error aggregation

```tsx
function WalletForm() {
  const [address, setAddress] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  return (
    <>
      <ErrorSummary errors={errors} />
      <WalletAddressInput
        id="wallet-address"
        label="Stellar wallet address"
        value={address}
        onChange={setAddress}
        onValidation={(fieldId, error) =>
          setErrors(prev => ({ ...prev, [fieldId]: error }))
        }
        required
      />
    </>
  );
}
```

---

## Validation behaviour

The component validates on **blur** using `isValidStellarAddress` from `@/lib/stellarAddress`:

| Condition | Error message |
|---|---|
| Empty value (when `required` is true) | `"{label} is required"` |
| Invalid format (too short, wrong prefix, bad checksum, invalid chars) | `"{label} must be a valid Stellar G... address"` |
| Valid Stellar G-address | No error |

### Validation rules

- Address must be exactly 56 characters.
- Must start with `G`.
- Must use only base32 characters (`A-Z`, `2-7`).
- Must pass CRC16-XModem checksum verification.

---

## Normalization on blur

On blur, the component automatically normalises the input value:

1. **Trims** surrounding whitespace.
2. **Uppercases** the entire string.

If the normalized value differs from the current value, `onChange` is called with the normalized value. This ensures the displayed value always matches on-chain representation.

---

## Error precedence

| Scenario | Displayed error |
|---|---|
| No `error` prop, blur triggers validation failure | Internal blur error |
| No `error` prop, valid on blur | No error |
| `error` prop provided by parent | Parent error (always takes precedence) |
| `error` prop provided, blur also fails | Parent error (parent wins) |

When the user starts typing after a blur error, the internal error is cleared immediately (on `change`) so the error doesn't persist while the user is correcting the input. If `onValidation` was provided, it is called with `null`.

---

## Accessibility

- **Label:** Associated with the input via `htmlFor` / `id`.
- **`aria-invalid`:** Set to `"true"` when an error is present, `"false"` otherwise.
- **`aria-describedby`:** Points to the helper text element (`{id}-helper`) and/or error element (`{id}-error`) as appropriate.
- **Error element:** Uses `role="alert"` for immediate screen reader announcement.
- **Input attributes:** `autoComplete="off"`, `spellCheck="false"`, `autoCapitalize="off"` for wallet address entry.

---

## Dependencies

- `@/components/FormField` — Accessible form field wrapper (label, error, helper text).
- `@/lib/stellarAddress` — `isValidStellarAddress` and `normalizeStellarAddress` used for validation and normalization.

---

## Testing

Tested with Jest and React Testing Library. Coverage target ≥ 95%.

### Scenarios covered

- **Rendering:** label, input, placeholder, helper text, required indicator, no error by default.
- **Blur validation:** empty required, empty not-required, invalid format (short, bad checksum, no G-prefix), valid address, valid lowercase address, valid address with whitespace.
- **Normalization:** lowercase → uppercase, whitespace trim, no-op when already normalized, no-op when empty.
- **Accessible error linking:** `aria-invalid` on valid/invalid/parent error, `aria-describedby` linking to error and helper IDs, `role="alert"` on error.
- **Error clearing:** blur error clears on typing, `onValidation` called with `null`.
- **`onValidation` callback:** called with error on blur, `null` on valid blur, `null` on change after error, rapid blur/change sequences.
- **Parent error precedence:** parent error shown even when valid, parent error persists after blur.
- **Edge cases:** whitespace-only input, very long input, special characters, custom label and id.
- **Accessibility audits:** `jest-axe` audits for default state, error state, and valid state with zero violations.
