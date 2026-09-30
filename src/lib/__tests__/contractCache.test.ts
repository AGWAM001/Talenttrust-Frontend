import {
  cacheContractData,
  getCachedContractData,
  hasCachedContract,
  clearContractCache,
  removeCachedContract,
  getCachedContractAge,
  getCacheStats,
  CONTRACT_CACHE_KEY,
  MAX_CACHE_ENTRIES,
  STALE_THRESHOLD_MS,
} from '@/lib/contractCache';
import type { ContractData } from '@/lib/contractResolver';

const mockContract: ContractData = {
  id: 'contract-test-1',
  name: 'Test Contract 1',
  status: 'Active',
  parties: [
    { label: 'Client', address: 'GCLIENT123456789012345678901234567890123456789012' },
    { label: 'Freelancer', address: 'GFREELANCER1234567890123456789012345678901234567890' },
  ],
  totalValue: 5000,
  currency: 'USD',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  milestones: [
    {
      id: 'ms-1',
      title: 'Milestone 1',
      status: 'Pending',
      payout: 5000,
      currency: 'USD',
      dueDate: '2026-09-01',
    },
  ],
};

describe('contractCache', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  describe('caching and retrieval', () => {
    it('caches contract data and retrieves it successfully', () => {
      const saved = cacheContractData(mockContract.id, mockContract);
      expect(saved).toBe(true);

      const cached = getCachedContractData(mockContract.id);
      expect(cached.success).toBe(true);
      expect(cached.data).toEqual(mockContract);
      expect(cached.stale).toBe(false);
      expect(hasCachedContract(mockContract.id)).toBe(true);
    });

    it('returns unsuccessful result when contract is not cached', () => {
      const result = getCachedContractData('non-existent');
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(hasCachedContract('non-existent')).toBe(false);
    });

    it('updates existing cache entry on re-cache', () => {
      cacheContractData(mockContract.id, mockContract);

      const updatedContract: ContractData = {
        ...mockContract,
        name: 'Updated Contract Name',
        totalValue: 10000,
      };

      cacheContractData(mockContract.id, updatedContract);

      const cached = getCachedContractData(mockContract.id);
      expect(cached.success).toBe(true);
      expect(cached.data?.name).toBe('Updated Contract Name');
      expect(cached.data?.totalValue).toBe(10000);

      const stats = getCacheStats();
      expect(stats.entryCount).toBe(1);
    });
  });

  describe('staleness detection', () => {
    it('marks cached data older than STALE_THRESHOLD_MS as stale', () => {
      const pastTime = new Date(Date.now() - (STALE_THRESHOLD_MS + 1000)).toISOString();

      const rawStore = {
        schemaVersion: 1,
        entries: [
          {
            contractId: mockContract.id,
            data: mockContract,
            version: 1,
            cachedAt: pastTime,
          },
        ],
      };
      window.localStorage.setItem(CONTRACT_CACHE_KEY, JSON.stringify(rawStore));

      const result = getCachedContractData(mockContract.id);
      expect(result.success).toBe(true);
      expect(result.stale).toBe(true);
    });

    it('marks cached data newer than STALE_THRESHOLD_MS as fresh', () => {
      const recentTime = new Date(Date.now() - 10000).toISOString(); // 10s ago

      const rawStore = {
        schemaVersion: 1,
        entries: [
          {
            contractId: mockContract.id,
            data: mockContract,
            version: 1,
            cachedAt: recentTime,
          },
        ],
      };
      window.localStorage.setItem(CONTRACT_CACHE_KEY, JSON.stringify(rawStore));

      const result = getCachedContractData(mockContract.id);
      expect(result.success).toBe(true);
      expect(result.stale).toBe(false);
    });

    it('calculates age of cached contract correctly', () => {
      const pastTime = Date.now() - 60000; // 1 min ago
      const rawStore = {
        schemaVersion: 1,
        entries: [
          {
            contractId: mockContract.id,
            data: mockContract,
            version: 1,
            cachedAt: new Date(pastTime).toISOString(),
          },
        ],
      };
      window.localStorage.setItem(CONTRACT_CACHE_KEY, JSON.stringify(rawStore));

      const age = getCachedContractAge(mockContract.id);
      expect(age).toBeGreaterThanOrEqual(59000);
      expect(age).toBeLessThanOrEqual(65000);

      expect(getCachedContractAge('unknown')).toBeNull();
    });
  });

  describe('bounded cache eviction (LRU)', () => {
    it('enforces maximum capacity by evicting oldest entries', () => {
      // Add MAX_CACHE_ENTRIES + 5 entries
      for (let i = 1; i <= MAX_CACHE_ENTRIES + 5; i++) {
        const contract: ContractData = {
          ...mockContract,
          id: `contract-${i}`,
          name: `Contract ${i}`,
        };
        cacheContractData(contract.id, contract);
      }

      const stats = getCacheStats();
      expect(stats.entryCount).toBe(MAX_CACHE_ENTRIES);

      // The first 5 entries should have been evicted
      for (let i = 1; i <= 5; i++) {
        expect(hasCachedContract(`contract-${i}`)).toBe(false);
      }

      // The newest entries should still exist
      for (let i = 6; i <= MAX_CACHE_ENTRIES + 5; i++) {
        expect(hasCachedContract(`contract-${i}`)).toBe(true);
      }
    });
  });

  describe('corruption resilience & recovery', () => {
    it('recovers gracefully from non-JSON string in localStorage', () => {
      window.localStorage.setItem(CONTRACT_CACHE_KEY, 'invalid-json{{{');

      const result = getCachedContractData(mockContract.id);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Writing fresh data after corrupt storage works
      const saved = cacheContractData(mockContract.id, mockContract);
      expect(saved).toBe(true);
      expect(getCachedContractData(mockContract.id).success).toBe(true);
    });

    it('recovers gracefully from missing schemaVersion or non-array entries', () => {
      window.localStorage.setItem(
        CONTRACT_CACHE_KEY,
        JSON.stringify({ invalid: 'structure' }),
      );

      const result = getCachedContractData(mockContract.id);
      expect(result.success).toBe(false);

      const stats = getCacheStats();
      expect(stats.entryCount).toBe(0);
    });

    it('filters out malformed entries within the store', () => {
      const corruptStore = {
        schemaVersion: 1,
        entries: [
          { invalid: 'entry' },
          { contractId: 'valid-id', data: mockContract, cachedAt: new Date().toISOString(), version: 1 },
          null,
          undefined,
        ],
      };
      window.localStorage.setItem(CONTRACT_CACHE_KEY, JSON.stringify(corruptStore));

      expect(hasCachedContract('valid-id')).toBe(true);
      const stats = getCacheStats();
      expect(stats.entryCount).toBe(1);
    });
  });

  describe('cache deletion operations', () => {
    it('removes a specific contract entry', () => {
      cacheContractData('c1', { ...mockContract, id: 'c1' });
      cacheContractData('c2', { ...mockContract, id: 'c2' });

      expect(removeCachedContract('c1')).toBe(true);
      expect(hasCachedContract('c1')).toBe(false);
      expect(hasCachedContract('c2')).toBe(true);

      // Removing non-existent returns false
      expect(removeCachedContract('c1')).toBe(false);
    });

    it('clears all cached contracts', () => {
      cacheContractData('c1', { ...mockContract, id: 'c1' });
      cacheContractData('c2', { ...mockContract, id: 'c2' });

      expect(clearContractCache()).toBe(true);
      expect(getCacheStats().entryCount).toBe(0);
      expect(hasCachedContract('c1')).toBe(false);
      expect(hasCachedContract('c2')).toBe(false);
    });
  });

  describe('storage failure handling', () => {
    it('handles localStorage.setItem throwing quota exceeded error', () => {
      jest.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const saved = cacheContractData(mockContract.id, mockContract);
      expect(saved).toBe(false);
    });

    it('handles localStorage.removeItem throwing error during clearContractCache', () => {
      jest.spyOn(window.localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('StorageError');
      });

      expect(clearContractCache()).toBe(false);
    });
  });
});
