'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import ContractSummary from '@/components/ContractSummary';
import MilestonesList from '@/components/MilestonesList';
import ActionPanel from '@/components/ActionPanel';
import ContractProgress from '@/components/ContractProgress';
import { ContractProgressSkeleton } from '@/components/ContractProgressSkeleton';
import { ContractSummarySkeleton } from '@/components/ContractSummarySkeleton';
import { MilestonesListSkeleton } from '@/components/MilestonesListSkeleton';
import ContractStatusAnnouncer from '@/components/ContractStatusAnnouncer';
import SafeBoundary from '@/components/SafeBoundary';
import OfflineIndicator from '@/components/OfflineIndicator';
import { resolveContractData, ContractData } from '@/lib/contractResolver';
import { useToast } from '@/components/toast/toast-provider';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  listMilestonesByContract,
  updateMilestone,
} from '@/lib/repository';
import { cacheContractData, getCachedContractData } from '@/lib/contractCache';
import { isValidContractId } from '@/lib/validateContractId';
import {
  useOptimisticContractStatus,
  type BuildPersistedContract,
} from '@/hooks/useOptimisticContractStatus';
import type { Milestone } from '@/types/domain';

// ---------------------------------------------------------------------------
// Contract status transition invariants
// ---------------------------------------------------------------------------

/**
 * Allowed status transitions for a contract.
 *
 * Invariant: a contract may only move to a status reachable from its current
 * one. Transitions not listed here are rejected deterministically without
 * making a network request, preventing silent inconsistent state.
 *
 * State machine:
 *   Active    → Completed | Disputed
 *   Pending   → Active | Disputed
 *   Disputed  → Active   (re-opens after dispute resolution)
 *   Completed → (terminal — no further transitions)
 */
const ALLOWED_TRANSITIONS: Record<ContractData['status'], ContractData['status'][]> = {
  Active: ['Completed', 'Disputed'],
  Pending: ['Active', 'Disputed'],
  Disputed: ['Active'],
  Completed: [],
};

/**
 * Returns `true` when moving `from` → `to` is a valid state transition.
 *
 * Duplicate transitions (`from === to`) are treated as no-ops and return
 * `false` so callers can short-circuit without producing a persistence round-trip.
 *
 * @param from - The current contract status.
 * @param to   - The desired next contract status.
 */
export function isAllowedTransition(
  from: ContractData['status'],
  to: ContractData['status'],
): boolean {
  if (from === to) return false;
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

// ---------------------------------------------------------------------------
// Milestone merge helper
// ---------------------------------------------------------------------------

/**
 * Merges the contract's resolved milestones with any milestones persisted in
 * the repository under the same `contractId`, de-duplicating by `id`.
 *
 * Persisted records take precedence over resolver records that share an id,
 * since the repository holds the most recently edited state.
 *
 * @param baseMilestones - Milestones returned by `resolveContractData`.
 * @param contractId - The contract id to filter persisted milestones by.
 * @returns The merged, de-duplicated milestone list for this contract.
 */
function mergeContractMilestones(
  baseMilestones: Milestone[],
  contractId: string,
): Milestone[] {
  const merged = new Map<string, Milestone>();
  baseMilestones.forEach((milestone) => merged.set(milestone.id, milestone));
  listMilestonesByContract(contractId).forEach((milestone) =>
    merged.set(milestone.id, milestone),
  );
  return Array.from(merged.values());
}

// ---------------------------------------------------------------------------
// Page content component
// ---------------------------------------------------------------------------

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

const ContractDetailPageContent = ({ id }: { id: string }) => {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPersistingStatus, setIsPersistingStatus] = useState(false);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | undefined>(undefined);
  const [isDataStale, setIsDataStale] = useState(false);

  /**
   * isMountedRef prevents state updates after unmount. It is set to `false` in
   * the useEffect cleanup so that an in-flight `resolveContractData` promise that
   * resolves after navigation away cannot write stale data into an unmounted tree.
   */
  const isMountedRef = useRef(true);
  /**
   * milestonesRef is kept in sync with the `milestones` state slice. It lets
   * `handleUpdateMilestone` capture the _latest_ milestone list inside the
   * rollback closure without being listed as a dependency of the `useCallback`
   * (which would recreate the callback on every render).
   */
  const milestonesRef = useRef(milestones);
  milestonesRef.current = milestones;

  const { showError, showSuccess } = useToast();
  const isOnline = useOnlineStatus();

  const { copied, copy } = useCopyToClipboard({
    delay: 2000,
    onSuccess: () => {
      showSuccess({
        title: 'Contract ID copied',
        description: 'The contract identifier has been copied to your clipboard.',
      });
    },
    onError: (err) => {
      if (err instanceof Error && err.message.includes('supported')) {
        showError({
          title: 'Copy not supported',
          description: 'Your browser does not support clipboard access. Please copy the ID manually.',
        });
      } else {
        showError({
          title: 'Copy failed',
          description: 'Unable to copy the contract ID to your clipboard. Please try again.',
        });
      }
    },
  });

  /**
   * Maps the resolved contract detail shape into the repository contract shape.
   *
   * The repository stores summary-friendly contract records, so the detail page
   * narrows `ContractData` into the fields that persistence already expects.
   * `version` is threaded through from {@link useOptimisticContractStatus} so
   * the repository's stale-overwrite guard compares against the correct baseline.
   *
   * Invariant: all fields are derived from the already-resolved `data`; no
   * defaults are silently injected so the shape is always deterministic.
   */
  const buildPersistedContract: BuildPersistedContract = useCallback(
    (data, status, version) => ({
      id: data.id,
      contractName: data.name,
      parties: data.parties,
      totalValue: data.totalValue,
      currency: data.currency,
      status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      milestoneCount: data.milestones.length,
      version,
    }),
    [],
  );

  const persistStatus = useOptimisticContractStatus(
    contractData,
    setContractData,
    buildPersistedContract,
  );

  /**
   * Applies a contract status transition optimistically, then persists it.
   *
   * Invariants enforced before any side-effect:
   *  1. Mutations are rejected when the device is offline.
   *  2. Mutations are rejected when serving stale cached data.
   *  3. The transition must be allowed by the {@link ALLOWED_TRANSITIONS} table.
   *     Duplicate transitions (same status → same status) are silently ignored.
   *     Invalid transitions surface a clear error.
   *
   * On failure — including a stale-overwrite rejection — the optimistic change
   * is rolled back and a specific error is surfaced via both the inline
   * `ActionPanel` banner and a dismissible toast. Sensitive identifiers are
   * never included in user-visible messages.
   *
   * @param nextStatus - The status to persist to the repository.
   * @param successTitle - The toast title shown after a successful write.
   * @param successDescription - The toast description shown after success.
   */
  const persistContractStatus = useCallback(
    (
      nextStatus: ContractData['status'],
      successTitle: string,
      successDescription: string,
    ) => {
      // Guard 1: offline
      if (!isOnline) {
        showError({
          title: 'Cannot update contract while offline',
          description: 'Please connect to the internet to make changes to this contract.',
        });
        return;
      }

      // Guard 2: stale cached data
      if (isUsingCachedData && isDataStale) {
        showError({
          title: 'Cannot update stale data',
          description: 'Please refresh the page to load the latest data before making changes.',
        });
        return;
      }

      // Guard 3: validate transition deterministically before any side-effect
      if (contractData) {
        const currentStatus = contractData.status;

        // Duplicate transition — no-op (idempotent)
        if (currentStatus === nextStatus) {
          return;
        }

        // Invalid transition — surface a clear error without touching the repository
        if (!isAllowedTransition(currentStatus, nextStatus)) {
          const error = `Cannot transition from '${currentStatus}' to '${nextStatus}'.`;
          setErrorMessage(error);
          showError({
            title: 'Invalid status transition',
            description: error,
          });
          return;
        }
      }

      setIsPersistingStatus(true);
      setErrorMessage(null);

      const result = persistStatus(nextStatus);

      if (!result.ok) {
        setErrorMessage(result.error);
        showError({
          title: 'Unable to update contract',
          description: result.error,
        });
        setIsPersistingStatus(false);
        return;
      }

      setErrorMessage(null);
      showSuccess({
        title: successTitle,
        description: successDescription,
      });
      setIsPersistingStatus(false);
    },
    [persistStatus, showError, showSuccess, isOnline, isUsingCachedData, isDataStale, contractData],
  );

  /**
   * Loads contract data from the network or falls back to the cache.
   *
   * The function is extracted from the effect body so it can be called both on
   * mount and whenever `isOnline` flips from `false` → `true`, enabling
   * automatic re-validation when connectivity is restored.
   *
   * Concurrency safety: an `AbortController` is created each time the effect
   * runs. All state updates are guarded by `isMountedRef.current`, so a
   * stale promise that resolves after the component unmounts or the effect
   * re-fires cannot produce an inconsistent state update.
   */
  useEffect(() => {
    isMountedRef.current = true;

    const loadContract = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // If offline, try to load from cache first
        if (!isOnline) {
          const cachedResult = getCachedContractData(id);
          if (cachedResult.success && cachedResult.data) {
            if (isMountedRef.current) {
              setContractData(cachedResult.data);
              setMilestones(mergeContractMilestones(cachedResult.data.milestones, id));
              setIsUsingCachedData(true);
              setIsDataStale(cachedResult.stale || false);
              setCachedAt(cachedResult.data.updatedAt);
              setIsLoading(false);
            }
            return;
          }
          // No cache available when offline — show a clear informative message
          if (isMountedRef.current) {
            setErrorMessage(
              'You are offline and this contract has not been loaded before. Please connect to the internet and try again.',
            );
            setIsLoading(false);
          }
          return;
        }

        // Online — fetch fresh data from the network
        const data = await resolveContractData(id);

        if (isMountedRef.current) {
          setContractData(data);
          setMilestones(mergeContractMilestones(data.milestones, id));
          setIsUsingCachedData(false);
          setIsDataStale(false);
          setCachedAt(undefined);

          // Cache the successfully loaded data for offline use
          cacheContractData(id, data);
        }
      } catch (error) {
        // On network error, fall back to the cache (may be stale)
        const cachedResult = getCachedContractData(id);
        if (cachedResult.success && cachedResult.data) {
          if (isMountedRef.current) {
            setContractData(cachedResult.data);
            setMilestones(mergeContractMilestones(cachedResult.data.milestones, id));
            setIsUsingCachedData(true);
            setIsDataStale(cachedResult.stale || false);
            setCachedAt(cachedResult.data.updatedAt);
            setErrorMessage(
              'Unable to load fresh data. Showing cached version which may be outdated.',
            );
          }
        } else if (isMountedRef.current) {
          // Expose a safe, non-sensitive error message only
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load contract. Please try again.',
          );
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadContract();

    return () => {
      isMountedRef.current = false;
    };
  }, [id, isOnline]);

  /**
   * Placeholder for the future milestone-submission workflow.
   *
   * Invariant: this is intentionally a no-op until the submission API is
   * integrated. The action button remains visible so the UI surface contract
   * is preserved for future callers.
   */
  const handleSubmitMilestone = () => {
    // Replace with real milestone submission flow.
  };

  /**
   * Persists the confirmed release-funds action as a completed contract.
   *
   * Transition: Active → Completed
   * Allowed by the ALLOWED_TRANSITIONS table; enforced inside
   * {@link persistContractStatus} before any repository write.
   */
  const handleReleaseFunds = useCallback(() => {
    persistContractStatus(
      'Completed',
      'Funds released',
      'The contract was marked as Completed and the change was saved.',
    );
  }, [persistContractStatus]);

  /**
   * Persists the confirmed dispute action as a disputed contract.
   *
   * Transition: Active → Disputed
   * Allowed by the ALLOWED_TRANSITIONS table; enforced inside
   * {@link persistContractStatus} before any repository write.
   */
  const handleDispute = useCallback(() => {
    persistContractStatus(
      'Disputed',
      'Dispute opened',
      'The contract was marked as Disputed and the change was saved.',
    );
  }, [persistContractStatus]);

  const handleViewSummary = () => {
    // Replace with summary navigation.
  };

  /**
   * Optimistically applies a milestone field patch to the local state, then
   * persists the change to the repository.
   *
   * Invariants:
   *  - Mutations are rejected when offline to prevent divergence.
   *  - Mutations are rejected when serving stale cached data.
   *  - On persistence failure the original milestone list is restored from
   *    `milestonesRef` (the snapshot taken before the optimistic update).
   *
   * @param milestoneId - The id of the milestone to patch.
   * @param patch - Partial milestone fields to merge onto the existing record.
   * @returns `true` when the persistence succeeds; `false` on failure.
   */
  const handleUpdateMilestone = useCallback((milestoneId: string, patch: Partial<Milestone>) => {
    // Guard 1: offline
    if (!isOnline) {
      showError({
        title: 'Cannot update milestone while offline',
        description: 'Please connect to the internet to make changes to milestones.',
      });
      return false;
    }

    // Guard 2: stale cached data
    if (isUsingCachedData && isDataStale) {
      showError({
        title: 'Cannot update stale data',
        description: 'Please refresh the page to load the latest data before making changes.',
      });
      return false;
    }

    // Capture the current list before the optimistic update for rollback
    const snapshot = milestonesRef.current;

    // Apply the optimistic update synchronously so the UI responds immediately
    setMilestones((current) =>
      current.map((item) => (item.id === milestoneId ? { ...item, ...patch } : item)),
    );

    // Persist to the repository
    const persisted = updateMilestone(milestoneId, patch);

    if (!persisted) {
      // Roll back to the pre-mutation snapshot
      setMilestones(snapshot);
      return false;
    }

    return true;
  }, [isOnline, isUsingCachedData, isDataStale, showError]);

  const status = contractData?.status || 'Active';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {contractData ? <ContractStatusAnnouncer status={contractData.status} /> : null}
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* Offline/stale data indicator */}
        <OfflineIndicator isStale={isDataStale} cachedAt={cachedAt} />

        <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <Breadcrumbs
              items={[
                { label: 'Dashboard', href: '/' },
                { label: 'Contracts', href: '/contracts' },
                { label: `#${id}` },
              ]}
            />
            <div className="flex items-center gap-3">
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Contract #{id}</h1>
              <button
                onClick={() => copy(id)}
                className="mt-2 flex-shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                aria-label={copied ? 'Contract ID copied' : 'Copy contract ID to clipboard'}
                title={copied ? 'Contract ID copied' : 'Copy contract ID'}
              >
                {copied ? (
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <Link
            href="/contracts"
            className="inline-flex items-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400"
          >
            Back to contracts
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
          <div className="space-y-6">
            <SafeBoundary>
              {isLoading ? (
                <ContractSummarySkeleton />
              ) : contractData ? (
                <ContractSummary
                  contractName={contractData.name}
                  parties={contractData.parties}
                  totalValue={contractData.totalValue}
                  currency={contractData.currency}
                  status={contractData.status}
                  createdAt={contractData.createdAt}
                  updatedAt={contractData.updatedAt}
                  milestoneCount={milestones.length}
                />
              ) : null}
            </SafeBoundary>

            <SafeBoundary>
              {isLoading ? (
                <ContractProgressSkeleton />
              ) : contractData ? (
                <ContractProgress milestones={milestones} />
              ) : null}
            </SafeBoundary>

            <SafeBoundary>
              {isLoading ? (
                <MilestonesListSkeleton />
              ) : contractData ? (
                <MilestonesList
                  milestones={milestones}
                  contractCurrency={contractData.currency}
                  onUpdateMilestone={handleUpdateMilestone}
                />
              ) : null}
            </SafeBoundary>
          </div>

          <div className="space-y-6">
            <ActionPanel
              status={status}
              onSubmitMilestone={handleSubmitMilestone}
              onReleaseFunds={handleReleaseFunds}
              onDispute={handleDispute}
              onViewSummary={handleViewSummary}
              isLoading={isLoading || isPersistingStatus}
              errorMessage={errorMessage || undefined}
              disputeFlow="confirm"
              disableMutations={!isOnline || (isUsingCachedData && isDataStale)}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

// ---------------------------------------------------------------------------
// Route entry point
// ---------------------------------------------------------------------------

/**
 * Contract detail page.
 *
 * Entry-point invariants:
 *  1. The `id` route parameter is validated by {@link isValidContractId}
 *     before any data fetching. Invalid ids call `notFound()` deterministically,
 *     never reaching the data layer.
 *  2. The validated `id` is passed to `ContractDetailPageContent` as a plain
 *     string — callers cannot supply an arbitrary object or null.
 *
 * @param params - A promise resolving to the Next.js dynamic route params.
 */
const ContractDetailPage = ({ params }: ContractDetailPageProps) => {
  const { id } = use(params);

  if (!isValidContractId(id)) {
    notFound();
  }

  return <ContractDetailPageContent id={id} />;
};

export default ContractDetailPage;
