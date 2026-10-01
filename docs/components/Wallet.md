# Wallet

Stellar wallet integration for TalentTrust. Manages connection state globally via React Context and exposes UI components for connecting, displaying, and collecting wallet addresses.

**Sources:**
- `src/contexts/WalletContext.tsx` — provider, hook, and type definitions
- `src/components/WalletConnectButton.tsx` — primary connect/disconnect UI
- `src/components/WalletAddressInput.tsx` — validated address form field
- `src/app/wallet/page.tsx` — wallet page entry point and validation boundaries

---

> ⚠️ **Mock implementation notice**
>
> `connect()` is **currently mocked**. It simulates a 1-second delay and resolves with the
> hard-coded `MOCKED_STELLAR_ADDRESS` constant. No real wallet extension is contacted.
> The public API will remain unchanged when real Freighter integration lands; only the
> internals of `connect()` will change.

---

## Quick Start

### 1. Mount the provider

WalletProvider` is already wired at the root in `src/app/layout.tsx`. Place it inside
`ToastProvider` so it can dispatch toast notifications:

```tsx
// src/app/layout.tsx
import { WalletProvider } from '@/contexts/WalletContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PreferencesProvider>
          <ToastProvider>
            <WalletProvider idleTimeout={900_000}>
              {children}
            </WalletProvider>
          </ToastProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
```

### 2. Drop in the connect button

```tsx
import { WalletConnectButton } from '@/components/WalletConnectButton';

export function Header() {
  return (
    <header>
      <WalletConnectButton />
    </header>
  );
}
```

### 3. Read wallet state in any client component

```tsx
'use client';
import { useWallet } from '@/contexts/WalletContext';

export function PayButton() {
  const { address, connect } = useWallet();

  if (!address) {
    return <button onClick={connect}>Connect wallet to pay</button>;
  }

  return <button>Pay from {address.slice(0, 6)}…</button>;
}
```

---

## Provider: `WalletProvider`

```tsx
<WalletProvider idleTimeout={900_000}>
  {children}
</WalletProvider>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | React subtree that requires wallet context. |
| `idleTimeout` | `number` | `preferences.idleDisconnectMs` | Inactivity duration in milliseconds before the session auto-disconnects. `0` disables the feature. When omitted, falls back to the value stored in `PreferencesProvider`. |

### Provider placement

WalletProvider` must be a descendant of both `PreferencesProvider` (for the `idleDisconnectMs`
default) and `ToastProvider` (for connection-failure and session-expired notifications):

```
RootLayout
└── PreferencesProvider
    └── ToastProvider
        └── WalletProvider   ← here
            └── {children}
```

### Idle auto-disconnect

When `idleTimeout > 0` and a wallet is connected, the provider attaches passive listeners for
`pointermove`, `keydown`, `visibilitychange`, `mousedown`, and `touchstart`. If none of these
events fires within `idleTimeout` ms, `disconnect()` is called automatically and a
_"Session expired" toast is shown. The timer resets on each activity event and is fully cleaned
up on unmount.

Recommended production value: `900_000` (15 minutes).

---

## Hook: `useWallet`

```tsx
const { address, isConnecting, error, connect, disconnect } = useWallet();
```

Must be called inside a `<WalletProvider>` subtree. Throws
`"useWallet must be used within a WalletProvider"` if called outside one.

### Return value (`WalletContextType`)

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string \ | null` | Connected Stellar public key (G-address), or `null`. Rehydrated from `localStorage` on mount so it survives page refreshes. |
| `isConnecting` | `boolean` | `true` while a connection attempt is in flight. Use to disable the connect button and show a spinner. |
| `error` | `string \ | null` | Human-readable error from the most recent failed `connect()` call, or `null`. Cleared automatically at the start of each new attempt. |
| `connect` | `() => Promise<void>` | Initiates a connection attempt. Always resolves; errors are surfaced via `error` and an accessible error toast, never via rejection. |
| `disconnect` | `() => void` | Clears `address`, removes `wallet_connected_address` from `localStorage`, and cancels any running idle timer. |

### `connect()` state transitions

1. Sets `isConnecting → true`, clears `error → null`.
2. Attempts to connect (currently mocked with a 1-second delay).
3. **Success:** sets `address` and persists to `localStorage`.
4. **Failure:** sets `error` and fires a `showError` toast.
5. Sets `isConnecting → false` in all cases (via `finally`).

### Known error constants

| Constant | Value | Cause |
|----------|-------|-------|
| `FREIGHTER_NOT_INSTALLED` | `"Freighter wallet is not installed. Please install the Freighter browser extension."` | Browser extension not detected. |
| `USER_REJECTED` | `"User rejected the connection request."` | User dismissed the Freighter approval popup. |

Both are exported from `src/contexts/WalletContext.tsx`.

### Example

```tsx
'use client';
import { useWallet } from '@/contexts/WalletContext';

export function ConnectButton() {
  const { address, isConnecting, error, connect, disconnect } = useWallet();

  if (isConnecting) return <p aria-live="polite">Connecting…</p>;

  if (error) {
    return (
      <div role="alert">
        <p>Connection error: {error}</p>
        <button onClick={connect}>Retry</button>
      </div>
    );
  }

  if (address) {
    return (
      <button onClick={disconnect}>
        Disconnect ({address.slice(0, 6)}…)
      </button>
    );
  }

  return <button onClick={connect}>Connect Wallet</button>;
}
```

---

## Component: `WalletConnectButton`

```tsx
import { WalletConnectButton } from '@/components/WalletConnectButton';

<WalletConnectButton />
```

Self-contained UI for the full connect/disconnect lifecycle. Requires no props — it reads
all state from `useWallet()` internally. Depends on both `WalletProvider` and `ToastProvider`
`being present in the tree.

### Props

None. This component is fully self-contained.

### Rendered branches

| State | Rendered output |
|-------|----------------|
| Disconnected | "Connect Wallet" button (`aria-label="Connect wallet"`). |
| Connecting | Disabled button with animated spinner and "Connecting…" text. |
| Error | Red banner with "Connection Error" label and a "Retry" link (`aria-label="Retry wallet connection"`). |
| Connected | Address pill (truncated via `truncateAddress`), copy button (`aria-label="Copy address to clipboard"`), and disconnect button (`aria-label="Disconnect wallet"`). |

### Clipboard copy behaviour

The copy button uses `navigator.clipboard.writeText`. Failures surface as error toasts rather
than console logs (the address is treated as sensitive data):

| Scenario | Result |
|----------|--------|
| Success | Checkmark icon; reverts to copy icon after 2 s. |
| `navigator.clipboard` absent | Error toast: "Copy not supported". |
| `writeText` absent | Error toast: "Copy not supported". |
| `writeText` rejects (e.g. permission denied) | Error toast: "Copy failed". |

---

## Component: `WalletAddressInput`

```tsx
import { WalletAddressInput } from '@/components/WalletAddressInput';

<WalletAddressInput
  id="recipient"
  label="Recipient address"
  value={address}
  onChange={setAddress}
/>
```

A validated Stellar address input field. Wraps `FormField` and validates on blur using
`isValidStellarAddress` from `src/lib/stellarAddress.ts`. Normalizes the value to uppercase
on blur to match on-chain representation.

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `id` | `string` | ✓ | — | `id` for the `<input>` and its associated `<label>`. |
| `label` | `string` | ✓ | — | Visible label text. Also used in generated error messages. |
| `value` | `string` | ✓ | — | Controlled input value. |
| `onChange` | `(value: string) => void` | ✓ | — | Called on every keystroke with the raw input value, and on blur with the normalized (uppercased) value if it changed. |
| `error` | `string` | — | `undefined` | External error message from the parent form (e.g. submit-time validation). Takes precedence over any internally generated blur error. |
| `helperText` | `string` | — | `undefined` | Supplemental hint displayed below the input. |
| `required` | `boolean` | — | `undefined` | Marks the field as required visually and semantically. Triggers a `"${label} is required"` error on blur when the value is empty. |
| `placeholder` | `string` | — | `"GXXXXXXXX…"` | Input placeholder text. |
| `onValidation` | `(fieldId: string, error: string \ | null) => void` | — | `undefined` | Called after every blur with the validation result. Use to feed errors into a parent `ErrorSummary`. |

### Validation rules (applied on blur)

| Condition | Error message |
|-----------|--------------|
| Empty value and `required={true}` | `"${label} is required"` |
| Non-empty value fails `isValidStellarAddress` | `"${label} must be a valid Stellar G... address"` |
| Valid address | No error; value is normalized to uppercase. |

### Accessibility

`WalletAddressInput` inherits the full accessibility wiring from `FormField`:
- `<label>` linked by `id`.
- `aria-invalid="true"` on the `<input>` when an error is present.
- `aria-describedby` pointing to the helper text and error message paragraphs.
- Error paragraph uses `role="alert"` for immediate screen-reader announcement.

### Example — form with submit validation

```tsx
'use client';
import { useState } from 'react';
import { WalletAddressInput } from '@/components/WalletAddressInput';

export function SendForm() {
  const [recipient, setRecipient] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const handleValidation = (fieldId: string, error: string | null) => {
    setFieldErrors(prev => ({ ...prev, [fieldId]: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // fieldErrors.recipient will be populated by blur validation
    if (fieldErrors.recipient) return;
    // proceed with recipient address…
  };

  return (
    <form onSubmit={handleSubmit}>
      <WalletAddressInput
        id="recipient"
        label="Recipient address"
        value={recipient}
        onChange={setRecipient}
        required
        helperText="Enter the full 56-character Stellar public key."
        onValidation={handleValidation}
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

---

## Page: `src/app/wallet/page.tsx`

The wallet page is the top-level entry point for wallet connection and address collection.
It owns the **validation boundaries** for address input before any value leaves the page.

### Responsibilities

- Renders `WalletConnectButton` and `WalletAddressInput`.
- Holds the controlled address state and the field-level error map.
- Enforces the validation boundaries described below on submit.
- Prevents duplicate and concurrent submissions from producing inconsistent state.

### Validation boundaries

Every address entering the page is classified into exactly one of the following categories.
The categories are mutually exclusive and exhaustive; the order below is the order in
which they are applied.

| Order | Category | Condition | Result |
|-------|----------|-----------|--------|
| 1 | Empty | Trimmed value is an empty string | Rejected with `"Recipient address is required"`. No submit is attempted. |
| 2 | Malformed | Trimmed value fails `isValidStellarAddress` | Rejected with `"Recipient address must be a valid Stellar G... address"`. No submit is attempted. |
| 3 | Duplicate | The normalized address equals the last successfully submitted address within the same page session | Rejected with `"Recipient address has already been submitted"`. No submit is attempted. |
| 4 | Boundary | Trimmed value is exactly 56 characters and passes `isValidStellarAddress` | Accepted. Normalized to uppercase before being handled. |
| 5 | Valid | Trimmed value passes `isValidStellarAddress` and is not a duplicate | Accepted. Normalized to uppercase before being handled. |

### Invariants

1. **Normalization is idempotent.** Applying trim + uppercase twice yields the same result as
applying it once. This makes duplicate detection deterministic regardless of how the user
capitalized the input.
2. **Validation precedes mutation.** No state change occurs until all five categories have been
evaluated. A failed validation leaves the previous state untouched.
3. **Submission is serialized.** At most one submission is in flight at any time. A second
submit while one is in flight is a no-op.
4. **Duplicate recording happens on success only.** The last-submitted address is updated only
after the submission resolves successfully, so a failed submission can be retried with the
same address.
5. **Errors are non-sensitive.** Error messages never echo the full address. They refer to the
field by label only.

### State model

```tsx
interface WalletPageState {
  /** Raw controlled input value, exactly as typed by the user. */
  recipient: string;
  /** Per-field validation messages keyed by field id. */
  fieldErrors: Record<string, string | null>;
  /** True while a submission is in flight; guards against concurrent submits. */
  isSubmitting: boolean;
  /** Normalized address of the last successful submit, or null. */
  lastSubmittedAddress: string | null;
}
```

### State transitions

```
IDILE
  └─ submit()
       ├─ validation fails → fieldErrors updated, stay in IDLE
       └─ validation passes → SUBMITTING

SUBMITTING
  └─ await resolves
       ├─ success → lastSubmittedAddress updated → IDLE
       └─ failure → fieldErrors updated, lastSubmittedAddress unchanged → IDLE
```

### Example

```tsx
'use client';
import { useCallback, useState } from 'react';
import { WalletAddressInput } from '@/components/WalletAddressInput';
import { isValidStellarAddress } from '@/lib/stellarAddress';

export default function WalletPage() {
  const [recipient, setRecipient] = useState('');
  const [fieldErrors, setFieldErrors = useState<Record<string, string | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedAddress, setLastSubmittedAddress] = useState<string | null>(null);

  const normalize = (value: string) => value.trim().toUpperCase();

  const validate = useCallback((value: string): string | null => {
    const normalized = normalize(value);
    if (!normalized) return 'Recipient address is required';
    if (!isValidStellarAddress(normalized)) {
      return 'Recipient address must be a valid Stellar G... address';
    }
    if (normalized === lastSubmittedAddress) {
      return 'Recipient address has already been submitted';
    }
    return null;
  }, [lastSubmittedAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const error = validate(recipient);
    if (error) {
      setFieldErrors(prev => ({ ...prev, recipient: error }));
      return;
    }
    setFieldErrors(prev => ({ ...prev, recipient: null }));
    setIsSubmitting(true);
    try {
      // call the address-consuming action here
      setLastSubmittedAddress(normalize(recipient));
    } catch {
      setFieldErrors(prev => ({ ...prev, recipient: 'Submission failed. Please retry.' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <WalletAddressInput
        id="recipient"
        label="Recipient address"
        value={recipient}
        onChange={setRecipient}
        error={fieldErrors.recipient ?? undefined}
        required
        onValidation={(fieldId, error) =>
          setFieldErrors(prev => ({ ...prev, [fieldId]: error }))
        }
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Send'}
      </button>
    </form>
  );
}
```

### Observability

- Rejections are surfaced through the field error paragraph (`role="alert"`) and the
parent `ErrorSummary` via `onValidation`.
- Submission failures set a generic field error that does not include the address.
- Never log the full address to the console or to any analytics sink.

### Test coverage

Focused tests for the page live in `src/app/wallet/page.test.tsx` and cover:

| Scenario | Expected outcome |
|----------|------------------|
| Accepted input | Valid 56-char G-address submits and records the normalized address. |
| Rejected input | Empty and malformed addresses set a field error and do not submit. |
| Duplicate submission | Submitting the same normalized address twice is rejected the second time. |
| Boundary values | 55-char and 57-char inputs are rejected; 56-char input is accepted. |
| Concurrent submit | A double click on submit only invokes the action once. |
| Regression | A valid address with lowercase letters is accepted and normalized to uppercase. |

---

## Named exports

### `src/contexts/WalletContext.tsx`

| Export | Kind | Description |
|--------|------|-------------|
| `WalletProvider` | Component | Context provider. Place at the app root. |
| `useWallet` | Hook | Primary consumer API. Throws outside `WalletProvider`. |
| `WalletContextType` | TypeScript type | Shape of the context value. |
| `MOCKED_STELLAR_ADDRESS` | `string` constant | Hard-coded G-address used by the mock `connect()`. |
| `FREIGHTER_NOT_INSTALLED` | `string` constant | Error string when the Freighter extension is absent. |
| `USER_REJECTED` | `string` constant | Error string when the user dismisses the approval popup. |

### `src/components/WalletConnectButton.tsx`

| Export | Kind | Description |
|--------|------|-------------|
| `WalletConnectButton` | Component (named + default) | Self-contained connect/disconnect UI. |

### `src/components/WalletAddressInput.tsx` 

| Export | Kind | Description |
|--------|------|-------------|
| `WalletAddressInput` | Component (named + default) | Validated Stellar address input field. |
| `WalletAddressInputProps` | TypeScript interface | Prop types for `WalletAddressInput`. |

### `src/app/wallet/page.tsx`

| Export | Kind | Description |
|--------|------|-------------|
| `WalletPage` | Component (default) | Wallet page entry point that owns address validation boundaries. |

---

## Session persistence

The connected address is stored in `localStorage` under the key `wallet_connected_address`.
On mount, `WalletProvider` reads this key and rehydrates `address`. `disconnect()` removes
the key and clears the in-memory address. The page level `duplicate` tracking is
scoped to the page session and is not persisted; a refresh clears it.
