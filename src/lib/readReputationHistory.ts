import { STORAGE_KEY } from '@/lib/repository';
import type { ReputationEvent } from '@/types/domain';

export class ReputationHistoryReadError extends Error {
  constructor(readonly reason: 'storage-unavailable' | 'invalid-data') {
    super('Reputation history could not be read');
    this.name = 'ReputationHistoryReadError';
  }
}

/** Strict, read-only snapshot for the reputation page; never repairs or clears storage. */
export function readReputationHistory(): ReputationEvent[] {
  let raw: string | null;
  try {
    if (typeof window === 'undefined') {
      throw new Error();
    }
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new ReputationHistoryReadError('storage-unavailable');
  }
  if (raw === null) return [];

  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    const history: unknown = (data as Record<string, unknown>).reputationEvents;
    // Older app snapshots may predate reputation history entirely.
    if (history === undefined) return [];
    if (!Array.isArray(history)) throw new Error();
    const ids = new Set<string>();
    for (const event of history) {
      if (
        !event ||
        typeof event !== 'object' ||
        typeof event.id !== 'string' ||
        !event.id.trim() ||
        ids.has(event.id) ||
        typeof event.type !== 'string' ||
        !event.type.trim() ||
        typeof event.summary !== 'string' ||
        !event.summary.trim() ||
        typeof event.date !== 'string' ||
        Number.isNaN(Date.parse(event.date)) ||
        (event.version !== undefined && (!Number.isSafeInteger(event.version) || event.version < 1))
      ) {
        throw new Error();
      }
      ids.add(event.id);
    }
    // Reject the whole snapshot on any invalid entry: never silently drop user data.
    return history;
  } catch {
    throw new ReputationHistoryReadError('invalid-data');
  }
}
