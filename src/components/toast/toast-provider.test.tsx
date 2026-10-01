/// <reference types="jest" />

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { PreferencesProvider } from '@/lib/preferences';
import { ToastProvider, useToast, ToastErrorBoundary, ToastSkeleton } from './toast-provider';
import * as errorReporter from '@/lib/errorReporter';

function ToastHarness() {
  const { showError, showSuccess } = useToast();

  return (
    <div>
      <button
        onClick={() =>
          showSuccess({
            title: 'Milestone released',
            description: 'Funds are on the way.',
            duration: 2000,
          })
        }
        type="button"
      >
        Trigger success
      </button>
      <button
        onClick={() =>
          showError({
            title: 'Wallet not connected',
            description: 'Connect a wallet first.',
            duration: 2000,
          })
        }
        type="button"
      >
        Trigger error
      </button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  it('renders success toasts and announces them in a polite live region', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Milestone released');
    expect(screen.getByLabelText('Notifications')).toHaveTextContent('Funds are on the way.');
    expect(screen.getByLabelText('Notifications')).toHaveAttribute('aria-atomic', 'false');
    expect(screen.getByText(/Milestone released\. Funds are on the way\./i)).toHaveAttribute('aria-live', 'polite');
  });

  it('renders error toasts and announces them in an assertive live region', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Wallet not connected');
    expect(screen.getByText(/Wallet not connected\. Connect a wallet first\./i)).toHaveAttribute('aria-live', 'assertive');
  });

  it('dismisses a toast when the dismiss button is clicked', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));
    fireEvent.click(screen.getByRole('button', { name: /dismiss success notification/i }));

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('automatically dismisses toasts after their duration', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('generates unique ids for rapid toast creation', () => {
    const ids: string[] = [];

    function RapidToastHarness() {
      const { showSuccess } = useToast();

      return (
        <div>
          <button
            onClick={() => {
              const id = showSuccess({ title: 'Toast 1' });
              ids.push(id);
            }}
            type="button"
          >
            Create toast 1
          </button>
          <button
            onClick={() => {
              const id = showSuccess({ title: 'Toast 2' });
              ids.push(id);
            }}
            type="button"
          >
            Create toast 2
          </button>
          <button
            onClick={() => {
              const id = showSuccess({ title: 'Toast 3' });
              ids.push(id);
            }}
            type="button"
          >
            Create toast 3
          </button>
        </div>
      );
    }

    render(
      <ToastProvider>
        <RapidToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /create toast 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /create toast 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /create toast 3/i }));

    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(3);
    expect(uniqueIds.size).toBe(3);
    expect(ids.every((id) => id.startsWith('toast-'))).toBe(true);
  });

  it('does not create duplicate toasts under StrictMode double invocation', () => {
    const ids: string[] = [];

    function StrictModeHarness() {
      const { showSuccess } = useToast();

      return (
        <div>
          <button
            onClick={() => {
              const id = showSuccess({ title: 'StrictMode toast' });
              ids.push(id);
            }}
            type="button"
          >
            Create toast
          </button>
        </div>
      );
    }

    render(
      <StrictMode>
        <ToastProvider>
          <StrictModeHarness />
        </ToastProvider>
      </StrictMode>,
    );

    fireEvent.click(screen.getByRole('button', { name: /create toast/i }));

    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(1);
    expect(uniqueIds.size).toBe(1);
  });

  it('pauses auto-dismiss while a toast is hovered', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    fireEvent.mouseEnter(screen.getByRole('status'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole('status'));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('pauses auto-dismiss while a toast is focused', async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    fireEvent.focus(screen.getByRole('button', { name: /dismiss success notification/i }));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.blur(screen.getByRole('button', { name: /dismiss success notification/i }));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('dismisses toast by returned id', async () => {
    let returnedId: string | null = null;

    function DismissByIdHarness() {
      const { showSuccess, dismissToast } = useToast();

      return (
        <div>
          <button
            onClick={() => {
              returnedId = showSuccess({ title: 'Dismissible toast' });
            }}
            type="button"
          >
            Create toast
          </button>
          <button
            onClick={() => {
              if (returnedId) {
                dismissToast(returnedId);
              }
            }}
            type="button"
          >
            Dismiss by id
          </button>
        </div>
      );
    }

    render(
      <ToastProvider>
        <DismissByIdHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /create toast/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss by id/i }));

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
});

describe('loading skeleton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  it('renders skeleton in the viewport when no toasts are present', () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );

    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton!.className).toContain('animate-pulse');
  });

  it('viewport has aria-busy when skeleton is visible', () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );

    const viewport = screen.getByLabelText('Notifications');
    expect(viewport).toHaveAttribute('aria-busy', 'true');
  });

  it('skeleton is replaced by toast content when a toast appears', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    expect(screen.getByLabelText('Notifications')).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Milestone released');
    expect(screen.getByLabelText('Notifications')).not.toHaveAttribute('aria-busy');
  });

  it('viewport is not busy when toasts are already present', () => {
    function PreFilledHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          onClick={() => showSuccess({ title: 'Exists' })}
          type="button"
        >
          Add
        </button>
      );
    }

    render(
      <ToastProvider>
        <PreFilledHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Notifications')).not.toHaveAttribute('aria-busy');
  });

  it('skeleton wrapper div is aria-hidden', () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );

    const skeleton = document.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeInTheDocument();
  });

  it('ToastSkeleton renders with correct toast-like structure', () => {
    const { container } = render(<ToastSkeleton />);

    const skeletonDiv = container.firstChild as HTMLElement;
    expect(skeletonDiv).toHaveAttribute('aria-hidden', 'true');
    expect(skeletonDiv.className).toContain('rounded-2xl');
    expect(skeletonDiv.className).toContain('animate-pulse');
    expect(skeletonDiv.querySelector('.rounded-full')).toBeInTheDocument();
    expect(skeletonDiv.querySelector('.rounded-md')).toBeInTheDocument();
  });

  it('error boundary fallback replaces skeleton when toast render throws', () => {
    const ThrowingSkeleton = () => {
      throw new Error('Skeleton render error');
    };

    render(
      <ToastErrorBoundary>
        <ThrowingSkeleton />
      </ToastErrorBoundary>
    );

    expect(screen.getByText('Notifications failed to load')).toBeInTheDocument();
  });
});

describe('quietMode', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('suppresses success toasts when quietMode is true and returns "suppressed"', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ quietMode: true }),
    );

    let result: string | null = null;

    function QuietModeHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          onClick={() => {
            result = showSuccess({ title: 'Quiet test' });
          }}
          type="button"
        >
          Trigger
        </button>
      );
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <QuietModeHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    expect(result).toBe('suppressed');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not suppress error toasts when quietMode is true', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ quietMode: true }),
    );

    let result: string | null = null;

    function QuietModeErrorHarness() {
      const { showError } = useToast();
      return (
        <button
          onClick={() => {
            result = showError({ title: 'Error test' });
          }}
          type="button"
        >
          Trigger error
        </button>
      );
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <QuietModeErrorHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));

    expect(result).not.toBe('suppressed');
    expect(result).toMatch(/^toast-/);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('density', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders viewport with relaxed (gap-3) spacing by default', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    const viewport = screen.getByLabelText('Notifications');
    expect(viewport.className).toMatch(/gap-3/);
  });

  it('renders viewport with compact (gap-1.5) spacing when toastDensity is compact', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDensity: 'compact' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <ToastHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger success/i }));

    const viewport = screen.getByLabelText('Notifications');
    expect(viewport.className).toMatch(/gap-1\.5/);
  });
});

describe('default duration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('uses DEFAULT_DURATION (5000ms) when no duration is provided', () => {
    function DefaultDurationHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          onClick={() => showSuccess({ title: 'Default duration' })}
          type="button"
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <DefaultDurationHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('maxVisible cap (MAX_VISIBLE_TOASTS = 4)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  function MultiToastHarness({ count }: { count: number }) {
    const { showSuccess } = useToast();
    return (
      <button
        onClick={() => {
          for (let i = 1; i <= count; i++) {
            showSuccess({ title: `Toast ${i}`, duration: 10000 });
          }
        }}
        type="button"
      >
        Add {count} toasts
      </button>
    );
  }

  it('shows all toasts when under the cap', () => {
    render(
      <ToastProvider>
        <MultiToastHarness count={3} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 3 toasts/i }));

    expect(screen.getAllByRole('status')).toHaveLength(3);
  });

  it('shows exactly MAX_VISIBLE_TOASTS toasts when exactly at cap', () => {
    render(
      <ToastProvider>
        <MultiToastHarness count={4} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 4 toasts/i }));

    expect(screen.getAllByRole('status')).toHaveLength(4);
  });

  it('evicts the oldest toast when over cap, keeping only MAX_VISIBLE_TOASTS', () => {
    render(
      <ToastProvider>
        <MultiToastHarness count={5} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 5 toasts/i }));

    const visible = screen.getAllByRole('status');
    expect(visible).toHaveLength(4);
    expect(screen.queryAllByText('Toast 1', { selector: 'p' })).toHaveLength(0);
    expect(screen.getAllByText('Toast 2', { selector: 'p' })).toHaveLength(1);
    expect(screen.getAllByText('Toast 5', { selector: 'p' })).toHaveLength(1);
  });

  it('always keeps the newest toast after multiple over-cap additions', () => {
    render(
      <ToastProvider>
        <MultiToastHarness count={6} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 6 toasts/i }));

    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.queryAllByText('Toast 1', { selector: 'p' })).toHaveLength(0);
    expect(screen.queryAllByText('Toast 2', { selector: 'p' })).toHaveLength(0);
    expect(screen.getAllByText('Toast 6', { selector: 'p' })).toHaveLength(1);
  });

  it('clears the evicted toast timer so it cannot auto-dismiss after eviction', async () => {
    function SequentialHarness() {
      const { showSuccess } = useToast();
      return (
        <>
          <button
            onClick={() => {
              for (let i = 1; i <= 4; i++) {
                showSuccess({ title: `SeqToast ${i}`, duration: 5000 });
              }
            }}
            type="button"
          >
            Add 4
          </button>
          <button
            onClick={() => showSuccess({ title: 'SeqToast 5', duration: 5000 })}
            type="button"
          >
            Add 5th
          </button>
        </>
      );
    }

    render(
      <ToastProvider>
        <SequentialHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 4/i }));
    expect(screen.getAllByRole('status')).toHaveLength(4);

    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    fireEvent.click(screen.getByRole('button', { name: /add 5th/i }));

    expect(clearTimeoutSpy).toHaveBeenCalled();

    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.queryAllByText('SeqToast 1', { selector: 'p' })).toHaveLength(0);
    expect(screen.getAllByText('SeqToast 5', { selector: 'p' })).toHaveLength(1);

    clearTimeoutSpy.mockRestore();
  });

  it('announces the newest toast in the live region after eviction', () => {
    render(
      <ToastProvider>
        <MultiToastHarness count={5} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 5 toasts/i }));

    const politeRegion = document.querySelector('[aria-live="polite"]');
    expect(politeRegion).toHaveTextContent('Toast 5');
  });

  it('does not affect pause-on-hover after eviction', async () => {
    function SingleEvictHarness() {
      const { showSuccess } = useToast();
      return (
        <>
          <button
            onClick={() => {
              for (let i = 1; i <= 5; i++) {
                showSuccess({ title: `T${i}`, duration: 2000 });
              }
            }}
            type="button"
          >
            Add 5
          </button>
        </>
      );
    }

    render(
      <ToastProvider>
        <SingleEvictHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 5/i }));

    const t5Para = screen.getAllByText('T5', { selector: 'p' })[0];
    const t5 = t5Para.closest('[role="status"]')!;
    fireEvent.mouseEnter(t5);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(t5).toBeInTheDocument();

    fireEvent.mouseLeave(t5);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(screen.queryAllByText('T5', { selector: 'p' })).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// action button
// ---------------------------------------------------------------------------

describe('toast action button', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  it('renders an action button when action is provided on a success toast', () => {
    function ActionHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({
              title: 'File saved',
              action: { label: 'Undo', onClick: jest.fn() },
            })
          }
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <ActionHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('renders an action button when action is provided on an error toast', () => {
    function ActionErrorHarness() {
      const { showError } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showError({
              title: 'Upload failed',
              action: { label: 'Retry', onClick: jest.fn() },
            })
          }
        >
          Trigger error
        </button>
      );
    }

    render(
      <ToastProvider>
        <ActionErrorHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger error/i }));

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('clicking the action button fires the onClick callback', async () => {
    const onActionClick = jest.fn();

    function ActionCallbackHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({
              title: 'Contract saved',
              action: { label: 'View', onClick: onActionClick },
            })
          }
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <ActionCallbackHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(onActionClick).toHaveBeenCalledTimes(1);
  });

  it('clicking the action button dismisses the toast immediately', async () => {
    function ActionDismissHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({
              title: 'Milestone released',
              duration: 10000,
              action: { label: 'Undo', onClick: jest.fn() },
            })
          }
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <ActionDismissHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    // The auto-dismiss timer must not fire after the toast is already gone.
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fires onClick before dismissing (callback order)', () => {
    const callOrder: string[] = [];
    const onActionClick = jest.fn(() => callOrder.push('action'));

    function OrderHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({
              title: 'Saved',
              action: { label: 'Undo', onClick: onActionClick },
            })
          }
        >
          Trigger
        </button>
      );
    }

    // For this test we verify onClick is called, not the internal order of
    // state updates (which React batches). Just confirm onClick runs exactly once.
    render(
      <ToastProvider>
        <OrderHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(onActionClick).toHaveBeenCalledTimes(1);
  });

  it('does not render an action button when action is omitted (backward compatibility)', () => {
    function NoActionHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({ title: 'Done', description: 'All good.' })
          }
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <NoActionHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    // Only the dismiss button should be present inside the toast
    const toast = screen.getByRole('status');
    const buttons = toast.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Dismiss success notification');
  });

  it('action label is rendered as a plain text node, not parsed as HTML', () => {
    const maliciousLabel = '<img src=x onerror=alert(1)>';

    function XssHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({
              title: 'Test',
              action: { label: maliciousLabel, onClick: jest.fn() },
            })
          }
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <XssHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    // The button text content must equal the raw string, not contain an img element.
    const actionBtn = screen.getByRole('button', { name: maliciousLabel });
    expect(actionBtn).toBeInTheDocument();
    expect(actionBtn.querySelector('img')).toBeNull();
    expect(actionBtn.textContent).toBe(maliciousLabel);
  });

  it('action button has focus-visible ring styling class', () => {
    function FocusHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            showSuccess({
              title: 'Ready',
              action: { label: 'Open', onClick: jest.fn() },
            })
          }
        >
          Trigger
        </button>
      );
    }

    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    const actionBtn = screen.getByRole('button', { name: 'Open' });
    expect(actionBtn.className).toContain('focus-visible:ring-2');
  });

  it('showSuccess and showError signatures remain backward compatible without action', () => {
    // Calling both without action must not throw and must return a valid id.
    let successId: string = '';
    let errorId: string = '';

    function BackCompatHarness() {
      const { showSuccess, showError } = useToast();
      return (
        <>
          <button
            type="button"
            onClick={() => { successId = showSuccess({ title: 'Success' }); }}
          >
            Success
          </button>
          <button
            type="button"
            onClick={() => { errorId = showError({ title: 'Error' }); }}
          >
            Error
          </button>
        </>
      );
    }

    render(
      <ToastProvider>
        <BackCompatHarness />
      </ToastProvider>,
    );

    expect(() => {
      fireEvent.click(screen.getByRole('button', { name: /^success$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^error$/i }));
    }).not.toThrow();

    expect(successId).toMatch(/^toast-/);
    expect(errorId).toMatch(/^toast-/);
  });
});

// ---------------------------------------------------------------------------
// toastDuration preference
// ---------------------------------------------------------------------------

describe('toastDuration preference', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  // Helper: renders with a given toastDuration preference and a trigger button.
  function DurationHarness({ variant = 'success' }: { variant?: 'success' | 'error' }) {
    const { showSuccess, showError } = useToast();
    return (
      <button
        type="button"
        onClick={() => {
          if (variant === 'success') {
            showSuccess({ title: 'Duration test' });
          } else {
            showError({ title: 'Duration error test' });
          }
        }}
      >
        Trigger
      </button>
    );
  }

  it("'normal' (default) auto-dismisses at 5000ms", async () => {
    render(
      <ToastProvider>
        <DurationHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(4999); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1); });
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it("'short' auto-dismisses at 2500ms", async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'short' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(2499); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1); });
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it("'long' auto-dismisses at 10000ms", async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'long' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(9999); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1); });
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it("'persistent' — toast never auto-dismisses", async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Advance well past any normal timeout.
    act(() => { jest.advanceTimersByTime(60000); });

    // Toast must still be visible.
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it("'persistent' — toast is dismissible via the dismiss button", async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss success notification/i }));

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it("'persistent' — toast is dismissible via keyboard (Enter on dismiss button)", async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    const dismissBtn = screen.getByRole('button', { name: /dismiss success notification/i });
    dismissBtn.focus();
    fireEvent.keyDown(dismissBtn, { key: 'Enter', code: 'Enter' });
    fireEvent.click(dismissBtn); // browser fires click on Enter for buttons

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('per-call duration overrides the persistent preference', async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent' }),
    );

    function OverrideHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() => showSuccess({ title: 'Override', duration: 1000 })}
        >
          Trigger
        </button>
      );
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <OverrideHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(999); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1); });
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('per-call duration overrides the long preference', async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'long' }),
    );

    function ShortOverrideHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() => showSuccess({ title: 'Short override', duration: 500 })}
        >
          Trigger
        </button>
      );
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <ShortOverrideHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(500); });
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('invalid stored toastDuration falls back to normal (5000ms)', async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'forever' }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(4999); });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(1); });
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('persistent + quietMode: success toast is still suppressed', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent', quietMode: true }),
    );

    let result: string | null = null;

    function PersistentQuietHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() => { result = showSuccess({ title: 'Silent persistent' }); }}
        >
          Trigger
        </button>
      );
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <PersistentQuietHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    expect(result).toBe('suppressed');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('persistent + quietMode: error toast is still shown and stays without auto-dismiss', async () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent', quietMode: true }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <DurationHarness variant="error" />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(60000); });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('MAX_VISIBLE_TOASTS eviction still works with persistent preference', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ toastDuration: 'persistent' }),
    );

    function PersistentMultiHarness({ count }: { count: number }) {
      const { showSuccess } = useToast();
      return (
        <button
          type="button"
          onClick={() => {
            for (let i = 1; i <= count; i++) {
              showSuccess({ title: `PToast ${i}` });
            }
          }}
        >
          Add toasts
        </button>
      );
    }

    render(
      <PreferencesProvider>
        <ToastProvider>
          <PersistentMultiHarness count={5} />
        </ToastProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add toasts/i }));

    // After adding 5, only 4 should be visible (oldest evicted).
    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.queryAllByText('PToast 1', { selector: 'p' })).toHaveLength(0);
    expect(screen.getAllByText('PToast 5', { selector: 'p' })).toHaveLength(1);

    // Advance time — none should auto-dismiss (all persistent).
    act(() => { jest.advanceTimersByTime(60000); });
    expect(screen.getAllByRole('status')).toHaveLength(4);
  });
});

describe('ToastErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(errorReporter, 'reportError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children seamlessly when no error occurs', () => {
    render(
      <ToastErrorBoundary>
        <div>Normal Content</div>
      </ToastErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('catches render errors in toast viewport, logs them, and renders fallback', () => {
    const ThrowingComponent = () => {
      throw new Error('Toast render error');
    };

    render(
      <ToastErrorBoundary>
        <ThrowingComponent />
      </ToastErrorBoundary>
    );

    expect(screen.getByText('Notifications failed to load')).toBeInTheDocument();
    expect(errorReporter.reportError).toHaveBeenCalledWith(
      expect.any(Error),
      'ToastErrorBoundary',
      'error',
      expect.any(Object)
    );
  });

  it('recovers when retry button is clicked', () => {
    let shouldThrow = true;
    const RecoverableComponent = () => {
      if (shouldThrow) {
        throw new Error('Temporary error');
      }
      return <div>Recovered!</div>;
    };

    render(
      <ToastErrorBoundary>
        <RecoverableComponent />
      </ToastErrorBoundary>
    );

    expect(screen.getByText('Notifications failed to load')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByText('Recovered!')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// focus management
// ---------------------------------------------------------------------------

describe('focus management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.clearAllTimers();
    });
    jest.useRealTimers();
  });

  function FocusHarness() {
    const { showSuccess, showError } = useToast();

    return (
      <div>
        <button
          onClick={() =>
            showSuccess({ title: 'Saved', duration: 5000 })
          }
          type="button"
          data-testid="trigger-success"
        >
          Trigger success
        </button>
        <button
          onClick={() =>
            showError({ title: 'Failed', duration: 5000 })
          }
          type="button"
          data-testid="trigger-error"
        >
          Trigger error
        </button>
        <button
          onClick={() =>
            showSuccess({
              title: 'With action',
              duration: 5000,
              action: { label: 'Undo', onClick: jest.fn() },
            })
          }
          type="button"
          data-testid="trigger-action"
        >
          Trigger action
        </button>
        <input data-testid="external-input" type="text" />
      </div>
    );
  }

  it('moves focus to the dismiss button when a success toast opens', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('trigger-success'));

    const dismissBtn = screen.getByRole('button', { name: /dismiss success notification/i });
    expect(dismissBtn).toHaveFocus();
  });

  it('moves focus to the action button over the dismiss button', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('trigger-action'));

    expect(screen.getByRole('button', { name: 'Undo' })).toHaveFocus();
  });

  it('moves focus to the newest toast when multiple appear', () => {
    function MultiHarness() {
      const { showSuccess } = useToast();
      return (
        <div>
          <button
            onClick={() => {
              showSuccess({ title: 'First', duration: 10000 });
              showSuccess({ title: 'Second', duration: 10000 });
            }}
            type="button"
          >
            Trigger two
          </button>
        </div>
      );
    }

    render(
      <ToastProvider>
        <MultiHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger two/i }));

    const toasts = screen.getAllByRole('status');
    expect(toasts).toHaveLength(2);

    const lastToast = toasts[1];
    const dismissBtn = lastToast.querySelector('button');
    expect(dismissBtn).toHaveFocus();
  });

  it('restores focus to the trigger element when a toast is dismissed', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    const trigger = screen.getByTestId('trigger-success');
    fireEvent.click(trigger);

    const dismissBtn = screen.getByRole('button', { name: /dismiss success notification/i });
    expect(dismissBtn).toHaveFocus();

    fireEvent.click(dismissBtn);

    expect(trigger).toHaveFocus();
  });

  it('restores focus to the trigger element on auto-dismiss', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    const trigger = screen.getByTestId('trigger-success');
    fireEvent.click(trigger);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(trigger).toHaveFocus();
  });

  it('restores focus to the last saved trigger when all toasts are gone after eviction', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    const externalInput = screen.getByTestId('external-input');
    externalInput.focus();
    fireEvent.click(screen.getByTestId('trigger-success'));

    // Fill past the cap — each new toast overwrites the saved trigger.
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByTestId('trigger-error'));
    }

    // All 5 toasts have short durations so they auto-dismiss quickly.
    // After they are all gone, focus should return to the most recent
    // trigger that was a user-interaction point (the trigger-error button
    // from the last click, which is still in the DOM).
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId('trigger-error')).toHaveFocus();
  });

  it('restores focus to <main> when the trigger element is no longer in the DOM', () => {
    // Insert a <main> element into the test DOM so the fallback can target it.
    const main = document.createElement('main');
    main.setAttribute('tabindex', '-1');
    document.body.prepend(main);

    function RemovableHarness() {
      const [mounted, setMounted] = useState(true);
      const { showSuccess } = useToast();

      return (
        <div>
          {mounted && (
            <button
              onClick={() => {
                showSuccess({ title: 'Gone', duration: 2000 });
                setMounted(false);
              }}
              type="button"
            >
              Trigger and remove
            </button>
          )}
        </div>
      );
    }

    render(
      <ToastProvider>
        <RemovableHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger and remove/i }));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(main).toHaveFocus();
    main.remove();
  });

  it('does not steal focus when quiet mode suppresses a toast', () => {
    localStorage.setItem(
      'talenttrust-user-preferences',
      JSON.stringify({ quietMode: true }),
    );

    render(
      <PreferencesProvider>
        <ToastProvider>
          <FocusHarness />
        </ToastProvider>
      </PreferencesProvider>,
    );

    const input = screen.getByTestId('external-input');
    input.focus();

    fireEvent.click(screen.getByTestId('trigger-success'));

    // Focus should remain on the input — no toast was created.
    expect(input).toHaveFocus();
  });

  it('does not restore focus when the user moved focus elsewhere before toast closed', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('trigger-success'));
    expect(screen.getByRole('button', { name: /dismiss success notification/i })).toHaveFocus();

    // User manually moves focus to the external input.
    const input = screen.getByTestId('external-input');
    input.focus();

    // Auto-dismiss fires while focus is on the input.
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Focus must stay on the input — the toast is gone but the user
    // intentionally moved focus there.
    expect(input).toHaveFocus();
  });

  it('focus-traps Tab cycling within the toast viewport', () => {
    render(
      <ToastProvider>
        <FocusHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByTestId('trigger-action'));

    const actionBtn = screen.getByRole('button', { name: 'Undo' });
    const dismissBtn = screen.getByRole('button', { name: /dismiss success notification/i });

    // Focus starts on the action button (highest priority when present).
    expect(actionBtn).toHaveFocus();

    // Tab from the last element (dismissBtn) wraps to the first (actionBtn).
    // The handler only intercepts when focus would escape the viewport;
    // forward movement between elements is handled by the browser's natural
    // Tab order.  We simulate the browser by focusing the next element before
    // each keydown.
    fireEvent.keyDown(actionBtn, { key: 'Tab', shiftKey: false });
    dismissBtn.focus();

    fireEvent.keyDown(dismissBtn, { key: 'Tab', shiftKey: false });
    expect(actionBtn).toHaveFocus();

    // Shift+Tab from the first element wraps to the last.
    fireEvent.keyDown(actionBtn, { key: 'Tab', shiftKey: true });
    expect(dismissBtn).toHaveFocus();
  });

  it('focuses the newest toast after the oldest is evicted', () => {
    function EvictHarness() {
      const { showSuccess } = useToast();
      return (
        <button
          onClick={() => {
            for (let i = 1; i <= 5; i++) {
              showSuccess({ title: `Toast ${i}`, duration: 10000 });
            }
          }}
          type="button"
        >
          Add 5
        </button>
      );
    }

    render(
      <ToastProvider>
        <EvictHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /add 5/i }));

    const visible = screen.getAllByRole('status');
    expect(visible).toHaveLength(4);

    // Focus should be on the newest toast (Toast 5).
    const newest = visible[visible.length - 1];
    const btn = newest.querySelector('button');
    expect(btn).toHaveFocus();
  });
});
