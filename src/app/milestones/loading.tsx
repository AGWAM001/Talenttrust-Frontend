/**
 * App Router loading state for the milestones board. Keep this route-level
 * fallback and the client Suspense fallback on the same component so their
 * geometry and assistive-technology announcement cannot drift apart.
 *
 * State invariants owned by this module:
 -----------------------------------------------------------------------------
 * 1. This file is a pure, side-effect-free presentational boundary. It must
 *    not read or mutate any milestone data, auth state, or global store.
 *    Doing so would let a transient loading render observe or corrupt state
 *    that the board itself owns.
 * 2. The rendered output is deterministic: the same props always produce the
 *    same tree, so repeated, interrupted, or concurrent loading renders
 *    cannot produce an inconsistent or unsafe result.
 * 3. The route-level fallback and the client Suspense fallback remain the
 *    same component so geometry and assistive-technology announcement cannot
 *    drift apart.
 * 4. No sensitive data is rendered or logged from this boundary; the skeleton
 *    is decorative and announced as a busy loading region by the skeleton
 *    component itself.
 */

import MilestonesBoardSkeleton from '@/components/milestones/MilestonesBoardSkeleton';

/**
 * Route-level loading fallback for /milestones.
 *
 * This component is rendered by the App Router while the route segment is
 * streaming. It is intentionally a pure function with no parameters and no
 * side effects so that any number of concurrent or repeated renders are
 * idempotent and cannot observe or mutate application state.
 */
export default function MilestonesLoading() {
  return <MilestonesBoardSkeleton />;
}
