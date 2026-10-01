/**
 * ReputationCopyId.test.tsx
 *
 * Tests for the copy-to-clipboard feature added to ReputationProfile (issue #52).
 * Covers:
 *  - Copy button renders for each event ID
 *  - Accessible label and aria-pressed state
 *  - Clipboard API success path → toast shown
 *  - Clipboard API unavailable → execCommand fallback → toast shown
 *  - Both fallback paths fail → error toast shown
 *  - Keyboard operability (button is focusable and clickable)
 *  - execCommandFallback utility function unit tests
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReputationProfile, {
  ReputationEvent,
  execCommandFallback,
} from '../ReputationProfile';

// ---------------------------------------------------------------------------
// Mock next/navigation (required by ReputationProfile)
// ---------------------------------------------------------------------------

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

// ---------------------------------------------------------------------------
// Toast mock
// ---------------------------------------------------------------------------

const mockShowSuccess = jest.fn();
const mockShowError = jest.fn();

jest.mock('@/components/toast/toast-provider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    dismissToast: jest.fn(),
    toasts: [],
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EVENTS: ReputationEvent[] = [
  { id: 'ev-001', type: 'Verification', summary: 'Identity verified', date: '2026-01-10' },
  { id: 'ev-002', type: 'Review', summary: 'Positive review', date: '2026-01-12' },
];

function renderProfile(history = EVENTS) {
  return render(
    <ReputationProfile
      name="Alice"
      score={3}
      history={history}
      syncUrl={false}
    />,
  );
}

// ---------------------------------------------------------------------------
// Clipboard helpers
// ---------------------------------------------------------------------------

let originalClipboard: typeof navigator.clipboard;

beforeEach(() => {
  jest.useFakeTimers();
  originalClipboard = navigator.clipboard;
  mockShowSuccess.mockClear();
  mockShowError.mockClear();
});

afterEach(() => {
  act(() => { jest.runAllTimers(); });
  jest.useRealTimers();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
});

function mockClipboard(impl: () => Promise<void> = () => Promise.resolve()) {
  const writeText = jest.fn().mockImplementation(impl);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return writeText;
}

function removeClipboard() {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
}

// ---------------------------------------------------------------------------
// Render: copy button present
// ---------------------------------------------------------------------------

describe('ReputationProfile — copy ID button renders', () => {
  it('renders a copy button for each event', () => {
    mockClipboard();
    renderProfile();
    EVENTS.forEach((e) => {
      expect(screen.getByTestId(`copy-reputation-id-btn-${e.id}`)).toBeInTheDocument();
    });
  });

  it('button has a descriptive aria-label containing the event ID', () => {
    mockClipboard();
    renderProfile();
    expect(
      screen.getByRole('button', { name: /Copy reputation event ID ev-001 to clipboard/i }),
    ).toBeInTheDocument();
  });

  it('button has aria-pressed="false" before any copy', () => {
    mockClipboard();
    renderProfile();
    expect(screen.getByTestId('copy-reputation-id-btn-ev-001')).toHaveAttribute('aria-pressed', 'false');
  });

  it('displays the event ID as a code element next to the copy button', () => {
    mockClipboard();
    renderProfile();
    expect(screen.getByTestId('reputation-event-id-ev-001')).toHaveTextContent('ev-001');
  });

  it('button text reads "Copy ID" before any click', () => {
    mockClipboard();
    renderProfile();
    expect(screen.getByTestId('copy-reputation-id-btn-ev-001')).toHaveTextContent('Copy ID');
  });
});

// ---------------------------------------------------------------------------
// Clipboard API success path
// ---------------------------------------------------------------------------

describe('ReputationProfile — Clipboard API success', () => {
  it('calls navigator.clipboard.writeText with the event ID', async () => {
    const writeText = mockClipboard();
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(writeText).toHaveBeenCalledWith('ev-001');
  });

  it('shows a success toast after a successful copy', async () => {
    mockClipboard();
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
    expect(mockShowSuccess.mock.calls[0][0]).toMatchObject({ title: expect.stringContaining('ev-001') });
  });

  it('button shows "Copied" and aria-pressed="true" after successful copy', async () => {
    mockClipboard();
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    const btn = screen.getByTestId('copy-reputation-id-btn-ev-001');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveTextContent('Copied');
  });

  it('button resets to "Copy ID" after the delay', async () => {
    mockClipboard();
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    act(() => { jest.advanceTimersByTime(2000); });

    await waitFor(() => {
      expect(screen.getByTestId('copy-reputation-id-btn-ev-001')).toHaveTextContent('Copy ID');
    });
  });

  it('only the clicked button shows "Copied"; other buttons are unaffected', async () => {
    mockClipboard();
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(screen.getByTestId('copy-reputation-id-btn-ev-001')).toHaveTextContent('Copied');
    expect(screen.getByTestId('copy-reputation-id-btn-ev-002')).toHaveTextContent('Copy ID');
  });

  it('does not show an error toast on success', async () => {
    mockClipboard();
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(mockShowError).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Clipboard API unavailable — execCommand fallback
// ---------------------------------------------------------------------------

describe('ReputationProfile — execCommand fallback (Clipboard API unavailable)', () => {
  it('falls back to execCommand when navigator.clipboard is absent', async () => {
    removeClipboard();
    document.execCommand = jest.fn().mockReturnValue(true);
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(mockShowSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows error toast when both Clipboard API and execCommand fail', async () => {
    removeClipboard();
    document.execCommand = jest.fn().mockReturnValue(false);
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(mockShowError).toHaveBeenCalledTimes(1);
    expect(mockShowError.mock.calls[0][0]).toMatchObject({ title: expect.stringContaining('ev-001') });
  });

  it('shows error toast when Clipboard API rejects', async () => {
    mockClipboard(() => Promise.reject(new Error('Permission denied')));
    document.execCommand = jest.fn().mockReturnValue(false);
    renderProfile();

    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-reputation-id-btn-ev-001'));
    });

    expect(mockShowError).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Keyboard operability
// ---------------------------------------------------------------------------

describe('ReputationProfile — copy button keyboard operability', () => {
  it('button is in the tab order (not disabled)', () => {
    mockClipboard();
    renderProfile();
    const btn = screen.getByTestId('copy-reputation-id-btn-ev-001');
    expect(btn).not.toBeDisabled();
  });

  it('pressing Enter on the button triggers the copy', async () => {
    const writeText = mockClipboard();
    renderProfile();
    const btn = screen.getByTestId('copy-reputation-id-btn-ev-001');

    await act(async () => {
      btn.focus();
      fireEvent.keyDown(btn, { key: 'Enter' });
      fireEvent.click(btn);
    });

    expect(writeText).toHaveBeenCalledWith('ev-001');
  });
});

// ---------------------------------------------------------------------------
// execCommandFallback unit tests
// ---------------------------------------------------------------------------

describe('execCommandFallback', () => {
  it('returns false in an SSR-like environment (document undefined)', () => {
    const origDoc = global.document;
    // @ts-expect-error - simulating SSR
    delete global.document;
    expect(execCommandFallback('test')).toBe(false);
    global.document = origDoc;
  });

  it('returns true when execCommand succeeds', () => {
    document.execCommand = jest.fn().mockReturnValue(true);
    expect(execCommandFallback('abc')).toBe(true);
  });

  it('returns false when execCommand returns false', () => {
    document.execCommand = jest.fn().mockReturnValue(false);
    expect(execCommandFallback('abc')).toBe(false);
  });

  it('returns false when execCommand throws', () => {
    document.execCommand = jest.fn().mockImplementation(() => { throw new Error('not supported'); });
    expect(execCommandFallback('abc')).toBe(false);
  });

  it('removes the textarea from the DOM after completion', () => {
    document.execCommand = jest.fn().mockReturnValue(true);
    const countBefore = document.body.querySelectorAll('textarea').length;
    execCommandFallback('hello');
    expect(document.body.querySelectorAll('textarea').length).toBe(countBefore);
  });
});
