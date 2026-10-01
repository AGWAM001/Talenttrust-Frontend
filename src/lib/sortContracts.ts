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
 *
 * ## Invariants owned by this module
 *
 * 1. **Purity** — neither `sortContracts` nor `compareContracts` mutates
 *    its inputs. `sortContracts` always returns a new array.
 * 2. **Total order*** — for any fixed `sortOrder`, `compareContracts` is a
 *    total ordering over the input set: reflexive, anti-symmetric, transitive,
 *    and total (any two distinct contracts compare non-zero). This is
 *    guaranteed by the final `id` tie-break, which is a complete discriminator
 *    for the domain identity.
 * 3. **Determinism** — the output depends only on the contents of the input
 *    array and the `sortOrder`, not on the incoming order.
 * 4. **Totality** — comparisons never throw. Malformed or missing data
 *    (unparsable `createdAt`, non-finite `totalValue`) is coerced to a
 *    deterministic extreme rather than propagating `NaN` into the sort.
 * 5. **Stable identity of equal elements** — contracts that tie on the
 *    primary key are ordered by `id`, so duplicate `ids cannot scatter.
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

/** Toolbar option list, in the order the `<select>` lenders them. */
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

/**
 * Normalizes a contract's `totalValue` to a finite, comparable number.
 *
 * `totalValue` is expected to be a finite number, but defensively coerces
 * `NaN`, `Infinity`, and non-numeric values to `NEGATIVE_INFINITY`. Without this,
 * a single `NaN` value would make every comparison return `NaN`, which `Array.sort`
 * treats as `0` and which breaks transitivity -- producing orders that depend on
 * the incoming array order. Coercing keeps the ordering total and deterministic.
 */
const normalizeTotalValue = (contract: Contract): number => {
  const value = contract.totalValue;
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.NEGATIVE_INFINITY;
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
 *
 * The return value is always a finite number in `{-1, 0, 1}` for the `id`
 * tie-break, and never `NaN`. This is what makes the ordering a total order.
 */
export const compareContracts = (
  a: Contract,
  b: Contract,
  sortOrder: ContractSortOrder,
): number => {
  if (sortOrder === 'value-desc' || sortOrder === 'value-asc') {
    const diff = normalizeTotalValue(a) - normalizeTotalValue(b);
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
 *
 * Repeated invocations with the same input (or with the same multiset of contracts
 * in a different order) always produce the same output, so concurrent or retried
 * sorts cannot observe an intermediate or inconsistent state.
 */
export const sortContracts = (
  contracts: readonly Contract[],
  sortOrder: ContractSortOrder = DEFAULT_CONTRACT_SORT_ORDER,
): Contract[] =>
  [...contracts].sort((a, b) => compareContracts(a, b, sortOrder));
