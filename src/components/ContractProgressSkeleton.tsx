/**
 * Placeholder skeleton rendered while contract milestones are loading.
 *
 * Mirrors the visual shape of `ContractProgress` with pulsing grey blocks,
 * and declares `aria-busy="true"` plus `aria-label="Loading escrow progress"`
 * so screen readers announce the loading state consistently with the other
 * skeleton components on the contract detail page.
 *
 * ── Compatibility contract (pinned by ContractProgressSkeleton.test.tsx) ──
 *
 * INV-1  Zero-prop public interface. Callers (`app/contracts/[id]/loading.tsx`
 *        and `app/contracts/[id]/page.tsx` Suspense branch) render
 *        `<ContractProgressSkeleton />` with no props; the component is pure
 *        static markup — no state, no data access, no side effects — so it is
 *        deterministic for every mount and re-render (retries, StrictMode
 *        double-render, concurrent hydration all produce identical DOM).
 * INV-2  Landmark attribute set is fixed: `<section aria-busy="true"
 *        aria-label="Loading escrow progress"
 *        aria-labelledby="contract-progress-title">`. The `aria-labelledby`
 *        anchor intentionally dangles while loading (the skeleton ships no
 *        heading node); the accessible name falls back to `aria-label` per
 *        the accname spec, and the anchor becomes valid the instant the
 *        live `ContractProgress` h2 (#contract-progress-title) replaces this
 *        skeleton in the same position — keeping the region name wired
 *        across the loading → loaded transition without a layout shift.
 * INV-3  Never mounts a heading, progressbar role, or interactive element:
 *        no data is ready, so no operational affordance may exist while the
 *        skeleton is in the tree.
 * INV-4  Reduced-motion is honoured belt-and-suspenders: the project-wide
 *        `prefers-reduced-motion` rule in globals.css freezes `.animate-pulse`,
 *        and `motion-reduce:animate-none` (house pattern from `Skeleton.tsx`
 *        and the local sub-skeletons in `loading.tsx`) keeps the guarantee
 *        local to this component if the global rule is ever dropped.
 *
 * Breaking any invariant above is a breaking change to the loading-state
 * contract shared with the live components and existing callers.
 */
export const ContractProgressSkeleton = () => {
  return (
    <section
      aria-labelledby="contract-progress-title"
      aria-busy="true"
      aria-label="Loading escrow progress"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse motion-reduce:animate-none"
    >
      {/* Heading */}
      <div className="h-7 w-40 rounded-lg bg-slate-200" />

      <div className="mt-6 space-y-6">
        {/* Milestone count row + progress bar */}
        <div>
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 rounded bg-slate-200" />
            <div className="h-4 w-12 rounded bg-slate-200" />
          </div>
          <div className="mt-3 h-3 w-full rounded-full bg-slate-200" />
        </div>

        {/* Paid / Outstanding cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="h-4 w-10 rounded bg-emerald-200" />
            <div className="mt-2 h-8 w-24 rounded-lg bg-emerald-200" />
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="h-4 w-20 rounded bg-amber-200" />
            <div className="mt-2 h-8 w-24 rounded-lg bg-amber-200" />
          </div>
        </div>
      </div>
    </section>
  );
};
