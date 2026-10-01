'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EmptyState from '../../components/EmptyState';
import MilestonesList from '../../components/MilestonesList';
import MilestoneFilter, {
  type MilestoneStatusFilter,
} from '../../components/milestones/MilestoneFilter';
import { MilestoneCreationForm } from '../../components/milestones/MilestoneCreationForm';
import { listMilestones } from '@/lib/repository';
import { getItem, setItem } from '@/lib/safeStorage';
import { useToast } from '@/components/toast/toast-provider';
import SafeBoundary from '@/components/SafeBoundary';
import MilestonesErrorBoundary from '@/components/milestones/MilestonesErrorBoundary';
import MilestonesBoardSkeleton from '@/components/milestones/MilestonesBoardSkeleton';
import { downloadMilestonesICS } from '@/lib/icsExport';
import { useOfflineMilestones } from '@/hooks/useOfflineMilestones';
import { SAMPLE_MILESTONES, SAMPLE_DISMISSED_KEY } from './constants';
import type { Milestone } from '@/types/domain';
import { useOptimisticMilestoneMutation } from '@/hooks/useOptimisticMilestoneMutation';

const UNPAGINATED_LIST_SIZE = 9999;

const VALID_STATUSES: MilestoneStatusFilter[] = [
  'All',
  'Pending',
  'Completed',
  'Paid',
  'Disputed',
];

function getValidStatus(param: string | null): MilestoneStatusFilter {
  return param && (VALID_STATUSES as string[]).includes(param)
    ? (param as MilestoneStatusFilter)
    : 'All';
}

type MilestoneSortOption = 'newest' | 'oldest';
const VALID_SORT_OPTIONS: MilestoneSortOption[] = ['newest', 'oldest'];

function getValidSortOption(param: string | null): MilestoneSortOption {
  return param && (VALID_SORT_OPTIONS as string[]).includes(param)
    ? (param as MilestoneSortOption)
    : 'newest';
}



const MilestonesContent: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>(SAMPLE_MILESTONES);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const startFromScratchRef = useRef<HTMLButtonElement | null>(null);

  const initialStatus = getValidStatus(searchParams.get('status'));
  const [statusFilter, setStatusFilter] =
    useState<MilestoneStatusFilter>(initialStatus);
  const [sortOrder, setSortOrder] = useState<MilestoneSortOption>(
    getValidSortOption(searchParams.get('sort')),
  );
  const [showForm, setShowForm] = useState(false);
  const { showError } = useToast();
  const reconcileFromRepo = useCallback(() => {
    setMilestones(listMilestones());
  }, []);
  const offline = useOfflineMilestones(reconcileFromRepo);
  const { optimisticCreate, optimisticUpdate } = useOptimisticMilestoneMutation(
    milestones,
    setMilestones,
  );

  useEffect(() => {
    setStatusFilter(getValidStatus(searchParams.get('status')));
    setSortOrder(getValidSortOption(searchParams.get('sort')));
  }, [searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (statusFilter !== 'All') {
        params.set('status', statusFilter);
      } else {
        params.delete('status');
      }

      if (sortOrder !== 'newest') {
        params.set('sort', sortOrder);
      } else {
        params.delete('sort');
      }

      const query = params.toString();
      router.replace(query ? `?${query}` : '?');
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [statusFilter, sortOrder, router, searchParams]);

  useEffect(() => {
    const persisted = listMilestones();
    if (persisted.length > 0) {
      setMilestones(persisted);
      setIsDismissed(true);
    } else {
      try {
        const dismissed = getItem(SAMPLE_DISMISSED_KEY) === 'true';
        setIsDismissed(dismissed);
      } catch {
        setIsDismissed(true);
      }
      setMilestones(SAMPLE_MILESTONES);
    }
  }, []);

  const handleDismissSampleBanner = useCallback(() => {
    try {
      setItem(SAMPLE_DISMISSED_KEY, 'true');
    } catch {
      // safeStorage resilience
    }
    setIsDismissed(true);
    setMilestones([]);
    setTimeout(() => {
      headingRef.current?.focus();
    }, 0);
  }, []);

  const isUsingSampleData = milestones === SAMPLE_MILESTONES;
  const showSampleBanner = isUsingSampleData && !isDismissed;
  const displayMilestones = isUsingSampleData && isDismissed ? [] : milestones;

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return displayMilestones;
    return displayMilestones.filter((m) => m.status === statusFilter);
  }, [displayMilestones, statusFilter]);

  const sortedMilestones = useMemo(() => {
    const nextMilestones = [...filtered];

    if (sortOrder === 'oldest') {
      nextMilestones.sort((left, right) => {
        const leftTime = left.dueDate ? Date.parse(left.dueDate) : Number.POSITIVE_INFINITY;
        const rightTime = right.dueDate ? Date.parse(right.dueDate) : Number.POSITIVE_INFINITY;
        return leftTime - rightTime;
      });
    } else {
      nextMilestones.sort((left, right) => {
        const leftTime = left.dueDate ? Date.parse(left.dueDate) : Number.NEGATIVE_INFINITY;
        const rightTime = right.dueDate ? Date.parse(right.dueDate) : Number.NEGATIVE_INFINITY;
        return rightTime - leftTime;
      });
    }

    return nextMilestones;
  }, [filtered, sortOrder]);

  const handleAddMilestone = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleSubmitMilestone = useCallback((milestone: Milestone) => {
    const result = optimisticCreate(milestone);
    if (!result.ok) {
      showError({
        title: 'Unable to create milestone',
        description: result.error,
      });
      return;
    }
    setShowForm(false);
    setIsDismissed(true);
  }, [optimisticCreate, showError]);
  const handleCancelForm = useCallback(() => {
    setShowForm(false);
  }, []);

  const handleUpdateMilestone = useCallback(
    (id: string, patch: Partial<Milestone>): boolean => {
      const result = optimisticUpdate(id, patch);
      if (result.ok) return true;
      showError({
        title: 'Unable to update milestone',
        description: result.error,
      });
      return false;
    },
    [optimisticUpdate, showError],
  );

  return (
    <div className="min-h-screen p-8">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold mb-6 focus:outline-none">
        Milestones
      </h1>

      {(offline.isFlushing || offline.notice || offline.pendingCount > 0) && (
        <div
          data-testid="offline-status-banner"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-200"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              {!offline.isOnline
                ? 'You’re offline — milestone changes are saved on this device and will sync automatically when you reconnect.'
                : offline.isFlushing
                  ? 'Synchronizing your pending milestones…'
                  : offline.notice}
            </p>
            {!offline.isOnline && offline.pendingCount > 0 && (
              <span className="ml-2 shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                {offline.pendingCount} pending
              </span>
            )}
          </div>
        </div>
      )}

      {showSampleBanner && (
        <div
          data-testid="sample-data-banner"
          role="status"
          aria-label="Sample data notice"
          className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                You're viewing sample data
              </p>
              <p className="mt-1 text-sm text-blue-700">
                These are example milestones to help you get started.
              </p>
              <button
                ref={startFromScratchRef}
                data-testid="start-from-scratch-btn"
                type="button"
                onClick={handleDismissSampleBanner}
                className="mt-3 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Start from scratch
              </button>
            </div>
            <button
              type="button"
              onClick={handleDismissSampleBanner}
              aria-label="Dismiss sample data notice"
              className="rounded-sm text-blue-500 hover:text-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {displayMilestones.length === 0 ? (
        <EmptyState
          illustration="milestones"
          title="No milestones tracked"
          description="Track your progress by adding milestones to your contracts. Milestones help you stay organized and ensure timely delivery."
          actionLabel="Add Milestone"
          onAction={handleAddMilestone}
        />
      ) : (
        <>
          <div className="mb-4 flex min-h-[42px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <MilestonesErrorBoundary sectionName="filters">
              <MilestoneFilter
                selected={statusFilter}
                onChange={setStatusFilter}
                resultCount={sortedMilestones.length}
              />
            </MilestonesErrorBoundary>
            <MilestonesErrorBoundary sectionName="actions">
              <div className="flex min-h-[42px] flex-wrap items-center gap-3">
                <label
                  htmlFor="milestone-sort"
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm"
                >
                  <span className="font-medium text-slate-700">Sort</span>
                  <select
                    id="milestone-sort"
                    aria-label="Sort milestones"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as MilestoneSortOption)}
                    className="rounded-xl border border-slate-200 bg-transparent px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => downloadMilestonesICS(sortedMilestones)}
                  aria-label="Add to calendar"
                  className="flex-shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  <span aria-hidden="true" className="mr-1">📅</span>
                  Add to Calendar
                </button>
                <button
                  type="button"
                  aria-label="Add Milestone"
                  onClick={handleAddMilestone}
                  className="flex-shrink-0 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                >
                  Add Milestone
                </button>
              </div>
            </MilestonesErrorBoundary>
          </div>

          <MilestonesErrorBoundary sectionName="milestone list">
            {sortedMilestones.length === 0 ? (
              <EmptyState
                illustration="milestones"
                title="No milestones match this filter"
                description={`There are no ${statusFilter.toLowerCase()} milestones at the moment. Try a different filter or add a new milestone.`}
                actionLabel="Add Milestone"
                onAction={handleAddMilestone}
              />
            ) : (
              <MilestonesList
                milestones={sortedMilestones}
                onUpdateMilestone={handleUpdateMilestone}
                pageSize={UNPAGINATED_LIST_SIZE}
              />
            )}
          </MilestonesErrorBoundary>
        </>
      )}

      {showForm && (
        <MilestoneCreationForm
          onSubmit={handleSubmitMilestone}
          onCancel={handleCancelForm}
        />
      )}
    </div>
  );
};

const MilestonesPage: React.FC = () => (
  <SafeBoundary fallbackTitle="Milestones failed to load.">
    <Suspense fallback={<MilestonesBoardSkeleton />}>
      <MilestonesContent />
    </Suspense>
  </SafeBoundary>
);

export default MilestonesPage;
