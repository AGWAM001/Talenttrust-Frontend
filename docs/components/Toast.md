# Toast

Transient notification system for success and error feedback. Supports auto-dismiss, pause-on-interaction (hover and focus), screen-reader announcements, density preferences, and quiet-mode suppression.

**Source:** `src/components/toast/toast-provider.tsx`
**Tests:** `src/components/toast/toast-provider.test.tsx`

---

## Quick Start

### 1. Mount the provider

`ToastProvider` must wrap any component that calls `useToast()`. In this project it is already wired in `src/app/layout.tsx` inside `PreferencesProvider`:

```tsx
// src/app/layout.tsx
import { PreferencesProvider } from '@/lib/preferences';
import { ToastProvider } from '@/components/toast/toast-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PreferencesProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
```

`ToastProvider` **must** be a descendant of `PreferencesProvider` because it reads
`quietMode`, `toastDensity`, and `toastDuration` from `usePreferences()`.

### 2. Call the hook

```tsx
'use client';
import { useToast } from '@/components/toast/toast-provider';

export function SaveButton() {
  const { showSuccess, showError } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      showSuccess({ title: 'Saved', description: 'Your changes have been saved.' });
    } catch {
      showError({ title: 'Save failed', description: 'Please try again.' });
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

---

## Provider Architecture

```text
<PreferencesProvider>            <- src/lib/preferences.tsx
  <ToastProvider>                <- src/components/toast/toast-provider.tsx
    {children}
    <ToastAnnouncer />           {/* two sr-only live-region <div>s */}
    <ToastViewport />            {/* fixed top-right visual stack */}
  </ToastProvider>
</PreferencesProvider>
```

All active toasts render in a **single** fixed column anchored `top-4 right-4`.
There is no multi-column layout.

---

## Exports

| Export               | Kind      | Description                                              |
|----------------------|-----------|----------------------------------------------------------|
| `ToastProvider`      | Component | Context provider; renders viewport and announcer          |
| `useToast`           | Hook      | Returns `{ toasts, showSuccess, showError, dismissToast }` |
| `ToastErrorBoundary` | Component | Class error boundary wrapping the toast viewport          |
| `ToastSkeleton`      | Component | Loading-state placeholder matching the toast layout       |

All four are named exports from `@/components/toast/toast-provider`.

---

## API Reference

### Types

```ts
type ToastVariant = 'success' | 'error';

type ToastAction = {
  /** Plain-text label. Never interpolated as HTML. */
  label: string;
  /** Called when the user clicks the action button. */
  onClick: () => void;
};

type ToastInput = {
  title: string;
  description?: string;
  /** Duration in ms. Overrides the user preference when supplied. */
  duration?: number;
  /** Optional inline action button. */
  action?: ToastAction;
};

type ToastRecord = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toasts: ToastRecord[];
  showSuccess: (toast: ToastInput) => string;
  showError:   (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};
```

### `useToast()` hook

Must be called inside `<ToastProvider>`. When called outside a provider the
context resolves to a default value whose `showSuccess` and `showError` return
empty strings and `dismissToast` is a no-op — no error is thrown.

Returns the `ToastContextValue` object:

| Member               | Type                     | Description                                      |
|----------------------|--------------------------|--------------------------------------------------|
| `toasts`             | `ToastRecord[]`          | All currently visible toasts                     |
| `showSuccess(toast)` | `(ToastInput) => string` | Creates a success toast; see return-value table  |
| `showError(toast)`   | `(ToastInput) => string` | Creates an error toast; always returns an ID     |
| `dismissToast(id)`   | `(string) => void`       | Removes the toast with the given ID immediately  |

### `showSuccess(toast: ToastInput): string`

```ts
const showSuccess = useCallback(
  (toast: ToastInput) => {
    if (preferences.quietMode) {
      return 'suppressed';          // literal string when quietMode is true
    }
    const durationMs =
      toast.duration !== undefined ? toast.duration : DURATION_MAP[preferences.toastDuration];
    return createToast('success', toast, durationMs);
  },
  [createToast, preferences.quietMode, preferences.toastDuration],
);
```

### `showError(toast: ToastInput): string`

```ts
const showError = useCallback(
  (toast: ToastInput) => {
    const durationMs =
      toast.duration !== undefined ? toast.duration : DURATION_MAP[preferences.toastDuration];
    return createToast('error', toast, durationMs);
  },
  [createToast, preferences.toastDuration],
);
```

`showError` has **no** quiet-mode branch — it always creates a toast.

### `dismissToast(id: string): void`

Removes the matching toast by ID. If the ID does not correspond to any visible
toast the call is a no-op.

### `ToastErrorBoundary`

A class-based React error boundary that wraps the `ToastAnnouncer` and `ToastViewport`
inside `ToastProvider`. If the toast viewport throws during render, the boundary catches
the error, reports it via `reportError` from `@/lib/errorReporter`, and renders a
fallback panel with a **Retry** button. Clicking Retry resets the boundary state so the
viewport can re-mount.

```tsx
// Used internally by ToastProvider — you normally do not need to use it directly.
// If you need a standalone boundary for a custom viewport, import it explicitly:
import { ToastErrorBoundary } from '@/components/toast/toast-provider';

<ToastErrorBoundary>
  <MyCustomToastViewport />
</ToastErrorBoundary>
```

---

## Return-Value Table

| Function       | Scenario                                              | Return value                         |
|----------------|-------------------------------------------------------|--------------------------------------|
| `showSuccess`  | Normal (`quietMode` is `false`)                       | Unique ID string e.g. `"toast-<uuid>"` |
| `showSuccess`  | Quiet mode active (`preferences.quietMode === true`)  | `'suppressed'` — no toast is created |
| `showError`    | Any (quiet mode is ignored)                           | Unique ID string e.g. `"toast-<uuid>"` |
| `dismissToast` | —                                                     | `void`                               |

The returned ID prefix is always `"toast-"`.

---

## Common Patterns

### Basic success and error

```tsx
'use client';
import { useToast } from '@/components/toast/toast-provider';

export function ContractActions() {
  const { showSuccess, showError } = useToast();

  const handleRelease = async () => {
    try {
      await releaseFunds();
      showSuccess({
        title: 'Milestone released',
        description: 'Funds are on the way to the freelancer wallet.',
      });
    } catch {
      showError({
        title: 'Release failed',
        description: 'Wallet not connected.',
      });
    }
  };

  return <button onClick={handleRelease}>Release milestone</button>;
}
```

### Undo action

Pass an `action` to render an inline button inside the toast. The callback fires
and the toast dismisses immediately when the user clicks it.

```tsx
const handleRelease = async () => {
  await releaseFunds();
  showSuccess({
    title: 'Milestone released',
    description: 'Funds are on the way.',
    action: {
      label: 'Undo',
      onClick: () => cancelRelease(),
      // onClick fires before dismiss; toast is always removed afterward
    },
  });
};
```

### Checking quiet mode

`showSuccess` returns the literal string `'suppressed'` when the user has quiet
mode enabled. Branch on it if the caller needs to fall back to another form of
feedback:

```tsx
const id = showSuccess({ title: 'Profile saved' });
if (id === 'suppressed') {
  // quietMode is on — update a status indicator instead
  setStatusText('Profile saved');
}
```

### Programmatic dismiss

Use the returned ID to dismiss a toast before its auto-dismiss timer fires —
useful for "loading" style toasts:

```tsx
const { showSuccess, showError, dismissToast } = useToast();

const handleUpload = async () => {
  const loadingId = showSuccess({
    title: 'Uploading…',
    duration: 60_000,   // keep visible during upload
  });

  try {
    await uploadFile(file);
    dismissToast(loadingId);
    showSuccess({ title: 'Upload complete' });
  } catch {
    dismissToast(loadingId);
    showError({ title: 'Upload failed' });
  }
};
```

### Per-call duration override

Supply `duration` in milliseconds to override the user's preference for a
single toast:

```tsx
// Show a critical error for 15 seconds regardless of user preference.
showError({
  title: 'Payment failed',
  description: 'Insufficient balance.',
  duration: 15_000,
});

// Show a brief confirmation for 1.5 seconds.
showSuccess({ title: 'Copied!', duration: 1_500 });

// Keep a toast on screen until the user dismisses it manually.
showSuccess({ title: 'Waiting for wallet…', duration: Infinity });
```

### Persistent toast (no auto-dismiss)

Set `toastDuration` to `'persistent'` in user preferences, or pass a very large
`duration`. The toast stays until the user clicks the dismiss button:

```tsx
// preference-driven — affects all toasts for this user
// (stored in talenttrust-user-preferences via PreferencesProvider)

// per-call — only this one toast stays persistent
showError({ title: 'Action required', duration: 0 }); // duration 0 = dismiss immediately
// NOTE: to keep on screen indefinitely, pass a large number or Infinity:
showError({ title: 'Action required', description: 'Please review the contract.', duration: 2_147_483_647 });
```

---

## Behavioral Guarantees

### Quiet Mode

When `preferences.quietMode === true`:

- `showSuccess()` returns the **literal string `'suppressed'`** and does **not** add
  any entry to the `toasts` array.
- `showError()` is **completely unaffected**. It returns a valid `toast-...` ID and
  the toast is rendered with `role="alert"`.
- The quiet-mode gate is applied **before** `createToast`, so no ID is ever
  generated for suppressed calls.

### `MAX_VISIBLE_TOASTS` and Eviction Order

```ts
const MAX_VISIBLE_TOASTS = 4;
```

When a new toast would make the queue length exceed `MAX_VISIBLE_TOASTS`,
the **oldest** toast (index 0) is evicted **before** the new one is appended:

```ts
setToasts((currentToasts) => {
  const next = [...currentToasts, { ...toast, id, variant }];
  if (next.length <= MAX_VISIBLE_TOASTS) {
    return next;
  }
  const [evicted, ...remaining] = next;
  clearToastTimer(evicted.id);
  return remaining;
});
```

Eviction is **oldest-first (FIFO)**. The evicted toast's auto-dismiss timer is
cancelled so its callback cannot fire after removal. The live region after
eviction announces the **newest** surviving toast.

### Density and Stacking Gap

`preferences.toastDensity` controls the Tailwind `gap-*` class on the viewport:

| `toastDensity` value  | CSS class | Approximate gap |
|-----------------------|-----------|-----------------|
| `'relaxed'` (default) | `gap-3`   | 12 px           |
| `'compact'`           | `gap-1.5` | 6 px            |

### Auto-Dismiss Duration

```ts
const DURATION_MAP: Readonly<Record<ToastDuration, number | null>> = {
  short:      2500,
  normal:     5000,
  long:      10000,
  persistent: null,   // null -> no timer scheduled
};
```

**Resolution order** (same for both `showSuccess` and `showError`):

1. If `toast.duration` is explicitly supplied, use it **as-is**.
2. Otherwise look up `DURATION_MAP[preferences.toastDuration]`.

Per-call `duration` always wins, including over `'persistent'`.

| Preference value | Effective duration | Auto-dismissed? |
|------------------|--------------------|-----------------|
| `'short'`        | 2 500 ms           | Yes             |
| `'normal'`       | 5 000 ms           | Yes (default)   |
| `'long'`         | 10 000 ms          | Yes             |
| `'persistent'`   | —                  | No              |

### Pause on Hover / Focus

Each toast panel listens for:

| Event        | Handler         |
|--------------|-----------------|
| `mouseenter` | pause timer     |
| `mouseleave` | resume timer    |
| `focus`      | pause timer     |
| `blur`       | resume timer    |

A `pauseCount` integer tracks overlapping interactions. The timer only resumes
when `pauseCount` returns to `0`. Remaining time is computed from
`expiresAt - Date.now()` at pause time and passed to a fresh `setTimeout` on
resume.

### Action Button Contract

```ts
type ToastAction = {
  label: string;        // rendered as a plain text node — never set via innerHTML
  onClick: () => void;  // callback; toast dismissed unconditionally after call
};
```

**Plain-text enforcement.** `label` is rendered as a React text child and is
**never** set via `innerHTML` or `dangerouslySetInnerHTML`.

**Dismiss-on-fire.** Clicking the action button **always** calls `onDismiss`
immediately after `onClick`, unconditionally:

```tsx
onClick={() => {
  toast.action!.onClick();
  onDismiss(toast.id);
}}
```

---

## Accessibility

### `role` attributes

| Toast variant | `role` value | AT behavior                                      |
|---------------|--------------|--------------------------------------------------|
| `'success'`   | `"status"`   | Announced when the AT is idle (non-interrupting) |
| `'error'`     | `"alert"`    | Announced immediately; may trigger alert sound   |

The viewport container carries `role="region"` and `aria-label="Notifications"`
with `aria-atomic="false"`, making it a navigable landmark.

### Live-Region Announcer

`ToastAnnouncer` renders **three** `sr-only` `<div>` elements:

| Region            | `aria-live`   | `aria-atomic` | Content                                                       |
|-------------------|---------------|---------------|---------------------------------------------------------------|
| Success (latest)  | `"polite"`    | `"true"`      | `title[. description]` of the **latest** success toast        |
| Error (latest)    | `"assertive"` | `"true"`      | `title[. description]` of the **latest** error toast          |
| Status summary    | `"polite"`    | `"true"`      | Aggregate notification count summary, e.g. `"3 notifications (1 error, 2 successes)"` |

Only the **most recent** toast of each variant appears in the per-variant
regions. The status-summary region updates 500 ms after every change,
announcing the total and per-variant breakdown. After eviction, all live
regions reflect the newest surviving toasts.

### Dismiss Button

Each toast renders one dismiss button with:

- `aria-label="Dismiss success notification"` or `"Dismiss error notification"`
- `focus:ring-2 focus:ring-[var(--ring)]` — fully keyboard accessible
- `<span aria-hidden="true">&times;</span>` hides the `×` glyph from AT

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `useToast` throws `"must be used within a ToastProvider"` | Component is outside `<ToastProvider>` |
| Success toasts not appearing | `quietMode` is `true`; `showSuccess` returns `'suppressed'` |
| Only 4 toasts visible after a burst | `MAX_VISIBLE_TOASTS = 4`; oldest toast evicted |
| Toast never dismisses | `toastDuration` is `'persistent'` with no per-call `duration` override |
| Action button click does not dismiss | Impossible by design: `onDismiss` is called unconditionally after `onClick` |
| Toast viewport crashes silently | `ToastErrorBoundary` caught a render error; check `reportError` output |
