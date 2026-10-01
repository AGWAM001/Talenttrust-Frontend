/**
 * @file constants.test.ts
 *
 * Focused tests for src/app/wallet/constants.ts
 *
 * Covers every invariant enforced by the module:
 *
 * 1. SAMPLE_WALLET_ITEMS shape — all items pass every invariant
 * 2. Immutability — array and items are frozen
 * 3. isValidWalletItemStatus — success, rejection, boundary
 * 4. isValidISODate — success, rejection, boundary (e.g. Feb 30)
 * 5. isValidStellarAddressPattern — success, rejection, boundary
 * 6. isValidWalletItem — success, rejection for each field
 * 7. assertValidWalletItems — throws InvariantError for each violation
 *    (empty array, empty fields, bad status, negative balance, bad date,
 *    bad address, duplicate IDs)
 * 8. InvariantError — correct name and message prefix
 * 9. WALLET_ITEM_STATUSES — completeness and immutability
 */

import {
  SAMPLE_WALLET_ITEMS,
  WALLET_ITEM_STATUSES,
  InvariantError,
  isValidWalletItemStatus,
  isValidISODate,
  isValidStellarAddressPattern,
  isValidWalletItem,
  assertValidWalletItems,
} from '../constants';
import type { WalletItem } from '@/types/domain';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fully valid WalletItem; override any field via the partial arg. */
function makeItem(overrides: Partial<WalletItem> = {}): WalletItem {
  return {
    id: 'test-1',
    name: 'Test Wallet',
    type: 'Test Asset',
    balance: 100,
    currency: 'XLM',
    status: 'Active',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. SAMPLE_WALLET_ITEMS — canonical data
// ---------------------------------------------------------------------------

describe('SAMPLE_WALLET_ITEMS — canonical data', () => {
  it('exports a non-empty array', () => {
    expect(SAMPLE_WALLET_ITEMS.length).toBeGreaterThan(0);
  });

  it('contains all three status variants', () => {
    const statuses = new Set(SAMPLE_WALLET_ITEMS.map((i) => i.status));
    expect(statuses.has('Active')).toBe(true);
    expect(statuses.has('Pending')).toBe(true);
    expect(statuses.has('Archived')).toBe(true);
  });

  it('all items pass isValidWalletItem', () => {
    SAMPLE_WALLET_ITEMS.forEach((item) => {
      expect(isValidWalletItem(item)).toBe(true);
    });
  });

  it('all IDs are unique', () => {
    const ids = SAMPLE_WALLET_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all items have non-empty required fields', () => {
    SAMPLE_WALLET_ITEMS.forEach((item) => {
      expect(item.id.trim()).not.toBe('');
      expect(item.name.trim()).not.toBe('');
      expect(item.type.trim()).not.toBe('');
      expect(item.currency.trim()).not.toBe('');
    });
  });

  it('all items have a non-negative finite balance', () => {
    SAMPLE_WALLET_ITEMS.forEach((item) => {
      expect(isFinite(item.balance)).toBe(true);
      expect(item.balance).toBeGreaterThanOrEqual(0);
    });
  });

  it('all createdAt values are valid ISO dates', () => {
    SAMPLE_WALLET_ITEMS.forEach((item) => {
      expect(isValidISODate(item.createdAt)).toBe(true);
    });
  });

  it('addresses, when present, match the Stellar pattern', () => {
    SAMPLE_WALLET_ITEMS.forEach((item) => {
      if (item.address !== undefined) {
        expect(isValidStellarAddressPattern(item.address)).toBe(true);
      }
    });
  });

  it('passes assertValidWalletItems without throwing', () => {
    expect(() => assertValidWalletItems(SAMPLE_WALLET_ITEMS)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Immutability — Object.freeze
// ---------------------------------------------------------------------------

describe('SAMPLE_WALLET_ITEMS — immutability', () => {
  it('the top-level array is frozen', () => {
    expect(Object.isFrozen(SAMPLE_WALLET_ITEMS)).toBe(true);
  });

  it('each item object is frozen', () => {
    SAMPLE_WALLET_ITEMS.forEach((item) => {
      expect(Object.isFrozen(item)).toBe(true);
    });
  });

  it('attempting to push to the array throws in strict mode', () => {
    // Object.freeze prevents mutation; direct push throws a TypeError in strict
    // mode (module code always runs in strict mode in ES modules and Next.js).
    // We assert the length stays the same to cover both strict and non-strict envs.
    const originalLength = SAMPLE_WALLET_ITEMS.length;
    try {
      SAMPLE_WALLET_ITEMS.push(makeItem({ id: 'intruder' }));
    } catch {
      // Expected TypeError in strict mode — this is the correct behaviour
    }
    expect(SAMPLE_WALLET_ITEMS.length).toBe(originalLength);
  });

  it('attempting to mutate an item property is silently rejected', () => {
    const first = SAMPLE_WALLET_ITEMS[0];
    const originalName = first.name;
    try {
      // Intentional mutation attempt — should throw in strict mode
      (first as Record<string, unknown>).name = 'MUTATED';
    } catch {
      // Strict mode throws TypeError — expected
    }
    expect(first.name).toBe(originalName);
  });
});

// ---------------------------------------------------------------------------
// 3. WALLET_ITEM_STATUSES
// ---------------------------------------------------------------------------

describe('WALLET_ITEM_STATUSES', () => {
  it('contains exactly the three permitted status strings', () => {
    expect(WALLET_ITEM_STATUSES).toContain('Active');
    expect(WALLET_ITEM_STATUSES).toContain('Archived');
    expect(WALLET_ITEM_STATUSES).toContain('Pending');
    expect(WALLET_ITEM_STATUSES).toHaveLength(3);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(WALLET_ITEM_STATUSES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. isValidWalletItemStatus
// ---------------------------------------------------------------------------

describe('isValidWalletItemStatus', () => {
  it.each(['Active', 'Archived', 'Pending'] as const)(
    'returns true for "%s"',
    (status) => {
      expect(isValidWalletItemStatus(status)).toBe(true);
    },
  );

  it.each(['active', 'ACTIVE', 'Deleted', 'unknown', '', ' ', 'Pending ', 'null'])(
    'returns false for "%s"',
    (value) => {
      expect(isValidWalletItemStatus(value)).toBe(false);
    },
  );

  it.each([null, undefined, 0, false, {}, []])(
    'returns false for non-string %p',
    (value) => {
      expect(isValidWalletItemStatus(value)).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// 5. isValidISODate
// ---------------------------------------------------------------------------

describe('isValidISODate', () => {
  describe('valid dates', () => {
    it.each(['2026-01-01', '2026-12-31', '2000-02-29', '1999-06-15', '2026-03-10'])(
      'returns true for "%s"',
      (date) => {
        expect(isValidISODate(date)).toBe(true);
      },
    );
  });

  describe('invalid format', () => {
    it.each([
      '01-01-2026',    // wrong order
      '2026/01/01',    // slashes
      '2026-1-1',      // no zero-padding
      '2026-13-01',    // month 13
      '20261201',      // no separators
      '',              // empty
      '2026-00-01',    // month 0
      '2026-01-00',    // day 0
    ])('returns false for "%s"', (date) => {
      expect(isValidISODate(date)).toBe(false);
    });
  });

  describe('calendar boundary violations', () => {
    it.each([
      '2026-02-29',    // not a leap year
      '2026-02-30',    // Feb never has 30 days
      '2026-04-31',    // April has only 30 days
      '2026-11-31',    // November has only 30 days
    ])('returns false for impossible date "%s"', (date) => {
      expect(isValidISODate(date)).toBe(false);
    });

    it('returns true for Feb 29 in a leap year', () => {
      expect(isValidISODate('2024-02-29')).toBe(true);
    });
  });

  describe('non-string inputs', () => {
    it.each([null, undefined, 20260101, true, {}, []])(
      'returns false for %p',
      (value) => {
        expect(isValidISODate(value)).toBe(false);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// 6. isValidStellarAddressPattern
// ---------------------------------------------------------------------------

describe('isValidStellarAddressPattern', () => {
  // All 56 characters; starts with G; only A-Z2-7
  const VALID_ADDRESS = 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIQ';

  it('returns true for a valid Stellar public key pattern', () => {
    expect(isValidStellarAddressPattern(VALID_ADDRESS)).toBe(true);
  });

  describe('structural violations', () => {
    it('returns false for an address that does not start with G', () => {
      const notG = 'BAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H';
      expect(isValidStellarAddressPattern(notG)).toBe(false);
    });

    it('returns false for a 55-character address (too short)', () => {
      const short = VALID_ADDRESS.slice(0, 55);
      expect(isValidStellarAddressPattern(short)).toBe(false);
    });

    it('returns false for a 57-character address (too long)', () => {
      const long = VALID_ADDRESS + 'A';
      expect(isValidStellarAddressPattern(long)).toBe(false);
    });

    it('returns false for an address containing characters outside the base-32 alphabet', () => {
      // Replace one char with '0' (not in Stellar base-32 A-Z2-7)
      const withZero = VALID_ADDRESS.slice(0, 10) + '0' + VALID_ADDRESS.slice(11);
      expect(isValidStellarAddressPattern(withZero)).toBe(false);
    });

    it('returns false for an address with a lowercase letter', () => {
      const lower = VALID_ADDRESS.toLowerCase();
      expect(isValidStellarAddressPattern(lower)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isValidStellarAddressPattern('')).toBe(false);
    });
  });

  describe('non-string inputs', () => {
    it.each([null, undefined, 12345, true, {}, []])(
      'returns false for %p',
      (value) => {
        expect(isValidStellarAddressPattern(value)).toBe(false);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// 7. isValidWalletItem
// ---------------------------------------------------------------------------

describe('isValidWalletItem', () => {
  it('returns true for a fully valid item', () => {
    expect(isValidWalletItem(makeItem())).toBe(true);
  });

  it('returns true for an item without an optional address', () => {
    expect(isValidWalletItem(makeItem({ address: undefined }))).toBe(true);
  });

  it('returns true for balance of 0 (boundary)', () => {
    expect(isValidWalletItem(makeItem({ balance: 0 }))).toBe(true);
  });

  describe('required field validation', () => {
    it.each(['id', 'name', 'type', 'currency'] as const)(
      'returns false when "%s" is an empty string',
      (field) => {
        expect(isValidWalletItem(makeItem({ [field]: '' }))).toBe(false);
      },
    );

    it.each(['id', 'name', 'type', 'currency'] as const)(
      'returns false when "%s" is whitespace only',
      (field) => {
        expect(isValidWalletItem(makeItem({ [field]: '   ' }))).toBe(false);
      },
    );

    it.each(['id', 'name', 'type', 'currency'] as const)(
      'returns false when "%s" is missing (undefined)',
      (field) => {
        const item = makeItem();
        // @ts-expect-error intentional invalid data
        delete (item as Record<string, unknown>)[field];
        expect(isValidWalletItem(item)).toBe(false);
      },
    );
  });

  describe('status validation', () => {
    it('returns false for an unknown status', () => {
      // @ts-expect-error intentional invalid status
      expect(isValidWalletItem(makeItem({ status: 'Deleted' }))).toBe(false);
    });

    it('returns false for a lowercase valid status', () => {
      // @ts-expect-error intentional invalid status
      expect(isValidWalletItem(makeItem({ status: 'active' }))).toBe(false);
    });

    it.each(['Active', 'Archived', 'Pending'] as const)(
      'returns true for valid status "%s"',
      (status) => {
        expect(isValidWalletItem(makeItem({ status }))).toBe(true);
      },
    );
  });

  describe('balance validation', () => {
    it('returns false for a negative balance', () => {
      expect(isValidWalletItem(makeItem({ balance: -1 }))).toBe(false);
    });

    it('returns false for NaN balance', () => {
      expect(isValidWalletItem(makeItem({ balance: NaN }))).toBe(false);
    });

    it('returns false for Infinity balance', () => {
      expect(isValidWalletItem(makeItem({ balance: Infinity }))).toBe(false);
    });

    it('returns true for large positive balance (boundary)', () => {
      expect(isValidWalletItem(makeItem({ balance: Number.MAX_SAFE_INTEGER }))).toBe(true);
    });
  });

  describe('createdAt validation', () => {
    it('returns false for an invalid date string', () => {
      expect(isValidWalletItem(makeItem({ createdAt: '01-01-2026' }))).toBe(false);
    });

    it('returns false for an impossible calendar date', () => {
      expect(isValidWalletItem(makeItem({ createdAt: '2026-02-30' }))).toBe(false);
    });

    it('returns false for a non-string createdAt', () => {
      // @ts-expect-error intentional invalid type
      expect(isValidWalletItem(makeItem({ createdAt: 20260101 }))).toBe(false);
    });
  });

  describe('address validation', () => {
    it('returns false when address is present but does not match the Stellar pattern', () => {
      expect(isValidWalletItem(makeItem({ address: 'NOT_A_STELLAR_KEY' }))).toBe(false);
    });

    it('returns false when address is an empty string', () => {
      expect(isValidWalletItem(makeItem({ address: '' }))).toBe(false);
    });

    it('returns true when address is undefined (optional field)', () => {
      expect(isValidWalletItem(makeItem({ address: undefined }))).toBe(true);
    });
  });

  describe('non-object inputs', () => {
    it.each([null, undefined, 'string', 42, true, []])(
      'returns false for %p',
      (value) => {
        expect(isValidWalletItem(value)).toBe(false);
      },
    );
  });
});

// ---------------------------------------------------------------------------
// 8. InvariantError
// ---------------------------------------------------------------------------

describe('InvariantError', () => {
  it('has the correct name', () => {
    const err = new InvariantError('test');
    expect(err.name).toBe('InvariantError');
  });

  it('message includes the violation description', () => {
    const err = new InvariantError('test violation');
    expect(err.message).toContain('test violation');
  });

  it('message includes the module prefix', () => {
    const err = new InvariantError('x');
    expect(err.message).toContain('[wallet/constants]');
  });

  it('is an instance of Error', () => {
    expect(new InvariantError('x')).toBeInstanceOf(Error);
  });

  it('is an instance of InvariantError', () => {
    expect(new InvariantError('x')).toBeInstanceOf(InvariantError);
  });
});

// ---------------------------------------------------------------------------
// 9. assertValidWalletItems — throws on each violation type
// ---------------------------------------------------------------------------

describe('assertValidWalletItems', () => {
  it('does not throw for a single valid item', () => {
    expect(() => assertValidWalletItems([makeItem()])).not.toThrow();
  });

  it('does not throw for multiple valid items with unique IDs', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ id: 'a' }), makeItem({ id: 'b' })]),
    ).not.toThrow();
  });

  // ─── Array-level invariants ───────────────────────────────────────────────

  it('throws InvariantError for an empty array', () => {
    expect(() => assertValidWalletItems([])).toThrow(InvariantError);
  });

  it('error message for empty array mentions "at least one item"', () => {
    expect(() => assertValidWalletItems([])).toThrow(/at least one item/i);
  });

  // ─── ID uniqueness ────────────────────────────────────────────────────────

  it('throws InvariantError for duplicate IDs', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ id: 'dup' }), makeItem({ id: 'dup' })]),
    ).toThrow(InvariantError);
  });

  it('error message for duplicate ID includes the duplicated id', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ id: 'dup-id' }), makeItem({ id: 'dup-id' })]),
    ).toThrow(/dup-id/);
  });

  // ─── Required string fields ───────────────────────────────────────────────

  it.each(['id', 'name', 'type', 'currency'] as const)(
    'throws InvariantError when "%s" is empty',
    (field) => {
      expect(() => assertValidWalletItems([makeItem({ [field]: '' })])).toThrow(
        InvariantError,
      );
    },
  );

  it.each(['id', 'name', 'type', 'currency'] as const)(
    'throws InvariantError when "%s" is whitespace only',
    (field) => {
      expect(() => assertValidWalletItems([makeItem({ [field]: '   ' })])).toThrow(
        InvariantError,
      );
    },
  );

  // ─── Status ───────────────────────────────────────────────────────────────

  it('throws InvariantError for an invalid status', () => {
    // @ts-expect-error intentional invalid status
    expect(() => assertValidWalletItems([makeItem({ status: 'Deleted' })])).toThrow(
      InvariantError,
    );
  });

  it('error message for invalid status includes the bad value', () => {
    expect(() =>
      // @ts-expect-error intentional
      assertValidWalletItems([makeItem({ id: 'x', status: 'Deleted' })]),
    ).toThrow(/Deleted/);
  });

  it('error message for invalid status lists permitted values', () => {
    expect(() =>
      // @ts-expect-error intentional
      assertValidWalletItems([makeItem({ id: 'x', status: 'Deleted' })]),
    ).toThrow(/Active.*Archived.*Pending|Pending.*Active.*Archived/);
  });

  // ─── Balance ─────────────────────────────────────────────────────────────

  it('throws InvariantError for a negative balance', () => {
    expect(() => assertValidWalletItems([makeItem({ balance: -0.01 })])).toThrow(
      InvariantError,
    );
  });

  it('does not throw for balance = 0 (boundary)', () => {
    expect(() => assertValidWalletItems([makeItem({ balance: 0 })])).not.toThrow();
  });

  it('throws InvariantError for NaN balance', () => {
    expect(() => assertValidWalletItems([makeItem({ balance: NaN })])).toThrow(
      InvariantError,
    );
  });

  it('throws InvariantError for Infinity balance', () => {
    expect(() => assertValidWalletItems([makeItem({ balance: Infinity })])).toThrow(
      InvariantError,
    );
  });

  it('throws InvariantError for -Infinity balance', () => {
    expect(() => assertValidWalletItems([makeItem({ balance: -Infinity })])).toThrow(
      InvariantError,
    );
  });

  // ─── createdAt ────────────────────────────────────────────────────────────

  it('throws InvariantError for a malformed date string', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ createdAt: '01-01-2026' })]),
    ).toThrow(InvariantError);
  });

  it('throws InvariantError for an impossible calendar date', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ createdAt: '2026-02-29' })]), // not a leap year
    ).toThrow(InvariantError);
  });

  it('does not throw for Feb 29 in a leap year', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ createdAt: '2024-02-29' })]),
    ).not.toThrow();
  });

  // ─── address (optional) ───────────────────────────────────────────────────

  it('throws InvariantError when address does not match the Stellar pattern', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ address: 'BAD_ADDRESS' })]),
    ).toThrow(InvariantError);
  });

  it('error message for bad address includes the offending value', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ id: 'x', address: 'BAD_ADDRESS' })]),
    ).toThrow(/BAD_ADDRESS/);
  });

  it('does not throw when address is undefined', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ address: undefined })]),
    ).not.toThrow();
  });

  // ─── Error message includes item id ──────────────────────────────────────

  it('includes the item id in the error message for per-item violations', () => {
    expect(() =>
      assertValidWalletItems([makeItem({ id: 'bad-item-id', balance: -5 })]),
    ).toThrow(/bad-item-id/);
  });

  // ─── Regression: concurrent / repeated execution cannot corrupt state ─────

  it('is idempotent — calling twice with the same valid data does not throw', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' })];
    expect(() => {
      assertValidWalletItems(items);
      assertValidWalletItems(items);
    }).not.toThrow();
  });

  it('subsequent valid call succeeds even after a previous call threw', () => {
    // First call throws
    expect(() => assertValidWalletItems([])).toThrow();
    // Second call with valid data must still succeed
    expect(() => assertValidWalletItems([makeItem()])).not.toThrow();
  });
});
