'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Contract, ContractStatus, Milestone } from '@types/domain';
import {
  applyContractStatusTransition,
  canNTransitionContractStatus,
  mergeContractMilestones,
  normalizeContractId,
} from '@/lib/contracts';

export type ContractLoadState = 'loading' | 'ready' | 'not-found' | 'error';

export interface UseContractResult {
  state: ContractLoadState;
  contract: Contract | null;
  milestones: Milestone[];
  error: Error | null;
  canTransition: (to: ContractStatus) => boolean;
  transitionStatus: (to: ContractStatus) => Promise<void>;
  reload: () => Promise<void>;
}

export interface UseContractOptions {
  /** Resolves the contract record for a given id. */
  resolveContract?: (id: string) => Promise<Contract | null>;
  /** Loads persisted milestones for a contract. */
  listMilestones?: (contractId: string) => Milestone[];
  /** Persists a status transition. Must be idempotent on conflict. */
  persistStatus?: (contract: Contract) => Promise<void>;
}

/**
 * Loads a contract and its milestones, enforcing the state invariants owned by
 * the contract detail route.
 *
 * Guarantees:
 *   - Results from stale requests are discarded (latest call wins).
 *   - Status transitions are validated against the current state before any
 *     persistence or optimistic update occurs.
 *   - Concurrent transitions are serialized so the contract cannot move to a
 *     conflicting state.
 *   - Failed persistence rolls back the optimistic update.
 */
export function useContract(
  id: string | undefined,
  options: UseContractOptions = {},
): UseContractResult {
  const { resolveContract, listMilestones, persistStatus } = options;

  const normalizedId = useMemo(() => normalizeContractId(id), [id]);

  const [state, setState] = useState<ContractLoadState>('loading');
  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Monotonic request token used to discard stale async results.
  const requestIdRef = useRef(0);
  // Serializes concurrent transition requests.
  const transitionChainRef = useRef<Promise<void>>(Promise.resolve());
  // Tracks whether the hook is still mounted.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!normalizedId) {
      setState('not-found');
      setContract(null);
      setMilestones([]);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setState('loading');
    setError(null);

    try {
      const resolved = resolveContract
        ? await resolveContract(normalizedId)
        : null;

      // Discard results from superseded requests.
      if (requestId !== requestIdRef.current || !mountedRef.current) {
        return;
      }

      if (!resolved) {
        setState('not-found');
        setContract(null);
        setMilestones([]);
        return;
      }

      const persisted = listMilestones ? listMilestones(normalizedId) : [];
      setContract(resolved);
      setMilestones(mergeContractMilestones(resolved.milestones ?? [], persisted));
      setState('ready');
    } catch (cause) {
      if (requestId !== requestIdRef.current || !mountedRef.current) {
        return;
      }
      setError(toError(cause));
      setState('error');
    }
  }, [normalizedId, resolveContract, listMilestones]);

  useEffect(() => {
    void load();
  }, [load]);

  const canTransition = useCallback(
    (to: ContractStatus) => {
      if (!contract) {
        return false;
      }
      return canNTransitionContractStatus(contract.status, to);
    },
    [contract],
  );

  const transitionStatus = useCallback(
    async (to: ContractStatus) => {
      // Serialize transitions to avoid concurrent mutations of the same
      // contract. The chain ensures the next transition observes the result
      // of the previous one.
      const next = transitionChainRef.current.then(async () => {
        const current = contract;
        if (!current) {
          throw new Error('Contract is not loaded.');
        }
        if (!canNTransitionContractStatus(current.status, to)) {
          throw new Error(
            `Transition from "${current.status}" to "${to}" is not allowed.`,
          );
        }

        const optimistic = applyContractStatusTransition(current, to);
        setContract(optimistic);

        try {
          if (persistStatus) {
            await persistStatus(optimistic);
          }
        } catch (cause) {
          // Roll back the optimistic update on failure so the UI reflects
          // the persisted state.
          if (mountedRef.current) {
            setContract(current);
          }
          throw toError(cause);
        }
      });

      // Keep the chain alive even when a transition rejects.
      transitionChainRef.current = next.catch(() => undefined);
      await next;
    },
    [contract, persistStatus],
  );

  return useMemo(
    () => ({ state, contract, milestones, error, canTransition, transitionStatus, reload: load }),
    [state, contract, milestones, error, canTransition, transitionStatus, load],
  );
}

function toError(cause: unknown): Error {
  if (cause instanceof Error) {
    return cause;
  }
  return new Error('unexpected contract load failure');
}
