'use client';

import React from 'react';

/**
 * Props for a single Skeleton block.
 */
export interface SkeletonProps {
  /**
   * Tailwind width class or arbitrary value.
   * @example "w-full" | "w-48" | "w-[200px]"
   * @default "w-full"
   */
  width?: string;
  /**
   * Tailwind height class or arbitrary value.
   * @example "h-4" | "h-10" | "h-[48px]"
   * @default "h-4"
   */
  height?: string;
  /**
   * Tailwind border-radius class.
   * @default "rounded-md"
   */
  rounded?: string;
  /** Additional Tailwind classes forwarded to the block. */
  className?: string;
}

/**
 * Skeleton — a single themed shimmer block.
 *
 * Accessibility:
 * - Carries `aria-hidden="true"` — visual decoration only. Use
 *   `<SkeletonContainer>` (or a host element with `role="status"`) to
 *   announce the loading state to screen readers.
 *
 * Design tokens:
 * - Background: `--muted` (adapts to light/dark via the project token set).
 * - Shimmer: `animate-pulse` (suppressed under `prefers-reduced-motion`
 *   by the project-wide globals.css rule; `motion-reduce:animate-none` is
 *   included as belt-and-suspenders).
 *
 * @example
 * ```tsx
 * <Skeleton width="w-48" height="h-5" />
 * ```
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-md',
  className = '',
}) => (
  <div
    aria-hidden="true"
    className={[
      width,
      height,
      rounded,
      'bg-[var(--muted,theme(colors.slate.200))]',
      'animate-pulse motion-reduce:animate-none',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  />
);

// ---------------------------------------------------------------------------
// SkeletonContainer
// ---------------------------------------------------------------------------

export interface SkeletonContainerProps {
  /**
   * Accessible label for the loading region (e.g. "Loading payment stream form").
   */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * SkeletonContainer — wraps a group of Skeleton blocks in a `role="status"`
 * region so screen readers announce the loading state as soon as it mounts.
 *
 * ```tsx
 * <SkeletonContainer label="Loading contract summary">
 *   <Skeleton width="w-48" height="h-6" />
 *   <Skeleton width="w-full" height="h-4" />
 * </SkeletonContainer>
 * ```
 */
export const SkeletonContainer: React.FC<SkeletonContainerProps> = ({
  label,
  children,
  className = '',
}) => (
  <div
    role="status"
    aria-label={label}
    aria-live="polite"
    aria-busy="true"
    className={className}
  >
    {children}
    {/* Visually hidden textual label so AT reads the container purpose */}
    <span className="sr-only">{label}</span>
  </div>
);

export default Skeleton;
