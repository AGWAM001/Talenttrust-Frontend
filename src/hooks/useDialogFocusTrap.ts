'use client';

import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseDialogFocusTrapOptions {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef: RefObject<HTMLElement | null>;
  onEscape: () => void;
  restoreFocus?: boolean;
}

/**
 * Applies the shared keyboard-focus behavior used by modal dialogs.
 *
 * While open, focus moves to `initialFocusRef`, Tab and Shift+Tab wrap at the
 * dialog boundaries, and Escape invokes `onEscape`. When `restoreFocus` is
 * enabled, the element focused immediately before opening receives focus when
 * the dialog closes or unmounts.
 */
export function useDialogFocusTrap({
  isOpen,
  dialogRef,
  initialFocusRef,
  onEscape,
  restoreFocus = false,
}: UseDialogFocusTrapOptions): void {
  const triggerRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);

  // Keep the active callback current without rebuilding the document listener.
  // Callers commonly inline their close handler; rebuilding the effect for
  // every render could otherwise restore focus while a user is typing.
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (initialFocusRef.current instanceof HTMLElement) {
      initialFocusRef.current.focus();
    } else if (dialogRef.current instanceof HTMLElement) {
      dialogRef.current.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      const activeElement = document.activeElement as HTMLElement | null;
      const activeIndex = focusable.indexOf(activeElement);

      // Defensive entry guard: focus can be outside the dialog after browser
      // chrome interaction or programmatic focus. Keep the next tab action in
      // the modal instead of allowing it to escape into the page.
      if (activeIndex === -1) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      const trigger = triggerRef.current;
      if (restoreFocus) {
        if (trigger && document.contains(trigger)) {
          trigger.focus();
        } else {
          const fallbackTarget = document.querySelector<HTMLElement>('main, h1[tabindex="-1"], h1');
          fallbackTarget?.focus();
        }
      }
    };
  }, [dialogRef, initialFocusRef, isOpen, restoreFocus]);
}
