/**
 * App Router loading state for the milestones board. Keep this route-level
 * fallback and the client Suspense fallback on the same component so their
 * geometry and assistive-technology announcement cannot drift apart.
 */

import MilestonesBoardSkeleton from '@/components/milestones/MilestonesBoardSkeleton';

export default function MilestonesLoading() {
  return <MilestonesBoardSkeleton />;
}
