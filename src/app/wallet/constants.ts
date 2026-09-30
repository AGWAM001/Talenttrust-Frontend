import type { WalletItem } from '@/types/domain';

/**
 * Canonical starter wallet items shown when the repository is empty.
 *
 * Invariants (relied on for deterministic failure recovery):
 * - The array and every item are deeply frozen, so consumers can never mutate
 *   the seed. A mutated seed would make each mount seed different data.
 * - Do not read this constant directly for mutable state. Callers that need a
 *   writable copy (React state, persistence) must go through
 *   {@link getSampleWalletItems}, which returns fresh, de-duplicated copies.
 */
const RAW_SAMPLE_WALLET_ITEMS: WalletItem[] = [
  {
    id: 'w-1',
    name: 'Stellar Lumens (XLM)',
    type: 'Native Asset',
    balance: 12500,
    currency: 'XLM',
    address: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
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
];

// Deep-freeze so the seed can never drift between mounts. WalletItem is a flat
// record of primitives, so freezing each item plus the array is sufficient.
RAW_SAMPLE_WALLET_ITEMS.forEach((item) => Object.freeze(item));
Object.freeze(RAW_SAMPLE_WALLET_ITEMS);

/**
 * @deprecated Read-only demo seed. Prefer {@link getSampleWalletItems}, which
 * returns fresh, validated copies safe to place in state or persist. Kept for
 * backward compatibility with existing read-only consumers and tests.
 */
export const SAMPLE_WALLET_ITEMS: WalletItem[] = RAW_SAMPLE_WALLET_ITEMS;

/**
 * Returns a deterministic, writable copy of the starter wallet items.
 *
 * The result is normalized so seeding is idempotent and safe to retry:
 * - Entries without a usable string `id` are dropped.
 * - Duplicate ids collapse to the first occurrence, so a partial seed that is
 *   retried can never create duplicate rows (stable React keys / store ids).
 * - Order is preserved, so the seed layout is stable across mounts.
 * - Every returned object is a fresh shallow copy, so mutating React state or
 *   persisting the record never aliases (or mutates) the frozen constant.
 */
export function getSampleWalletItems(): WalletItem[] {
  const seen = new Set<string>();
  const normalized: WalletItem[] = [];

  for (const item of RAW_SAMPLE_WALLET_ITEMS) {
    if (typeof item.id !== 'string' || item.id.length === 0) {
      continue;
    }
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    normalized.push({ ...item });
  }

  return normalized;
}
