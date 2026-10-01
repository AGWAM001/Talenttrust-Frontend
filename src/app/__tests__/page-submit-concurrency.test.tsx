/**
 * Concurrency regression suite for the login submit path in `src/app/page.tsx`.
 *
 * The behaviours pinned here are exactly the ones that fail when a submission
 * races another one — a sibling `Home` instance, a second browser tab, or a
 * duplicate synthetic event that bypasses the `disabled` submit button:
 *
 * - the cooldown guard reads the authoritative stored deadline, never the
 *   `cooldownRemainingMs` render state (which is stale within a task);
 * - a rejected submission performs **no** accounting and **no** user-visible
 *   side effects;
 * - exactly one attempt is recorded per accepted user action;
 * - cooldown lifecycles (start, restart, expiry, unmount) leak no timers.
 *
 * Interleavings are produced deterministically with fake timers and by
 * mutating the shared throttle storage directly to stand in for a peer writer.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import Home from '../page';
import { PreferencesProvider } from '@/lib/preferences';
import { ToastProvider } from '@/components/toast/toast-provider';
import { safeStorage } from '@/lib/safeStorage';
import { setErrorReporter } from '@/lib/errorReporter';
import { getRemainingCooldownMs, getStoredAttempts, recordAttempt, resetThrottle } from '@/lib/loginThrottle';

function renderHome() {
  return render(
    <PreferencesProvider>
      <ToastProvider>
        <Home />
      </ToastProvider>
    </PreferencesProvider>,
  );
}

function getForm(): HTMLFormElement {
  const form = screen.getByRole('button', { name: /sign in|wait/i }).closest('form');
  if (!(form instanceof HTMLFormElement)) {
    throw new Error('sign-in form not found');
  }
  return form;
}

/** Simulates a peer tab: records `n` attempts against the shared storage. */
function peerRecordsAttempts(n: number): void {
  for (let i = 0; i < n; i += 1) {
    recordAttempt();
  }
}

beforeEach(() => {
  safeStorage.resetCache();
  window.localStorage.clear();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  // Keep the throttle's degraded-mode diagnostics out of the test log; the
  // assertions below verify behaviour, not console noise.
  setErrorReporter(() => {});
});

afterEach(() => {
  setErrorReporter(null);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Home submit — authoritative cooldown guard', () => {
  it('rejects a submission when a peer started a lockout after the last render', () => {
    renderHome();

    // A peer tab records two attempts while this component is mounted. Its
    // `cooldownRemainingMs` render state is still 0, so a state-based guard
    // would wave this submission straight through.
    peerRecordsAttempts(2);
    expect(getStoredAttempts()).toBe(2);
    expect(getRemainingCooldownMs()).toBe(5000);

    fireEvent.submit(getForm());

    // No accounting work, and no escalation past the peer's lockout.
    expect(getStoredAttempts()).toBe(2);
    expect(getRemainingCooldownMs()).toBe(5000);
  });

  it('runs no validation and emits no toast or announcement for a rejected submission', () => {
    renderHome();
    peerRecordsAttempts(2);

    fireEvent.submit(getForm());

    expect(
      screen.queryByRole('alert', { name: /there is a problem/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-invalid', 'false');
  });

  it('re-syncs the view with the authoritative deadline when it rejects a submission', () => {
    renderHome();
    peerRecordsAttempts(2);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();

    fireEvent.submit(getForm());

    const button = screen.getByRole('button', { name: /wait/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Wait 5s');
    expect(screen.getByText(/please wait/i)).toBeInTheDocument();
  });

  it('honours a peer clearing the lockout without waiting for the next tick', () => {
    renderHome();
    peerRecordsAttempts(2);

    // The first submit is rejected and re-syncs the view to the peer's lockout.
    fireEvent.submit(getForm());
    expect(screen.getByRole('button', { name: /wait/i })).toBeDisabled();
    expect(getStoredAttempts()).toBe(2);

    // A peer tab signs in successfully and clears the shared throttle.
    resetThrottle();
    expect(getRemainingCooldownMs()).toBe(0);

    fireEvent.submit(getForm());

    // The guard re-reads storage, so the submission is accepted immediately
    // rather than being blocked by the stale 5s render state.
    expect(getStoredAttempts()).toBe(1);
    expect(
      screen.getByRole('alert', { name: /there is a problem/i }),
    ).toBeInTheDocument();
  });

  it('keeps exactly one countdown interval across repeated restarts', () => {
    const setIntervalSpy = jest.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');

    renderHome();
    peerRecordsAttempts(2);
    expect(setIntervalSpy).toHaveBeenCalledTimes(0);

    // Each rejected submission restarts the countdown; the previous interval is
    // torn down first (the very first start has nothing to tear down), so two
    // timers can never race to write the label.
    fireEvent.submit(getForm());
    fireEvent.submit(getForm());
    fireEvent.submit(getForm());

    expect(setIntervalSpy).toHaveBeenCalledTimes(3);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
  });

  it('tears the countdown down on unmount and stops writing to state', () => {
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHome();
    peerRecordsAttempts(2);

    fireEvent.submit(getForm());
    const beforeUnmount = clearIntervalSpy.mock.calls.length;

    unmount();

    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(beforeUnmount);

    // Advancing past the original deadline after unmount must not throw or
    // resurrect the cancelled countdown.
    expect(() => {
      act(() => {
        jest.advanceTimersByTime(10_000);
      });
    }).not.toThrow();
  });

  it('picks up a peer-extended lockout on the next tick', () => {
    renderHome();
    peerRecordsAttempts(2);
    fireEvent.submit(getForm());
    expect(screen.getByRole('button', { name: /wait 5s/i })).toBeInTheDocument();

    // The peer escalates hard (attempt 3 → 25s).
    act(() => {
      recordAttempt();
    });
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(screen.getByRole('button', { name: /wait 25s/i })).toBeInTheDocument();
  });
});

describe('Home submit — timing boundaries', () => {
  /** Drives the form into an active 5s lockout with an empty (invalid) form. */
  function enterCooldown() {
    renderHome();
    fireEvent.submit(getForm());
    fireEvent.submit(getForm());
    expect(screen.getByRole('button', { name: /wait/i })).toBeDisabled();
  }

  it('rejects a submission one millisecond before the deadline', () => {
    enterCooldown();

    act(() => {
      jest.advanceTimersByTime(4999);
    });
    fireEvent.submit(getForm());

    expect(getStoredAttempts()).toBe(2);
    expect(screen.getByRole('button', { name: /wait/i })).toBeDisabled();
  });

  it('accepts a submission at exactly the deadline', () => {
    enterCooldown();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    fireEvent.submit(getForm());

    expect(getStoredAttempts()).toBe(3);
  });

  it('re-enables the button once the deadline passes', () => {
    enterCooldown();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    expect(screen.queryByText(/please wait/i)).not.toBeInTheDocument();
  });

  it('a stale countdown tick cannot re-disable the form after expiry', () => {
    enterCooldown();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    // Several further tick intervals pass; the label must not come back.
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });
});

describe('Home submit — duplicate work suppression', () => {
  it('records exactly one attempt per accepted user action', () => {
    renderHome();

    fireEvent.submit(getForm());

    expect(getStoredAttempts()).toBe(1);
    expect(getRemainingCooldownMs()).toBe(0);
  });

  it('does not double-count a submission repeated within the same task', () => {
    renderHome();

    // Two synthetic events dispatched back to back in one task. The first
    // leaves no lockout behind (attempt 1 has no backoff), so the second is a
    // genuine second attempt — but it must not inflate past the documented
    // backoff schedule.
    act(() => {
      fireEvent.submit(getForm());
      fireEvent.submit(getForm());
    });

    expect(getStoredAttempts()).toBe(2);
    expect(getRemainingCooldownMs()).toBe(5000);
  });

  it('does not escalate the lockout for repeated submissions during a peer lockout', () => {
    renderHome();
    peerRecordsAttempts(4);
    expect(getRemainingCooldownMs()).toBe(125000);

    for (let i = 0; i < 5; i += 1) {
      fireEvent.submit(getForm());
    }

    expect(getStoredAttempts()).toBe(4);
    expect(getRemainingCooldownMs()).toBe(125000);
  });

  it('clears the throttle on a successful submission once the peer lockout expires', () => {
    renderHome();
    peerRecordsAttempts(2);

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });

    fireEvent.submit(getForm());

    expect(getStoredAttempts()).toBe(0);
    expect(getRemainingCooldownMs()).toBe(0);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    expect(screen.getByRole('status')).toHaveTextContent('Form submitted successfully!');
  });
});

describe('Home submit — accessibility under concurrent state', () => {
  // axe-core drives its own async work, so this block runs on real timers.
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('has no a11y violations while a peer lockout is displayed', async () => {
    const { container } = renderHome();
    peerRecordsAttempts(2);
    fireEvent.submit(getForm());
    expect(screen.getByRole('button', { name: /wait/i })).toBeDisabled();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations after a rejected submission', async () => {
    const { container } = renderHome();
    peerRecordsAttempts(2);

    fireEvent.submit(getForm());

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no a11y violations after a successful submission', async () => {
    const { container } = renderHome();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(getForm());

    expect(await axe(container)).toHaveNoViolations();
  });
});
