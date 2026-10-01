'use client';

/**
 * UseContract
 *
 * A deterministic, concurrency-safe hook for loading a single contract by id.
 *
 * Invariants:
 * -  Only the latest request for the current id may write state (stale responses
 *    are discarded).
 * -  Repeated or concurrent calls for the same id coalesce into one network
 *    request via the shared deduper.
 * -  Unmount aborts the caller-scoped view but never corrupts the shared
 *    in-flight promise for other consumers.
 * -  Retry is idempotent: a retry always issues a fresh request and never
 *    reuses a stale result.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  Contract,
  ContractsApiError,
  fetchContract,
  FetchContractOptions,
} from '@/lib/contractsApi';

export interface UseContractResult {
  contract: Contract | null;
  isLoading: boolean;
  error: ContractsApiError | null;
  /** True when the current id is missing or malformed. */
  isInvalidId: boolean;
  /** Trigger a fresh fetch, bypassing any in-flight coalescing. */
  refresh: () => Promise<void>;
}

export interface UseContractOptions {
  /** Optional request timeout in milliseconds. */
  timeoutMs?: number;
  /** Optional base URL override (tests). */
  baseUrl?: string;
}

const isValidId = (id: unknown): boolean =>
  typeof id === 'string' && id.trim().length > 0 && /^[A-Za-z0-9_.:-]+$/.test(id);

export function useContract(
  id: string | undefined | null,
  options: UseContractOptions = {},
): UseContractResult {
  const { timeoutMs, baseUrl } = options;

  const normalizedId = typeof id === 'string' ? id.trim() : '';
  const validId = isValidId(normalizedId);

  const [state, setState] = useState<{
    contract: Contract | null;
    isLoading: boolean;
    error: ContractsApiError | null;
  }>({ contract: null, isLoading: false, error: null });

  // Monotonic token guarantees only the latest request can commit state.
  const requestTokenRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<true>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort only this caller's view; the shared in-flight request survives.
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const load = useCallback(
    async (force: boolean) => {
      if (!validId) {
        // Invalid inputs must never issue a request or leak stale state.
        requestTokenRef.current += 1;
        abortRef.current?.abort();
        abortRef.current = null;
        if (mountedRef.current) {
          setState({ contract: null, isLoading: false, error: null });
        }
        return;
      }

      const token = ++requestTokenRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (mountedRef.current) {
        setState((prev) => ({
          // Preserve the last known contract while reloading to avoid flicker.
          contract: prev.contract,
          isLoading: true,
          error: null,
        }));
      }

      const requestOptions: FetchContractOptions = {
        signal: controller.signal,
        timeoutMs,
        baseUrl,
        force,
      };

      try {
        const contract = await fetchContract(normalizedId, requestOptions);
        if (!mountedRef.current || token !== requestTokenRef.current) {
          // Stale response: discard without touching state.
          return;
        }
        setState({ contract, isLoading: false, error: null });
      } catch (error) {
        if (!mountedRef.current || token !== requestTokenRef.current) {
          return;
        }
        const apiError =
          error instanceof ContractsApiError
            ? error
            : new ContractsApiError('Unable to load contract.', 'ER_UNKNOWN');
        // Aborted requests are expected during unmount/renavigation and must not
        // surface as user-visible errors.
        if (apiError.code === 'ER_ABORTED') {
          return;
        }
        setState({ contract: null, isLoading: false, error: apiError });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [normalizedId, validId, timeoutMs, baseUrl],
  );

  useEffect(() => {
    void load(false);
    // Intentionally do not abort on dependency change here; `load` already
    // assumes ownership of the previous caller signal and bumps the token.
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return useMemo(
    () => ({
      contract: state.contract,
      isLoading: state.isLoading,
      error: state.error,
      isInvalidId: !validId,
      refresh,
    }),
    [state.contract, state.isLoading, state.error, validId, refresh],
  );
}
