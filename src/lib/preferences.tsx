'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getItem, setItem } from './safeStorage';

export type Theme = 'light' | 'dark' | 'system';
export type AmountFormat = 'usd' | 'ngn' | 'compact';
export type ToastDensity = 'relaxed' | 'compact';
export type FormDensity = 'comfortable' | 'compact';
export type ListDensity = 'comfortable' | 'compact';
export type ContractsDensity = 'comfortable' | 'compact';
/**
 * Controls the default auto-dismiss duration for toasts when the caller does
 * not supply an explicit `duration`.
 *
 * | Value          | Duration  | Notes                              |
 * |----------------|-----------|------------------------------------|
 * | `'short'`      | 2 500 ms  | Quick, low-priority confirmations  |
 * | `'normal'`     | 5 000 ms  | Default – matches legacy behaviour |
 * | `'long'`       | 10 000 ms | Complex messages or slow readers   |
 * | `'persistent'` | ∞         | Toast stays until manually closed  |
 */
export type ToastDuration = 'short' | 'normal' | 'long' | 'persistent';

/**
 * Safely format a number as currency, falling back to USD if the provided currency code is invalid.
 */
function safeCurrencyFormat(
  amount: number,
  currency: string,
  locale: string = 'en-US',
  options: Intl.NumberFormatOptions = {}
): string {
  const defaultCurrency = 'USD';
  try {
    return new Intl.NumberFormat(locale, {
      ...options,
      style: 'currency',
      currency,
    }).format(amount);
  } catch (_e) {
    return new Intl.NumberFormat(locale, {
      ...options,
      style: 'currency',
      currency: defaultCurrency,
    }).format(amount);
  }
}

export interface UserPreferences {
  theme: Theme;
  amountFormat: AmountFormat;
  toastDensity: ToastDensity;
  formDensity: FormDensity;
  milestonesDensity: ListDensity;
  walletDensity: ListDensity;
  contractsDensity: ContractsDensity;
  quietMode: boolean;
  toastDuration: ToastDuration;
  /**
   * Idle auto-disconnect timeout in milliseconds. 0 disables the feature.
   * Allowed values: 0 or between 5000 ms and 30000 ms.
   */
  idleDisconnectMs: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  amountFormat: 'usd',
  toastDensity: 'relaxed',
  formDensity: 'comfortable',
  milestonesDensity: 'comfortable',
  walletDensity: 'comfortable',
  contractsDensity: 'comfortable',
  quietMode: false,
  toastDuration: 'normal',
  idleDisconnectMs: 0,
};

/**
 * Whitelisted keys we accept from untrusted storage. Anything else is dropped
 * before the spread merge to prevent unknown properties from leaking into state.
 *
 * Defined as a typed `Set` so `.has(key)` narrows correctly without casts.
 */
const KNOWN_KEYS: ReadonlySet<keyof UserPreferences> = new Set([
  'theme',
  'amountFormat',
  'toastDensity',
  'formDensity',
  'milestonesDensity',
  'walletDensity',
  'contractsDensity',
  'quietMode',
  'toastDuration',
  'idleDisconnectMs',
]);

/**
 * Property names that must never survive sanitization, regardless of source.
 * These are rejected because they have historically been used to hijack
 * prototypes during shallow merges (Object.assign, naive spreads, recursive
 * merge helpers, etc.).
 */
const DANGEROUS_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Allowed enum-like values per field. Used to validate the runtime type of
 * a parsed payload before it is merged into preferences.
 *
 * Typed Sets narrow `unknown` to the field's enum literal without casts.
 */
const ALLOWED_THEMES: ReadonlySet<Theme> = new Set(['light', 'dark', 'system']);
const ALLOWED_AMOUNT_FORMATS: ReadonlySet<AmountFormat> = new Set(['usd', 'ngn', 'compact']);
const ALLOWED_TOAST_DENSITIES: ReadonlySet<ToastDensity> = new Set(['relaxed', 'compact']);
const ALLOWED_FORM_DENSITIES: ReadonlySet<FormDensity> = new Set(['comfortable', 'compact']);
const ALLOWED_LIST_DENSITIES: ReadonlySet<ListDensity> = new Set(['comfortable', 'compact']);
const ALLOWED_CONTRACTS_DENSITIES: ReadonlySet<ContractsDensity> = new Set(['comfortable', 'compact']);
const ALLOWED_TOAST_DURATIONS: ReadonlySet<ToastDuration> = new Set(['short', 'normal', 'long', 'persistent']);

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  formatAmount: (amount: number, currency?: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEY = 'talenttrust-user-preferences';

/**
 * Sanitize an untrusted, already-JSON-parsed value into a valid
 * {@link UserPreferences} object.
 *
 * Defense-in-depth against malformed and prototype-polluting input read from
 * `localStorage` (or any other untrusted source):
 *
 * - Returns a fresh copy of {@link DEFAULT_PREFERENCES} when `raw` is `null`,
 *   a primitive, or an array — these cannot represent preferences.
 * - Iterates only the parsed object's **own** enumerable string keys
 *   (`Object.keys`) so inherited prototype keys can never reach the merge step.
 * - Rejects `__proto__`, `constructor`, and `prototype` keys outright so a
 *   spread or `Object.assign` downstream cannot rewire the prototype chain.
 * - Whitelists the five known keys (`theme`, `amountFormat`, `toastDensity`,
 *   `quietMode`, `toastDuration`) and validates each value against its allowed
 *   set. Unknown keys are silently dropped; invalid values fall back to the
 *   default.
 *
 * Booleans are checked with `typeof === 'boolean'` (not truthiness) so values
 * like `1`, `"true"`, or an object cannot be coerced into a `quietMode` flag.
 *
 * The helper is pure and total — it never throws, returns the same shape for
 * any input, and is safe to unit-test in isolation.
 *
 * @param raw - A value already deserialised from storage (e.g. `JSON.parse`).
 * @returns A pristine, fully-typed `UserPreferences` object.
 */
export function sanitizePreferences(raw: unknown): UserPreferences {
  // Fast path: must be a plain object (not null, not array, not primitive).
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PREFERENCES };
  }

  // Each local carries the precise runtime type expected for its field, so
  // the final return is well-typed without any cast. Invalid values simply
  // leave the local at its default value.
  let theme: Theme = DEFAULT_PREFERENCES.theme;
  let amountFormat: AmountFormat = DEFAULT_PREFERENCES.amountFormat;
  let toastDensity: ToastDensity = DEFAULT_PREFERENCES.toastDensity;
  let formDensity: FormDensity = DEFAULT_PREFERENCES.formDensity;
  let milestonesDensity: ListDensity = DEFAULT_PREFERENCES.milestonesDensity;
  let walletDensity: ListDensity = DEFAULT_PREFERENCES.walletDensity;
  let contractsDensity: ContractsDensity = DEFAULT_PREFERENCES.contractsDensity;
  let quietMode: boolean = DEFAULT_PREFERENCES.quietMode;
  let toastDuration: ToastDuration = DEFAULT_PREFERENCES.toastDuration;
  let idleDisconnectMs: number = DEFAULT_PREFERENCES.idleDisconnectMs;

  for (const key of Object.keys(raw as object)) {
    // Drop dangerous keys regardless of value. These are the keys historically
    // used for prototype pollution during shallow merges.
    if (DANGEROUS_KEYS.has(key)) {
      continue;
    }
    // Drop any unknown key — only known preferences may flow into state.
    if (!KNOWN_KEYS.has(key as keyof UserPreferences)) {
      continue;
    }
    const value = (raw as Record<string, unknown>)[key];

    switch (key) {
      case 'theme':
        // Cast at the call AND the assignment: `Set.has` does not narrow
        // `unknown` value on its own, but membership is verified at runtime.
        if (typeof value === 'string' && ALLOWED_THEMES.has(value as Theme)) {
          theme = value as Theme;
        }
        break;
      case 'amountFormat':
        if (typeof value === 'string' && ALLOWED_AMOUNT_FORMATS.has(value as AmountFormat)) {
          amountFormat = value as AmountFormat;
        }
        break;
      case 'toastDensity':
        if (typeof value === 'string' && ALLOWED_TOAST_DENSITIES.has(value as ToastDensity)) {
          toastDensity = value as ToastDensity;
        }
        break;
      case 'formDensity':
        if (typeof value === 'string' && ALLOWED_FORM_DENSITIES.has(value as FormDensity)) {
          formDensity = value as FormDensity;
        }
        break;
      case 'milestonesDensity':
        if (typeof value === 'string' && ALLOWED_LIST_DENSITIES.has(value as ListDensity)) {
          milestonesDensity = value as ListDensity;
        }
        break;
      case 'walletDensity':
        if (typeof value === 'string' && ALLOWED_LIST_DENSITIES.has(value as ListDensity)) {
          walletDensity = value as ListDensity;
        }
        break;
      case 'contractsDensity':
        if (typeof value === 'string' && ALLOWED_CONTRACTS_DENSITIES.has(value as ContractsDensity)) {
          contractsDensity = value as ContractsDensity;
        }
        break;
      case 'quietMode':
        if (typeof value === 'boolean') {
          quietMode = value;
        }
        break;
      case 'toastDuration':
        // Cast at call site and assignment: Set.has does not narrow `unknown`
        // on its own, but membership is verified at runtime.
        if (typeof value === 'string' && ALLOWED_TOAST_DURATIONS.has(value as ToastDuration)) {
          toastDuration = value as ToastDuration;
        }
        break;
      case 'idleDisconnectMs':
        if (typeof value === 'number') {
          const min = 5000;
          const max = 30000;
          if (value === 0 || (value >= min && value <= max)) {
            idleDisconnectMs = value;
          }
        }
        break;
    }
  }

  return {
    theme,
    amountFormat,
    toastDensity,
    formDensity,
    milestonesDensity,
    walletDensity,
    contractsDensity,
    quietMode,
    toastDuration,
    idleDisconnectMs,
  };
}

/**
 * Provides sanitized, persisted user preferences and applies the effective
 * document theme. See `docs/preferences.md` for the hydration, persistence,
 * system-theme, and amount-formatting contract.
 */
export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const preferencesRef = useRef<UserPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const pendingUpdates = useRef<Record<string, number>>({});

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  // Load from localStorage on mount. Every value is routed through
  // `sanitizePreferences` so tampered, corrupted, or prototype-polluting
  // payloads cannot reach React state.
  useEffect(() => {
    const saved = getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        setPreferences(sanitizePreferences(parsed));
      } catch (_e) {
        console.error('Failed to parse preferences', _e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when preferences change
  useEffect(() => {
    if (isHydrated) {
      setItem(STORAGE_KEY, JSON.stringify(preferences));
    }
  }, [preferences, isHydrated]);

  // Apply theme to document
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const root = document.documentElement;
      let effectiveTheme = theme;

      if (theme === 'system') {
        effectiveTheme = systemPrefersDark ? 'dark' : 'light';
      }

      root.setAttribute('data-theme', effectiveTheme);
      root.classList.remove('light', 'dark');
      root.classList.add(effectiveTheme);
    };

    applyTheme(preferences.theme);
  }, [preferences.theme, systemPrefersDark]);

  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      const previous = preferencesRef.current[key];
      const currentReq = (pendingUpdates.current[key as string] || 0) + 1;
      pendingUpdates.current[key as string] = currentReq;

      setPreferences(prev => ({ ...prev, [key]: value }));

      try {
        await new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            if (typeof window !== 'undefined' && (window as any).__SIMULATE_SETTINGS_ERROR) {
              reject(new Error('Failed to save settings'));
            } else {
              resolve();
            }
          }, 600);
        });
      } catch (error) {
        if (pendingUpdates.current[key as string] === currentReq) {
          setPreferences(prev => ({ ...prev, [key]: previous }));
        }
        throw error;
      }
    },
    [],
  );

  /**
   * Format monetary values using the active amount preference.
   * USD keeps the caller-provided currency, NGN forces Nigerian Naira,
   * and compact keeps the caller-provided currency with compact notation.
   */
  const formatAmount = useMemo(
    () => (amount: number, currency: string = 'USD') => {
      const { amountFormat } = preferences;
      
      // Determine which currency to use based on settings
      const activeCurrency = amountFormat === 'ngn' ? 'NGN' : currency;
      const locale = amountFormat === 'ngn' ? 'en-NG' : 'en-US';

      if (amountFormat === 'compact') {
        return safeCurrencyFormat(amount, activeCurrency, 'en-US', {
          notation: 'compact',
        });
      }

      return safeCurrencyFormat(amount, activeCurrency, locale);
    },
    [preferences.amountFormat],
  );

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference, formatAmount }}>
      {children}
    </PreferencesContext.Provider>
  );
}

/**
 * Read preference state and helpers from {@link PreferencesProvider}.
 *
 * When no provider is mounted, this hook intentionally returns defaults plus
 * no-op helpers so isolated tests can render preference-aware components.
 * See `docs/preferences.md#provider-less-fallback` for the fallback contract.
 */
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    // Return default preferences if used outside a provider (useful for testing)
    return {
      preferences: DEFAULT_PREFERENCES,
      updatePreference: async () => {},
      formatAmount: (amount: number, currency: string = 'USD') => 
        safeCurrencyFormat(amount, currency, 'en-US'),
    };
  }
  return context;
}
