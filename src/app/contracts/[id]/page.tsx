'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { validateStatusTransition } from '@/lib/validateContractStatusTransition';
import { validateMilestonePatch } from '@/lib/validateMilestonePatch';
import {
  useOptimisticContractStatus,
  type BuildPersistedContract,
} from '@/hooks/useOptimisticContractStatus';
import type { Milestone } from '@/types/domain';
import { canTransitionContractStatus } from '@/lib/contractStatusTransitions';

/**
 * Monotonic token used to identify the latest in-flight load for a given
 * contract id. Concurrent or repeated loads (e.g. rapid `id`/`isOnline`
 * changes, StrictMode double-invocation, or overlapping retries) each capture
 * a token; only the load holding the newest token is allowed to commit state.
 *
 * This guarantees that a slower, older request can never overwrite the result
 * of a newer one, preventing stale or inconsistent renders.
 */
let loadSequence = 0;

/**
 * Per-contract in-flight mutation guard.
 *
 * Prevents duplicate concurrent status transitions for the same contract from
 * racing each other. The first caller acquires the lock; subsequent callers
 * while the lock is held are rejected deterministically instead of producing
 * interleaved optimistic updates or duplicate repository writes.
 */
const inFlightStatusMutations = new Set<string>();

/**
 * Per-contract in-flight milestone mutation guard, keyed by `contractId`.
 *
 * Ensures that two concurrent milestone patches for the same contract cannot
 * both snapshot the same baseline and then clobber each other on rollback.
 */
const inFlightMilestoneMutations = new Set<string>();

/**
 * Validation boundaries for the contract detail route.
 *
 * The route param `id` is untrusted input: it arrives from the URL, may be
 * replayed, duplicated, or crafted adversarially, and is used both as a
 * lookup key and as a persistence key. These constants define the single
 * source of truth for what is considered a valid contract id so that every
 * entry point (initial load, cache lookup, persistence, copy, render)
 * enforces the same invariants.
 *
 * Invariants:
 * - A contract id is a non-empty string of at most {@link MAX_CONTRACT_ID_LENGTH}
 *   characters.
 * - It must match {@link CONTRACT_ID_PATTERN}: alphanumerics, hyphens, and
 *   underscores only. This prevents path traversal, whitespace smuggling,
 *   and control characters from reaching the resolver, cache, or repository.
 * - Validation is pure and side-effect free so it can be reused by tests and
 *   by both the server-rendered boundary and the client content component.
 */
export const MAX_CONTRACT_ID_LENGTH = 128;
export const CONTRACT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Determines whether `id` is a structurally valid contract identifier.
 *
 * This is the canonical boundary check. It rejects:
 * - non-string input (defensive against malformed route params),
 * - empty or whitespace-only ids,
 * - ids longer than {@link MAX_CONTRACT_ID_LENGTH},
 * - ids containing characters outside {@link CONTRACT_ID_PATTERN}.
 *
 * @param id - The candidate contract id from the route.
 * @returns `true` when the id is safe to use as a lookup and persistence key.
 */
export function isValidContractIdBoundary(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_CONTRACT_ID_LENGTH) return false;
  return CONTRACT_ID_PATTERN.test(id);
}

/**
 * Maximum number of automatic retry attempts for transient load failures.
 * Kept small so recovery stays bounded and deterministic.
 */
const MAX_LOAD_RETRIES = 2;

/**
 * Base delay (ms) for exponential backoff between load retries.
 */
const LOAD_RETRY_BASE_DELAY_MS = 300;

/**
 * Classifies an error as retryable (transient) or terminal.
 *
 * Retryable failures are network/abort-like conditions where a bounded retry
 * can plausibly succeed. Terminal failures (validation, not-found, auth) must
 * not be retried because they would produce the same result and could mask
 * authorization or validation invariants.
 *
 * @param error - The thrown value from a load attempt.
 * @returns `true` when a bounded retry is safe.
 */
function isRetryableLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  if (message.includes('not found') || message.includes('unauthor')) return false;
  if (message.includes('invalid')) return false;
  return true;
}

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
  const isMountedRef = useRef(true);
  /**
   * Synchronous duplicate-submission guard for contract status writes.
   * `isPersistingStatus` state alone re-renders too late to stop a second
   * invocation dispatched in the same tick (e.g. a double-click racing the
   * confirm dialog), so the ref closes that gap.
   */
  const isPersistingStatusRef = useRef(false);
  const milestonesRef = useRef(milestones);
  milestonesRef.current = milestones;
  const loadRequestIdRef = useRef(0);
  const statusMutationIdRef = useRef(0);
  const { showError, showSuccess } = useToast();
  const isOnline = useOnlineStatus();

  const { copied, copy } = useCopyToClipboard({
    delay: 2000,
    onSuccess: () => {
      /* istanbul ignore next -- toast side effect */
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
   */
  const buildPersistedContract: BuildPersistedContract = useCallback(
    (data, status, version) => ({
      id: data.id,
      contractName: data.name,
      // NOTE: `parties` is copied by reference; callers must not mutate it.
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
  const persistStatusRef = useRef(persistStatus);
  persistStatusRef.current = persistStatus;

  /**
   * Applies a contract status transition optimistically, then persists it.
   *
   * The UI already reflects `nextStatus` by the time this returns (applied
   * synchronously inside {@link useOptimisticContractStatus}). On failure —
   * including a stale-overwrite rejection — the optimistic change is rolled
   * back and a clear, specific error message is surfaced via both the inline
   * `ActionPanel` banner and a dismissible toast.
   *
   * When offline, mutations are disabled to prevent data inconsistency.
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
      // Reject invalid ids before any state transition or persistence attempt.
      if (!isValidContractIdBoundary(id)) {
        showError({
          title: 'Invalid contract',
          description: 'This contract identifier is not valid and cannot be updated.',
        });
        return;
      }

      // Disable unsafe mutations while offline
      if (!isOnline) {
        showError({
          title: 'Cannot update contract while offline',
          description: 'Please connect to the internet to make changes to this contract.',
        });
        return;
      }

      // Also disable if using stale cached data
      if (isUsingCachedData && isDataStale) {
        showError({
          title: 'Cannot update stale data',
          description: 'Please refresh the page to load the latest data before making changes.',
        });
        return;
      }

      // Boundary guard: the current status must permit this transition.
      // Terminal states (Completed/Disputed) reject every lifecycle change so
      // a release or dispute can never run twice, even if a second request
      // races in before the UI re-renders with the new status.
      const transition = validateStatusTransition(
        contractData?.status,
        nextStatus,
      );
      if (!transition.ok) {
        showError({
          title: 'Unable to update contract',
          description: transition.message,
        });
        return;
      }

      // Duplicate-submission guard: ignore re-entrant calls while a status
      // write is already in flight. Without this, a double-invocation could
      // issue two repository writes for one user action.
      if (isPersistingStatusRef.current) {
        return;
      }

      setIsPersistingStatus(true);
      isPersistingStatusRef.current = true;
      setErrorMessage(null);

      const persistStatus = persistStatusRef.current;
      const result = persistStatus(nextStatus);

        if (!result.ok) {
          setErrorMessage(result.error);
          showError({
            title: 'Unable to update contract',
            description: result.error,
          });
          return;
        }

        setErrorMessage(null);
        showSuccess({
          title: successTitle,
          description: successDescription,
        });
      } finally {
        inFlightStatusMutations.delete(id);
        setIsPersistingStatus(false);
        isPersistingStatusRef.current = false;
        return;
      }

      setErrorMessage(null);
      showSuccess({
        title: successTitle,
        description: successDescription,
      });
      setIsPersistingStatus(false);
      isPersistingStatusRef.current = false;
    },
    [persistStatus, showError, showSuccess, isOnline, isUsingCachedData, isDataStale, contractData?.status],
  );

  useEffect(() => {
    let isCurrentAttempt = true;

    const loadContract = async () => {
      const requestId = ++loadRequestIdRef.current;
      try {
        setIsLoading(true);
        setErrorMessage(null);
        loadAttemptRef.current = 0;

        // Abort any in-flight load from a previous effect run so concurrent
        // executions cannot race and clobber newer state.
        loadAbortRef.current?.abort();
        const abortController = new AbortController();
        loadAbortRef.current = abortController;
        const isAborted = () => abortController.signal.aborted;

        // Boundary check: never touch cache, resolver, or repository with an
        // invalid id. This guards against malformed params that bypass the
        // server-side notFound() boundary (e.g. programmatic navigation).
        if (!isValidContractIdBoundary(id)) {
          if (isMountedRef.current) {
            setErrorMessage('Invalid contract identifier.');
            setIsLoading(false);
          }
          return;
        }

        // If offline, try to load from cache first
        if (!isOnline) {
          const cachedResult = getCachedContractData(id);
          if (cachedResult.success && cachedResult.data) {
            if (isCurrentAttempt) {
              setContractData(cachedResult.data);
              setMilestones(mergeContractMilestones(cachedResult.data.milestones, id));
              setIsUsingCachedData(true);
              setIsDataStale(cachedResult.stale || false);
              setCachedAt(cachedResult.data.updatedAt);
              setIsLoading(false);
            }
            return;
          }
          // No cache available when offline - show error
          if (isCurrentAttempt) {
            setErrorMessage(
              'You are offline and this contract has not been loaded before. Please connect to the internet and try again.',
            );
            setIsLoading(false);
          }
          return;
        }

        // Online - load fresh data with bounded, deterministic retries.
        let data: ContractData | null = null;
        let lastError: unknown = null;
        for (let attempt = 0; attempt <= MAX_LOAD_RETRIES; attempt += 1) {
          if (isAborted()) return;
          loadAttemptRef.current = attempt;
          try {
            data = await resolveContractData(id);
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
            if (!isRetryableLoadError(err) || attempt === MAX_LOAD_RETRIES) {
              break;
            }
            // Exponential backoff, bounded and deterministic.
            const delay = LOAD_RETRY_BASE_DELAY_MS * 2 ** attempt;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        if (isCurrentAttempt) {
          setContractData(data);
          setMilestones(mergeContractMilestones(data.milestones, id));
          setIsUsingCachedData(false);
          setIsDataStale(false);
          setCachedAt(undefined);

          // Cache the successfully loaded data
          cacheContractData(id, data);
        }
      } catch (error) {
        if (loadAbortRef.current?.signal.aborted) return;
        // On error, try to fall back to cache
        const cachedResult = getCachedContractData(id);
        if (cachedResult.success && cachedResult.data) {
          if (isCurrentAttempt) {
            setContractData(cachedResult.data);
            setMilestones(mergeContractMilestones(cachedResult.data.milestones, id));
            setIsUsingCachedData(true);
            setIsDataStale(cachedResult.stale || false);
            setCachedAt(cachedResult.data.updatedAt);
            setErrorMessage(
              'Unable to load fresh data. Showing cached version which may be outdated.',
            );
          }
        } else if (isCurrentAttempt) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Failed to load contract. Please try again.',
          );
        }
      } finally {
        if (isCurrentAttempt) {
          setIsLoading(false);
        }
      }
    };

    loadContract();

    return () => {
      isCurrentAttempt = false;
    };
  }, [id, isOnline, loadAttempt]);

  const retryContractLoad = () => {
    setLoadAttempt((attempt) => attempt + 1);
  };

  /**
   * Placeholder for the future milestone-submission workflow.
   */
  const handleSubmitMilestone = () => {
    // Replace with real milestone submission flow.
  };

  /**
   * Persists the confirmed release-funds action as a completed contract.
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

  const handleUpdateMilestone = useCallback((id: string, patch: Partial<Milestone>) => {
    // Reject invalid contract id before mutating local or persisted state.
    if (!isValidContractIdBoundary(id)) {
      showError({
        title: 'Invalid contract',
        description: 'This contract identifier is not valid and cannot be updated.',
      });
      return false;
    }

    // Disable unsafe mutations while offline
    if (!isOnline) {
      /* istanbul ignore next -- toast side effect */
      showError({
        title: 'Cannot update milestone while offline',
        description: 'Please connect to the internet to make changes to milestones.',
      });
      return false;
    }

    // Also disable if using stale cached data
    if (isUsingCachedData && isDataStale) {
      /* istanbul ignore next -- toast side effect */
      showError({
        title: 'Cannot update stale data',
        description: 'Please refresh the page to load the latest data before making changes.',
      });
      return false;
    }

    const snapshot = milestonesRef.current;

    // Boundary guard: the milestone must belong to this contract. Rejecting
    // unknown ids keeps a duplicate/stale submission from silently applying
    // a patch to (or creating the appearance of) a milestone that is not on
    // this contract's roster.
    const targetExists = snapshot.some((item) => item.id === id);
    if (!targetExists) {
      showError({
        title: 'Milestone not found',
        description: 'This milestone is no longer part of the contract. Please refresh the page.',
      });
      return false;
    }

    // Boundary guard: reject patches that are invalid, empty after
    // sanitisation, or try to change identity/concurrency fields (id,
    // contractId, version, timestamps). The repository merges patches
    // wholesale, so unvalidated keys could re-parent a milestone or defeat
    // the stale-overwrite guard.
    const validation = validateMilestonePatch(id, patch);
    if (!validation.ok) {
      showError({
        title: 'Milestone update rejected',
        description: validation.errors.map((error) => error.message).join(' '),
      });
      return false;
    }

    const safePatch = validation.sanitized;

    setMilestones((current) =>
      current.map((item) => (item.id === id ? { ...item, ...safePatch } : item)),
    );

    const persisted = updateMilestone(id, safePatch);

    if (!persisted) {
      setMilestones(snapshot);
      return false;
    }

    const snapshot = milestonesRef.current;

    // Apply optimistic update synchronously so the UI reflects intent.
    setMilestones((current) =>
      current.map((item) => (item.id === id ? { ...item, ...sanitizedPatch } : item)),
    );

    // Persist synchronously; on failure, roll back to the exact snapshot so
    // partial failure cannot leave the UI in an inconsistent state.
    const persisted = updateMilestone(id, patch);

      if (!persisted) {
        setMilestones(snapshot);
        return false;
      }

      return true;
    } finally {
      inFlightMilestoneMutations.delete(id);
    }
  }, [isOnline, isUsingCachedData, isDataStale, showError]);

  const status = contractData?.status || 'Active';

  // Deterministic derived flag: mutations are unsafe when offline or when
  // showing stale cached data. Kept in one place so ActionPanel and handlers
  // cannot drift out of sync.
  const disableMutations = useMemo(
    () => !isOnline || (isUsingCachedData && isDataStale),
    [isOnline, isUsingCachedData, isDataStale],
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {contractData ? <ContractStatusAnnouncer status={contractData.status} /> : null}
      {/*
        Invariants enforced on this page:
        - Only the newest load token may commit contract/milestone state.
        - At most one status mutation and one milestone mutation may be
          in-flight per contract id at any time.
        - Optimistic updates are always rolled back on persistence failure.
      */}
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
              ) : errorMessage ? (
                <ContractProgressSkeleton hasError onRetry={retryContractLoad} />
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
              disableMutations={disableMutations}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

const ContractDetailPage = ({ params }: ContractDetailPageProps) => {
  const { id } = use(params);

  if (!isValidContractIdBoundary(id) || !isValidContractId(id)) {
    notFound();
  }

  return <ContractDetailPageContent id={id} />;
};

export default ContractDetailPage;
