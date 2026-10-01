import type { WalletItem } from '@/types/domain';

/**
 * Wallet constants and validation boundaries.
 *
 * Invariants enforced here:
 *  1. Every wallet item has a non-empty, unique `id`.
 *  2. @type must be one of the allowed domain values.
 *  3. `status` must be one of the allowed domain values.
 *  4. `balance` must be a finite, non-negative number.
 *  5. `createdAt` must be an ISO 8601 date (YYYY-MM-DD) that is a real calendar date.
 *  6. Addresses, when present, must not be blank.
 */

// ---------------------------------------------------------------------------
// Boundaries
// ---------------------------------------------------------------------------

export const WALLET_ITEM_TYPES = [
  'Native Asset',
  'Stablecoin',
  'Security Credential',
  'Custom Asset',
] as const;

export type WalletItemType = (typeof WALLET_ITEM_TYPES)[number];

export const WALLET_ITEM_STATUSES = [
  'Active',
  'Pending',
  'Archived',
] as const;

export type WalletItemStatus = (typeof WALLET_ITEM_STATUSES)[number];

// Maximum length of a wallet item identifier.
export const WALLET_ITEM_ID_MAX_LENGTH = 64;

// Maximum length of a wallet item name.
export const WALLET_ITEM_NAME_MAX_LENGTH = 128;

// Maximum length of a currency code.
export const WALLET_ITEM_CURRENCY_MAX_LENGTH = 16;

// Maximum length of a wallet address.
export const WALLET_ITEM_ADDRESS_MAX_LENGTH = 256;

// Maximum allowed balance. Prevents overflow and order-of-magnitude mistakes.
export const WALLET_ITEM_BALANCE_MAX = Number.MAX_SAFE_INTEGER;

// Minimum allowed balance.
export const WALLET_ITEM_BALANCE_MIN = 0;

// ---------------------------------------------------------------------------
// Validation errors
// ---------------------------------------------------------------------------

export class WalletItemValidationError extends Error {
  readonly field: string;
  readonly code: string;

  constructor(field: string, code: string, message: string) {
    super(message);
    this.name = 'WalletItemValidationError';
    this.field = field;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Primitive guards
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  // Reject normalized dates like 2026-02-31 -> 2026-03-03.
  return date.toISOString().slice(0, 10) === value;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateWalletItem(item: unknown): WalletItem {
  if (!isPlainObject(item)) {
    throw new WalletItemValidationError('item', 'not_object', 'Wallet item must be an object.');
  }

  const candidate = item as Record<string, unknown>;

  // id
  if (!isNonEmptyString(candidate.id)) {
    throw new WalletItemValidationError('id', 'invalid_id', 'Wallet item id must be a non-empty string.');
  }
  if (candidate.id.length > WALLET_ITEM_ID_MAX_LENGTH) {
    throw new WalletItemValidationError('string', 'id_too_long', `Wallet item id must be at most ${WALLET_ITEM_ID_MAX_LENGTH} characters.`);
  }

  // name
  if (!isNonEmptyString(candidate.name)) {
    throw new WalletItemValidationError('name', 'invalid_name', 'Wallet item name must be a non-empty string.');
  }
  if (candidate.name.length > WALLET_ITEM_NAME_MAX_LENGTH) {
    throw new WalletItemValidationError('name', 'name_too_long', `Wallet item name must be at most ${WALLET_ITEM_NAME_MAX_LENGTH} characters.`);
  }

  // type
  if (!isNonEmptyString(candidate.type)) {
    throw new WalletItemValidationError('type', 'invalid_type', 'Wallet item type must be a non-empty string.');
  }
  if (!WALLET_ITEM_TYPES.includes(candidate.type as WalletItemType)) {
    throw new WalletItemValidationError('type', 'unknown_type', `Wallet item type must be one of ${WALLET_ITEM_TYPES.join(', ')}.`);
  }

  // balance
  if (typeof candidate.balance !== 'number' || !Number.finite(candidate.balance)) {
    throw new WalletItemValidationError('balance', 'invalid_balance', 'Wallet item balance must be a finite number.');
  }
  if (candidate.balance < WALLET_ITEM_BALANCE_MIN) {
    throw new WalletItemValidationError('balance', 'balance_negative', 'Wallet item balance must not be negative.');
  }
  if (candidate.balance > WALLET_ITEM_BALANCE_MAX) {
    throw new WalletItemValidationError('balance', 'balance_too_large', `Wallet item balance must be at most ${WALLET_ITEM_BALANCE_MAX}.`);
  }

  // currency
  if (!isNonEmptyString(candidate.currency)) {
    throw new WalletItemValidationError('currency', 'invalid_currency', 'Wallet item currency must be a non-empty string.');
  }
  if (candidate.currency.length > WALLET_ITEM_CURRENCY_MAX_LENGTH) {
    throw new WalletItemValidationError('currency', 'currency_too_long', `Wallet item currency must be at most ${WALLET_ITEM_CURRENCY_MAX_LENGTH} characters.`);
  }

  // address (optional)
  if (candidate.address !== undefined) {
    if (!isNonEmptyString(candidate.address)) {
      throw new WalletItemValidationError('address', 'invalid_address', 'Wallet item address must be a non-empty string when provided.');
    }
    if (candidate.address.length > WALLET_ITEM_ADDRESS_MAX_LENGTH) {
      throw new WalletItemValidationError('address', 'address_too_long', `Wallet item address must be at most ${WALLET_ITEM_ADDRESS_MAX_LENGTH} characters.`);
    }
  }

  // status
  if (!isNonEmptyString(candidate.status)) {
    throw new WalletItemValidationError('status', 'invalid_status', 'Wallet item status must be a non-empty string.');
  }
  if (!WALLET_ITEM_STATUSES.includes(candidate.status as WalletItemStatus)) {
    throw new WalletItemValidationError('status', 'unknown_status', `Wallet item status must be one of ${WALLET_ITEM_STATUSES.join(', ')}.`);
  }

  // createdAt
  if (!isValidIsoDate(candidate.createdAt)) {
    throw new WalletItemValidationError('createdAt', 'invalid_createdAt', 'Wallet item createdAt must be a valid ISO 8601 date (YYYY-MM-DD).');
  }

  return {
    id: candidate.id,
    name: candidate.name,
    type: candidate.type as WalletItemType,
    balance: candidate.balance,
    currency: candidate.currency,
    address: candidate.address as string | undefined,
    status: candidate.status as WalletItemStatus,
    createdAt: candidate.createdAt,
  };
}

/**
 * Validate a collection of wallet items and enforce id uniqueness.
 *
 * This is the duplicate-submission guard: two items with the same `id`
 * are rejected rather than silently collapsing or overwriting each other.
 */
export function validateWalletItemsCollection(items: unknown): WalletItem[] {
  if (!Array.isArray(items)) {
    throw new WalletItemValidationError('items', 'not_array', 'Wallet items must be an array.');
  }

  const seenIds = new Set<string>();
  const validated: WalletItem[] = [];

  items.forEach((entry, index) => {
    const validatedItem = validateWalletItem(entry);
    if (seenIds.has(validatedItem.id)) {
      throw new WalletItemValidationError(
        'id',
        'duplicate_id',
        `Duplicate wallet item id "${validatedItem.id}" at index ${index}.`,
      );
    }
    seenIds.add(validatedItem.id);
    validated.push(validatedItem);
  });

  return validated;
}

/**
 * Safe variant of validateWalletItem that returns a result instead of throwing.
 * Useful for boundary checks where callers want to handle rejection without
 * exception control flow.
 */
export type ValidationResult =
  | { ok: true; value: WalletItem }
  | { ok: false; error: WalletItemValidationError };

export function tryValidateWalletItem(item: unknown): ValidationResult {
  try {
    return { ok: true, value: validateWalletItem(item) };
  } catch (error) {
    if (error instanceof WalletItemValidationError) {
      return { ok: false, error };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const RAW_SAMPLE_WALLET_ITEMS: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM ',
    address: 'GAAQCAIBAEAQCAIBAEAQC8AIBAEAQC8AIBAEAQC8AIBAEAQDZ7H',
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
  },];

/**
 * Sample wallet items, validated at module load time.
 *
 * This guarantees that consumers of this constant can rely on the data
 * satisfying the domain invariants without re-validating on every read.
 */
export const SAMPLE_WALLET_ITEMS: WalletItem[] = validateWalletItemsCollection(RAW_SAMPLE_WALLET_ITEMS);
