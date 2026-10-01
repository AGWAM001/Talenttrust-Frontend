import { readReputationHistory, ReputationHistoryReadError } from '../readReputationHistory';
import { STORAGE_KEY, listReputationEvents } from '../repository';
import * as reporter from '../errorReporter';

const event = { id: 'event-1', type: 'Review', summary: 'Contract completed', date: '2026-09-01' };

beforeEach(() => window.localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test('missing key and legacy snapshots are legitimate empty history', () => {
  expect(readReputationHistory()).toEqual([]);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ contracts: [{ id: 'keep' }] }));
  expect(readReputationHistory()).toEqual([]);
});

test('valid snapshots preserve order, extra fields and unrelated persisted data without writes', () => {
  const data = {
    contracts: [{ id: 'keep' }],
    reputationEvents: [event, { ...event, id: 'event-2', version: 1 }],
  };
  const raw = JSON.stringify(data);
  window.localStorage.setItem(STORAGE_KEY, raw);
  const write = jest.spyOn(window.localStorage, 'setItem');
  const remove = jest.spyOn(window.localStorage, 'removeItem');
  const result = readReputationHistory();
  expect(result).toEqual(data.reputationEvents);
  result[0].summary = 'Only an in-memory change';
  expect(readReputationHistory()).toEqual(data.reputationEvents);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
  expect(write).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

test('storage access failure is bounded and recovers without erasing data', () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ reputationEvents: [event] }));
  jest.spyOn(window.localStorage, 'getItem').mockImplementationOnce(() => {
    throw new Error('private credential');
  });
  expect(readReputationHistory).toThrow(
    expect.objectContaining({
      reason: 'storage-unavailable',
      message: 'Reputation history could not be read',
    }),
  );
  expect(readReputationHistory()).toEqual([event]);
});

test.each([
  '',
  'private broken JSON',
  'null',
  'false',
  '3',
  '"private"',
  '[]',
  '{"reputationEvents":null}',
  '{"reputationEvents":{}}',
])('rejects invalid snapshots without changing the bytes: %s', (raw) => {
  window.localStorage.setItem(STORAGE_KEY, raw);
  expect(readReputationHistory).toThrow(expect.objectContaining({ reason: 'invalid-data' }));
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
});

test.each([
  null,
  3,
  [],
  {},
  { ...event, id: 3 },
  { ...event, id: ' ' },
  { ...event, type: 3 },
  { ...event, type: '' },
  { ...event, summary: 3 },
  { ...event, summary: ' ' },
  { ...event, date: 3 },
  { ...event, date: 'invalid' },
  { ...event, version: null },
  { ...event, version: '1' },
  { ...event, version: 0 },
  { ...event, version: -1 },
  { ...event, version: 1.5 },
  { ...event, version: Number.MAX_SAFE_INTEGER + 1 },
])('rejects the whole snapshot on an invalid entry %p, preserving valid siblings', (invalid) => {
  const raw = JSON.stringify({ reputationEvents: [event, invalid] });
  window.localStorage.setItem(STORAGE_KEY, raw);
  expect(readReputationHistory).toThrow(ReputationHistoryReadError);
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
});

test('duplicate ids are rejected rather than partially deduplicated', () => {
  const raw = JSON.stringify({
    reputationEvents: [event, { ...event, summary: 'Different data' }],
  });
  window.localStorage.setItem(STORAGE_KEY, raw);
  expect(readReputationHistory).toThrow(expect.objectContaining({ reason: 'invalid-data' }));
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
});

test('legacy repository callers keep their fallback while the page loader exposes a failed read', () => {
  jest.spyOn(reporter, 'reportError').mockImplementation(() => undefined);
  window.localStorage.setItem(STORAGE_KEY, 'broken JSON');
  expect(listReputationEvents()).toEqual([]);
  expect(readReputationHistory).toThrow(expect.objectContaining({ reason: 'invalid-data' }));
  expect(window.localStorage.getItem(STORAGE_KEY)).toBe('broken JSON');
});

test('empty history and maximum safe version are valid boundaries', () => {
  window.localStorage.setItem(STORAGE_KEY, '{"reputationEvents":[]}');
  expect(readReputationHistory()).toEqual([]);
  const boundary = { ...event, version: Number.MAX_SAFE_INTEGER };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ reputationEvents: [boundary] }));
  expect(readReputationHistory()).toEqual([boundary]);
});
