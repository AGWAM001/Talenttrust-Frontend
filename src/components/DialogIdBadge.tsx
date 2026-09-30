'use client';

import React, { useId } from 'react';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useToast } from '@/components/toast/toast-provider';

/**
 * Props for {@link DialogIdBadge}.
 */
export interface DialogIdBadgeProps {
  /**
   * The identifier string to display and copy.
   * Must be a non-empty string (e.g. a contract ID, dispute ID, user ID).
   */
  id: string;
  /**
   * Human-readable label rendered before the identifier and used in
   * accessible button labels / toast messages.
   *
   * @default "ID"
   * @example "Contract ID" | "Dispute ID" | "User ID"
   */
  label?: string;
  /** Additional CSS class names applied to the root `<span>`. */
  className?: string;
}

/**
 * DialogIdBadge
 *
 * An accessible copy-to-clipboard control for dialog identifiers.
 *
 * ## Features
 * - Renders `label: id` in a monospace span for easy scanning.
 * - A keyboard-operable copy button (Enter / Space) triggers the copy.
 * - Uses the modern **Clipboard API** (`navigator.clipboard.writeText`) as the
 *   primary copy mechanism, with a documented **`execCommand('copy')` fallback**
 *   for non-HTTPS contexts or older browsers where the Clipboard API is
 *   unavailable.
 * - Shows a **success toast** (`showSuccess`) on copy, or an **error toast**
 *   (`showError`) if both paths fail — no silent failures.
 * - Icon toggles from `Copy` → `Check` for 2 s after a successful copy.
 * - An `aria-live="polite"` region announces the copy outcome to screen
 *   readers without interrupting ongoing speech.
 * - The copy button's `aria-label` is updated to reflect the current state
 *   ("Copy …" / "… copied") for AT users who inspect the button.
 *
 * ## Usage
 *
 * ```tsx
 * // Inside a dialog that shows a contract
 * <DialogIdBadge id={contract.id} label="Contract ID" />
 *
 * // Inside a confirm dialog that references a dispute
 * <DialogIdBadge id={dispute.id} label="Dispute ID" />
 * ```
 *
 * @see {@link useCopyToClipboard} for the clipboard + fallback logic.
 * @see `docs/components/DialogIdBadge.md` for behavioural guarantees.
 */
export const DialogIdBadge: React.FC<DialogIdBadgeProps> = ({
  id,
  label = 'ID',
  className,
}) => {
  const { showSuccess, showError } = useToast();
  const liveRegionId = useId();

  const { copied, copy } = useCopyToClipboard({
    delay: 2000,
    onSuccess: () => {
      showSuccess({
        title: `${label} copied`,
        description: id,
        duration: 2000,
      });
    },
    onError: () => {
      showError({
        title: 'Copy failed',
        description:
          'Unable to copy to clipboard. Please select and copy the identifier manually.',
        duration: 4000,
      });
    },
  });

  const handleCopy = (e: React.MouseEvent | React.KeyboardEvent) => {
    // Stop propagation so the click does not bubble up to any dialog close
    // handler or table-row click handler on a parent element.
    e.stopPropagation();
    copy(id);
  };

  const buttonLabel = copied ? `${label} copied` : `Copy ${label}`;

  return (
    <span
      className={[
        'inline-flex items-center gap-2 text-sm',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      {/* Human-readable label */}
      <span className="font-medium text-[var(--muted-foreground)]">{label}:</span>

      {/* Monospace identifier */}
      <span
        className="font-mono text-[var(--foreground)]"
        title={id}
        data-testid="dialog-id-badge-value"
      >
        {id}
      </span>

      {/* Copy button */}
      <button
        type="button"
        aria-label={buttonLabel}
        aria-describedby={liveRegionId}
        title={buttonLabel}
        onClick={handleCopy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCopy(e);
          }
        }}
        className={[
          // Layout
          'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded',
          // Colours — use themed tokens so it works in light and dark mode
          'text-[var(--muted-foreground)]',
          // Hover
          'hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
          // Focus-visible ring (keyboard navigation)
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1',
          // Disabled
          'disabled:pointer-events-none disabled:opacity-50',
          // Transition — collapsed to 0.01ms by prefers-reduced-motion in globals.css
          'transition-colors',
        ].join(' ')}
        data-testid="dialog-id-badge-button"
      >
        {copied ? (
          /* Check icon — success state */
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 text-[var(--status-success-foreground,#15803d)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="dialog-id-badge-check-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          /* Copy icon — default state */
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="dialog-id-badge-copy-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>

      {/*
       * Screen-reader live region.
       * `aria-live="polite"` announces the outcome without interrupting
       * ongoing speech. The region is visually hidden (sr-only pattern).
       */}
      <span
        id={liveRegionId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="dialog-id-badge-live-region"
      >
        {copied ? `${label} copied` : ''}
      </span>
    </span>
  );
};
