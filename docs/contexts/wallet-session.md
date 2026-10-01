# Wallet Session Management Guide

This guide documents the session lifecycle, persistence, and inactivity-based auto-disconnect safeguards managed by the [`WalletProvider`](../../src/contexts/WalletContext.tsx) within TalentTrust.

---

## Overview

The [`WalletProvider`](../../src/contexts/WalletContext.tsx) provides the global wallet connection state. To improve security on shared or public machines, it includes an optional idle auto-disconnect safeguard that monitors user activity and automatically logs out the user after a configurable period of inactivity.

---

## Configuration

The auto-disconnect feature is configured via the `idleTimeout` prop on the [`WalletProvider`](../../src/contexts/WalletContext.tsx).

| Prop | Type | Default | Description |
|---|---|---|---|
| `idleTimeout` | `number` | `0` (disabled) | The inactivity duration in milliseconds before the wallet is automatically disconnected. |

### Wiring the Provider

The provider is placed in the global layout structure (`src/app/layout.tsx`). Here is an example configuration setting the idle timeout to 15 minutes:

```tsx
import { WalletProvider } from '@/contexts/WalletContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 15 minutes = 15 * 60 * 1000 = 900,000 ms
  return (
    <WalletProvider idleTimeout={900000}>
      {children}
    </WalletProvider>
  );
}
```

> [!NOTE]
> Setting `idleTimeout` to `0` or omitting it completely disables the inactivity auto-disconnect safeguard.

---

## Session Persistence & Rehydration

To provide a seamless user experience across page reloads and navigations, the wallet session status is persisted in the browser.

### Storage Key
The wallet public address is saved under the storage key:
* `wallet_connected_address` (as defined in [`WalletContext.tsx`](../../src/contexts/WalletContext.tsx)).

### Rehydration Flow on Mount
1. **Client Check:** During server-side rendering (SSR), `window` is undefined, and the rehydration hook does not execute.
2. **Mount Event:** Once the component mounts on the client, a `useEffect` runs to rehydrate the wallet state.
3. **Retrieval:** The address is retrieved from storage using [`getItem`](../../src/lib/safeStorage.ts) via the `safeStorage` helper.
4. **State Restoration:** If a valid address exists, the inner state of [`WalletProvider`](../../src/contexts/WalletContext.tsx) is restored, making the address globally accessible via `useWallet`.

### Security Profile
* Only the public key (mocked or from the Stellar wallet extension) is saved to the storage.
* No private keys, seed phrases, or sensitive wallet data are ever accessed or persisted.
* Storage interactions are safely wrapped using `safeStorage` (in [`src/lib/safeStorage.ts`](../../src/lib/safeStorage.ts)) to catch potential storage access exceptions in restricted browser environments.

---

## Idle Timeout Lifecycle & Activity Events

The inactivity auto-disconnect safeguard ensures that the wallet does not remain connected indefinitely when a user is inactive.

### Active Event Monitoring
When a wallet session is active (`address !== null`) and the configuration specifies an `idleTimeout` greater than `0`, the provider registers passive event listeners on the global `window` object.

The timer is reset back to zero on any of the following **five activity events** (defined as `IDLE_EVENTS` in [`WalletContext.tsx`](../../src/contexts/WalletContext.tsx)):

* `pointermove` — Tracks mouse movement or hover actions.
* `keydown` — Tracks any keyboard interaction.
* `visibilitychange` — Tracks tab switches (e.g., when the user returns to the page/tab).
* `mousedown` — Tracks mouse clicks.
* `touchstart` — Tracks touch gestures on mobile devices.

### Underlying Lifecycle Flow
1. **Wallet Connected:** When `address` transitions from `null` to a valid public key, the idle effect starts and `resetTimer` schedules the first countdown.
2. **Activity Event Fired:** Any of the five monitored events triggers `resetTimer`.
3. **Timer Reset:** `resetTimer` clears the previous `setTimeout` (via `timerRef.current`) and schedules a fresh one.
4. **Auto-Disconnect Execution:** If no monitored activity occurs before the timeout expires, the provider:
   * Nullifies `timerRef.current` to prevent phantom reschedules.
   * Invokes `disconnect()` to clear the connected address and remove `wallet_connected_address` from storage.
   * Dispatches a "Session expired" toast.

### Cleanup
When the wallet is disconnected manually, the session expires, or the component unmounts, all event listeners are removed from `window` and the pending timeout is cancelled. This prevents memory leaks and phantom disconnects.

---

## Toast Notifications & Fallback Mechanism

When the session expires due to inactivity, the user is notified with a success-level toast.

### Session Expired Message
* **Title:** `"Session expired"`
* **Description:** `"You have been disconnected due to inactivity."`

### Safe Toast Fallback
The [`WalletProvider`](../../src/contexts/WalletContext.tsx) is designed to operate robustly even if it is mounted outside the [`ToastProvider`](../../src/components/toast/toast-provider.tsx).

The module-level `useSafeToast` function wraps `useToast` in a try/catch:

```typescript
function useSafeToast() {
  try {
    return useToast();
  } catch {
    return { showSuccess: (_input: unknown) => '', showError: (_input: unknown) => '' };
  }
}
```

If the [`ToastProvider`](../../src/components/toast/toast-provider.tsx) is absent, the application falls back to no-ops, ensuring the auto-disconnect lifecycle continues silently without throwing.

---

## Wallet Context API & Connection State

The `useWallet` hook exposes the connection methods, error states, and session status to components:

```typescript
export type WalletContextType = {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};
```

### Mocked Stellar Address & Freighter Integration
Because full integration with the Freighter browser wallet is pending, the provider currently mocks the wallet connection using a hardcoded Stellar G-address:
* **Mock Address:** `MOCKED_STELLAR_ADDRESS` = `'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H'`

### Methods and State

#### 1. `connect`
An asynchronous function that triggers the wallet connection:
1. Sets `isConnecting` to `true` and clears any previous `error`.
2. Simulates an asynchronous connection latency of `1000ms`.
3. Sets the wallet address state to the mocked Stellar G-address.
4. Stores the address in persistence under the `wallet_connected_address` key.
5. Sets `isConnecting` back to `false`.

#### 2. `disconnect`
A synchronous function that clears the active session:
1. Nullifies `timerRef.current` and cancels any pending idle timeout.
2. Resets the address state to `null`.
3. Removes the `wallet_connected_address` key from storage.

#### 3. `error`
A string state (or `null`) that stores any connection failure message. Currently defaults to `null`, but is reserved for Freighter error cases such as:
* User rejecting connection prompts.
* Freighter extension not installed.
