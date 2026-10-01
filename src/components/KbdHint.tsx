'use client';

import React from 'react';

/**
 * Props for the KbdHint component.
 */
export interface KbdHintProps {
  /**
   * One or more key names to display (e.g. `['Ctrl', 'Enter']` or `['⌘', 'K']`).
   * Each key is rendered inside its own `<kbd>` element.
   */
  keys: string[];
  /**
   * Human-readable description of what the shortcut does.
   * Rendered visually after the key chips and used as the accessible label.
   * Example: "to submit"
   */
  label?: string;
  /**
   * Additional CSS classes to apply to the outermost wrapper.
   */
  className?: string;
  /**
   * When `true` the hint is hidden from sighted users (display: none equivalent
   * via sr-only) but still announced to screen readers. Defaults to `false`.
   */
  srOnly?: boolean;
}

/**
 * KbdHint — displays one or more keyboard shortcut key chips followed by an
 * optional descriptive label.
 *
 * Accessibility:
 * - Each key is wrapped in a semantic `<kbd>` element so screen readers
 *   announce it as a keyboard key (e.g. "Control + Enter").
 * - Separator `+` characters between keys are marked `aria-hidden` so they
 *   are not read aloud, relying instead on the natural pause between keys.
 * - The wrapper carries `aria-label` synthesised from the keys and label so
 *   the full hint reads naturally as a unit (e.g. "Ctrl+Enter — to submit").
 * - When `srOnly` is true the component is visually hidden but still present
 *   in the accessibility tree.
 *
 * Design tokens:
 * - Background / border use `--card` and `--border` CSS variables so the
 *   component adapts to light and dark themes automatically.
 * - Text uses `--muted-foreground` matching the project's token set.
 *
 * @example
 * ```tsx
 * // Show "Ctrl + Enter — to submit" hint
 * <KbdHint keys={['Ctrl', 'Enter']} label="to submit" />
 *
 * // Mac variant
 * <KbdHint keys={['⌘', 'Enter']} label="to submit" />
 *
 * // Screen-reader only hint
 * <KbdHint keys={['Escape']} label="to cancel" srOnly />
 * ```
 */
export const KbdHint: React.FC<KbdHintProps> = ({
  keys,
  label,
  className = '',
  srOnly = false,
}) => {
  // Build an accessible label: "Ctrl+Enter — to submit" or just "Ctrl+Enter"
  const ariaLabel = [keys.join('+'), label].filter(Boolean).join(' \u2014 ');

  const wrapperClass = [
    'inline-flex items-center gap-1 text-xs',
    'text-[var(--muted-foreground,theme(colors.slate.500))]',
    srOnly ? 'sr-only' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={wrapperClass}
      aria-label={ariaLabel}
      // role="img" is intentional: the entire hint is a single meaningful unit
      // (the shortcut) and wrapping it in a labelled img role prevents screen
      // readers from reading each <kbd> element separately.
      role="img"
    >
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && (
            <span aria-hidden="true" className="select-none">
              +
            </span>
          )}
          <kbd
            className={[
              'inline-flex items-center justify-center',
              'min-w-[1.5rem] h-5 px-1 rounded',
              'border border-[var(--border,theme(colors.slate.200))]',
              'bg-[var(--card,theme(colors.white))]',
              'font-mono text-[0.65rem] leading-none',
              'shadow-[0_1px_0_var(--border,theme(colors.slate.200))]',
              'select-none',
            ].join(' ')}
          >
            {key}
          </kbd>
        </React.Fragment>
      ))}
      {label && (
        <span aria-hidden="true" className="ml-1 not-italic">
          {label}
        </span>
      )}
    </span>
  );
};

export default KbdHint;
