/**
 * Placeholder skeleton rendered while contract milestones are loading.
 *
 * Mirrors the visual shape of `ContractProgress` with pulsing grey blocks,
 * and declares `aria-busy="true"` plus `aria-label="Loading escrow progress"`
 * so screen readers announce the loading state consistently with the other
 * skeleton components on the contract detail page.
 */
interface ContractProgressSkeletonProps {
  hasError?: boolean;
  onRetry?: () => void;
}

export const ContractProgressSkeleton = ({
  hasError = false,
  onRetry,
}: ContractProgressSkeletonProps) => {
  if (hasError) {
    return (
      <section
        role="alert"
        aria-labelledby="contract-progress-error-title"
        className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm"
      >
        <h2 id="contract-progress-error-title" className="text-lg font-semibold text-red-900">
          Escrow progress unavailable
        </h2>
        <p className="mt-2 text-sm text-red-700">
          Contract progress could not be loaded. Your saved contract data has not been changed.
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            Retry
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-labelledby="contract-progress-title"
      aria-busy="true"
      aria-label="Loading escrow progress"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse"
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
