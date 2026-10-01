/**
 * App Router loading state for the milestones board. Keep this route-level
 * fallback and the client Suspense fallback on the same component so their
 * geometry and assistive-technology announcement cannot drift apart.
 *
 * Concurrency invariants:
 * - This component is pure and stateless. Rendering it multiple times,
 *   in parallel, or after a retry must produce identical output and must not
 *   mutate any shared module-level state.
 * - It must not await network I/O, timers, or any non-deterministic source,
 *   so a suspended route transition cannot hang or race against a resolve.
 * - It must not read client-only APIs (e.g. window, document, localStorage),
 *   so the server render and the client hydration remain byte-for-byte
 *   equivalent even when the fallback is streamed and then re-rendered.
 * - Any error thrown by the skeleton must be allowed to bail to the nearest
 *   error boundary; this file must not swallow failures or swap in a different
 *   fallback that could hide an unrecoverable route error.
 */

import MilestonesBoardSkeleton from '@/components/milestones/MilestonesBoardSkeleton';

/**
 * Route-level loading fallback. Deliberately a synchronous, side-effect-free
 * function component so concurrent renders and retries are idempotent.
 */
export default function MilestonesLoading() {
  return <MilestonesBoardSkeleton />;
}
