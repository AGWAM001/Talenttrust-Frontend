import {
  CONTRACT_SORT_OPTIONS,
  DEFAULT_CONTRACT_SORT_ORDER,
  compareContracts,
  isContractSortOrder,
  sortContracts,
  toContractSortOrder,
} from '@/lib/sortContracts';
import type { Contract } from '@/types/domain';

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'contract-id',
    contractName: 'Website Redesign',
    parties: [],
    totalValue: 1000,
    currency: 'USD',
    status: 'Active',
    createdAt: '2025-01-01',
    milestoneCount: 0,
    ...overrides,
  };
}

const ids = (contracts: Contract[]) => contracts.map((contract) => contract.id);

describe('sortContracts', () => {
  describe('created-date ordering', () => {
    const unordered = [
      makeContract({ id: 'b', createdAt: '2025-03-15' }),
      makeContract({ id: 'a', createdAt: '2025-01-02' }),
      makeContract({ id: 'c', createdAt: '2025-07-30' }),
    ];

    it('orders newest first for date-desc', () => {
      expect(ids(sortContracts(unordered, 'date-desc'))).toEqual(['c', 'b', 'a']);
    });

    it('orders oldest first for date-asc', () => {
      expect(ids(sortContracts(unordered, 'date-asc'))).toEqual(['a', 'b', 'c']);
    });

    it('defaults to newest first when no order is given', () => {
      expect(ids(sortContracts(unordered))).toEqual(['c', 'b', 'a']);
      expect(DEFAULT_CONTRACT_SORT_ORDER).toBe('date-desc');
    });

    it('parses human-readable created dates', () => {
      const contracts = [
        makeContract({ id: 'a', createdAt: 'Jan 1, 2025' }),
        makeContract({ id: 'b', createdAt: 'Dec 31, 2024' }),
        makeContract({ id: 'c', createdAt: 'Mar 4, 2025' }),
      ];

      expect(ids(sortContracts(contracts, 'date-asc'))).toEqual(['b', 'a', 'c']);
    });

    it('distinguishes timestamps on the same day', () => {
      const contracts = [
        makeContract({ id: 'late', createdAt: '2025-01-01T18:00:00Z' }),
        makeContract({ id: 'early', createdAt: '2025-01-01T06:00:00Z' }),
      ];

      expect(ids(sortContracts(contracts, 'date-asc'))).toEqual(['early', 'late']);
      expect(ids(sortContracts(contracts, 'date-desc'))).toEqual(['late', 'early']);
    });

    it('does not mutate the input array', () => {
      const contracts = [
        makeContract({ id: 'a', createdAt: '2025-01-01' }),
        makeContract({ id: 'b', createdAt: '2025-06-01' }),
      ];
      const snapshot = [...contracts];

      sortContracts(contracts, 'date-desc');

      expect(contracts).toEqual(snapshot);
    });
  });

  describe('tie-breaks', () => {
    it('breaks equal created dates on id, ascending, in both directions', () => {
      const sameDay = [
        makeContract({ id: 'c', createdAt: '2025-01-01' }),
        makeContract({ id: 'a', createdAt: '2025-01-01' }),
        makeContract({ id: 'b', createdAt: '2025-01-01' }),
      ];

      expect(ids(sortContracts(sameDay, 'date-desc'))).toEqual(['a', 'b', 'c']);
      expect(ids(sortContracts(sameDay, 'date-asc'))).toEqual(['a', 'b', 'c']);
    });

    it('produces the same order regardless of input order', () => {
      const base = [
        makeContract({ id: 'a', createdAt: '2025-01-01' }),
        makeContract({ id: 'b', createdAt: '2025-01-01' }),
        makeContract({ id: 'c', createdAt: '2025-02-01' }),
      ];
      const reversed = [...base].reverse();

      expect(ids(sortContracts(base, 'date-desc'))).toEqual(
        ids(sortContracts(reversed, 'date-desc')),
      );
      expect(ids(sortContracts(base, 'date-asc'))).toEqual(
        ids(sortContracts(reversed, 'date-asc')),
      );
    });

    it('keeps identical ids adjacent without throwing', () => {
      const duplicates = [
        makeContract({ id: 'dupe', createdAt: '2025-01-01' }),
        makeContract({ id: 'dupe', createdAt: '2025-01-01' }),
      ];

      expect(ids(sortContracts(duplicates, 'date-desc'))).toEqual(['dupe', 'dupe']);
      expect(compareContracts(duplicates[0], duplicates[1], 'date-desc')).toBe(0);
    });

    it('groups unparsable created dates deterministically by id', () => {
      const contracts = [
        makeContract({ id: 'z', createdAt: 'not a date' }),
        makeContract({ id: 'm', createdAt: '2025-01-01' }),
        makeContract({ id: 'a', createdAt: 'unknown' }),
      ];

      // Unparsable dates sort as the oldest possible value.
      expect(ids(sortContracts(contracts, 'date-asc'))).toEqual(['a', 'z', 'm']);
      expect(ids(sortContracts(contracts, 'date-desc'))).toEqual(['m', 'a', 'z']);
    });
  });

  describe('edge cases', () => {
    it('returns an empty array for an empty list', () => {
      expect(sortContracts([], 'date-desc')).toEqual([]);
      expect(sortContracts([], 'date-asc')).toEqual([]);
    });

    it('returns a single contract unchanged', () => {
      const only = [makeContract({ id: 'only' })];

      expect(ids(sortContracts(only, 'date-desc'))).toEqual(['only']);
    });

    it('accepts a readonly array', () => {
      const contracts: readonly Contract[] = [
        makeContract({ id: 'b', createdAt: '2025-01-02' }),
        makeContract({ id: 'a', createdAt: '2025-01-01' }),
      ];

      expect(ids(sortContracts(contracts, 'date-asc'))).toEqual(['a', 'b']);
    });
  });

  describe('value ordering', () => {
    const contracts = [
      makeContract({ id: 'mid', totalValue: 500, createdAt: '2025-01-01' }),
      makeContract({ id: 'high', totalValue: 900, createdAt: '2025-01-02' }),
      makeContract({ id: 'low', totalValue: 100, createdAt: '2025-01-03' }),
    ];

    it('orders high to low for value-desc', () => {
      expect(ids(sortContracts(contracts, 'value-desc'))).toEqual(['high', 'mid', 'low']);
    });

    it('orders low to high for value-asc', () => {
      expect(ids(sortContracts(contracts, 'value-asc'))).toEqual(['low', 'mid', 'high']);
    });

    it('breaks equal values on id rather than on created date', () => {
      const equalValues = [
        makeContract({ id: 'b', totalValue: 250, createdAt: '2025-05-05' }),
        makeContract({ id: 'a', totalValue: 250, createdAt: '2024-01-01' }),
      ];

      expect(ids(sortContracts(equalValues, 'value-desc'))).toEqual(['a', 'b']);
      expect(ids(sortContracts(equalValues, 'value-asc'))).toEqual(['a', 'b']);
    });
  });

  describe('sort order helpers', () => {
    it.each(CONTRACT_SORT_OPTIONS.map((option) => option.value))(
      'recognises %s as a valid sort order',
      (value) => {
        expect(isContractSortOrder(value)).toBe(true);
        expect(toContractSortOrder(value)).toBe(value);
      },
    );

    it.each([['name-asc'], [''], [null], [undefined], [42], [{}]])(
      'rejects %p and falls back to the default',
      (value) => {
        expect(isContractSortOrder(value)).toBe(false);
        expect(toContractSortOrder(value)).toBe(DEFAULT_CONTRACT_SORT_ORDER);
      },
    );

    it('exposes the toolbar options in display order', () => {
      expect(CONTRACT_SORT_OPTIONS.map((option) => option.value)).toEqual([
        'date-desc',
        'date-asc',
        'value-desc',
        'value-asc',
      ]);
    });
  });
});
