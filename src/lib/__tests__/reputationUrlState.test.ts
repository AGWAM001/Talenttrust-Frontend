import {
  DEFAULT_DIR,
  DEFAULT_SORT,
  DEFAULT_TYPE,
  REPUTATION_DIR_PARAM,
  REPUTATION_SORT_PARAM,
  REPUTATION_TYPE_PARAM,
  buildReputationQueryString,
  filterAndSortHistory,
  getAvailableHistoryTypes,
  getValidDir,
  getValidSort,
  getValidType,
  isReputationUrlInSync,
  parseReputationUrlState,
} from '../reputationUrlState';

const HISTORY = [
  { id: 'a', type: 'Verification', summary: 'Verified', date: '2026-04-24' },
  { id: 'b', type: 'Referral', summary: 'Referred', date: '2026-04-20' },
  { id: 'c', type: 'On-chain review', summary: 'Reviewed', date: '2026-04-23' },
  { id: 'd', type: 'Referral', summary: 'Another', date: '2026-04-21' },
];

describe('reputationUrlState validators', () => {
  const types = getAvailableHistoryTypes(HISTORY);

  it('getValidType defaults and accepts known types', () => {
    expect(getValidType(null, types)).toBe(DEFAULT_TYPE);
    expect(getValidType('', types)).toBe(DEFAULT_TYPE);
    expect(getValidType('All', types)).toBe(DEFAULT_TYPE);
    expect(getValidType('Verification', types)).toBe('Verification');
    expect(getValidType('Referral', types)).toBe('Referral');
  });

  it('getValidType ignores unknown types when availability is known', () => {
    expect(getValidType('NotARealType', types)).toBe(DEFAULT_TYPE);
    expect(getValidType('bogus', types)).toBe(DEFAULT_TYPE);
  });

  it('getValidType keeps the raw value when availability is empty (pre-data)', () => {
    expect(getValidType('Verification', [])).toBe('Verification');
  });

  it('getValidSort accepts only date and falls back', () => {
    expect(getValidSort(null)).toBe(DEFAULT_SORT);
    expect(getValidSort('date')).toBe('date');
    expect(getValidSort('score')).toBe(DEFAULT_SORT);
    expect(getValidSort('')).toBe(DEFAULT_SORT);
  });

  it('getValidDir accepts asc/desc and falls back', () => {
    expect(getValidDir(null)).toBe(DEFAULT_DIR);
    expect(getValidDir('asc')).toBe('asc');
    expect(getValidDir('desc')).toBe('desc');
    expect(getValidDir('up')).toBe(DEFAULT_DIR);
  });
});

describe('reputationUrlState parse / build round-trip', () => {
  const types = getAvailableHistoryTypes(HISTORY);

  it('parses a shareable query into validated state', () => {
    const params = new URLSearchParams('type=Referral&dir=asc&sort=date');
    expect(parseReputationUrlState((k) => params.get(k), types)).toEqual({
      type: 'Referral',
      sort: 'date',
      dir: 'asc',
    });
  });

  it('ignores invalid params when parsing', () => {
    const params = new URLSearchParams('type=Nope&dir=sideways&sort=name');
    expect(parseReputationUrlState((k) => params.get(k), types)).toEqual({
      type: DEFAULT_TYPE,
      sort: DEFAULT_SORT,
      dir: DEFAULT_DIR,
    });
  });

  it('omits default values from the built query string', () => {
    expect(
      buildReputationQueryString('', {
        type: DEFAULT_TYPE,
        sort: DEFAULT_SORT,
        dir: DEFAULT_DIR,
      })
    ).toBe('');
  });

  it('writes only non-default params and preserves unrelated params', () => {
    const query = buildReputationQueryString('utm=campaign', {
      type: 'Verification',
      sort: DEFAULT_SORT,
      dir: 'asc',
    });
    const params = new URLSearchParams(query);
    expect(params.get(REPUTATION_TYPE_PARAM)).toBe('Verification');
    expect(params.get(REPUTATION_DIR_PARAM)).toBe('asc');
    expect(params.get(REPUTATION_SORT_PARAM)).toBeNull();
    expect(params.get('utm')).toBe('campaign');
  });

  it('includes a non-default sort field when provided', () => {
    const query = buildReputationQueryString('', {
      type: DEFAULT_TYPE,
      // Cast: only "date" is validated today; builder still serialises other fields.
      sort: 'score' as typeof DEFAULT_SORT,
      dir: DEFAULT_DIR,
    });
    expect(new URLSearchParams(query).get(REPUTATION_SORT_PARAM)).toBe('score');
  });

  it('accepts URLSearchParams instances as the current query source', () => {
    const current = new URLSearchParams('keep=1');
    const query = buildReputationQueryString(current, {
      type: 'Referral',
      sort: DEFAULT_SORT,
      dir: DEFAULT_DIR,
    });
    const params = new URLSearchParams(query);
    expect(params.get('keep')).toBe('1');
    expect(params.get(REPUTATION_TYPE_PARAM)).toBe('Referral');
  });

  it('round-trips filter/sort state through query string', () => {
    const state = { type: 'On-chain review', sort: DEFAULT_SORT, dir: 'asc' as const };
    const query = buildReputationQueryString('', state);
    const params = new URLSearchParams(query);
    expect(parseReputationUrlState((k) => params.get(k), types)).toEqual(state);
  });

  it('isReputationUrlInSync treats missing defaults as in sync', () => {
    const params = new URLSearchParams('');
    expect(
      isReputationUrlInSync(
        (k) => params.get(k),
        { type: DEFAULT_TYPE, sort: DEFAULT_SORT, dir: DEFAULT_DIR },
        types
      )
    ).toBe(true);
  });

  it('isReputationUrlInSync detects drift', () => {
    const params = new URLSearchParams('type=Referral');
    expect(
      isReputationUrlInSync(
        (k) => params.get(k),
        { type: DEFAULT_TYPE, sort: DEFAULT_SORT, dir: DEFAULT_DIR },
        types
      )
    ).toBe(false);
  });
});

describe('filterAndSortHistory', () => {
  it('returns a shallow copy and does not mutate the source', () => {
    const original = [...HISTORY];
    const result = filterAndSortHistory(HISTORY, DEFAULT_TYPE, 'asc');
    expect(HISTORY).toEqual(original);
    expect(result).not.toBe(HISTORY);
  });

  it('filters by type', () => {
    const result = filterAndSortHistory(HISTORY, 'Referral', 'desc');
    expect(result.map((e) => e.id)).toEqual(['d', 'b']);
  });

  it('sorts newest first by default', () => {
    const result = filterAndSortHistory(HISTORY, DEFAULT_TYPE, 'desc');
    expect(result.map((e) => e.id)).toEqual(['a', 'c', 'd', 'b']);
  });

  it('sorts oldest first when dir is asc', () => {
    const result = filterAndSortHistory(HISTORY, DEFAULT_TYPE, 'asc');
    expect(result.map((e) => e.id)).toEqual(['b', 'd', 'c', 'a']);
  });

  it('returns an empty list when filter matches nothing', () => {
    expect(filterAndSortHistory(HISTORY, 'Missing', 'desc')).toEqual([]);
  });

  it('lists available types alphabetically without All', () => {
    expect(getAvailableHistoryTypes(HISTORY)).toEqual([
      'On-chain review',
      'Referral',
      'Verification',
    ]);
  });
});
