/**
 * ContractsSkeleton
 *
 * Content-shaped loading placeholder for the /contracts list page. Mirrors
 * the exact layout rendered by ContractsPage when contracts are present:
 *   - Page heading
 *   - "Create Contract" button (top-right)
 *   - A column of contract-card rows (rounded-3xl border p-4)
 *
 * Accessibility:
 * - The wrapper accepts an `aria-busy` and `role="status"` through the
 *   parent; all shimmer blocks are `aria-hidden="true"` (decorative).
 * - A visually-hidden `<span role="status" aria-live="polite">` inside
 *   announces "Loading contracts…" to screen readers on mount.
 * - The shimmer animation is suppressed by the project-wide
 *   prefers-reduced-motion rule in globals.css and the
 *   `motion-reduce:animate-none` Tailwind variant as a belt-and-suspenders
 *   guard.
 *
 * No layout shift: the skeleton occupies the same vertical space as the
 * fully-loaded list, so the page does not jump when content arrives.
 */

/**
 * A single shimmer card that mirrors one <li> contract row in ContractsPage.
 *
 * Structure:
 *   <div rounded-3xl border p-4>   ← matches the real `<li>` wrapper
 *     <div h-5 w-48 …>             ← contract name (font-semibold)
 *     <div mt-2 h-3.5 w-36 …>     ← "status · Created at" line
 *   </div>
 */
const ContractCardSkeleton = () => (
  <div
    aria-hidden="true"
    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
  >
    {/* Contract name placeholder */}
    <div className="h-5 w-48 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
    {/* "status · Created …" placeholder */}
    <div className="mt-2 h-3.5 w-36 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />
  </div>
);

interface ContractsSkeletonProps {
  /** Number of card rows to render. Defaults to 3. */
  count?: number;
}

/**
 * Full-page skeleton for the /contracts list view.
 *
 * Rendered by ContractsPage while the contract list is loading, and exported
 * so it can also be independently tested.
 *
 * @param count - number of skeleton card rows to render (default 3).
 */
export const ContractsSkeleton = ({ count = 3 }: ContractsSkeletonProps) => (
  <div aria-hidden="true" data-testid="contracts-skeleton">
    {/* Heading skeleton – matches <h1 className="text-2xl font-bold mb-6"> */}
    <div className="mb-6 h-8 w-36 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none" />

    {/* "Create Contract" button skeleton – matches the top-right button */}
    <div className="mb-4 flex justify-end">
      <div className="h-9 w-36 rounded-2xl bg-slate-200 animate-shimmer motion-reduce:animate-none" />
    </div>

    {/* Contract card list skeleton */}
    <ul className="space-y-4" aria-label="Loading contract list">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <ContractCardSkeleton />
        </li>
      ))}
    </ul>
  </div>
);
