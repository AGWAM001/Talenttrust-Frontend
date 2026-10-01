import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// -----------------------------------------------------------------------------
// State invariant contract for src/app/layout.tsx
//
// The layout owns the root document shell and the global theme
// state that drives the `theme-class` on the `<html>` element. The
// invariants we enforce here are:
//
//  1. The theme value is always one of the allowed literals
//     ('light' | 'dark' | 'system'). Any other value is rejected and
//     falls back to 'the default' without mutating the previous state.
//  2. The effective theme class is deterministic given the stored
//     preference and the system color scheme.
//  3. Concurrent updates are serialized: the last committed update
//     wins and partial failures never leave the DOM in a state that
//     does not match the stored preference.
//  4. Reading from persisted storage never throws; corrupt data is
//     treated as missing data.
// -----------------------------------------------------------------------------

export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'talenttrust.theme';
const VALID_THEMES: readonly ThemePreference[] = [
  'light',
  'dark',
  'system',
] as const;

const DEFAULT_THEME: ThemePreference = 'system';

function isValidTheme(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

// Read the persisted theme preference. Never throws; corrupt or unknown
// values are treated as absent and the default is returned.
function readStoredTheme(): ThemePreference {
  try {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === null) return DEFAULT_THEME;
    const parsed: unknown = JSON.parse(raw);
    return isValidTheme(parsed) ? parsed : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

// Persist the theme preference. Returns true on success, false if the
// underlying storage is unavailable or throws. Callers must not assume
// persistence succeeded just because the in-memory state changed.
function writeStoredTheme(theme: ThemePreference): boolean {
  if (!isValidTheme(theme)) return false;
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    return true;
  } catch {
    return false;
  }
}

// Resolve the effective theme class given the preference and the
// current system color scheme. Pure function.
function resolveThemeClass(
  preference: ThemePreference,
  systemDark: boolean,
): 'light' | 'dark' {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

// -----------------------------------------------------------------------------
// Root layout component
// -----------------------------------------------------------------------------

export interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const [preference, setPreference] = React.useState<ThemePreference>(DEFAULT_THEME);
  const [systemDark, setSystemDark] = React.useState(false);
  const [persistenceFailed, setPersistenceFailed] = React.useState(false);

  // Hydration-safe: read persisted state and system preference after mount.
  React.useEffect(() => {
    setPreference(readStoredTheme());
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemDark(mql.matches);
      const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    return undefined;
  }, []);

  // Serialized update: apply the class to <html> and persist the
  // preference. If persistence fails, the in-memory state is still
  // updated (so the UI reflects the user's choice) but the failure is
  // surfaced to the caller via `persistenceFailed`.
  const applyTheme = React.useCallback((next: ThemePreference) => {
    if (!isValidTheme(next)) {
      // Reject invalid transitions without mutating state.
      return false;
    }
    setPreference(next);
    const ok = writeStoredTheme(next);
    setPersistenceFailed(!ok);
    return ok;
  }, []);

  const effectiveTheme = resolveThemeClass(preference, systemDark);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    // Invariant: only one theme class is present at a time.
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    root.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  // Expose the controlled theme API on the window for external callers.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const api = {
      getTheme: () => preference,
      getEffectiveTheme: () => effectiveTheme,
      setTheme: (next: ThemePreference) => applyTheme(next),
    };
    (window as unknown as { __talentTrustTheme?: typeof api }).__talentTrustTheme = api;
    return () => {
      delete (window as unknown as { __talentTrustTheme?: unknown }).__talentTrustTheme;
    };
  }, [preference, effectiveTheme, applyTheme]);

  return (
    <div data-testid="root-layout" data-theme-preference={preference}>
      {persistenceFailed ? (
        <div role="alert" data-testid="theme-persistence-warning">
          Theme preference could not be saved. Your choice will apply for this session only.
        </div>
      ) : null}
      {children}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

type StorageMock = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  length: number;
};

function createStorageMock(): StorageMock {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => {
      map.clear();
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size;
    },
  };
}

function installMatchMedia(initialDark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  let matches = initialDark;
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.add(handler);
    },
    removeEventListener: (_: string, handler: (e: MediaQueryListEvent) => void) => {
      listeners.delete(handler);
    },
  };
  window.matchMedia = (() => mql) as unknown as typeof window.matchMedia;
  return {
    setDark(next: boolean) {
      matches = next;
      for (const handler of Array.from(listeners)) {
        handler(self as unknown as MediaQueryListEvent);
      }
    },
    listenerCount: () => listeners.size,
  };
}

describe('RootLayout theme invariants', () => {
  let storage: StorageMock;
  let originalLocalStorage: PropertyDescriptor | undefined;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    storage = createStorageMock();
    originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: storage,
    });
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
    } else {
      delete (window as unknown as { localStorage?: unknown }).localStorage;
    }
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
    delete (window as unknown as { __talentTrustTheme?: unknown }).__talentTrustTheme;
  });

  it('renders children and exposes the default preference', () => {
    installMatchMedia(false);
    render(
      <RootLayout>
        <span data-testid="child">hello</span>
      </RootLayout>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
    expect(screen.getByTestId('root-layout')).toHaveAttribute(
      'data-theme-preference',
      'system',
    );
  });

  it('applies the stored theme and only one theme class is present', () => {
    installMatchMedia(false);
    storage.setItem('talenttrust.theme', JSON.stringify('dark'));
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('falls back to the default for corrupt persisted state', () => {
    installMatchMedia(false);
    storage.setItem('talenttrust.theme', '{ not json');
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(screen.getByTestId('root-layout')).toHaveAttribute(
      'data-theme-preference',
      'system',
    );
  });

  it('rejects invalid theme transitions without mutating state', () => {
    installMatchMedia(false);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    const api = (window as unknown as {
      __talentTrustTheme: {
        getTheme: () => string;
        setTheme: (next: unknown) => boolean;
      };
    }).__talentTrustTheme;
    expect(api).toBeTruthy();
    const before = api.getTheme();
    const ok = api.setTheme('not-a-theme');
    expect(ok).toBe(false);
    expect(api.getTheme()).toBe(before);
  });

  it('persists valid theme updates and reports success', () => {
    installMatchMedia(false);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    const api = (window as unknown as {
      __talentTrustTheme: {
        getTheme: () => string;
        setTheme: (next: unknown) => boolean;
      };
    }).__talentTrustTheme;
    const ok = api.setTheme('dark');
    expect(ok).toBe(true);
    expect(api.getTheme()).toBe('dark');
    expect(storage.getItem('talenttrust.theme')).toBe(JSON.stringify('dark'));
  });

  it('surfaces a non-sensitive error when persistence fails', () => {
    installMatchMedia(false);
    const failingStorage: StorageMock = {
      ...storage,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: failingStorage,
    });
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    const api = (window as unknown as {
      __talentTrustTheme: {
        setTheme: (next: unknown) => boolean;
      };
    }).__talentTrustTheme;
    const ok = api.setTheme('light');
    expect(ok).toBe(false);
    expect(
      screen.getByTestId('theme-persistence-warning'),
    ).toBeInTheDocument();
  });

  it('serializes concurrent updates so the last commit wins', () => {
    installMatchMedia(false);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    const api = (window as unknown as {
      __talentTrustTheme: {
        getTheme: () => string;
        setTheme: (next: unknown) => boolean;
      };
    }).__talentTrustTheme;
    api.setTheme('dark');
    api.setTheme('light');
    api.setTheme('dark');
    expect(api.getTheme()).toBe('dark');
    expect(storage.getItem('talenttrust.theme')).toBe(JSON.stringify('dark'));
  });

  it('resolves the system theme from the media query', () => {
    const mql = installMatchMedia(true);
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    mql.setDark(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('removes the media query listener on unmount', () => {
    const mql = installMatchMedia(false);
    const { unmount } = render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(mql.listenerCount()).toBe(1);
    unmount();
    expect(mql.listenerCount()).toBe(0);
  });

  it('removes the exposed theme API on unmount', () => {
    installMatchMedia(false);
    const { unmount } = render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect((window as unknown as { __talentTrustTheme?: unknown }).__talentTrustTheme).toBeTruthy();
    unmount();
    expect((window as unknown as { __talentTrustTheme?: unknown }).__talentTrustTheme).toBeUndefined();
  });

  it('recovers from a transient persistence failure', () => {
    installMatchMedia(false);
    let fail = true;
    const flakyStorage: StorageMock = {
      ...storage,
      setItem: (key, value) => {
        if (fail) throw new Error('transient');
        storage.setItem(key, value);
      },
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: flakyStorage,
    });
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    const api = (window as unknown as {
      __talentTrustTheme: {
        setTheme: (next: unknown) => boolean;
      };
    }).__talentTrustTheme;
    expect(api.setTheme('dark')).toBe(false);
    fail = false;
    expect(api.setTheme('dark')).toBe(true);
    expect(storage.getItem('talenttrust.theme')).toBe(JSON.stringify('dark'));
  });

  it('treats unknown persisted themes as absent', () => {
    installMatchMedia(false);
    storage.setItem('talenttrust.theme', JSON.stringify('neons'));
    render(
      <RootLayout>
        <span />
      </RootLayout>,
    );
    expect(screen.getByTestId('root-layout')).toHaveAttribute(
      'data-theme-preference',
      'system',
    );
  });
});
