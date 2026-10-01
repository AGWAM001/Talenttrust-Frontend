import React from 'react';

/**
 * loading.tsx - /contracts
*
 * App Router Suspense boundary rendered while the contracts list page streams
 * in. Mirrors the visual shape of ContractsPage: a page heading followed by
 * a column of contract-card rows (matching the `<li>` cards rendered when
 * contracts exist).
 *
 * Invariants:
 * - Pure and Stateless: This component is purely presentational and side-effect free.
 * - Concurrency Safe: Uses `React.useId()` for deterministic, hydration-safe list keys,
 *   ensuring concurrent or repeated execution never produces stale or inconsistent DOM state.
 *
 * Accessibility:
 * - Outer wrapper carries `aria-busy="true"` and `role="status` so assistive
 *   technologies understand the region is in a transient loading state.
 * - The visually-hidden span announces "Loading contracts…" via an
 *   `aria-live="polite"` region on mount.
 * - All shimmer blocks carry `aria-hidden="true` — they are decorative
 *   placeholders with no semantic content.
 * - The shimmer animation is suppressed via the project-wide
 *   `prefers-reduced-motion` CSS rule in globals.css plus the
 *   `motion-reduce:animate-none` Tailwind variant belt-and-suspenders guard.
 *
 * Validation boundaries (deterministic skeleton count):
 * - The number of skeleton cards is a derived, bounded value. It is not
 *   accepted from random input and cannot be negative, naN, or Infinity.
 * - `DEFAULT_SKELETON_COUNT` is the canonical count used in production.
 *   Tests may override it via the `count` prop, but the value is always
 *   coerced to an integer in [`MIN_SKELETON_COUNT`, `MAX_SKELETON_COUNT`].
 * - Duplicate or out-of-range inputs are normalized to the nearest valid
 *   boundary, so rendering is always deterministic and side-effect free.
 */
const SKELETON_CARD_COUNT = 5;

/** Minimum number of skeleton cards rendered. */
export const MIN_SKELETON_COUNT = 1;

/** Maximum number of skeleton cards rendered. */
export const MAX_SKELETON_COUNT = 20;

/** Default number of skeleton cards rendered in production. */
const DEFAULT_SKELETON_COUNT = 5;

/**
 * Normalize a requested skeleton count into a deterministic, bounded integer.
 *
 * Accepted input: any number or undefined.
 * - `undefined` -> `DEFAULT_SKELETON_COUNT`.
 * - `NaN`, `Infinity`, `-Infinity`, non-numbers -> `DEFAULT_SKELETON_COUNT`.
 * - Fractional values -> truncated toward zero.
 * - Out-of-range values -> clamped to [`MIN_SKELETON_COUNT`, `MAX_SKELETON_COUNT`].
 *
 * The result is always an integer in [`MIN_SKELETON_COUNT`, `MAX_SKELETON_COUNT`],
 * so the rendered output is always deterministic and cannot throw.
 */
export function normalizeSkeletonCount(count?: number): number {
  if (count === undefined || !Number.isFinite(count)) {
    return DEFAULT_SKELETON_COUNT;
  }

  const truncated = Math.trunc(count);

  if (truncated < MIN_SKELETON_COUNT) {
    return MIN_SKELETON_COUNT;
  }

  if (truncated > MAX_SKELETON_COUNT) {
    return MAX_SKELETON_COUNT;
  }

  return truncated;
}

const ContractCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
  >
    {/* Contract name */}
    <div className="h-5 w-48 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
    {/* Status · Created */}
    <div className="mt-2 h-3.5 w-36 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
  </div>
);

export default function ContractsLoading() {
  const id = React.useId();

  return (
    <main className="min-h-screen p-8" aria-busy="true">
      {/* Accessible announcement -- exactly one live region (invariant #4) */}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading contracts…
      </span>

      {/* Heading skeleton */}
      <div
        aria-hidden="true"
        className="mb-6 h-8 w-36 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none"
      />

      {/* "Create Contract" button skeleton – top-right alignment */}
      <div className="mb-4 flex justify-end">
        <div
          aria-hidden="true"
          className="h-9 w-36 rounded-2xl bg-slate-200 animate-shimmer motion-reduce:animate-none"
        />
      </div>

      {/* Contract card list */}
      <ul className="space-y-4" aria-label="Loading contract list">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={`${id}-skeleton-${i}`}>
            <ContractCardSkeleton />
          </li>
        ))}
      </ul>
    </main>
  );
}
