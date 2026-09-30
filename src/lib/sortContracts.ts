/**
 * @file sortContracts.ts
 *
 * Pure, deterministic ordering helpers for the Contracts list toolbar.
 *
 * The list is sorted entirely on the client, on top of whatever the active
 * search/filter has already narrowed the collection down to. Every ordering
 * ends with a tie-break on `id`, so contracts that compare equal on the
 * primary key (identical `createdAt` timestamps, identical values) always
 * come back in the same order regardless of the input order.
 */

import type { Contract } from '@/types/domain';

/** Ordering options offered by the Contracts list toolbar. */
export type ContractSortOrder =
  | 'date-desc'
  | 'date-asc'
  | 'value-desc'
  | 'value-asc';

/** The default ordering: most recently created contracts first. */
export const DEFAULT_CONTRACT_SORT_ORDER: ContractSortOrder = 'date-desc';

/** Toolbar option list, in the order the `<select>` renders them. */
export const CONTRACT_SORT_OPTIONS: ReadonlyArray<{
  value: ContractSortOrder;
  label: string;
}> = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'value-desc', label: 'Value (High to Low)' },
  { value: 'value-asc', label: 'Value (Low to High)' },
];

const SORT_ORDER_VALUES = new Set<string>(
  CONTRACT_SORT_OPTIONS.map((option) => option.value),
);

/** Narrows an arbitrary string (e.g. a `<select>` value) to a sort order. */
export const isContractSortOrder = (value: unknown): value is ContractSortOrder =>
  typeof value === 'string' && SORT_ORDER_VALUES.has(value);

/**
 * Coerces an arbitrary value to a sort order, falling back to the default
 * when it is not one of the supported options.
 */
export const toContractSortOrder = (value: unknown): ContractSortOrder =>
  isContractSortOrder(value) ? value : DEFAULT_CONTRACT_SORT_ORDER;

/**
 * Parses a contract's `createdAt` string to a comparable timestamp.
 *
 * `createdAt` is a display string (`"Jan 1, 2025"`, an ISO date, …) so it can
 * fail to parse. Unparsable dates are treated as the oldest possible value in
 * ascending order — combined with the `id` tie-break this keeps them grouped
 * deterministically at one end of the list instead of scattering them.
 */
const parseCreatedAt = (contract: Contract): number => {
  const time = Date.parse(contract.createdAt);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
};

/** Locale-independent, stable comparison of two contract ids. */
const compareIds = (a: Contract, b: Contract): number => {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
};

/**
 * Compares two contracts under the given ordering.
 *
 * Exported for reuse by callers that need to merge this ordering into a
 * larger comparison (and to keep the tie-break rule testable in isolation).
 */
export const compareContracts = (
  a: Contract,
  b: Contract,
  sortOrder: ContractSortOrder,
): number => {
  if (sortOrder === 'value-desc' || sortOrder === 'value-asc') {
    const diff = a.totalValue - b.totalValue;
    if (diff !== 0) {
      return sortOrder === 'value-desc' ? -diff : diff;
    }
  } else {
    const diff = parseCreatedAt(a) - parseCreatedAt(b);
    // `Infinity - Infinity` is NaN, so guard: two unparsable dates are equal.
    if (diff !== 0 && !Number.isNaN(diff)) {
      return sortOrder === 'date-desc' ? -diff : diff;
    }
  }

  return compareIds(a, b);
};

/**
 * Returns a new array of contracts ordered by `sortOrder`.
 *
 * The input array is never mutated. Contracts that tie on the primary key are
 * ordered by `id`, so the result is fully determined by the contents of the
 * list rather than by its incoming order.
 */
export const sortContracts = (
  contracts: readonly Contract[],
  sortOrder: ContractSortOrder = DEFAULT_CONTRACT_SORT_ORDER,
): Contract[] =>
  [...contracts].sort((a, b) => compareContracts(a, b, sortOrder));
