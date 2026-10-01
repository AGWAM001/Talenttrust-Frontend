/**
 * @file validateContractStatusTransition.ts
 *
 * Pure status-transition boundary for contract lifecycle changes initiated
 * from the contract detail page (`src/app/contracts/[id]/page.tsx`).
 *
 * The ActionPanel already restricts which buttons are *visible* per status,
 * but visibility is a UI affordance, not a validation boundary. This module
 * is the single source of truth for which transitions are valid so that
 * programmatic or double-submitted calls are rejected deterministically
 * instead of silently producing inconsistent state (e.g. releasing funds on
 * an already-completed contract, or re-disputing a completed contract).
 *
 * The module is intentionally pure and side-effect-free: no React, no
 * storage, no network. It can be unit-tested exhaustively and reused by any
 * future surface (bulk actions, API adapters) that mutates contract status.
 */

import type { ContractData } from './contractResolver';

/** Canonical contract lifecycle statuses (subset carried by `ContractData`). */
export type ContractStatus = ContractData['status'];

/**
 * Allowed contract status transitions.
 *
 * Invariants encoded here:
 * - `Active` and `Pending` are work-in-progress states; they may be released
 *   (→ `Completed`) or disputed (→ `Disputed`).
 * - `Completed` and `Disputed` are terminal states. No further lifecycle
 *   transition is permitted from either — money movement and dispute flows
 *   must not run twice.
 */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<ContractStatus, readonly ContractStatus[]>
> = {
  Active: ['Completed', 'Disputed'],
  Pending: ['Completed', 'Disputed'],
  Completed: [],
  Disputed: [],
};

/** Every lifecycle status accepted by this validator (terminal ones included). */
export const ALL_CONTRACT_STATUSES: readonly ContractStatus[] = [
  'Active',
  'Pending',
  'Completed',
  'Disputed',
];

/**
 * Returns `true` when moving a contract from `from` to `to` is allowed.
 *
 * Unknown statuses (defensive: data from cache or storage may be stale or
 * hand-edited) never permit a transition.
 *
 * @param from - The contract's current status.
 * @param to - The status a caller wants to transition to.
 */
export function isStatusTransitionAllowed(
  from: ContractStatus,
  to: ContractStatus,
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Result returned by {@link validateStatusTransition}.
 *
 * - `ok: true` — the transition is valid and may be applied.
 * - `ok: false` — the transition is rejected; `reason` names the invariant
 *   that failed so callers can surface a specific, actionable message
 *   without exposing internal details.
 */
export type StatusTransitionResult =
  | { ok: true; from: ContractStatus; to: ContractStatus }
  | { ok: false; reason: 'unknown-current-status' | 'unknown-next-status' | 'transition-not-allowed'; message: string };

/**
 * Validates a contract status transition against the lifecycle invariants.
 *
 * Validation order is **unknown current status → unknown next status →
 * transition allowed**, so the most fundamental rejection is reported first.
 *
 * @param currentStatus - The contract's status at the time of the request.
 * @param nextStatus - The status the caller wants to persist.
 * @returns A {@link StatusTransitionResult}; `ok: false` carries a
 *          user-safe message suitable for display in the ActionPanel
 *          error banner and toasts.
 *
 * @example
 * ```ts
 * validateStatusTransition('Active', 'Completed');
 * // { ok: true, from: 'Active', to: 'Completed' }
 *
 * validateStatusTransition('Completed', 'Disputed');
 * // { ok: false, reason: 'transition-not-allowed', message: '...' }
 * ```
 */
export function validateStatusTransition(
  currentStatus: unknown,
  nextStatus: unknown,
): StatusTransitionResult {
  const isKnownStatus = (value: unknown): value is ContractStatus =>
    typeof value === 'string' &&
    (ALL_CONTRACT_STATUSES as readonly string[]).includes(value);

  if (!isKnownStatus(currentStatus)) {
    return {
      ok: false,
      reason: 'unknown-current-status',
      message:
        'The contract status is unknown. Please reload the page before making changes.',
    };
  }

  if (!isKnownStatus(nextStatus)) {
    return {
      ok: false,
      reason: 'unknown-next-status',
      message: 'The requested contract status is not valid.',
    };
  }

  if (!isStatusTransitionAllowed(currentStatus, nextStatus)) {
    return {
      ok: false,
      reason: 'transition-not-allowed',
      message:
        currentStatus === nextStatus
          ? `The contract is already ${currentStatus}. No change is needed.`
          : `A ${currentStatus.toLowerCase()} contract cannot be changed to ${nextStatus}. Please reload the page to see its current status.`,
    };
  }

  return { ok: true, from: currentStatus, to: nextStatus };
}
