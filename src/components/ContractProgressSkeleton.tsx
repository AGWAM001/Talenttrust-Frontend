/**
 * Stateless placeholder rendered while contract milestones are loading.
 *
 * Mirrors the visual shape of `ContractProgress` with pulsing grey blocks,
 * and declares `aria-busy="true"` plus `aria-label="Loading escrow progress"`
 * so screen readers announce the loading state. This component has no effects
 * or shared state, so repeated and concurrent renders remain independent. Do
 * not reference the live heading, which is absent during this loading state.
 */
export const ContractProgressSkeleton = () => {
  return (
    <section
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
