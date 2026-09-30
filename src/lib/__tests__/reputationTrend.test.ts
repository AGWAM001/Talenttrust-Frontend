import { deriveReputationTrend } from '../reputationTrend';
import type { ReputationEvent } from '@/components/ReputationProfile';

const NOW = Date.parse('2026-07-29T12:00:00Z');
const realDateNow = Date.now.bind(Date);
beforeAll(() => { Date.now = () => NOW; });
afterAll(() => { Date.now = realDateNow; });

function daysAgo(n: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

describe('deriveReputationTrend', () => {
  it('returns stable for empty history', () => {
    expect(deriveReputationTrend([])).toBe('stable');
  });

  it('returns stable for null/undefined history', () => {
    expect(deriveReputationTrend(undefined as unknown as ReputationEvent[])).toBe('stable');
    expect(deriveReputationTrend(null as unknown as ReputationEvent[])).toBe('stable');
  });

  it('returns up when recent events outnumber older events', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(5) },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(10) },
      { id: '3', type: 'Verification', summary: 'C', date: daysAgo(60) },
    ];
    expect(deriveReputationTrend(history)).toBe('up');
  });

  it('returns down when older events outnumber recent events', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(5) },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(40) },
      { id: '3', type: 'Verification', summary: 'C', date: daysAgo(50) },
    ];
    expect(deriveReputationTrend(history)).toBe('down');
  });

  it('returns stable when recent and older counts are equal', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(5) },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(40) },
    ];
    expect(deriveReputationTrend(history)).toBe('stable');
  });

  it('returns stable when all events are older than 90 days', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(100) },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(120) },
    ];
    expect(deriveReputationTrend(history)).toBe('stable');
  });

  it('returns up when only recent events exist (older=0)', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(5) },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(15) },
    ];
    expect(deriveReputationTrend(history)).toBe('up');
  });

  it('skips events with invalid dates', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: 'not-a-date' },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(5) },
      { id: '3', type: 'Verification', summary: 'C', date: daysAgo(60) },
    ];
    expect(deriveReputationTrend(history)).toBe('stable');
  });

  it('returns stable when all event dates are invalid', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: 'invalid' },
    ];
    expect(deriveReputationTrend(history)).toBe('stable');
  });

  it('handles single recent event', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(3) },
    ];
    expect(deriveReputationTrend(history)).toBe('up');
  });

  it('handles event within 30-day window as recent', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(29) },
    ];
    expect(deriveReputationTrend(history)).toBe('up');
  });

  it('handles event at day 31 as older', () => {
    const history: ReputationEvent[] = [
      { id: '1', type: 'Verification', summary: 'A', date: daysAgo(31) },
      { id: '2', type: 'Review', summary: 'B', date: daysAgo(5) },
    ];
    expect(deriveReputationTrend(history)).toBe('stable');
  });
});
