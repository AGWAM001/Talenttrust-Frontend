import type { Reputation, ReputationEvent } from '@/types/domain';

export const REPUTATION_MAX_SCORE = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateReputationEvent(
  event: unknown,
  index: number,
  ids: Set<string>,
): asserts event is ReputationEvent {
  if (!isRecord(event)) {
    throw new Error(`reputation history event ${index} must be an object`);
  }

  const id = event.id;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new Error(`reputation history event ${index} has an invalid id`);
  }

  if (ids.has(id)) {
    throw new Error('reputation history contains duplicate event identifiers');
  }
  ids.add(id);

  for (const field of ['type', 'summary'] as const) {
    const value = event[field];
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`reputation history event ${index} has an invalid ${field}`);
    }
  }

  const date = event.date;
  if (
    typeof date !== 'string' ||
    date.trim() === '' ||
    Number.isNaN(Date.parse(date))
  ) {
    throw new Error(`reputation history event ${index} has an invalid date`);
  }

  if ('version' in event && event.version !== undefined) {
    if (
      typeof event.version !== 'number' ||
      !Number.isFinite(event.version) ||
      !Number.isInteger(event.version) ||
      event.version < 0
    ) {
      throw new Error(`reputation history event ${index} has an invalid version`);
    }
  }
}

export function validateReputationData(
  data: unknown,
): asserts data is Reputation {
  if (!isRecord(data)) {
    throw new Error('reputation data must be a non-null object');
  }

  if ('score' in data && data.score !== null && data.score !== undefined) {
    if (
      typeof data.score !== 'number' ||
      !Number.isFinite(data.score) ||
      data.score < 0 ||
      data.score > REPUTATION_MAX_SCORE
    ) {
      throw new Error(
        `reputation score must be a finite number between 0 and ${REPUTATION_MAX_SCORE}`,
      );
    }
  }

  if ('level' in data && data.level !== undefined) {
    if (typeof data.level !== 'string' || data.level.trim() === '') {
      throw new Error('reputation level must be a non-empty string when provided');
    }
  }

  if ('history' in data && data.history !== undefined) {
    if (!Array.isArray(data.history)) {
      throw new Error('reputation history must be an array');
    }

    const ids = new Set<string>();
    data.history.forEach((event, index) => {
      validateReputationEvent(event, index, ids);
    });
  }
}
