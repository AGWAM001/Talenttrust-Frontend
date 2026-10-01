/**
 * @file contractCache.ts
 *
 * Offline-aware caching layer for contract data.
 *
 * Provides bounded, versioned read snapshots of contract data that can be
 * displayed when the user is offline. Cache entries include timestamps for
 * staleness detection and are stored in localStorage with a namespaced key.
 *
 * Design principles:
 * - **Bounded storage** — cache is limited to a maximum number of entries
 * - **Versioned snapshots** — each cached entry includes a version and timestamp
 * - **Offline-first** — can serve cached data when network is unavailable
 * - **Corruption resilient** — validates cache structure before use
 * - **SSR-safe** — guards all storage access with `isBrowser()` checks
 */

import { reportError } from './errorReporter';
import type { ContractData } from './contractResolver';

/**
 * Checks whether code is running in a browser environment with localStorage available.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// ---------------------------------------------------------------------------
// Storage configuration
// ---------------------------------------------------------------------------

/** localStorage key for contract cache. */
export const CONTRACT_CACHE_KEY = 'talenttrust_contract_cache';

/** Maximum number of contract entries to cache (bounded storage). */
export const MAX_CACHE_ENTRIES = 50;

/** Time in milliseconds after which cached data is considered stale (5 minutes). */
export const STALE_THRESHOLD_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Cache entry structure
// ---------------------------------------------------------------------------

interface CacheEntry {
  /** The contract data snapshot. */
  data: ContractData;
  /** Cache version for migration support. */
  version: number;
  /** ISO timestamp when this entry was cached. */
  cachedAt: string;
  /** Contract ID for lookup. */
  contractId: string;
}

interface CacheStore {
  /** Array of cached contract entries. */
  entries: CacheEntry[];
  /** Cache schema version for future migrations. */
  schemaVersion: number;
}

const EMPTY_CACHE: CacheStore = { entries: [], schemaVersion: 1 };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads the contract cache from localStorage.
 * Returns empty cache on any failure (missing, corrupt, unparseable).
 */
function readCache(): CacheStore {
  if (!isBrowser()) return { ...EMPTY_CACHE };

  try {
    const raw = window.localStorage.getItem(CONTRACT_CACHE_KEY);
    if (!raw) return { ...EMPTY_CACHE };

    const parsed = JSON.parse(raw) as Partial<CacheStore>;

    // Validate structure
    if (!parsed.schemaVersion || !Array.isArray(parsed.entries)) {
      reportError(
        new Error('Invalid cache structure'),
        '[contractCache] Cache structure invalid, resetting to empty.',
      );
      return { ...EMPTY_CACHE };
    }

    // Validate each entry
    const validEntries = (parsed.entries as CacheEntry[]).filter((entry) => {
      return (
        entry &&
        typeof entry.contractId === 'string' &&
        entry.data &&
        typeof entry.cachedAt === 'string' &&
        typeof entry.version === 'number'
      );
    });

    return {
      entries: validEntries,
      schemaVersion: parsed.schemaVersion,
    };
  } catch (err) {
    reportError(err, '[contractCache] Failed to read cache, falling back to empty.');
    return { ...EMPTY_CACHE };
  }
}

/**
 * Writes the contract cache to localStorage.
 * Returns success flag.
 */
function writeCache(cache: CacheStore): boolean {
  if (!isBrowser()) return false;

  try {
    window.localStorage.setItem(CONTRACT_CACHE_KEY, JSON.stringify(cache));
    return true;
  } catch (err) {
    reportError(err, '[contractCache] Failed to write cache to localStorage.');
    return false;
  }
}

/**
 * Enforces the bounded storage limit by retaining the newest entries.
 * Preserves chronological order (oldest first, newest last).
 */
function enforceCacheLimit(cache: CacheStore): CacheStore {
  if (cache.entries.length <= MAX_CACHE_ENTRIES) {
    return cache;
  }

  // Sort by cachedAt ascending (oldest first), preserving array insertion order for ties
  const sorted = [...cache.entries].sort(
    (a, b) => new Date(a.cachedAt).getTime() - new Date(b.cachedAt).getTime(),
  );

  return {
    ...cache,
    entries: sorted.slice(-MAX_CACHE_ENTRIES),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Result returned by cache operations.
 */
export type CacheResult<T> = {
  /** Whether the operation succeeded. */
  success: boolean;
  /** The cached data (if successful). */
  data?: T;
  /** Whether the cached data is stale. */
  stale?: boolean;
  /** Error message if operation failed. */
  error?: string;
};

/**
 * Caches a contract data snapshot.
 *
 * @param contractId - The contract ID.
 * @param data - The contract data to cache.
 * @returns Success flag.
 */
export function cacheContractData(contractId: string, data: ContractData): boolean {
  const cache = readCache();

  // Remove existing entry for this contract if present
  const filtered = cache.entries.filter((entry) => entry.contractId !== contractId);

  const newEntry: CacheEntry = {
    data,
    version: 1,
    cachedAt: new Date().toISOString(),
    contractId,
  };

  const updated = {
    ...cache,
    entries: [...filtered, newEntry],
  };

  const bounded = enforceCacheLimit(updated);
  return writeCache(bounded);
}

/**
 * Retrieves cached contract data by ID.
 *
 * @param contractId - The contract ID to look up.
 * @returns Cache result with data, staleness flag, and success status.
 */
export function getCachedContractData(contractId: string): CacheResult<ContractData> {
  const cache = readCache();
  const entry = cache.entries.find((e) => e.contractId === contractId);

  if (!entry) {
    return {
      success: false,
      error: 'No cached data found for this contract.',
    };
  }

  const cachedAt = new Date(entry.cachedAt).getTime();
  const now = Date.now();
  const stale = now - cachedAt > STALE_THRESHOLD_MS;

  return {
    success: true,
    data: entry.data,
    stale,
  };
}

/**
 * Checks if a contract is cached.
 *
 * @param contractId - The contract ID to check.
 * @returns Whether the contract has a cached entry.
 */
export function hasCachedContract(contractId: string): boolean {
  const cache = readCache();
  return cache.entries.some((e) => e.contractId === contractId);
}

/**
 * Clears all cached contract data.
 *
 * @returns Success flag.
 */
export function clearContractCache(): boolean {
  if (!isBrowser()) return false;

  try {
    window.localStorage.removeItem(CONTRACT_CACHE_KEY);
    return true;
  } catch (err) {
    reportError(err, '[contractCache] Failed to clear contract cache.');
    return false;
  }
}

/**
 * Removes a specific contract from the cache.
 *
 * @param contractId - The contract ID to remove.
 * @returns Success flag.
 */
export function removeCachedContract(contractId: string): boolean {
  const cache = readCache();
  const filtered = cache.entries.filter((e) => e.contractId !== contractId);

  if (filtered.length === cache.entries.length) {
    return false; // Nothing to remove
  }

  return writeCache({ ...cache, entries: filtered });
}

/**
 * Returns the age of a cached contract in milliseconds.
 *
 * @param contractId - The contract ID to check.
 * @returns Age in milliseconds, or null if not cached.
 */
export function getCachedContractAge(contractId: string): number | null {
  const cache = readCache();
  const entry = cache.entries.find((e) => e.contractId === contractId);

  if (!entry) return null;

  const cachedAt = new Date(entry.cachedAt).getTime();
  return Date.now() - cachedAt;
}

/**
 * Returns cache statistics for debugging/monitoring.
 *
 * @returns Object with cache entry count and storage size estimate.
 */
export function getCacheStats(): { entryCount: number; totalSizeBytes: number } {
  const cache = readCache();
  const raw = isBrowser() ? window.localStorage.getItem(CONTRACT_CACHE_KEY) : null;
  const totalSizeBytes = raw ? new Blob([raw]).size : 0;

  return {
    entryCount: cache.entries.length,
    totalSizeBytes,
  };
}
