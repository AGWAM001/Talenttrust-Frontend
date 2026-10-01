import { MilestonesListSkeleton } from '@/components/MilestonesListSkeleton';

/**
 * Loading shell for the milestones board.
 *
 * The shell intentionally uses the same outer spacing, filter footprint, and
 * list card dimensions as the resolved board. Keeping those boxes in place
 * means the heading and the first card do not jump when the client data is
 * ready. Decorative blocks are hidden from assistive technology; the one
 * status node is the single live announcement for the entire board.
 */
export default function MilestonesBoardSkeleton() {
  return (
    <div
      className="min-h-screen p-8"
      aria-busy="true"
      data-testid="milestones-board-skeleton"
    >
      <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        Loading milestones…
      </span>

      <div
        aria-hidden="true"
        className="mb-6 h-8 w-36 rounded-lg bg-slate-200 animate-shimmer motion-reduce:animate-none"
      />

      <div
        aria-hidden="true"
        className="mb-4 flex min-h-[42px] flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex min-h-8 flex-wrap items-center gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="h-8 w-20 rounded-full bg-slate-200 animate-shimmer motion-reduce:animate-none"
            />
          ))}
        </div>
        <div className="flex min-h-[42px] flex-wrap items-center gap-3">
          <div className="h-[42px] w-32 rounded-2xl bg-slate-200 animate-shimmer motion-reduce:animate-none" />
          <div className="h-[42px] w-36 rounded-2xl bg-slate-200 animate-shimmer motion-reduce:animate-none" />
        </div>
      </div>

      <MilestonesListSkeleton />
    </div>
  );
}
