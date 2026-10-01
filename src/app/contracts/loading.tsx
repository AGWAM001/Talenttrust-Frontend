/**
 * loading.tsx – /contracts
 *
 * App Router Suspense boundary rendered while the contracts list page streams
 * in. It shows the shared `ContractsSkeleton` (heading + "Create Contract"
 * button + contract-card rows) so the route-level fallback and the in-page
 * skeleton can never drift apart, and wraps it in
 * {@link ContractsLoadingBoundary} so a stalled or failed fallback always has a
 * deterministic, observable outcome:
 *
 *   - the stream is slow      → an explicit "taking longer" notice plus a
 *                               reload affordance, reported at `warn` level,
 *                               with the skeleton left in place;
 *   - the fallback throws     → a contained `role="alert"` state with a bounded
 *                               number of "Try again" attempts, reported at
 *                               `error` level;
 *   - nothing recovers        → the retry affordance becomes a hard page
 *                               reload, the only recovery that discards all
 *                               in-memory React state.
 *
 * The boundary never touches persisted storage, so contracts, milestones,
 * wallet items and preferences survive a failure/retry cycle intact. Its
 * invariants are documented in ContractsLoadingBoundary.tsx.
 *
 * Accessibility:
 * - The root layout owns the single `<main id="main-content">` landmark, so
 *   this fallback renders a `<div aria-busy="true">` rather than a second
 *   `<main>` (duplicate-landmark regression fixed for /milestones in #682).
 * - A visually-hidden `role="status"` announces "Loading contracts…" on mount
 *   and re-announces the stalled message; the skeleton itself is
 *   `aria-hidden="true"` because it is decorative.
 * - Shimmer blocks are suppressed for `prefers-reduced-motion` by the
 *   project-wide rule in globals.css plus `motion-reduce:animate-none`.
 */

import ContractsLoadingBoundary, {
  CONTRACTS_LOADING_SKELETON_ROWS,
} from './ContractsLoadingBoundary';
import { ContractsSkeleton } from '@/components/contracts/ContractsSkeleton';

export default function ContractsLoading() {
  return (
    <ContractsLoadingBoundary>
      <ContractsSkeleton count={CONTRACTS_LOADING_SKELETON_ROWS} />
    </ContractsLoadingBoundary>
  );
}
