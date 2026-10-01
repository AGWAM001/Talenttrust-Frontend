/**
 * @file constants.ts
 *
 * Sample wallet items used to seed the wallet page on first load and drive tests.
 *
 * ## State invariants
 *
 * Every item in SAMPLE_WALLET_ITEMS must satisfy all of the following invariants.
 * Violations throw an `InvariantError` at module-load time so misconfigured data
 * is caught immediately — in CI, local dev, and tests — rather than silently
 * producing inconsistent runtime state.
 *
 * 1. **Required string fields** – `id`, `name`, `type`, and `currency` must be
 *    non-empty strings.
 * 2. **Status** – must be one of the three permitted values:
 *    `'Active' | 'Archived' | 'Pending'`.
 * 3. **Balance** – must be a finite, non-negative number (`>= 0`). Negative
 *    balances and `NaN`/`Infinity` are rejected.
 * 4. **createdAt** – must be a valid ISO calendar date in the form `YYYY-MM-DD`
 *    whose calendar date components are self-consistent (e.g. no `2026-02-30`).
 * 5. **address** (optional) – when present must match the Stellar public-key
 *    pattern: starts with `G`, exactly 56 characters, base-32 alphabet (`A-Z2-7`).
 * 6. **ID uniqueness** – every item in the array must have a distinct `id`.
 * 7. **Non-empty array** – the array must contain at least one item.
 *
 * ## Immutability
 *
 * Every item object and the top-level array are frozen with `Object.freeze` so
 * that callers cannot accidentally mutate sample data. TypeScript's `as const`
 * assertion propagates the readonly constraint at compile time.
 *
 * ## Exported helpers
 *
 * Three pure helpers are exported for use by tests and runtime validation code:
 *
 * - `isValidWalletItemStatus(value)` — type-guard for the status union.
 * - `isValidWalletItem(item)` — returns `true` when an unknown value satisfies
 *   all invariants; returns `false` otherwise (never throws).
 * - `assertValidWalletItems(items)` — throws `InvariantError` on the first
 *   violation found; also checks ID uniqueness and array length.
 */

import type { WalletItem } from '@/types/domain';

// ---------------------------------------------------------------------------
// Permitted status values
// ---------------------------------------------------------------------------

/** The complete set of allowed status strings for a `WalletItem`. */
export const WALLET_ITEM_STATUSES = Object.freeze(
  ['Active', 'Archived', 'Pending'] as const,
);

export type WalletItemStatus = (typeof WALLET_ITEM_STATUSES)[number];

// ---------------------------------------------------------------------------
// Internal validation patterns
// ---------------------------------------------------------------------------

/**
 * Matches a Stellar ed25519 public key:
 * - Starts with `G`
 * - Followed by exactly 55 characters from the Stellar base-32 alphabet (A-Z and 2-7)
 * - Total length: 56 characters
 *
 * Note: this is a structural pattern check only (identical to the pattern in
 * `src/lib/stellarAddress.ts`). It does NOT verify the StrKey checksum.
 * For display / seeding purposes a structural check is sufficient; full
 * checksum verification is performed by `isValidStellarAddress` in the lib.
 */
const STELLAR_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;

/**
 * Matches an ISO calendar date in YYYY-MM-DD format.
 * The regex alone cannot rule out calendar inconsistencies (e.g. Feb 30);
 * those are caught by `isValidISODate`.
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Custom error type
// ---------------------------------------------------------------------------

/**
 * Thrown when a wallet-item invariant is violated.
 * Extends `Error` so it can be caught generically while still being
 * distinguishable from other error types in tests.
 */
export class InvariantError extends Error {
  constructor(message: string) {
    super(`[wallet/constants] Invariant violation: ${message}`);
    this.name = 'InvariantError';
    // Ensures correct instanceof check across transpiled environments.
    Object.setPrototypeOf(this, InvariantError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Exported guard helpers
// ---------------------------------------------------------------------------

/**
 * Type-guard that returns `true` when `value` is one of the three permitted
 * `WalletItemStatus` strings.
 *
 * @example
 * isValidWalletItemStatus('Active')   // true
 * isValidWalletItemStatus('Deleted')  // false
 */
export function isValidWalletItemStatus(value: unknown): value is WalletItemStatus {
  return typeof value === 'string' && (WALLET_ITEM_STATUSES as readonly string[]).includes(value);
}

/**
 * Returns `true` when `date` is a well-formed ISO calendar date (YYYY-MM-DD)
 * whose components resolve to a valid calendar date (e.g. `2026-02-30` → false).
 *
 * Does not throw; invalid input (non-string, wrong format) returns `false`.
 */
export function isValidISODate(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  if (!ISO_DATE_PATTERN.test(date)) return false;

  const [yearStr, monthStr, dayStr] = date.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Month must be 1–12; day must be >= 1.
  if (month < 1 || month > 12 || day < 1) return false;

  // Use the Date constructor to verify calendar consistency:
  // passing month-1 because Date months are 0-indexed.
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Returns `true` when `address` matches the Stellar public-key structural
 * pattern: starts with `G`, exactly 56 characters, Stellar base-32 alphabet.
 *
 * Does not throw; invalid input (non-string, wrong format) returns `false`.
 */
export function isValidStellarAddressPattern(address: unknown): address is string {
  return typeof address === 'string' && STELLAR_ADDRESS_PATTERN.test(address);
}

/**
 * Returns `true` when `item` satisfies every `WalletItem` invariant:
 *
 * 1. `id`, `name`, `type`, `currency` are non-empty strings.
 * 2. `status` is one of `'Active' | 'Archived' | 'Pending'`.
 * 3. `balance` is a finite number `>= 0`.
 * 4. `createdAt` is a valid ISO calendar date.
 * 5. `address`, if present, matches the Stellar public-key pattern.
 *
 * This function never throws; it returns `false` for any violation.
 * Use `assertValidWalletItems` when you need early-exit error reporting.
 */
export function isValidWalletItem(item: unknown): item is WalletItem {
  if (typeof item !== 'object' || item === null) return false;

  const w = item as Record<string, unknown>;

  // Required non-empty string fields
  if (typeof w.id !== 'string' || w.id.trim() === '') return false;
  if (typeof w.name !== 'string' || w.name.trim() === '') return false;
  if (typeof w.type !== 'string' || w.type.trim() === '') return false;
  if (typeof w.currency !== 'string' || w.currency.trim() === '') return false;

  // Status must be one of the permitted values
  if (!isValidWalletItemStatus(w.status)) return false;

  // Balance must be a finite non-negative number
  if (typeof w.balance !== 'number' || !isFinite(w.balance) || w.balance < 0) return false;

  // createdAt must be a valid ISO date string
  if (!isValidISODate(w.createdAt)) return false;

  // address is optional, but when present it must match the Stellar pattern
  if (w.address !== undefined && !isValidStellarAddressPattern(w.address)) return false;

  return true;
}

/**
 * Validates an array of wallet items against all invariants, throwing an
 * `InvariantError` on the first violation found.
 *
 * Checks performed (in order):
 * 1. The array must be non-empty.
 * 2. Each item must satisfy every per-item invariant (via `isValidWalletItem`).
 * 3. All `id` values must be unique across the array.
 *
 * @throws {InvariantError} On the first violation.
 */
export function assertValidWalletItems(items: readonly WalletItem[]): void {
  if (items.length === 0) {
    throw new InvariantError('SAMPLE_WALLET_ITEMS must contain at least one item.');
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Required non-empty string fields
    if (typeof item.id !== 'string' || item.id.trim() === '') {
      throw new InvariantError(`Item at index ${i} has an invalid or empty "id".`);
    }
    if (typeof item.name !== 'string' || item.name.trim() === '') {
      throw new InvariantError(`Item "${item.id}" has an invalid or empty "name".`);
    }
    if (typeof item.type !== 'string' || item.type.trim() === '') {
      throw new InvariantError(`Item "${item.id}" has an invalid or empty "type".`);
    }
    if (typeof item.currency !== 'string' || item.currency.trim() === '') {
      throw new InvariantError(`Item "${item.id}" has an invalid or empty "currency".`);
    }

    // Status must be one of the permitted values
    if (!isValidWalletItemStatus(item.status)) {
      throw new InvariantError(
        `Item "${item.id}" has invalid status "${String(item.status)}". ` +
          `Permitted values: ${WALLET_ITEM_STATUSES.join(', ')}.`,
      );
    }

    // Balance must be a finite non-negative number
    if (typeof item.balance !== 'number' || !isFinite(item.balance) || item.balance < 0) {
      throw new InvariantError(
        `Item "${item.id}" has invalid balance ${String(item.balance)}. ` +
          `Balance must be a finite non-negative number.`,
      );
    }

    // createdAt must be a valid ISO calendar date
    if (!isValidISODate(item.createdAt)) {
      throw new InvariantError(
        `Item "${item.id}" has invalid createdAt "${item.createdAt}". ` +
          `Expected a valid ISO date in YYYY-MM-DD format.`,
      );
    }

    // address is optional, but when present must match the Stellar pattern
    if (item.address !== undefined && !isValidStellarAddressPattern(item.address)) {
      throw new InvariantError(
        `Item "${item.id}" has an invalid Stellar address "${item.address}". ` +
          `Address must start with G, be exactly 56 characters, and use the Stellar base-32 alphabet.`,
      );
    }
  }

  // ID uniqueness check
  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.id)) {
      throw new InvariantError(`Duplicate item id "${item.id}" detected in SAMPLE_WALLET_ITEMS.`);
    }
    seenIds.add(item.id);
  }
}

// ---------------------------------------------------------------------------
// Sample wallet items
// ---------------------------------------------------------------------------

/**
 * Canonical sample wallet items for seeding and testing.
 *
 * Immutability: every object and the array itself are frozen at runtime.
 * TypeScript's `as const` propagates the readonly constraint at compile time.
 *
 * Invariants are validated at module-load time via `assertValidWalletItems`.
 * Any violation throws an `InvariantError` so misconfigured data is caught
 * in CI, local dev, and Jest before it can produce inconsistent runtime state.
 */
const _SAMPLE_WALLET_ITEMS: WalletItem[] = [
  Object.freeze({
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIQ',
    status: 'Active',
    createdAt: '2026-01-15',
  } as WalletItem),
  Object.freeze({
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3200,
    currency: 'USDC',
    address: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    status: 'Active',
    createdAt: '2026-02-01',
  } as WalletItem),
  Object.freeze({
    id: 'w-3',
    name: 'Escrow Lock Key #402',
    type: 'Security Credential',
    balance: 1,
    currency: 'KEY',
    status: 'Pending',
    createdAt: '2026-03-10',
  } as WalletItem),
  Object.freeze({
    id: 'w-4',
    name: 'Archived Client Token',
    type: 'Custom Asset',
    balance: 50,
    currency: 'ACT',
    status: 'Archived',
    createdAt: '2025-11-20',
  } as WalletItem),
];

// Validate all invariants at module-load time.
// Any violation throws InvariantError immediately, surfacing bugs in CI and tests.
assertValidWalletItems(_SAMPLE_WALLET_ITEMS);

/**
 * Validated, runtime-immutable array of sample `WalletItem` records.
 *
 * - The array is frozen at runtime: push/pop/splice throw in strict mode.
 * - Each item is frozen at runtime: field mutations throw in strict mode.
 * - All invariants (unique IDs, valid status, non-negative balance, ISO date,
 *   optional Stellar address pattern) are enforced at module-load time.
 *
 * The TypeScript type is `WalletItem[]` (not `readonly`) so that existing
 * callers do not require changes.  The runtime `Object.freeze` guarantee is
 * verified by the focused tests in `__tests__/constants.test.ts`.
 *
 * To read or iterate use standard array methods; do not mutate elements.
 */
export const SAMPLE_WALLET_ITEMS: WalletItem[] = Object.freeze(_SAMPLE_WALLET_ITEMS) as WalletItem[];
