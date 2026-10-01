# Preferences Provider

`PreferencesProvider` in [`src/lib/preferences.tsx`](../src/lib/preferences.tsx) owns user preference state for the frontend. It applies the active theme to the document, persists preferences through [`src/lib/safeStorage.ts`](../src/lib/safeStorage.ts), and exposes `formatAmount` so UI code formats payouts consistently.

The provider is mounted as the outermost application provider in `src/app/layout.tsx`. Keeping it outside the toast and wallet providers lets lower-level components consume preferences without each feature creating its own persistence or formatting rules.

## Preference Model

`UserPreferences` contains the following fields:

| Field | Type | Default | Behavior |
|-------|------|---------|----------|
| `theme` | `'light' \| 'dark' \| 'system'` | `'system'` | Controls the `data-theme` attribute and `light` / `dark` class on `document.documentElement`. |
| `amountFormat` | `'usd' \| 'ngn' \| 'compact'` | `'usd'` | Selects how `formatAmount` formats currency values. |
| `toastDensity` | `'relaxed' \| 'compact'` | `'relaxed'` | Available to toast UI consumers for spacing decisions. |
| `formDensity` | `'comfortable' \| 'compact'` | `'comfortable'` | Controls spacing in form fields; `compact` reduces vertical gaps for denser layouts. |
| `quietMode` | `boolean` | `false` | Available to notification consumers that need to reduce interruption. |

The defaults live in `DEFAULT_PREFERENCES`:

```ts
{
  theme: 'system',
  amountFormat: 'usd',
  toastDensity: 'relaxed',
  formDensity: 'comfortable',
  quietMode: false,
}
```

Preferences are stored under `STORAGE_KEY`, currently `talenttrust-user-preferences`.

## Storage And Hydration

The provider starts each render with `DEFAULT_PREFERENCES` and an internal `isHydrated` flag set to `false`.

On mount, the hydration effect calls `getItem(STORAGE_KEY)` from `safeStorage`. If storage returns a value, the effect parses it as JSON and routes the result through `sanitizePreferences` before writing to React state. If parsing fails, the provider logs `Failed to parse preferences` and keeps the defaults. After this one-time load, `isHydrated` becomes `true`.

`sanitizePreferences` is intentionally strict because storage is untrusted input:

- Non-objects, arrays, and `null` become a fresh copy of `DEFAULT_PREFERENCES`.
- Only own enumerable string keys are inspected.
- Unknown keys are dropped.
- `__proto__`, `constructor`, and `prototype` are always dropped.
- Enum fields must match the allowed literal values.
- `quietMode` must be an actual boolean, not a truthy value such as `1` or `"true"`.

The persist effect runs whenever `preferences` or `isHydrated` changes. It writes `JSON.stringify(preferences)` through `setItem(STORAGE_KEY, ...)`, but only after hydration has completed. This avoids overwriting saved preferences with defaults before the initial storage read has had a chance to run.

`safeStorage` protects the provider from browser and rendering edge cases:

- Server-side rendering returns storage as unavailable.
- Private browsing, disabled storage, and quota errors do not throw into React.
- A small in-memory fallback store keeps values available for the current session when `localStorage` cannot be used.
- Development-only storage warnings are logged once to avoid console noise.

## Updating Preferences

Consumers call `updatePreference(key, value)` from `usePreferences()`. The provider shallow-merges the changed field into the existing state:

```ts
setPreferences(prev => ({ ...prev, [key]: value }));
```

Because hydration sanitizes persisted state, the live preference object contains only the known fields. New preference fields should be added in all of these places together:

- `UserPreferences`
- `DEFAULT_PREFERENCES`
- `KNOWN_KEYS`
- Any allowed-value set used by `sanitizePreferences`
- The docs table above
- Tests that cover hydration, persistence, and invalid stored values

## Theme Application

The theme effect runs whenever `preferences.theme` changes.

For explicit themes:

- `light` applies `data-theme="light"`, removes existing `light` / `dark` classes, then adds `light`.
- `dark` applies `data-theme="dark"`, removes existing `light` / `dark` classes, then adds `dark`.

For `system`, the provider reads:

```ts
window.matchMedia('(prefers-color-scheme: dark)').matches
```

If the media query matches, the effective theme is `dark`; otherwise it is `light`. The effective value is what gets written to `data-theme` and the root class list.

When `theme` is `system`, the effect also registers a `change` listener on the same media query. That listener reapplies the system theme whenever the operating system color scheme changes. The effect cleanup removes the listener so stale callbacks do not accumulate across preference changes or unmounts.

### Accessibility And Contrast

Theme changes are applied at the document root, so every component should source colors from theme-aware CSS variables or selectors rather than hard-coded foreground/background pairs. When adding or changing theme styles:

- Verify text and interactive controls meet contrast requirements in both light and dark effective themes.
- Check focus indicators against both backgrounds.
- Treat `system` as both light and dark during manual review because it can switch at runtime.
- Avoid relying on color alone to communicate state; theme changes can alter perceived contrast and hue.

## Amount Formatting

`formatAmount(amount, currency = 'USD')` uses the active `amountFormat` preference.

| `amountFormat` | Currency used | Locale | Notes |
|----------------|---------------|--------|-------|
| `usd` | Caller-provided `currency`, defaulting to `USD` | `en-US` | Despite the preference name, this branch preserves a custom currency such as `EUR`. |
| `ngn` | Always `NGN` | `en-NG` | Ignores the caller-provided currency and formats as Nigerian Naira. |
| `compact` | Caller-provided `currency`, defaulting to `USD` | `en-US` | Uses `Intl.NumberFormat` compact notation for abbreviated values such as thousands or millions. |

All branches call `safeCurrencyFormat`. That helper wraps `Intl.NumberFormat` and catches invalid currency codes. If the requested currency cannot be formatted, it falls back to USD rather than throwing during render.

Examples:

```ts
formatAmount(1000, 'USD'); // "$1,000.00" in the default usd branch
formatAmount(5000, 'USD'); // NGN output after amountFormat is set to "ngn"
formatAmount(1500, 'EUR'); // compact EUR output after amountFormat is set to "compact"
```

Exact symbols, separators, and rounding can vary by JavaScript runtime because they come from the platform `Intl` implementation. Tests should prefer `Intl.NumberFormat` expectations or resilient assertions for locale-specific output.

## Provider-Less Fallback

`usePreferences()` does not throw when called outside `PreferencesProvider`. It returns:

- `DEFAULT_PREFERENCES`
- A no-op `updatePreference`
- A `formatAmount` fallback that formats with the caller-provided currency, defaulting to USD, in `en-US`

This fallback keeps isolated unit tests and shallow component renders simple. Application code should still use the root provider so updates, persistence, theme application, and system-theme listeners work.
