/**
 * App Router loading state for the milestones board. Keep this route-level
 * fallback and the client Suspense fallback on the same component so their
 * geometry and assistive-technology announcement cannot drift apart.
 *
 * Validation boundaries (documented invariants):
 * - This module is a pure, siden-effect-free React server component: it accepts no
 *   props and must not read from global mutable state, so there is no input to
 *   validate at the call site. Any future prop must be added with an explicit
 *   validation boundary and a default that preserves the skeleton geometry.
 * - The component must always return a renderable React element. The default
 *   export is the only public interface and must remain stable for the App
 *   Router convention.
 * - The component must be deterministic: rendering it repeatedly with the
 *   same inputs yields the same output, and it must not throw for any
 *   normal or adverse input because it has no inputs.
 * - The component must not expose sensitive data; it renders only a static
 *   skeleton with no user, tenant, or request-specific information.
 *
 * Failure modes:
 * - If the skeleton component fails to render, React's error boundary owns the
 *   recovery; this module must not swallow or transform errors.
 * - No network access, timers, or concurrency is involved, so retries and
 *   concurrent execution cannot produce an inconsistent result.
 *
 * Observability:
 * - This component intentionally emits no logs or metrics because it carries no
 *   sensitive data and its failure is already surfaced by React's error
 *   boundary and the route's error boundary.
 */

import type { ReactElement } from 'react';

import MilestonesBoardSkeleton from '@/components/milestones/MilestonesBoardSkeleton';

export default function MilestonesLoading(): ReactElement {
  return <MilestonesBoardSkeleton />;
}
