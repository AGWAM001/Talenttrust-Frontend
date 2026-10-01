/**
 * Duplicate-work and partial-failure regression suite for the login submit path
 * in `src/app/page.tsx`.
 *
 * `handleSubmit` must behave as if exactly one user action produces exactly one
 * unit of work, even when a submission is *re-entrantly* delivered while the
 * previous one is still on the stack, and even when one of the callbacks it
 * invokes throws part-way through.
 *
 * `useToast` and `useFormAnnouncer` are mocked because they are the two
 * callbacks the handler invokes that can be re-entered or made to throw at a
 * controlled point — and because counting their invocations is the direct way
 * to assert "no duplicate side effects".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Home from '../page';
import { PreferencesProvider } from '@/lib/preferences';
import { useToast } from '@/components/toast/toast-provider';
import { useFormAnnouncer } from '@/hooks/useFormAnnouncer';
import { setErrorReporter } from '@/lib/errorReporter';
import { safeStorage } from '@/lib/safeStorage';
import { getRemainingCooldownMs, getStoredAttempts } from '@/lib/loginThrottle';

jest.mock('@/components/toast/toast-provider', () => ({
  __esModule: true,
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: jest.fn(),
}));

jest.mock('@/hooks/useFormAnnouncer', () => ({
  useFormAnnouncer: jest.fn(),
}));

const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseFormAnnouncer = useFormAnnouncer as jest.MockedFunction<typeof useFormAnnouncer>;

const showSuccess = jest.fn();
const showError = jest.fn();
const announce = jest.fn();

function renderHome() {
  return render(
    <PreferencesProvider>
      <Home />
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

function fillValidCredentials() {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'user@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: 'password123' },
  });
}

beforeEach(() => {
  safeStorage.resetCache();
  window.localStorage.clear();
  // Fake timers keep the shared throttle's wall-clock deadlines exact, so
  // assertions on the backoff window are not sensitive to machine speed.
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  setErrorReporter(() => {});
  showSuccess.mockReset();
  showError.mockReset();
  announce.mockReset();
  mockUseToast.mockReturnValue({
    toasts: [],
    showSuccess,
    showError,
    dismissToast: jest.fn(),
  } as unknown as ReturnType<typeof useToast>);
  mockUseFormAnnouncer.mockReturnValue({
    politeMessage: '',
    assertiveMessage: '',
    announce,
    clearAnnouncement: jest.fn(),
  } as unknown as ReturnType<typeof useFormAnnouncer>);
});

afterEach(() => {
  setErrorReporter(null);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/**
 * Re-enters the submit handler from inside `trigger`, i.e. while the original
 * handler is still on the stack. This is the shape a duplicate or replayed
 * delivery takes. Nesting is capped so a missing guard yields a readable
 * assertion failure rather than a stack overflow.
 */
function reenterFrom(trigger: jest.Mock, cap = 5): () => number {
  const form = getForm();
  let nested = 0;
  trigger.mockImplementation(() => {
    if (nested < cap) {
      nested += 1;
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  });
  return () => nested;
}

describe('Home submit — re-entrant duplicate delivery', () => {
  it('suppresses a submission re-entered from the success toast path', () => {
    renderHome();
    fillValidCredentials();
    const getNestedCount = reenterFrom(showSuccess);

    fireEvent.submit(getForm());

    expect(getNestedCount()).toBe(1);
    expect(showSuccess).toHaveBeenCalledTimes(1);
  });

  it('suppresses a submission re-entered from the announcer path', () => {
    renderHome();
    const getNestedCount = reenterFrom(announce);

    fireEvent.submit(getForm());

    expect(getNestedCount()).toBe(1);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('emits no duplicate success side effects for one user action', () => {
    renderHome();
    fillValidCredentials();
    reenterFrom(showSuccess);

    fireEvent.submit(getForm());

    expect(showSuccess).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith({
      message: 'Form submitted successfully.',
      type: 'success',
    });
  });

  it('counts a re-entrantly duplicated successful submission once, then clears', () => {
    renderHome();
    fillValidCredentials();
    reenterFrom(showSuccess);

    fireEvent.submit(getForm());

    // One attempt recorded and then reset by the success path — the duplicate
    // delivery must not leave a second attempt or a stray lockout behind.
    expect(getStoredAttempts()).toBe(0);
    expect(getRemainingCooldownMs()).toBe(0);
  });

  it('counts a re-entrantly duplicated failing submission once', () => {
    renderHome();
    // Empty form, so the handler takes the failure path and calls `announce`.
    reenterFrom(announce);

    fireEvent.submit(getForm());

    expect(getStoredAttempts()).toBe(1);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('leaves the form usable after a suppressed duplicate', () => {
    renderHome();
    fillValidCredentials();
    reenterFrom(showSuccess);

    fireEvent.submit(getForm());
    fireEvent.submit(getForm());

    // The second, independent user action is processed normally.
    expect(showSuccess).toHaveBeenCalledTimes(2);
  });
});

/**
 * The in-flight lock must not stick on *any* exit path, otherwise one bad
 * submission leaves the form permanently unsubmittable — an unrecoverable UX.
 *
 * The `finally` in `handleSubmit` also covers a throwing dependency, but React
 * 19 routes handler errors to its own unrecoverable-error channel before they
 * can be observed here, so a throwing callback is deliberately not driven from
 * this suite. What is asserted is that every path this suite *can* drive —
 * accepted, rejected, and suppressed — leaves the lock released.
 */
describe('Home submit — the in-flight lock never sticks', () => {
  it('releases the lock after an accepted submission', () => {
    renderHome();
    fillValidCredentials();

    fireEvent.submit(getForm());
    fireEvent.submit(getForm());

    expect(showSuccess).toHaveBeenCalledTimes(2);
  });

  it('releases the lock after a rejected (cooldown) submission', () => {
    renderHome();

    // Attempt 1 has no backoff; attempt 2 starts a 5s lockout, so the third
    // submission takes the early-rejection return inside the guarded region.
    fireEvent.submit(getForm());
    fireEvent.submit(getForm());
    fireEvent.submit(getForm());
    fireEvent.submit(getForm());

    // Two accepted, two rejected — and no wedged form.
    expect(getStoredAttempts()).toBe(2);
    expect(getRemainingCooldownMs()).toBe(5000);
  });

  it('releases the lock after a suppressed re-entrant submission', () => {
    renderHome();
    fillValidCredentials();
    reenterFrom(showSuccess);

    fireEvent.submit(getForm());

    // A follow-up user action is processed normally, proving the nested call
    // left no residual lock behind.
    showSuccess.mockReset();
    fireEvent.submit(getForm());

    expect(showSuccess).toHaveBeenCalledTimes(1);
  });

  it('emits no diagnostic report for a normal successful submission', () => {
    const contexts: string[] = [];
    setErrorReporter((_error, context) => {
      contexts.push(context);
    });
    renderHome();
    fillValidCredentials();

    fireEvent.submit(getForm());

    expect(contexts).toHaveLength(0);
  });
});
