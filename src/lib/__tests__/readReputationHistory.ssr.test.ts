/** @jest-environment node */
import { readReputationHistory } from '../readReputationHistory';

test('SSR does not silently claim an empty persisted history', () => {
  expect(readReputationHistory).toThrow(expect.objectContaining({ reason: 'storage-unavailable' }));
});
