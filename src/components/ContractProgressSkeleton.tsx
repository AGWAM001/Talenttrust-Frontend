/**
 * Stateless placeholder rendered while contract milestones are loading.
 *
 * Mirrors the visual shape of `ContractProgress` with pulsing grey blocks,
 * and declares `aria-busy="true"` plus `aria-label="Loading escrow progress"`
 * so screen readers announce the loading state consistently with the other
 * skeleton components on the contract detail page.
 *
 * State invariants:
 * - This component is a pure, stateless presentational element. It must not
 *   read or mutate escrow domain state, and it must not accept or forward
 *   user input that could affect contract transitions.
 * - The loading announcement must remain deterministic and identical across
 *   renders: aria-busy="true" and a stable aria-label are always present.
 * - The component must not expose sensitive data (addresses, amounts, milestone
 *   names) while loading; all content is decorative and anonymous.
 * - Rendering must be idempotent and safe under concurrent or repeated
 *   renders (e.g. React StrictMode double-invoking), since it holds no mutable
 *   state and performs no side effects.
 */

/** Stable loading announcement used by the skeleton. */
export const CONTRACT_PROGRESS_LOADING_LABEL =
  "Loading escrow progress" as const;

/**
 * Static decorative blocks used by the skeleton. Kept as a module-level
 * constant so the render output is deterministic and free of any per-render
 * allocations or randomness.
 */
const SkeletonBlock = ({
  className,
  testId,
}: {
  className: string;
  testId?: string;
}) => (
  <div className={className} data-testid={testId} aria-hidden="true" />
);

export const ContractProgressSkeleton = () => {
  return (
    <section
      aria-busy="true"
      aria-label={CONTRACT_PROGRESS_LOADING_LABEL}
      data-testid="contract-progress-skeleton"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse"
    >
      {/* Heading */}
      <SkeletonBlock className="h-7 w-40 rounded-lg bg-slate-200" />

      <div className="mt-6 space-y-6">
        {/* Milestone count row + progress bar */}
        <div>
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-36 rounded bg-slate-200" />
            <SkeletonBlock className="h-4 w-12 rounded bg-slate-200" />
          </div>
          <SkeletonBlock className="mt-3 h-3 w-full rounded-full bg-slate-200" />
        </div>

        {/* Paid / Outstanding cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <SkeletonBlock className="h-4 w-10 rounded bg-emerald-200" />
            <SkeletonBlock className="mt-2 h-8 w-24 rounded-lg bg-emerald-200" />
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <SkeletonBlock className="h-4 w-20 rounded bg-amber-200" />
            <SkeletonBlock className="mt-2 h-8 w-24 rounded-lg bg-amber-200" />
          </div>
        </div>
      </div>
    </section>
  );
};
