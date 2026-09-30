import type { WalletItem } from '@/types/domain';

/**
 * Compatibility contracts for the wallet domain.
 *
 * These constants are part of the public contract of the wallet feature.
 * Callers (UI, tests, and downstream modules) depend on the following invariants:
 *
 * 1. @see SAMPLE_WALLET_ITEMS is a non-empty, read-only array of WalletItems.
 * 2. Every item has a unique, non-empty `id`.
 * 3. Every item has a non-empty `name`, `currency`, and a valid `status`.
 * 4. @balance is a non-negative finite number.
 * 5. `createdAt` is an ISO 8601 date string (YYYY-MM-DD).
 *
 * The data is frozen at module load time so accidental mutation by any
 * caller cannot corrupt the shared state. If a caller needs mutable data,
 * it must clone the array explicitly.
 */

export type WalletItemStatus = WalletItem['status'];

export const WALLET_ITEM_STATUSES = [
  'Active',
  'Pending',
  'Archived',
] as const satisfies readonly WalletItemStatus[];

export type WalletItemStatusValue = (typeof WALLET_ITEM_STATUSES)[number];

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isWalletItemStatus(value: unknown): value is WalletItemStatus {
  return (
    typeof value === 'string' &&
    (WALLET_ITEM_STATUSES as readonly string[]).includes(value)
  );
}

function isWalletItem(value: unknown): value is WalletItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    typeof candidate.type === 'string' &&
    candidate.type.length > 0 &&
    typeof candidate.balance === 'number' &&
    Number.finite(candidate.balance) &&
    candidate.balance >= 0 &&
    typeof candidate.currency === 'string' &&
    candidate.currency.length > 0 &&
    (candidate.address === undefined || typeof candidate.address === 'string') &&
    isWalletItemStatus(candidate.status) &&
    isValidISODate(candidate.createdAt)
  );
}

/**
 * Validates a collection of wallet items against the compatibility contract.
 *
 * Returns a normalized, frozen array on success. Throws a descriptive error
 * on any violation so failures are diagnosable without exposing sensitive data.
 */
export function validateWalletItems(
  items: readonly WalletItem[],
): readonly WalletItem[] {
  if (!Array.isArray(items)) {
    throw new TypeError('Wallet items must be an array.');
  }

  const seenIds = new Set<string>();
  const normalized: WalletItem[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isWalletItem(item)) {
      throw new TypeError(`Invalid wallet item at index ${index}.`);
    }
    if (seenIds.has(item.id)) {
      throw new Error(`Duplicate wallet item id: ${item.id}`);
    }
    seenIds.add(item.id);
    normalized.push(Object.freeze({ ...item }));
  }

  return Object.freeze(normalized);
}

/**
 * Sample wallet items used by the UI and tests.
 *
 * The array and its elements are deep-frozen and validated at module load time.
 * This preserves the historical shape of the data while guaranteeeing that
 * accidental mutation or duplicate ids cannot silently corrupt consumers.
 */
export const SAMPLE_WALLET_ITEMS: readonly WalletItem[] = validateWalletItems([
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQC8AIBAEAQC8AIBAEAQC8AIBAEAQC8AIBAEAQDZ7H',
    status: 'Active',
    createdAt: '2026-01-15',
  },
  {
    id: 'w-2',
    name: 'USD Coin (USDC)',
    type: 'Stablecoin',
    balance: 3200,
    currency: 'USDC',
    address: 'GA2C456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
    status: 'Active',
    createdAt: '2026-02-01',
  },
  {
    id: 'w-3',
    name: 'Escrow Lock Key #402',
    type: 'Security Credential',
    balance: 1,
    currency: 'KEY',
    status: 'Pending',
    createdAt: '2026-03-10',
  },
  {
    id: 'w-4',
    name: 'Archived Client Token',
    type: 'Custom Asset',
    balance: 50,
    currency: 'ACT',
    status: 'Archived',
    createdAt: '2025-11-20',
  },
]);
