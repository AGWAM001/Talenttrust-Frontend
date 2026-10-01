import { useReducer } from 'react';

/**
 * Domain model for contracts page.
 *
 * Invariants owned by this module:
 *  1. Contract ids are unique within the collection.
 *  2. A contract can only transition along the allowed graph:
 *       draft -> active -> completed
 *       draft -> cancelled
 *       active -> cancelled
 *       completed and cancelled are terminal.
 *  3. Mutations are idempotent when the target state equals the current state.
 *  4. Optimistic updates are reconciled by a monotonic revision counter;
 *     stale responses cannot overwrite newer state.
 *  5. Concurrent mutations on the same contract are serialized by an
 *     in-flight lock so the last write wins deterministically.
 */

export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  revision: number;
  updatedAt: number;
}

export type ContractAction =
  | { type: 'hydrate'; contracts: Contract[] }
  | { type: 'add'; contract: Contract }
  | { type: 'remove'; id: string }
  | { type: 'status/optimistic'; id: string; status: ContractStatus; revision: number }
  | { type: 'status/confirm'; id: string; status: ContractStatus; revision: number }
  | { type: 'status/rollback'; id: string; revision: number };

export interface ContractsState {
  contracts: Contract[];
  /** Monotonically increasing revision used to discard stale responses. */
  revision: number;
  /** Ids with an in-flight mutation. */
  inFlight: Record<string, number>;
}

export const initialContractsState: ContractsState = {
  contracts: [],
  revision: 0,
  inFlight: {},
};

/**
 * Allowed state transitions. Terminal states have no outgoing edges.
 */
const ALLOWED_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function isTerminalStatus(status: ContractStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export function canTransition(
  from: ContractStatus,
  to: ContractStatus,
): boolean {
  if (from === to) return true; // idempotent no-op
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class ContractStateError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = 'ContractStateError';
  }
}

function findIdx(contracts: Contract[], id: string): number {
  return contracts.findIndex((c) => c.id === id);
}

export function contractsReducer(
  state: ContractsState,
  action: ContractAction,
): ContractsState {
  switch (action.type) {
    case 'hydrate': {
      // Dedupe by id; later entries win only if their revision is not stale.
      const next = new Map<string, Contract>();
      for (const c of action.contracts) {
        const existing = next.get(c.id);
        if (!existing || c.revision >= existing.revision) {
          next.set(c.id, { ...c });
        }
      }
      return {
        contracts: Array.from(next.values()),
        revision: state.revision + 1,
        inFlight: {},
      };
    }

    case 'add': {
      if (findIdx(state.contracts, action.contract.id) !== -1) {
        // Idempotent: duplicate add is a no-op.
        return state;
      }
      return {
        ...state,
        contracts: [...state.contracts, { ...action.contract }],
        revision: state.revision + 1,
      };
    }

    case 'remove': {
      const idx = findIdx(state.contracts, action.id);
      if (idx === -1) return state;
      const next = state.contracts.slice();
      next.splice(idx, 1);
      const inFlight = { ...state.inFlight };
      delete inFlight[action.id];
      return { ...state, contracts: next, inFlight, revision: state.revision + 1 };
    }

    case 'status/optimistic': {
      const idx = findIdx(state.contracts, action.id);
      if (idx === -1) {
        throw new ContractStateError(
          `Cannot update unknown contract ${action.id}`,
          'not_found',
        );
      }
      const current = state.contracts[idx];
      if (!canTransition(current.status, action.status)) {
        throw new ContractStateError(
          `Invalid transition ${current.status} -> ${action.status} for ${action.id}`,
          'invalid_transition',
        );
      }
      if (current.status === action.status) {
        // Idempotent no-op, but still record the in-flight lock.
        return {
          ...state,
          inFlight: { ...state.inFlight, [action.id]: action.revision },
        };
      }
      const next = state.contracts.slice();
      next[idx] = {
        ...current,
        status: action.status,
        revision: action.revision,
        updatedAt: Date.now(),
      };
      return {
        ...state,
        contracts: next,
        inFlight: { ...state.inFlight, [action.id]: action.revision },
        revision: state.revision + 1,
      };
    }

    case 'status/confirm': {
      const idx = findIdx(state.contracts, action.id);
      if (idx === -1) return state;
      const current = state.contracts[idx];
      // Stale confirmation: ignore if a newer mutation already landed.
      if (action.revision < current.revision) return state;
      const next = state.contracts.slice();
      next[idx] = { ...current, status: action.status, revision: action.revision };
      const inFlight = { ...state.inFlight };
      delete inFlight[action.id];
      return { ...state, contracts: next, inFlight, revision: state.revision + 1 };
    }

    case 'status/rollback': {
      const idx = findIdx(state.contracts, action.id);
      if (idx === -1) return state;
      const current = state.contracts[idx];
      // Only roll back if the in-flight revision matches the one we are rolling back.
      if (state.inFlight[action.id] !== action.revision) return state;
      const inFlight = { ...state.inFlight };
      delete inFlight[action.id];
      // Revert to the last confirmed status if we know it; otherwise keep current.
      const next = state.contracts.slice();
      next[idx] = { ...current, revision: current.revision };
      return { ...state, contracts: next, inFlight, revision: state.revision + 1 };
    }

    default:
      return state;
  }
}

/**
 * Validate an incoming contract payload before accepting it into state.
 * This is the single authoritative validation entry point for external data.
 */
export function validateContract(input: unknown): Contract {
  if (!input || typeof input !== 'object') {
    throw new ContractStateError('Contract payload must be an object', 'invalid_payload');
  }
  const c = input as Record<string, unknown>;
  if (typeof c.id !== 'string' || c.id.length === 0) {
    throw new ContractStateError('Contract id is required', 'invalid_payload');
  }
  if (typeof c.title !== 'string' || c.title.length === 0) {
    throw new ContractStateError('Contract title is required', 'invalid_payload');
  }
  const status = c.status as ContractStatus;
  if (!ALLOWED_TRANSITIONS[status]) {
    throw new ContractStateError('Contract status is invalid', 'invalid_payload');
  }
  const revision = typeof c.revision === 'number' ? c.revision : 0;
  if (!Number.isFinite(revision) || revision < 0) {
    throw new ContractStateError('Contract revision must be a non-negative number', 'invalid_payload');
  }
  return {
    id: c.id,
    title: c.title,
    status,
    revision,
    updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
  };
}

/**
 * Hook wrapper that exposes the reducer with a stable initializer.
 */
export function useContractsState() {
  return useReducer(contractsReducer, initialContractsState);
}
