import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeToggle } from '../ThemeToggle';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { resetCache } from '@/lib/safeStorage';


// Helper: render inside the provider
const renderToggle = () =>
  render(
    <PreferencesProvider>
      <ThemeToggle />
    </PreferencesProvider>,
  );

// Helper: render toggle alongside a component that can inspect preferences
function ToggleWithState() {
  const { preferences } = usePreferences();
  return (
    <>
      <ThemeToggle />
      <span data-testid="theme">{preferences.theme}</span>
    </>
  );
}

const renderWithState = () =>
  render(
    <PreferencesProvider>
      <ToggleWithState />
    </PreferencesProvider>,
  );

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCache();
  });

  it('renders a skeleton during the server render before hydration', () => {
    const { renderToStaticMarkup } = require('react-dom/server.node');
    const markup = renderToStaticMarkup(
      <PreferencesProvider>
        <ThemeToggle />
      </PreferencesProvider>,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('h-9 w-9');
    expect(markup).toContain('animate-pulse');
    expect(markup).toContain('disabled=""');
    expect(markup).not.toContain('aria-label="Switch to dark theme"');
    expect(markup).not.toContain('aria-label="Switch to light theme"');
  });

  it('renders the final button after hydration', async () => {
    renderToggle();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
    });
  });

  it('shows moon icon and "Switch to dark theme" label when theme is light', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'light' }),
    );
    renderToggle();
    const btn = screen.getByRole('button', { name: /switch to dark theme/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows sun icon and "Switch to light theme" label when theme is dark', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'dark' }),
    );
    renderToggle();
    const btn = screen.getByRole('button', { name: /switch to light theme/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles light → dark and calls updatePreference', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'light' }),
    );
    renderWithState();
    expect(screen.getByTestId('theme').textContent).toBe('light');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('toggles dark → light and calls updatePreference', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'dark' }),
    );
    renderWithState();
    expect(screen.getByTestId('theme').textContent).toBe('dark');

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }));
    });

    expect(screen.getByTestId('theme').textContent).toBe('light');
  });

  it('treats "system" as non-dark and toggles to dark on first click', () => {
    // default theme is 'system'
    renderWithState();
    expect(screen.getByTestId('theme').textContent).toBe('system');

    // moon icon shown (not dark), so clicking goes to dark
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
  });

  it('aria-pressed reflects current dark state accurately', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'light' }),
    );
    renderToggle();
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      fireEvent.click(btn);
    });

    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('persists the toggled theme to localStorage', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ theme: 'light' }),
    );
    renderToggle();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /switch to dark theme/i }));
    });

    const saved = JSON.parse(
      localStorage.getItem('talenttrust-user-preferences') || '{}',
    );
    expect(saved.theme).toBe('dark');
  });

  it('keeps the skeleton size stable while loading', () => {
    const { renderToStaticMarkup } = require('react-dom/server.node');
    const markup = renderToStaticMarkup(
      <PreferencesProvider>
        <ThemeToggle />
      </PreferencesProvider>,
    );

    expect(markup).toContain('class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-200 animate-pulse dark:bg-slate-700"');
  });
});
