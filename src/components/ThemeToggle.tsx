'use client';

import React from 'react';
import { usePreferences } from '@/lib/preferences';
import { useToast } from '@/components/toast/toast-provider';

/**
 * ThemeToggle — inline header button that cycles between light and dark.
 *
 * - Reads `preferences.theme` via `usePreferences()`.
 * - Toggles between `'light'` and `'dark'` (treats `'system'` as dark for
 *   the first click so the user gets an explicit state immediately).
 * - Renders a loading skeleton before hydration to avoid layout shift while
 *   the resolved theme state is still settling on the client.
 */
export function ThemeToggle() {
  const { preferences, updatePreference } = usePreferences();
  const { showError } = useToast();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        aria-hidden="true"
        aria-busy="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-200 animate-pulse dark:bg-slate-700"
      />
    );
  }

  const isDark = preferences.theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await updatePreference('theme', next);
        } catch {
          showError({ title: 'Failed to update settings. Please try again.' });
        }
      }}
      aria-label={label}
      aria-pressed={isDark}
      className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
    >
      {isDark ? (
        /* Sun icon — shown in dark mode to switch to light */
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
        </svg>
      ) : (
        /* Moon icon — shown in light/system mode to switch to dark */
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
        </svg>
      )}
    </button>
  );
}
