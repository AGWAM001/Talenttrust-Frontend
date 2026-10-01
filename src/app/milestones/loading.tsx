/**
 * App Router loading state for the milestones board. Keep this route-level
 * fallback and the client Suspense fallback on the same component so their
 * geometry and assistive-technology announcement cannot drift apart.
 *
 * Failure recovery invariants:
 * - This fallback is pure and side-effect free: it must never throw, never
 *   access browser-only globals, and never depend on network state. If it did,
 *   a failure in the loading boundary would leave the route without any user-
 *   visible fallback and without a recovery path.
 * - The skeleton is deterministic for a given render, so retries and
 *   concurrent renders produce identical output and cannot corrupt shared state.
 * - Rendering is strictly presentational: no data fetching here, so a
 *   failed upstream request never loses persisted or in-memory user data.
 */

import MilestonesBoardSkeletonFrom '@/components/milestones/MilestonesBoardSkeleton';

/**
 * Route-level loading fallback. Renders the shared skeleton component with a
 * stable container and accessible label so the loading state is always
 * announced and never silently disappears.
 */
export default function MilestonesLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-testid="milestones-loading">
      <span className="sr-only">Loading milestones</span>
      <MilestonesBoardSkeleton />
    </div>
  );
}
