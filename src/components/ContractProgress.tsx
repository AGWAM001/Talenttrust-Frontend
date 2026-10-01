'use client';

import { usePreferences } from '@/lib/preferences';
import { useContractProgress } from '@/hooks/useContractProgress';
import { Milestone } from './MilestonesList';

export interface ContractProgressProps {
  milestones: Milestone[];
}

/**
 * ContractProgress displays an accessible escrow summary and milestone progress panel.
 *
 * Features:
 * - Calculates completed milestone count and total milestone count.
 * - Calculates total paid funds vs. outstanding funds in escrow.
 * - Displays a visual and semantic progress bar with ARIA attributes.
 * - Formats monetary values using user preferences.
 * - Handles edge cases: zero milestones, all paid, none paid.
 *
 * Empty-state behaviour (totalCount === 0):
 * - Renders an explicit "No milestones yet" message in place of the progress
 *   bar and "0 / 0" completion row.
 * - The `role="progressbar"` element is intentionally omitted for the empty
 *   state — an indeterminate bar with aria-valuenow="0" out of 0 milestones
 *   conveys no meaningful information to assistive technologies and reads as
 *   a broken state rather than "not started". The financial cards (Paid /
 *   Outstanding) are still rendered showing zero values so the card layout
 *   remains consistent with the non-empty state.
 *
 * Accessibility:
 * - Semantic `<section>` with `aria-labelledby` referencing the heading.
 * - Progress bar uses `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
 * - Screen reader text provides context for the progress percentage.
 * - Empty state uses a plain `<p>` so screen readers announce it naturally.
 *
 * @param props - Component props
 * @param props.milestones - Array of milestone objects.
 *
 * @example
 * ```tsx
 * <ContractProgress milestones={sampleMilestones} />
 * ```
 */
const ContractProgress = ({ milestones }: ContractProgressProps) => {
  const { formatAmount } = usePreferences();

  // Data-integrity invariant: Ensure milestones is an array to prevent crashes
  const safeMilestones = Array.isArray(milestones) ? milestones : [];

  const { completedCount, totalCount, paidAmount, outstandingAmount, progressPercent, currency } =
    useContractProgress(safeMilestones);

  // State-transition and data-integrity invariants:
  // 1. Counts must be non-negative, and completed cannot exceed total
  const safeTotalCount = Math.max(0, totalCount);
  const safeCompletedCount = Math.max(0, Math.min(completedCount, safeTotalCount));

  // 2. Progress percentage must be bounded between 0 and 100 and be a valid number
  const safeProgressPercent = Number.isFinite(progressPercent)
    ? Math.max(0, Math.min(progressPercent, 100))
    : 0;

  // 3. Financial values should remain non-negative in the UI display
  const safePaidAmount = Math.max(0, paidAmount);
  const safeOutstandingAmount = Math.max(0, outstandingAmount);

  /**
   * Empty-state branch: no milestones have been added to this contract yet.
   *
   * Renders a descriptive message instead of a "0 of 0" progress bar, which
   * would read as broken to both sighted users and screen reader users.
   * The financial summary cards are retained at zero so the card layout stays
   * consistent and the section still communicates "nothing paid, nothing
   * outstanding" rather than showing no financial context at all.
   */
  const isEmpty = safeTotalCount === 0;

  return (
    <section
      aria-labelledby="contract-progress-title"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="contract-progress-title" className="text-xl font-semibold text-slate-900">
        Escrow Progress
      </h2>

      <div className="mt-6 space-y-6">
        {isEmpty ? (
          /* Empty state — no milestones attached to this contract yet */
          <p className="text-sm text-slate-500">
            No milestones yet
          </p>
        ) : (
          /* Milestone completion progress */
          <div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Milestones completed</span>
              <span className="font-semibold text-slate-900">
                {safeCompletedCount} / {safeTotalCount}
              </span>
            </div>
            <div className="mt-3">
              <div
                role="progressbar"
                aria-valuenow={safeProgressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${safeCompletedCount} of ${safeTotalCount} milestones completed, ${safeProgressPercent}%`}
                className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                  style={{ width: `${safeProgressPercent}%` }}
                >
                  <span className="sr-only">{safeProgressPercent}% complete</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Financial summary — rendered for both empty and non-empty states */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700 font-medium">Paid</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-900">
              {formatAmount(safePaidAmount, currency)}
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4">
            <p className="text-sm text-amber-700 font-medium">Outstanding</p>
            <p className="mt-2 text-2xl font-semibold text-amber-900">
              {formatAmount(safeOutstandingAmount, currency)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContractProgress;
