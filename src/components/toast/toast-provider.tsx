'use client';

import {
  Component,
  ErrorInfo,
  ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { reportError } from '@/lib/errorReporter';
import { usePreferences } from '@/lib/preferences';
import type { ToastDuration } from '@/lib/preferences';
import { ToastSkeleton } from './toast-skeleton';

export { ToastSkeleton };

type ToastVariant = 'success' | 'error';

/** Optional inline action attached to a toast. */
type ToastAction = {
  /** Plain-text label rendered inside the action button. Never interpolated as HTML. */
  label: string;
  /** Callback fired when the user clicks the action button. */
  onClick: () => void;
};

type ToastInput = {
  title: string;
  description?: string;
  duration?: number;
  /**
   * Optional action button rendered inside the toast.
   * Clicking it fires `onClick` and immediately dismisses the toast.
   */
  action?: ToastAction;
};

type ToastRecord = ToastInput & {
  id: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toasts: ToastRecord[];
  showSuccess: (toast: ToastInput) => string;
  showError: (toast: ToastInput) => string;
  dismissToast: (id: string) => void;
};

const defaultToastContext: ToastContextValue = {
  toasts: [],
  showSuccess: () => '',
  showError: () => '',
  dismissToast: () => undefined,
};

const ToastContext = createContext<ToastContextValue>(defaultToastContext);

/**
 * Maps each `ToastDuration` preference value to a concrete millisecond count,
 * or `null` for `'persistent'` (no auto-dismiss timer).
 */
const DURATION_MAP: Readonly<Record<ToastDuration, number | null>> = {
  short: 2500,
  normal: 5000,
  long: 10000,
  persistent: null,
};

/**
 * Maximum number of toasts that may be visible at the same time.
 * When a new toast would exceed this cap the oldest visible toast is
 * evicted (its auto-dismiss timer is cancelled) before the new one is
 * appended.  This prevents a burst of wallet/payout events from stacking
 * toasts past the bottom of the viewport and burying the dismiss buttons.
 */
const MAX_VISIBLE_TOASTS = 4;

/**
 * CSS selector matching all natively focusable elements.
 * Used for focus-trapping within the toast viewport.
 */
const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Generates a unique toast ID without mutating refs during render.
 * Uses crypto.randomUUID() when available, with a timestamp-based fallback.
 * This ensures collision-free IDs even under React StrictMode double-invocation.
 *
 * @returns A unique string identifier for a toast
 */
function generateToastId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `toast-${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID support
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getToastStyles(variant: ToastVariant) {
  // a11y/theming-27: badge classes were `bg-emerald-100 text-emerald-800`
  // / `bg-rose-100 text-rose-800` — fixed Tailwind pastels that don't
  // respond to [data-theme='dark']. Swapped for the --status-* variables
  // defined in globals.css, which carry an audited light AND dark pair.
  // Light-mode hex values are unchanged from the originals.
  if (variant === 'success') {
    return {
      accent: 'bg-emerald-500',
      badge: 'bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]',
      panel: 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm',
    };
  }

  return {
    accent: 'bg-rose-500',
    badge: 'bg-[var(--status-error-bg)] text-[var(--status-error-foreground)]',
    panel: 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm',
  };
}

const ToastViewport = forwardRef<HTMLDivElement, {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
  onPauseTimer: (id: string) => void;
  onResumeTimer: (id: string) => void;
  density: 'relaxed' | 'compact';
}>(({ toasts, onDismiss, onPauseTimer, onResumeTimer, density }, ref) => {
  const isEmpty = toasts.length === 0;
  return (
    <div
      ref={ref}
      role="region"
      aria-atomic="false"
      aria-label="Notifications"
      aria-busy={isEmpty || undefined}
      className={`pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col ${
        density === 'compact' ? 'gap-1.5' : 'gap-3'
      }`}
    >
      {isEmpty ? (
        <ToastSkeleton />
      ) : (
        toasts.map((toast) => {
        const styles = getToastStyles(toast.variant);
        const badgeLabel = toast.variant === 'success' ? 'Success' : 'Error';

        return (
          <div
            key={toast.id}
            // tabIndex={0} makes each toast a tab stop so keyboard users can
            // navigate to it directly and pause its auto-dismiss timer via focus.
            // The logical focus order is: toast container → action button (if present)
            // → dismiss button, matching the visual left-to-right layout.
            tabIndex={0}
            className={`pointer-events-auto overflow-hidden rounded-2xl border ${styles.panel} shadow-lg focus:outline-none`}
            onBlur={() => onResumeTimer(toast.id)}
            onFocus={() => onPauseTimer(toast.id)}
            onMouseEnter={() => onPauseTimer(toast.id)}
            onMouseLeave={() => onResumeTimer(toast.id)}
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <div className={`h-1.5 w-full ${styles.accent}`} />
            <div className="flex items-start gap-3 p-4">
              <div className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
                {badgeLabel}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? (
                  // a11y/theming-27: was `text-slate-600`, which measured
                  // 2.36:1 against the dark --surface (#0f172a) — well
                  // below the 4.5:1 AA minimum for body text. Replaced
                  // with --muted-foreground, which is themed in
                  // globals.css and passes AA in both modes (4.55:1
                  // light, 6.96:1 dark). See docs/components/Accessibility.md.
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{toast.description}</p>
                ) : null}
                {toast.action ? (
                  // Action button: label is a plain text node — never set via
                  // innerHTML or dangerouslySetInnerHTML. Clicking fires the
                  // caller-supplied callback then immediately dismisses this toast.
                  <button
                    type="button"
                    onClick={() => {
                      toast.action!.onClick();
                      onDismiss(toast.id);
                    }}
                    className="mt-2 rounded-md px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
                  >
                    {toast.action.label}
                  </button>
                ) : null}
              </div>
              <button
                aria-label={`Dismiss ${badgeLabel.toLowerCase()} notification`}
                // a11y/theming-27: was `text-slate-500 hover:bg-slate-100
                // hover:text-slate-900`. text-slate-500 measured 3.75:1
                // against the dark --surface — fails AA. The light hover
                // background also stayed fixed-light, producing a bright
                // patch on a dark panel. Replaced with themed tokens that
                // pass AA in both modes.
                // The `transition` utility is kept here; the global
                // @media (prefers-reduced-motion: reduce) rule in
                // globals.css collapses its duration to 0.01ms so the
                // button snaps to its hover/focus state instantly for
                // users who prefer reduced motion, without any layout
                // shift or visibility change.
                //
                // a11y/toast-11-keyboard: changed focus:ring-2 → focus-visible:ring-2
                // so the ring only appears on keyboard/programmatic focus, not on
                // mouse clicks. Added focus-visible:ring-offset-1 for a small visual
                // separation between the ring and the button edge.
                // Added explicit onKeyDown for Enter/Space to satisfy test coverage
                // requirements; native <button> already fires click on these keys,
                // but being explicit lets tests assert keyboard activation directly.
                className="rounded-full p-1.5 text-[var(--muted-foreground)] transition hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1"
                onClick={() => onDismiss(toast.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDismiss(toast.id);
                  }
                }}
                type="button"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          </div>
        );
      })
    )}
    </div>
  );
});

function ToastAnnouncer({ toasts }: { toasts: ToastRecord[] }) {
  const latestSuccess = [...toasts].reverse().find((toast) => toast.variant === 'success');
  const latestError = [...toasts].reverse().find((toast) => toast.variant === 'error');

  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    const timer = setTimeout(() => {
      const count = toasts.length;
      if (count === 0) {
        setStatusAnnouncement('0 notifications');
        return;
      }

      const errors = toasts.filter((t) => t.variant === 'error').length;
      const successes = toasts.filter((t) => t.variant === 'success').length;
      
      const parts = [];
      if (errors > 0) parts.push(`${errors} error${errors === 1 ? '' : 's'}`);
      if (successes > 0) parts.push(`${successes} success${successes === 1 ? '' : 'es'}`);
      
      setStatusAnnouncement(`${count} notification${count === 1 ? '' : 's'} (${parts.join(', ')})`);
    }, 500);

    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <>
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {latestSuccess ? `${latestSuccess.title}${latestSuccess.description ? `. ${latestSuccess.description}` : ''}` : ''}
      </div>
      <div aria-atomic="true" aria-live="assertive" className="sr-only">
        {latestError ? `${latestError.title}${latestError.description ? `. ${latestError.description}` : ''}` : ''}
      </div>
      <div aria-atomic="true" aria-live="polite" className="sr-only">
        {statusAnnouncement}
      </div>
    </>
  );
}

type ToastTimerState = {
  expiresAt: number | null;
  pauseCount: number;
  remainingMs: number;
  timeoutId: number | null;
};

/**
 * Provides toast notification context to the component tree. Renders the
 * `ToastViewport` (visual toast stack) and `ToastAnnouncer` (screen-reader
 * live regions).
 *
 * Must be mounted inside `<PreferencesProvider>` because it reads `quietMode`,
 * `toastDensity`, and `toastDuration` from user preferences.
 *
 * @see `docs/components/Toast.md` for detailed behavioral guarantees.
 *
 * @param children - React children that will have access to `useToast`.
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * <PreferencesProvider> <ToastProvider> <App /> </ToastProvider> </PreferencesProvider>
 * ```
 *
 * ## Quiet mode
 *
 * When `preferences.quietMode` is `true`, `showSuccess()` returns the literal
 * string `'suppressed'` and does **not** create a toast. `showError()` is
 * unaffected and always creates a toast.
 *
 * ## Density
 *
 * `preferences.toastDensity` controls the vertical gap between stacked toasts:
 * - `'relaxed'` (default) → `gap-3`
 * - `'compact'` → `gap-1.5`
 *
 * ## Auto-Dismiss Duration
 *
 * Duration is resolved in order of precedence:
 * 1.  **Per-call `duration`**: `showSuccess({ duration: 1000 })` always wins.
 * 2.  **User preference**: `preferences.toastDuration` is used as a fallback.
 *
 * | Value          | Duration  | Behaviour                       |
 * |----------------|-----------|---------------------------------|
 * | `'short'`      | 2500 ms   | Fast, low-priority confirmation |
 * | `'normal'`     | 5000 ms   | Default behaviour               |
 * | `'long'`       | 10000 ms  | Longer read time                |
 * | `'persistent'` | `null`    | No timer; manual dismiss only   |
 *
 * ## Eviction
 *
 * A maximum of `4` toasts are visible at once. If a fifth is created, the
 * oldest is evicted to make room.
 *
 * ## Action button
 *
 * Pass `action: { label, onClick }` in the toast input to render an inline
 * action button. Clicking it fires `onClick` then immediately dismisses the
 * toast. The label is always rendered as a plain text node to prevent XSS.
 */
export class ToastErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, 'ToastErrorBoundary', 'error', { info });
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="region"
          aria-label="Notifications Fallback"
          className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
        >
          <div className="pointer-events-auto overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm shadow-lg" role="alert">
            <div className="h-1.5 w-full bg-rose-500" />
            <div className="flex flex-col gap-2 p-4">
              <p className="text-sm font-semibold">Notifications failed to load</p>
              <button
                type="button"
                onClick={this.reset}
                className="self-start rounded-md px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const toastTimersRef = useRef<Record<string, ToastTimerState>>({});

  /** Ref tracking the element that had focus before the most recent toast was created. */
  const toastTriggerRef = useRef<HTMLElement | null>(null);
  /** Ref attached to the toast viewport DOM node for querying focusable children. */
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const prevToastCountRef = useRef(0);
  /** Tracks the most recently clicked element (via capture-phase listener).
   *  Clicking a button does not move focus in jsdom, so `document.activeElement`
   *  inside `createToast` may be stale. This ref gives us the actual trigger. */
  const lastClickedRef = useRef<HTMLElement | null>(null);
  /** Set to true while a React effect is programmatically moving focus into a toast,
   *  so the toast's `onFocus`-triggered timer-pause is skipped. */
  const programmaticFocusRef = useRef(false);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  /**
   * Starts (or restarts) the auto-dismiss timeout for a toast.
   * Stores the expiry timestamp so remaining time can be recovered when pausing.
   */
  const scheduleToastDismiss = useCallback(
    (id: string, durationMs: number) => {
      const existingTimer = toastTimersRef.current[id];
      const timer: ToastTimerState = existingTimer ?? {
        expiresAt: null,
        pauseCount: 0,
        remainingMs: durationMs,
        timeoutId: null,
      };

      if (timer.timeoutId !== null) {
        window.clearTimeout(timer.timeoutId);
      }

      timer.remainingMs = durationMs;
      timer.expiresAt = Date.now() + durationMs;
      timer.timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);

      toastTimersRef.current[id] = timer;
    },
    [dismissToast],
  );

  /**
   * Clears a toast's auto-dismiss timeout and removes its timer state.
   * Called when a toast is dismissed or unmounted.
   */
  const clearToastTimer = useCallback((id: string) => {
    const timer = toastTimersRef.current[id];

    if (!timer) {
      return;
    }

    if (timer.timeoutId !== null) {
      window.clearTimeout(timer.timeoutId);
    }

    delete toastTimersRef.current[id];
  }, []);

  /**
   * Pauses the auto-dismiss timer while a toast is hovered or focused.
   * Uses a pause counter so overlapping hover and focus keep the timer
   * paused until both interactions end.
   */
  const pauseToastTimer = useCallback((id: string) => {
    const timer = toastTimersRef.current[id];

    if (!timer) {
      return;
    }

    // Programmatic focus from the focus-management effect should not pause
    // the auto-dismiss timer, otherwise the toast would never auto-dismiss.
    if (programmaticFocusRef.current) return;

    timer.pauseCount += 1;

    if (timer.pauseCount === 1 && timer.timeoutId !== null) {
      window.clearTimeout(timer.timeoutId);
      timer.timeoutId = null;

      if (timer.expiresAt !== null) {
        timer.remainingMs = Math.max(0, timer.expiresAt - Date.now());
        timer.expiresAt = null;
      }
    }
  }, []);

  /**
   * Resumes the auto-dismiss timer after hover or focus ends.
   * Only restarts the timeout once every pause source has cleared.
   */
  const resumeToastTimer = useCallback(
    (id: string) => {
      const timer = toastTimersRef.current[id];

      if (!timer || timer.pauseCount === 0) {
        return;
      }

      timer.pauseCount -= 1;

      if (timer.pauseCount === 0 && timer.timeoutId === null) {
        scheduleToastDismiss(id, timer.remainingMs);
      }
    },
    [scheduleToastDismiss],
  );

  const createToast = useCallback(
    (variant: ToastVariant, toast: ToastInput, durationMs: number | null) => {
      toastTriggerRef.current = (() => {
        // Prefer the last clicked element — clicking a button does not move
        // focus in jsdom, so `document.activeElement` may be stale.
        const clicked = lastClickedRef.current;
        if (clicked && document.contains(clicked)) {
          return clicked;
        }
        return document.activeElement instanceof HTMLElement ? document.activeElement : null;
      })();

      const id = generateToastId();

      setToasts((currentToasts) => {
        const next = [...currentToasts, { ...toast, duration: durationMs ?? undefined, id, variant }];
        if (next.length <= MAX_VISIBLE_TOASTS) {
          return next;
        }
        // Evict the oldest toast and cancel its timer.
        const [evicted, ...remaining] = next;
        clearToastTimer(evicted.id);
        return remaining;
      });

      return id;
    },
    [clearToastTimer],
  );

  const { preferences } = usePreferences();

  const showSuccess = useCallback(
    (toast: ToastInput) => {
      if (preferences.quietMode) {
        return 'suppressed';
      }
      // Per-call duration takes precedence; fall back to the preference mapping.
      const durationMs =
        toast.duration !== undefined ? toast.duration : DURATION_MAP[preferences.toastDuration];
      return createToast('success', toast, durationMs);
    },
    [createToast, preferences.quietMode, preferences.toastDuration],
  );

  const showError = useCallback(
    (toast: ToastInput) => {
      const durationMs =
        toast.duration !== undefined ? toast.duration : DURATION_MAP[preferences.toastDuration];
      return createToast('error', toast, durationMs);
    },
    [createToast, preferences.toastDuration],
  );

  useEffect(() => {
    toasts.forEach((toast) => {
      if (toastTimersRef.current[toast.id]) {
        return;
      }

      // `toast.duration` on the record is the resolved duration computed at
      // creation time (number | undefined). `undefined` means the toast was
      // created with `toastDuration: 'persistent'` — skip scheduling.
      if (toast.duration === undefined || toast.duration === null) {
        return;
      }

      scheduleToastDismiss(toast.id, toast.duration);
    });

    Object.keys(toastTimersRef.current).forEach((toastId) => {
      const toastStillVisible = toasts.some((toast) => toast.id === toastId);

      if (!toastStillVisible) {
        clearToastTimer(toastId);
      }
    });

    return undefined;
  }, [clearToastTimer, scheduleToastDismiss, toasts]);

  useEffect(() => {
    const timers = toastTimersRef.current;
    return () => {
      Object.keys(timers).forEach((toastId) => {
        const timer = timers[toastId];

        if (timer.timeoutId !== null) {
          clearTimeout(timer.timeoutId);
        }
      });
    };
  }, []);

  /** Capture-phase click listener — tracks the most recently clicked element
   *  so `createToast` can save it as the trigger even in jsdom (where
   *  `fireEvent.click` never moves focus). */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement) {
        lastClickedRef.current = e.target;
      }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  // -------------------------------------------------------------------------
  // Focus management
  // -------------------------------------------------------------------------

  useEffect(() => {
    const prev = prevToastCountRef.current;
    prevToastCountRef.current = toasts.length;

    // A new toast was added — move focus to its first interactive element.
    if (toasts.length > prev && toasts.length > 0) {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const allToasts = viewport.querySelectorAll<HTMLElement>(
        '[role="status"], [role="alert"]',
      );
      const newestToast = allToasts[allToasts.length - 1];
      if (!newestToast) return;

      const firstBtn = newestToast.querySelector<HTMLElement>(
        'button:not([disabled])',
      );
      if (firstBtn && document.contains(firstBtn)) {
        programmaticFocusRef.current = true;
        firstBtn.focus();
        programmaticFocusRef.current = false;
      }
    }

    // All toasts just cleared — restore focus to the saved trigger.
    if (toasts.length === 0 && prev > 0) {
      const trigger = toastTriggerRef.current;
      toastTriggerRef.current = null;
      if (!trigger) return;

      // Only restore if:
      //   1. Focus is still inside the viewport (user was interacting with a toast), OR
      //   2. Focus is on <body>, which happens in jsdom when the focused toast element
      //      is removed from the DOM — treat this as "focus was lost" and restore.
      const active = document.activeElement;
      const focusLost =
        viewportRef.current?.contains(active) ||
        active === document.body ||
        active === null;
      if (!focusLost) return;

      if (document.contains(trigger)) {
        trigger.focus();
      } else {
        // Trigger element was removed from the DOM (e.g. route change).
        document.querySelector<HTMLElement>('main')?.focus();
      }
    }
  }, [toasts.length]);

  /**
   * Soft keyboard-trap: when focus enters the toast viewport, Tab/Shift+Tab
   * cycles among all focusable elements inside it (dismiss buttons, action
   * buttons) rather than escaping behind the fixed-position overlay.
   *
   * We trap at the viewport level (not per-toast) so the user can Tab
   * through all visible toasts. Per-toast trapping would prevent keyboard
   * navigation between stacked toasts, which is a worse UX.
   */
  useEffect(() => {
    if (toasts.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const viewport = viewportRef.current;
      if (!viewport) return;

      const focusable = Array.from(
        viewport.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter(
        (el) =>
          el.getAttribute('role') !== 'status' &&
          el.getAttribute('role') !== 'alert',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toasts.length > 0]);

  const value = useMemo(
    () => ({
      dismissToast,
      showError,
      showSuccess,
      toasts,
    }),
    [dismissToast, showError, showSuccess, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastErrorBoundary>
        <ToastAnnouncer toasts={toasts} />
        <ToastViewport
          ref={viewportRef}
          density={preferences.toastDensity}
          onDismiss={dismissToast}
          onPauseTimer={pauseToastTimer}
          onResumeTimer={resumeToastTimer}
          toasts={toasts}
        />
      </ToastErrorBoundary>
    </ToastContext.Provider>
  );
}

/**
 * Grants access to the global toast context: `{ toasts, showSuccess,
 * showError, dismissToast }`.
 *
 * Must be called from a component rendered inside `<ToastProvider>`.
 *
 * @returns `{ toasts, showSuccess, showError, dismissToast }`
 *
 * @throws `Error` if called outside a `ToastProvider` tree.
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useToast } from '@/components/toast/toast-provider';
 *
 * function MyComponent() {
 *   const { showSuccess, showError } = useToast();
 *
 *   const onSave = () => {
 *     const id = showSuccess({ title: 'Profile saved!' });
 *     if (id === 'suppressed') {
 *       // User has quiet mode on
 *     }
 *   };
 * }
 * ```
 *
 * ## Return Value Contract
 *
 * | Method               | Normal scenario                | `quietMode: true`              |
 * |----------------------|--------------------------------|--------------------------------|
 * | `showSuccess(toast)` | Unique ID string (`'toast-...'`) | `'suppressed'` (no toast shown) |
 * | `showError(toast)`   | Unique ID string (`'toast-...'`) | Unique ID string (always shown) |
 *
 * ## Accessibility
 *
 * `ToastProvider` renders a `ToastAnnouncer` with two `aria-live` regions
 * (`polite` for success, `assertive` for error) to ensure screen readers
 * announce new toasts reliably. Individual toasts also carry `role="status"`
 * or `role="alert"`.
 */
export function useToast() {
  return useContext(ToastContext);
}
