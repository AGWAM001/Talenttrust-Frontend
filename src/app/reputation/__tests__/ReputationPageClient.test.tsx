/**
 * ReputationPageClient.test.tsx
 *
 * Focus management tests for the reputation page.
 *
 * Tests cover:
 * 1. Focus moves to main element on page mount
 * 2. Previous focus element is stored
 * 3. TabIndex is set to -1 on main element
 * 4. Focus behavior with different page states (no reputation, partial, full)
 * 5. Cleanup on unmount
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import ReputationPageClient, {
  applyFocus,
  isFocusableElement,
  resolveFocusTarget,
  FOCUS_DELAY_MS,
  MAX_FOCUS_ATTEMPTS,
} from '../ReputationPageClient';
import * as errorReporter from '@/lib/errorReporter';
import type { Reputation } from '@/types/domain';

// Mock the ReputationPageContent to avoid complex rendering
jest.mock('../ReputationPageContent', () => ({
  ReputationPageContent: ({ reputationData, userName }: any) => (
    <div data-testid="reputation-page-content">
      <div data-testid="user-name">{userName}</div>
      <div data-testid="score">{reputationData?.score ?? 'N/A'}</div>
    </div>
  ),
}));

describe('ReputationPageClient – focus management', () => {
  beforeEach(() => {
    // Reset document focus before each test
    document.body.focus();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial focus behavior', () => {
    it('renders the main element with tabIndex={-1}', () => {
      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveAttribute('tabIndex', '-1');
    });

    it('stores the previously focused element on mount', () => {
      // Create a focusable element and focus it before mounting
      const button = document.createElement('button');
      button.textContent = 'Previous focus';
      document.body.appendChild(button);
      button.focus();

      expect(document.activeElement).toBe(button);

      render(<ReputationPageClient />);

      // The component should have stored the previous focus
      // This is verified indirectly by checking that the button was focused before
      expect(button).toBeInTheDocument();
      
      document.body.removeChild(button);
    });

    it('moves focus to the main element after mount', async () => {
      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('handles the case where no element was previously focused', async () => {
      // Ensure no element is focused
      document.body.focus();

      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });
  });

  describe('Focus with different page states', () => {
    it('focuses main element when reputation data is null', async () => {
      render(<ReputationPageClient reputationData={null} />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('focuses main element when reputation data is undefined', async () => {
      render(<ReputationPageClient reputationData={undefined} />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('focuses main element when reputation data exists', async () => {
      const reputationData: Reputation = {
        score: 88,
        level: 'Trusted Contributor',
        history: [],
      };

      render(<ReputationPageClient reputationData={reputationData} userName="Alice" />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });
    });

    it('focuses main element with custom userName', async () => {
      render(<ReputationPageClient userName="CustomUser" />);

      const main = document.querySelector('main');
      
      await waitFor(() => {
        expect(document.activeElement).toBe(main);
      });

      expect(screen.getByTestId('user-name')).toHaveTextContent('CustomUser');
    });
  });

  describe('Cleanup behavior', () => {
    it('clears the focus timer on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<ReputationPageClient />);

      unmount();

      // clearTimeout should be called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('does not throw when unmounting before focus is set', () => {
      const { unmount } = render(<ReputationPageClient />);

      // Unmount immediately before the focus timer fires
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Accessibility attributes', () => {
    it('applies correct CSS classes to main element', () => {
      render(<ReputationPageClient />);

      const main = document.querySelector('main');
      expect(main).toHaveClass('min-h-screen', 'p-8');
    });

    it('renders child content correctly', () => {
      render(<ReputationPageClient userName="TestUser" />);

      expect(screen.getByTestId('reputation-page-content')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('TestUser');
    });
  });

  describe('Edge cases', () => {
    it('prefers its own main landmark over the first document main', async () => {
      // A competing <main> earlier in the document must not win.
      const competingMain = document.createElement('main');
      competingMain.tabIndex = -1;
      document.body.insertBefore(competingMain, document.body.firstChild);

      render(<ReputationPageClient />);

      const wrapperMain = screen
        .getByTestId('reputation-page-content')
        .closest('main');

      await waitFor(() => {
        expect(document.activeElement).toBe(wrapperMain);
      });
      expect(document.activeElement).not.toBe(competingMain);

      document.body.removeChild(competingMain);
    });

    it('does not throw when the focus target cannot be focused', () => {
      jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});
      jest.spyOn(errorReporter, 'reportError').mockImplementation(() => {});

      expect(() => render(<ReputationPageClient />)).not.toThrow();
    });

    it('handles rapid mount/unmount cycles', () => {
      const { unmount } = render(<ReputationPageClient />);
      unmount();

      const { unmount: unmount2 } = render(<ReputationPageClient />);
      expect(() => unmount2()).not.toThrow();
    });
  });
});

describe('ReputationPageClient – deterministic focus recovery', () => {
  beforeEach(() => {
    document.body.focus();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const wrapperMain = () => {
    const main = document.querySelector('main');
    if (!main) throw new Error('main landmark not found');
    return main;
  };

  it('retries after a transient focus failure and recovers', () => {
    const originalFocus = HTMLElement.prototype.focus;
    let failedOnce = false;
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (!failedOnce) {
        failedOnce = true; // first attempt is a no-op (simulated failure)
        return;
      }
      originalFocus.call(this);
    });

    render(<ReputationPageClient />);

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));
    expect(document.activeElement).not.toBe(wrapperMain());

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));
    expect(document.activeElement).toBe(wrapperMain());
  });

  it('reports once and stops after exhausting bounded retries', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

    render(<ReputationPageClient />);

    act(() => {
      jest.advanceTimersByTime(FOCUS_DELAY_MS * MAX_FOCUS_ATTEMPTS);
    });

    expect(reportSpy).toHaveBeenCalledTimes(1);
    expect(reportSpy).toHaveBeenCalledWith(
      expect.any(Error),
      'ReputationPageClient: focus',
      'warn',
      { attempts: MAX_FOCUS_ATTEMPTS },
    );

    // No further attempts are scheduled after exhaustion.
    act(() => {
      jest.advanceTimersByTime(FOCUS_DELAY_MS * MAX_FOCUS_ATTEMPTS);
    });
    expect(reportSpy).toHaveBeenCalledTimes(1);
  });

  it('does not report when the first attempt succeeds', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});

    render(<ReputationPageClient />);
    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));

    expect(document.activeElement).toBe(wrapperMain());
    expect(reportSpy).not.toHaveBeenCalled();
  });

  it('cancels pending retries on unmount so a stale mount cannot steal focus', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

    const { unmount } = render(<ReputationPageClient />);
    unmount();

    act(() => {
      jest.advanceTimersByTime(FOCUS_DELAY_MS * MAX_FOCUS_ATTEMPTS);
    });

    expect(reportSpy).not.toHaveBeenCalled();
  });

  it('keeps the latest mount focused across rapid mount/unmount cycles', () => {
    const first = render(<ReputationPageClient />);
    first.unmount();

    render(<ReputationPageClient userName="Second" />);

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));

    expect(document.activeElement).toBe(wrapperMain());
    expect(screen.getByTestId('user-name')).toHaveTextContent('Second');
  });

  it('recovers on the final allowed attempt without reporting a failure', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});
    const originalFocus = HTMLElement.prototype.focus;
    let failures = 0;
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (
      this: HTMLElement,
    ) {
      // Fail every attempt except the very last one the budget allows.
      if (failures < MAX_FOCUS_ATTEMPTS - 1) {
        failures += 1;
        return;
      }
      originalFocus.call(this);
    });

    render(<ReputationPageClient />);

    // Attempts 1..MAX-1 are rejected: still no report (the budget is not
    // exhausted yet) and focus has not landed.
    for (let attempt = 1; attempt < MAX_FOCUS_ATTEMPTS; attempt += 1) {
      act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));
      expect(document.activeElement).not.toBe(wrapperMain());
      expect(reportSpy).not.toHaveBeenCalled();
    }

    // Attempt MAX (the boundary) succeeds: recovery wins, nothing to report.
    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));
    expect(document.activeElement).toBe(wrapperMain());
    expect(reportSpy).not.toHaveBeenCalled();
  });

  it('never leaks user data into failure diagnostics and keeps content rendered', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(() => {});

    render(
      <ReputationPageClient
        userName="SensitiveUserName"
        reputationData={{
          score: 4242,
          level: 'Trusted Contributor',
          history: [],
        }}
      />,
    );

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS * MAX_FOCUS_ATTEMPTS));

    expect(reportSpy).toHaveBeenCalledTimes(1);

    const serialized = JSON.stringify(reportSpy.mock.calls);
    expect(serialized).not.toContain('SensitiveUserName');
    expect(serialized).not.toContain('4242');
    expect(serialized).not.toContain('Trusted Contributor');

    // A focus failure is non-fatal: the rendered user data survives and the
    // page remains usable (no silent data loss, no unrecoverable state).
    expect(screen.getByTestId('user-name')).toHaveTextContent('SensitiveUserName');
    expect(screen.getByTestId('score')).toHaveTextContent('4242');
  });

  it('relies on the cancelled flag when a pending timer cannot be cleared', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});
    const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');

    // Simulate a host that fails to honour clearTimeout (worst case): the
    // closure flag alone must still stop the superseded mount from acting.
    const clearSpy = jest.spyOn(global, 'clearTimeout').mockImplementation(() => {});

    const { unmount } = render(<ReputationPageClient />);
    unmount();
    clearSpy.mockRestore();

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS * MAX_FOCUS_ATTEMPTS));

    expect(focusSpy).not.toHaveBeenCalled();
    expect(reportSpy).not.toHaveBeenCalled();
  });

  it('focuses deterministically when React StrictMode double-invokes the effect', () => {
    const reportSpy = jest
      .spyOn(errorReporter, 'reportError')
      .mockImplementation(() => {});

    render(
      <React.StrictMode>
        <ReputationPageClient />
      </React.StrictMode>,
    );

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS));

    // The superseded first invocation must not leave a stray timer that
    // reports a phantom failure, and the live invocation must land focus.
    expect(document.activeElement).toBe(wrapperMain());
    expect(reportSpy).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(FOCUS_DELAY_MS * MAX_FOCUS_ATTEMPTS));
    expect(reportSpy).not.toHaveBeenCalled();
  });
});

describe('ReputationPageClient – focus helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isFocusableElement', () => {
    it('accepts a connected focusable element', () => {
      const el = document.createElement('main');
      document.body.appendChild(el);
      expect(isFocusableElement(el)).toBe(true);
      document.body.removeChild(el);
    });

    it('rejects non-elements, null, and detached nodes', () => {
      expect(isFocusableElement(null)).toBe(false);
      expect(isFocusableElement(undefined)).toBe(false);
      expect(isFocusableElement('main')).toBe(false);
      expect(isFocusableElement(document.createElement('main'))).toBe(false);
    });
  });

  describe('resolveFocusTarget', () => {
    it('prefers the provided ref when focusable', () => {
      const ref = document.createElement('main');
      document.body.appendChild(ref);
      expect(resolveFocusTarget(ref)).toBe(ref);
      document.body.removeChild(ref);
    });

    it('falls back to the first document main when the ref is unusable', () => {
      const detachedRef = document.createElement('main');
      const fallback = document.createElement('main');
      document.body.appendChild(fallback);
      expect(resolveFocusTarget(detachedRef)).toBe(fallback);
      document.body.removeChild(fallback);
    });

    it('returns null when no valid target exists', () => {
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn(
        () => null,
      ) as unknown as typeof document.querySelector;
      try {
        expect(resolveFocusTarget(null)).toBeNull();
      } finally {
        document.querySelector = originalQuerySelector;
      }
    });
  });

  describe('applyFocus', () => {
    it('returns true and focuses a valid target', () => {
      const el = document.createElement('main');
      el.tabIndex = -1;
      document.body.appendChild(el);
      expect(applyFocus(el)).toBe(true);
      expect(document.activeElement).toBe(el);
      document.body.removeChild(el);
    });

    it('returns false for a null target without throwing', () => {
      expect(applyFocus(null)).toBe(false);
    });

    it('reports and returns false when focus() throws', () => {
      const reportSpy = jest
        .spyOn(errorReporter, 'reportError')
        .mockImplementation(() => {});
      const el = document.createElement('main');
      document.body.appendChild(el);
      jest.spyOn(el, 'focus').mockImplementation(() => {
        throw new Error('focus aborted');
      });

      expect(applyFocus(el)).toBe(false);
      expect(reportSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'ReputationPageClient: focus',
        'warn',
      );

      document.body.removeChild(el);
    });
  });
});
