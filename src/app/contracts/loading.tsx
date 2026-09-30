/**
 * loading.tsx – /contracts
 *
 * App Router Suspense boundary rendered while the contracts list page streams
 * in. Mirrors the visual shape of ContractsPage: a page heading followed by
 * a column of contract-card rows (matching the `<li>` cards rendered when
 * contracts exist).
 *
 * Accessibility:
 * - Outer wrapper carries `aria-busy="true"` and `role="status` so assistive
 *   technologies understand the region is in a transient loading state.
 * - The visually-hidden span announces "Loading contracts…" via an
 *   `aria-live="polite"` region on mount.
 * - All shimmer blocks carry `aria-hidden="true"` — they are decorative
 *   placeholders with no semantic content.
 * - The shimmer animation is suppressed via the project-wide
 *   `prefers-reduced-motion` CSS rule in globals.css plus the
 *   `motion-reduce:animate-none` Tailwind variant belt-and-suspenders guard.
 *
 * Validation boundaries:
 * This component is a purely presentational Suspense fallback. The only
 * externally influenced input is the number of skeleton rows to render.
 * To keep the render deterministic and bounded regardless of how the
 * component is invoked (e.g. from tests, storybooks, or future refactors),
 * the row count is normalized through `resolveSkeletonCount`:
 *
 *   - Non-finite values (NaN, Infinity, -Infinity) fall back to the
 *     default.
 *   - Negative values clamp to 0 (renders an empty list, never a crash).
 *   - Fractional values are truncated towards zero.
 *   - Values above `MAX_SKELETON_ROWS` clamp to the maximum, so a
 *     misconfigured caller cannot force an unbounded render (memory/DOS
 *     exhaustion).
 *   - Duplicate or repeated invocations are idempotent: the same input
 *     always produces the same number of rows.
 *
 * The default export keeps its existing signature (no props) so existing
 * callers remain compatible.
 */

/** Default number of skeleton rows rendered while loading. */
export const DEFAULT_SKELETON_ROWS = 5;

/** Hard upper bound on skeleton rows to prevent unbounded renders. */
export const MAX_SKELETON_ROWS = 50;

/**
 * Normalize a candidate row count into a safe, deterministic integer.
 *
 * Accepted: finite numbers in [0, MAX_SKELETON_ROWS].
 * Rejected (coerced to a defined, safe value): non-numbers, NaN,
 * ±Infinity, negatives, fractions, and out-of-range values.
 */
export function resolveSkeletonCount(candidate?: number): number {
  if (candidate === undefined || candidate === null) {
    return DEFAULT_SKELETON_ROWS;
  }

  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    return DEFAULT_SKELETON_ROWS;
  }

  if (candidate <= 0) {
    return 0;
  }

  const truncated = Math.trunc(candidate);

  if (truncated > MAX_SKELETON_ROWS) {
    return MAX_SKELETON_ROWS;
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

export interface ContractsLoadingProps {
  /**
   * Optional override for the number of skeleton rows. Normalized by
   * `resolveSkeletonCount` so invalid or out-of-range values cannot
   * produce an unsafe or non-deterministic render.
   */
  rows?: number;
}

export default function ContractsLoading({ rows }: ContractsLoadingProps = {}) {
  const rowCount = resolveSkeletonCount(rows);

  return (
    <main className="min-h-screen p-8" aria-busy="true">
      {/* Accessible announcement */}
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
        {Array.from({ length: rowCount }, (_, i) => (
          <li key={i} data-testid="contract-skeleton-row">
            <ContractCardSkeleton />
          </li>
        ))
      }
      </ul>
    </main>
  );
}
