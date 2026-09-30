'use client';

import React, { useEffect, useId, useRef } from 'react';
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap';
import { DialogLastUpdated } from './dialogs/DialogLastUpdated';

/** Props for the ConfirmDialog component */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Dialog title */
  title: string;
  /** Dialog description or message */
  description: string;
  /**
   * Optional identifier to display inside the dialog (e.g. a contract ID,
   * dispute ID, or any entity reference). When supplied, a
   * {@link DialogIdBadge} is rendered below the description so users can
   * copy the ID to their clipboard.
   */
  dialogId?: string;
  /**
   * Human-readable label for the `dialogId` field, e.g. `"Contract ID"`.
   * Defaults to `"ID"` when `dialogId` is set.
   */
  dialogIdLabel?: string;
  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;
  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;
  /** Dialog tone / severity: "destructive" sets role="alertdialog", "default" sets role="dialog" */
  tone?: 'default' | 'destructive';
  /** Callback when the user confirms the action */
  onConfirm: () => void;
  /** Callback when the user cancels or closes the dialog */
  onCancel: () => void;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Error message to display inside the dialog */
  error?: string;
  /** Whether the dialog is in an empty state */
  isEmpty?: boolean;
  /** Whether the dialog action was successful */
  isSuccess?: boolean;
  /** When the data shown in this dialog was last updated. Renders a relative "Updated X ago" line when provided. */
  updatedAt?: Date | string | number;
}

/**
 * Accessible confirmation dialog.
 *
 * - Focus is moved to the cancel button when opened.
 * - Focus is trapped within the dialog.
 * - Escape key triggers cancel.
 * - After closing, focus returns to the element that opened the dialog (handled by the caller).
 * - Generates unique IDs via useId for title and description.
 * - Supports tone="destructive" (role="alertdialog") or default (role="dialog").
 * - Restricts background content with inert / aria-hidden while open.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  onConfirm,
  onCancel,
  isLoading,
  error,
  isEmpty,
  isSuccess,
  updatedAt,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const titleId = useId();
  const descriptionId = useId();

  useDialogFocusTrap({
    isOpen,
    dialogRef,
    initialFocusRef: cancelBtnRef,
    onEscape: onCancel,
    // Restore focus to the element that opened the dialog (trigger button)
    // when the dialog closes or unmounts — satisfies WCAG 2.1 SC 3.2.2.
    restoreFocus: true,
  });

  useEffect(() => {
    if (!isOpen) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const elementsToHide: { element: HTMLElement; prevAriaHidden: string | null; prevInert: boolean }[] = [];

    Array.from(document.body.children).forEach((node) => {
      if (node instanceof HTMLElement && !node.contains(overlay) && node !== overlay) {
        elementsToHide.push({
          element: node,
          prevAriaHidden: node.getAttribute('aria-hidden'),
          prevInert: node.inert ?? false,
        });
      }
    });

    let curr: HTMLElement | null = overlay;
    while (curr && curr.parentElement && curr.parentElement !== document.body) {
      const parent: HTMLElement = curr.parentElement;
      Array.from(parent.children).forEach((sibling) => {
        if (sibling !== curr && sibling instanceof HTMLElement && !sibling.contains(overlay)) {
          if (!elementsToHide.some((item) => item.element === sibling)) {
            elementsToHide.push({
              element: sibling,
              prevAriaHidden: sibling.getAttribute('aria-hidden'),
              prevInert: sibling.inert ?? false,
            });
          }
        }
      });
      curr = parent;
    }

    elementsToHide.forEach(({ element }) => {
      element.setAttribute('aria-hidden', 'true');
      element.setAttribute('inert', '');
      element.inert = true;
    });

    return () => {
      elementsToHide.forEach(({ element, prevAriaHidden, prevInert }) => {
        if (prevAriaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', prevAriaHidden);
        }
        if (!prevInert) {
          element.removeAttribute('inert');
          element.inert = false;
        }
      });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={dialogRef}
        role={tone === 'destructive' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-xl p-6 border border-gray-200"
      >
        <h2 id={titleId} className="text-lg font-semibold mb-4">
          {title}
        </h2>
        {isSuccess ? (
          <div role="status" className="mb-6 p-3 bg-green-100 text-green-800 rounded">Action successful.</div>
        ) : isEmpty ? (
          <div className="mb-6 p-3 text-gray-500 italic">No data available.</div>
        ) : (
          <p id={descriptionId} className="text-sm text-gray-700 mb-6">{description}</p>
        )}
        {error && (
          <div role="alert" className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>
        )}
        {updatedAt !== undefined && <DialogLastUpdated updatedAt={updatedAt} className="mb-4" />}
        <div className="flex justify-end space-x-3">
          {/* Cancel — receives initial focus; explicit focus-visible ring for keyboard users */}
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            {cancelLabel}
          </button>
          {/* Confirm — styled to its tone; consistent focus-visible ring */}
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'px-4 py-2 rounded text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              tone === 'destructive'
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
            ].join(' ')}
          >
            {isLoading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};