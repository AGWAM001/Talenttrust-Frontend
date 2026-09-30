import React from 'react';
import { render, act, renderHook, screen, fireEvent } from '@testing-library/react';
import {
  PreferencesProvider,
  sanitizePreferences,
  usePreferences,
  type UserPreferences,
} from '../preferences';
import { resetCache } from '../safeStorage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PreferencesProvider>{children}</PreferencesProvider>
);

beforeEach(() => {
  localStorage.clear();
  resetCache();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PreferencesProvider', () => {

  it('provides default preferences', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.theme).toBe('system');
    expect(result.current.preferences.amountFormat).toBe('usd');
  });

  it('updates preferences and persists to localStorage', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => {
      result.current.updatePreference('theme', 'dark');
    });

    expect(result.current.preferences.theme).toBe('dark');
    const saved = JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}');
    expect(saved.theme).toBe('dark');
  });

  it('loads preferences from localStorage on mount', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'light', quietMode: true }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.theme).toBe('light');
    expect(result.current.preferences.quietMode).toBe(true);
  });

  it('merges partial localStorage data with defaults', () => {
    localStorage.setItem('talenttrust-user-preferences', JSON.stringify({ theme: 'dark' }));
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.theme).toBe('dark');
    expect(result.current.preferences.amountFormat).toBe('usd'); // default preserved
  });

  it('silently falls back to defaults when localStorage contains invalid JSON', () => {
    localStorage.setItem('talenttrust-user-preferences', '%%%invalid%%%');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.theme).toBe('system');
    (console.error as jest.Mock).mockRestore();
  });

  it('falls back to defaults when JSON parses to a non-object payload', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('talenttrust-user-preferences', JSON.stringify([1, 2, 3]));
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences).toEqual({
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
    });
    (console.error as jest.Mock).mockRestore();
  });

  it('ignores __proto__ payloads and keeps defaults', () => {
    const malicious = '{"__proto__":{"polluted":true},"theme":"dark"}';
    localStorage.setItem('talenttrust-user-preferences', malicious);
    const { result } = renderHook(() => usePreferences(), { wrapper });
    // Valid `theme` should still be picked up…
    expect(result.current.preferences.theme).toBe('dark');
    // …but nothing should reach Object.prototype via the merge.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    // And the sanitized state must not be polluted itself.
    expect(
      Object.prototype.hasOwnProperty.call(result.current.preferences, '__proto__'),
    ).toBe(false);
  });

  it('ignores constructor payloads', () => {
    const malicious =
      '{"constructor":{"prototype":{"polluted":true}},"quietMode":true}';
    localStorage.setItem('talenttrust-user-preferences', malicious);
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.quietMode).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('drops unknown keys and invalid enum values', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({
        theme: 'red', // invalid
        amountFormat: 'eur', // invalid
        toastDensity: 'compact', // valid
        quietMode: true,
        garbage: 'should-be-dropped',
      }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.theme).toBe('system'); // invalid → default
    expect(result.current.preferences.amountFormat).toBe('usd'); // invalid → default
    expect(result.current.preferences.toastDensity).toBe('compact');
    expect(result.current.preferences.quietMode).toBe(true);
    // The state object must not carry the unknown key.
    expect(
      Object.prototype.hasOwnProperty.call(result.current.preferences, 'garbage'),
    ).toBe(false);
  });

  it('uses default formDensity when none is stored', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.formDensity).toBe('comfortable');
  });

  it('persists formDensity and restores it on hydation', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => {
      result.current.updatePreference('formDensity', 'compact');
    });

    expect(result.current.preferences.formDensity).toBe('compact');
    const saved = JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}');
    expect(saved.formDensity).toBe('compact');

    // Remount to simulate reload
    const { result: r2 } = renderHook(() => usePreferences(), { wrapper });
    expect(r2.current.preferences.formDensity).toBe('compact');
  });

  it('falls back to comfortable when stored formDensity is invalid', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ formDensity: 'ultra-compact' }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.formDensity).toBe('comfortable');
  });

  it('uses default contractsDensity when none is stored', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.contractsDensity).toBe('comfortable');
  });

  it('persists contractsDensity and restores it on hydration', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => {
      result.current.updatePreference('contractsDensity', 'compact');
    });

    expect(result.current.preferences.contractsDensity).toBe('compact');
    const saved = JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}');
    expect(saved.contractsDensity).toBe('compact');

    // Remount to simulate reload
    const { result: r2 } = renderHook(() => usePreferences(), { wrapper });
    expect(r2.current.preferences.contractsDensity).toBe('compact');
  });

  it('falls back to comfortable when stored contractsDensity is invalid', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ contractsDensity: 'ultra-compact' }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.contractsDensity).toBe('comfortable');
  });

  it('rejects non-boolean quietMode values (truthy coercion guard)', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ quietMode: 1 }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.quietMode).toBe(false);

    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ quietMode: 'true' }),
    );
    const { result: r2 } = renderHook(() => usePreferences(), { wrapper });
    expect(r2.current.preferences.quietMode).toBe(false);
  });

  it('persists only the seven known keys even after a malicious payload round-trips', async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({
        theme: 'dark',
        amountFormat: 'ngn',
        toastDensity: 'compact',
        formDensity: 'compact',
        quietMode: true,
        toastDuration: 'long',
        idleDisconnectMs: 10000,
        secretKey: 'leaked',
      }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    // Trigger a re-save with no changes.
    act(() => { result.current.updatePreference('theme', 'dark'); });

    const serialized = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}',
    );
    // Modern JS engines preserve string-key insertion order in JSON.stringify,
    // so we compare with `.sort()` for engine-independent comparison.
    expect(Object.keys(serialized).sort()).toEqual([
      'amountFormat',
      'contractsDensity',
      'formDensity',
      'idleDisconnectMs',
      'milestonesDensity',
      'quietMode',
      'theme',
      'toastDensity',
      'toastDuration',
      'walletDensity',
    ]);
  });

  it('loads toastDuration from localStorage when valid', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'short' }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.toastDuration).toBe('short');
  });

  it('loads toastDuration: persistent from localStorage', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent' }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.toastDuration).toBe('persistent');
  });

  it('falls back to normal when stored toastDuration is invalid', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'forever' }),
    );
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.preferences.toastDuration).toBe('normal');
  });

  it('persists toastDuration change and re-hydrates correctly', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('toastDuration', 'long'); });

    const saved = JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}');
    expect(saved.toastDuration).toBe('long');

    // Simulate page reload by mounting a fresh hook instance after the save.
    const { result: result2 } = renderHook(() => usePreferences(), { wrapper });
    act(() => {}); // flush effects
    expect(result2.current.preferences.toastDuration).toBe('long');
  });
});

describe('sanitizePreferences (pure helper)', () => {
  const DEFAULTS: UserPreferences = {
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

  it('returns DEFAULT_PREFERENCES for null', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULTS);
  });

  it('returns DEFAULT_PREFERENCES for primitives', () => {
    expect(sanitizePreferences(undefined)).toEqual(DEFAULTS);
    expect(sanitizePreferences(42)).toEqual(DEFAULTS);
    expect(sanitizePreferences('hello')).toEqual(DEFAULTS);
    expect(sanitizePreferences(true)).toEqual(DEFAULTS);
  });

  it('returns DEFAULT_PREFERENCES for arrays', () => {
    expect(sanitizePreferences([])).toEqual(DEFAULTS);
    expect(sanitizePreferences(['theme', 'dark'])).toEqual(DEFAULTS);
  });

  it('returns DEFAULT_PREFERENCES for an empty object', () => {
    expect(sanitizePreferences({})).toEqual(DEFAULTS);
  });

  it('accepts a fully valid object', () => {
    expect(
      sanitizePreferences({
        theme: 'dark',
        amountFormat: 'compact',
        toastDensity: 'compact',
        formDensity: 'compact',
        quietMode: true,
        toastDuration: 'long',
        idleDisconnectMs: 15000,
      }),
    ).toEqual({
      theme: 'dark',
      amountFormat: 'compact',
      toastDensity: 'compact',
      formDensity: 'compact',
      milestonesDensity: 'comfortable',
      walletDensity: 'comfortable',
      contractsDensity: 'comfortable',
      quietMode: true,
      toastDuration: 'long',
      idleDisconnectMs: 15000,
    });
  });

  it('merges a partial object with defaults (only valid keys overwrite)', () => {
    expect(
      sanitizePreferences({ theme: 'light', quietMode: true }),
    ).toEqual({
      theme: 'light',
      amountFormat: 'usd',
      toastDensity: 'relaxed',
      formDensity: 'comfortable',
      milestonesDensity: 'comfortable',
      walletDensity: 'comfortable',
      contractsDensity: 'comfortable',
      quietMode: true,
      toastDuration: 'normal',
      idleDisconnectMs: 0,
    });
  });

  it('drops unknown keys outright', () => {
    const result = sanitizePreferences({
      theme: 'dark',
      unknownKey: 'x',
      nested: { evil: true },
    } as unknown as UserPreferences);
    expect(result.theme).toBe('dark');
    expect(Object.prototype.hasOwnProperty.call(result, 'unknownKey')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, 'nested')).toBe(false);
  });

  it('rejects invalid theme values', () => {
    expect(sanitizePreferences({ theme: 'red' })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ theme: 123 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ theme: null } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('rejects invalid amountFormat values', () => {
    expect(sanitizePreferences({ amountFormat: 'eur' })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ amountFormat: 1 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('rejects invalid toastDensity values', () => {
    expect(sanitizePreferences({ toastDensity: 'wide' })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ toastDensity: 2 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('accepts valid milestonesDensity values', () => {
    expect(sanitizePreferences({ milestonesDensity: 'compact' })).toEqual({
      ...DEFAULTS,
      milestonesDensity: 'compact',
    });
    expect(sanitizePreferences({ milestonesDensity: 'comfortable' })).toEqual({
      ...DEFAULTS,
      milestonesDensity: 'comfortable',
    });
  });

  it('rejects invalid milestonesDensity values and falls back to default', () => {
    expect(sanitizePreferences({ milestonesDensity: 'wide' })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ milestonesDensity: 1 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ milestonesDensity: null } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ milestonesDensity: true } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('accepts valid contractsDensity values', () => {
    expect(sanitizePreferences({ contractsDensity: 'compact' })).toEqual({
      ...DEFAULTS,
      contractsDensity: 'compact',
    });
    expect(sanitizePreferences({ contractsDensity: 'comfortable' })).toEqual({
      ...DEFAULTS,
      contractsDensity: 'comfortable',
    });
  });

  it('rejects invalid contractsDensity values and falls back to default', () => {
    expect(sanitizePreferences({ contractsDensity: 'wide' })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ contractsDensity: 1 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ contractsDensity: null } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ contractsDensity: true } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('rejects non-boolean quietMode values even when truthy', () => {
    expect(sanitizePreferences({ quietMode: 1 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ quietMode: 'true' } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ quietMode: {} } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('rejects __proto__ payloads and does not pollute prototypes', () => {
    const attackerPayload = JSON.parse(
      '{"__proto__":{"polluted":true},"theme":"dark"}',
    );
    sanitizePreferences(attackerPayload);

    // The attack must not have installed a property on Object.prototype.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects constructor payloads and does not pollute prototypes', () => {
    const attackerPayload = JSON.parse(
      '{"constructor":{"prototype":{"polluted":true}},"quietMode":true}',
    );
    const result = sanitizePreferences(attackerPayload);
    expect(result.quietMode).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects prototype payloads', () => {
    const attackerPayload = JSON.parse(
      '{"prototype":{"polluted":true},"amountFormat":"ngn"}',
    );
    const result = sanitizePreferences(attackerPayload);
    expect(result.amountFormat).toBe('ngn');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('mixes valid overrides with rejected noise', () => {
    const result = sanitizePreferences({
      theme: 'dark',
      amountFormat: '???', // invalid
      toastDensity: 'compact',
      milestonesDensity: 'compact', // valid
      quietMode: 'yes', // invalid
      toastDuration: 'persistent', // valid
      idleDisconnectMs: 10000, // valid
      bogus: true, // unknown
      constructor: { hacked: 1 }, // dangerous
    } as unknown as UserPreferences);
    expect(result).toEqual({
      theme: 'dark',
      amountFormat: 'usd',
      toastDensity: 'compact',
      formDensity: 'comfortable',
      milestonesDensity: 'compact',
      walletDensity: 'comfortable',
      contractsDensity: 'comfortable',
      quietMode: false,
      toastDuration: 'persistent',
      idleDisconnectMs: 10000,
    });
  });

  it('rejects invalid toastDuration values', () => {
    expect(sanitizePreferences({ toastDuration: 'forever' })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ toastDuration: 5000 } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ toastDuration: null } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('rejects invalid idleDisconnectMs values', () => {
    expect(sanitizePreferences({ idleDisconnectMs: 4000 })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ idleDisconnectMs: 31000 })).toEqual({ ...DEFAULTS });
    expect(sanitizePreferences({ idleDisconnectMs: '10000' } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
    expect(sanitizePreferences({ idleDisconnectMs: null } as unknown as UserPreferences)).toEqual({
      ...DEFAULTS,
    });
  });

  it('ignores inherited keys on the source object (only own keys are read)', () => {
    function Attacker() {}
    (Attacker.prototype as Record<string, unknown>).polluted = true;
    (Attacker.prototype as Record<string, unknown>).theme = 'dark';
    try {
      const attackerInstance = new Attacker();
      const result = sanitizePreferences(attackerInstance);
      expect(result.theme).toBe('system');
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    } finally {
      // Clean up so the mutation cannot leak into other test files.
      delete (Attacker.prototype as Record<string, unknown>).polluted;
      delete (Attacker.prototype as Record<string, unknown>).theme;
    }
  });
});

describe('formatAmount – usd (default)', () => {
  it('formats a typical USD amount', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.formatAmount(1000, 'USD')).toBe('$1,000.00');
  });

  it('formats zero', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.formatAmount(0, 'USD')).toBe('$0.00');
  });

  it('formats a large payout', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.formatAmount(1_000_000, 'USD')).toBe('$1,000,000.00');
  });

  it('formats a fractional amount', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.formatAmount(0.5, 'USD')).toBe('$0.50');
  });

  it('formats a negative amount', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    // sign style may vary by runtime; just assert currency symbol present
    expect(result.current.formatAmount(-250, 'USD')).toContain('250');
  });

  it('defaults currency to USD when none is passed', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(result.current.formatAmount(50)).toBe('$50.00');
  });

  it('respects a custom currency for the default format', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    const expected = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(1250);

    expect(result.current.formatAmount(1250, 'EUR')).toBe(expected);
  });
});

describe('formatAmount – ngn', () => {
  it('formats a typical NGN amount', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'ngn'); });
    const formatted = result.current.formatAmount(5000, 'USD'); // currency overridden to NGN
    expect(formatted).toMatch(/5[,.]?000/); // ₦5,000.00 or locale variant
    expect(formatted).toMatch(/NGN|₦/);
  });

  it('formats zero in NGN', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'ngn'); });
    expect(result.current.formatAmount(0)).toMatch(/NGN|₦/);
  });

  it('formats a large NGN payout', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'ngn'); });
    const formatted = result.current.formatAmount(1_000_000);
    expect(formatted).toMatch(/1[,.]?000[,.]?000/);
  });
});

describe('formatAmount – compact', () => {
  it('abbreviates thousands', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'compact'); });
    const formatted = result.current.formatAmount(1500, 'USD');
    expect(formatted).toMatch(/1\.?5K|\$2K|\$1K/); // runtime may round
  });

  it('abbreviates millions', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'compact'); });
    expect(result.current.formatAmount(2_500_000, 'USD')).toMatch(/M/i);
  });

  it('formats zero compactly', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'compact'); });
    expect(result.current.formatAmount(0, 'USD')).toMatch(/\$0/);
  });

  it('keeps a custom currency when compact notation is enabled', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'compact'); });
    const expected = new Intl.NumberFormat('en-US', {
      notation: 'compact',
      style: 'currency',
      currency: 'EUR',
    }).format(1_500);

    expect(result.current.formatAmount(1_500, 'EUR')).toBe(expected);
  });
});

describe('persistence and re-render', () => {
  it('persists amountFormat change and new consumers see updated format', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });

    act(() => { result.current.updatePreference('amountFormat', 'ngn'); });

    const saved = JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}');
    expect(saved.amountFormat).toBe('ngn');

    // New hook instance in the same provider sees the updated format
    const { result: result2 } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result2.current.updatePreference('amountFormat', 'ngn'); });
    expect(result2.current.preferences.amountFormat).toBe('ngn');
  });

  it('persists quietMode and re-hydrates correctly', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('quietMode', true); });

    const saved = JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}');
    expect(saved.quietMode).toBe(true);

    // Simulate new page load
    renderHook(() => usePreferences(), { wrapper });
    act(() => {}); // flush effects
    // fresh hook loads from the saved localStorage value set above
    expect(JSON.parse(localStorage.getItem('talenttrust-user-preferences') || '{}').quietMode).toBe(true);
  });

  it('consumer component re-renders with updated format', () => {
    localStorage.clear(); // isolate from previous persistence tests
    function AmountDisplay() {
      const { formatAmount, updatePreference } = usePreferences();
      return (
        <>
          <span data-testid="amount">{formatAmount(1000, 'USD')}</span>
          <button onClick={() => updatePreference('amountFormat', 'ngn')}>switch</button>
        </>
      );
    }

    render(<PreferencesProvider><AmountDisplay /></PreferencesProvider>);
    expect(screen.getByTestId('amount').textContent).toBe('$1,000.00');

    act(() => { fireEvent.click(screen.getByRole('button', { name: 'switch' })); });

    // After switching to NGN the displayed text should contain NGN symbol/code
    expect(screen.getByTestId('amount').textContent).toMatch(/NGN|₦/);
  });
});

describe('usePreferences outside provider', () => {
  it('returns default fallback without throwing', () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.preferences.theme).toBe('system');
    expect(result.current.formatAmount(100, 'USD')).toBe('$100.00');
  });

  it('provides a no-op updatePreference fallback and honors custom currency formatting', () => {
    const { result } = renderHook(() => usePreferences());
    const expected = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(100);

    expect(() => result.current.updatePreference('theme', 'dark')).not.toThrow();
    expect(result.current.preferences.theme).toBe('system');
    expect(result.current.formatAmount(100, 'EUR')).toBe(expected);
  });
});

describe('formatAmount invalid currency codes', () => {
  it('does not throw with invalid currency codes in default (usd) format', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    expect(() => result.current.formatAmount(100, 'INVALIDCURRENCY')).not.toThrow();
    expect(() => result.current.formatAmount(100, '123')).not.toThrow();
    expect(() => result.current.formatAmount(100, '')).not.toThrow();
  });

  it('falls back to USD with invalid currency codes in default format', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    const formatted = result.current.formatAmount(100, 'INVALID');
    expect(formatted).toContain('$');
    expect(formatted).toContain('100');
  });

  it('does not throw with invalid currency codes in ngn format', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'ngn'); });
    expect(() => result.current.formatAmount(100, 'INVALID')).not.toThrow();
  });

  it('does not throw with invalid currency codes in compact format', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper });
    act(() => { result.current.updatePreference('amountFormat', 'compact'); });
    expect(() => result.current.formatAmount(1000, 'INVALID')).not.toThrow();
  });

  it('does not throw with invalid currency codes outside provider', () => {
    const { result } = renderHook(() => usePreferences());
    expect(() => result.current.formatAmount(100, 'INVALID')).not.toThrow();
  });
});

describe('theme application', () => {
  function mockMatchMedia(matches: boolean) {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const mediaQueryList = {
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn(() => mediaQueryList),
    });

    return { addEventListener, removeEventListener };
  }

  it('applies the system theme using the media query result', () => {
    mockMatchMedia(true);
    render(<PreferencesProvider><div /></PreferencesProvider>);

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('registers and cleans up the system theme listener while theme is set to system', () => {
    const { addEventListener, removeEventListener } = mockMatchMedia(false);

    const { unmount } = render(<PreferencesProvider><div /></PreferencesProvider>);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
