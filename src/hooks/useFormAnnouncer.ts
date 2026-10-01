'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The type of a form announcement. Determines which `aria-live` politeness
 * level is used:
 * - `'success'` → polite (queued, reads when screen reader is idle)
 * - `'error'`   → assertive (interrupts current speech immediately)
 */
export type AnnouncementType = 'success' | 'error' | 'idle';

/**
 * The shape of a form announcement to queue.
 */
export interface FormAnnouncement {
  /** Human-readable message for the screen reader. */
  message: string;
  /** Whether this is a success or error result. Defaults to `'success'`. */
  type?: 'success' | 'error';
}

/**
 * The value returned by `useFormAnnouncer`.
 */
export interface UseFormAnnouncerReturn {
  /**
   * The current polite announcement text. Rendered in an `aria-live="polite"`
   * region for success results. Cleared automatically after `clearAfterMs`.
   */
  politeMessage: string;
  /**
   * The current assertive announcement text. Rendered in an
   * `aria-live="assertive"` region for error results. Cleared automatically
   * after `clearAfterMs`.
   */
  assertiveMessage: string;
  /**
   * Queues a form announcement through the live region.
   *
   * Rapid calls within `debounceMs` are coalesced: only the last call fires.
   * This prevents a burst of async events from flooding the screen reader
   * with redundant announcements.
   *
   * @param announcement - The message and type to announce.
   *
   * @example
   * ```ts
   * // On successful form submission:
   * announce({ message: 'Form submitted successfully.', type: 'success' });
   *
   * // On server-side validation error:
   * announce({ message: 'Submission failed. Please check your details.', type: 'error' });
   * ```
   */
  announce: (announcement: FormAnnouncement) => void;
  /**
   * Immediately clears both live-region messages without waiting for the
   * auto-clear timer. Useful for cleanup on unmount or when navigating away.
   */
  clearAnnouncement: () => void;
}

/**
 * Options for `useFormAnnouncer`.
 */
export interface UseFormAnnouncerOptions {
  /**
   * Debounce window in milliseconds. When `announce()` is called multiple
   * times within this window, only the **last** call is forwarded to the
   * live region. Defaults to `300` ms.
   *
   * Set to `0` to disable debouncing (useful for tests or instant feedback).
   */
  debounceMs?: number;
  /**
   * How long (ms) to leave the announcement visible before clearing it.
   * Clearing prevents stale messages from being re-read when focus returns
   * to the live region.
   *
   * Defaults to `5000` ms (5 seconds). Set to `0` to disable auto-clearing.
   */
  clearAfterMs?: number;
}

/**
 * `useFormAnnouncer` — a11y hook for announcing form async action results
 * via ARIA live regions without any visual change.
 *
 * ## Motivation
 *
 * When a form submits asynchronously, screen-reader users receive no feedback
 * unless a live region explicitly announces the outcome. This hook provides a
 * dedicated, debounced announcement channel that is entirely separate from the
 * toast notification system, so it works even when toasts are silenced (quiet
 * mode) and does not duplicate announcements.
 *
 * ## How it works
 *
 * 1. `announce({ message, type })` is called after an async action resolves.
 * 2. If called again within `debounceMs`, the previous pending announcement is
 *    cancelled and the new one takes its place (last-write-wins debounce).
 * 3. After `debounceMs` the message is committed to either `politeMessage`
 *    (success) or `assertiveMessage` (error), triggering the live region.
 * 4. After `clearAfterMs` the message is cleared so stale text is not
 *    re-announced when focus revisits the region.
 *
 * ## Usage
 *
 * ```tsx
 * const { politeMessage, assertiveMessage, announce } = useFormAnnouncer();
 *
 * // Inside an async submit handler:
 * try {
 *   await submitForm(data);
 *   announce({ message: 'Form submitted successfully.', type: 'success' });
 * } catch {
 *   announce({ message: 'Submission failed. Please try again.', type: 'error' });
 * }
 *
 * // In JSX (no visual output — purely for assistive technology):
 * <div aria-live="polite" aria-atomic="true" className="sr-only">
 *   {politeMessage}
 * </div>
 * <div aria-live="assertive" aria-atomic="true" className="sr-only">
 *   {assertiveMessage}
 * </div>
 * ```
 *
 * @param options - Optional configuration for debounce window and auto-clear delay.
 * @returns `{ politeMessage, assertiveMessage, announce, clearAnnouncement }`
 *
 * @see {@link UseFormAnnouncerOptions} for configuration options.
 * @see {@link FormAnnouncement} for the announcement shape.
 */
export function useFormAnnouncer(options: UseFormAnnouncerOptions = {}): UseFormAnnouncerReturn {
  const { debounceMs = 300, clearAfterMs = 5000 } = options;

  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  // Refs for pending timers — these must not trigger re-renders.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  /** Immediately clears both live-region message strings. */
  const clearAnnouncement = useCallback(() => {
    clearTimers();
    setPoliteMessage('');
    setAssertiveMessage('');
  }, [clearTimers]);

  const announce = useCallback(
    (announcement: FormAnnouncement) => {
      const { message, type = 'success' } = announcement;

      // Cancel any pending debounced announcement and pending clear timer.
      clearTimers();

      const commit = () => {
        // Place message in the appropriate live region.
        if (type === 'error') {
          setAssertiveMessage(message);
          setPoliteMessage('');
        } else {
          setPoliteMessage(message);
          setAssertiveMessage('');
        }

        // Schedule auto-clear so stale text does not linger.
        if (clearAfterMs > 0) {
          clearTimerRef.current = setTimeout(() => {
            setPoliteMessage('');
            setAssertiveMessage('');
            clearTimerRef.current = null;
          }, clearAfterMs);
        }
      };

      if (debounceMs > 0) {
        // Debounce: delay committing until rapid calls settle.
        debounceTimerRef.current = setTimeout(() => {
          debounceTimerRef.current = null;
          commit();
        }, debounceMs);
      } else {
        // Debounce disabled: commit immediately.
        commit();
      }
    },
    [debounceMs, clearAfterMs, clearTimers],
  );

  // Clean up all timers when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    politeMessage,
    assertiveMessage,
    announce,
    clearAnnouncement,
  };
}
