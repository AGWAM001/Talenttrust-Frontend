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
 * State invariants (this file is a pure presentational boundary):
 * - 1. The component is a pure function of its props: it accepts no props,
 *      reads no external mutable state, and performs no side effects.
 *      Rendering it therefore cannot corrupt any shared state.
 * - 2. The skeleton count is a fixed, bounded constant (`SKELETON_COUNT`).
 *      It is never derived from untrusted input, so a compromised or
 *      unexpected value cannot cause unbounded memory/DOM growth or a DOS.
 * - 3. Keys are derived from the stable integer index of a fixed-length
 *      array, guaranteeing unique, stable React keys across re-renders.
 * - 4. The component never fetches, mutates, or persists data; failure of the
 *      underlying data load is handled by the route's error boundary, not
 *      here. This boundary only ever represents the transient loading state.
 * - 5. The announcement text is a static literal containing no user or
 *      server-supplied data, so no sensitive information can be leaked through
 *      the live region.
 */

/**
 * Fixed, bounded number of placeholder cards. Kept as a module-level
 * constant so the render output is deterministic and the DOM growth is capped
 * regardless of external input.
 */
const SKELETON_COUNT = 5;

/**
 * Stable identity for the announcement text. Extracted as a constant to
 * avoid accidental interpolation of dynamic data into the live region.
 */
const LOADING_MESSAGE = "Loading contracts…";

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
  return (
    <main className="min-h-screen p-8" aria-busy="true">
      {/* Accessible announcement */}
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {LOADING_MESSAGE}
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
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <li key={i}>
            <ContractCardSkeleton />
          </li>
        ))}
      </ul>
    </main>
  );
}
