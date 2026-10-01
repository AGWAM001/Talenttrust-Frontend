/** Minimal history event shape needed for filter/sort helpers. */
export type ReputationHistoryItem = {
  id: string;
  type: string;
  date: string;
};

/** Query param keys used by the reputation page. */
export const REPUTATION_TYPE_PARAM = 'type';
export const REPUTATION_SORT_PARAM = 'sort';
export const REPUTATION_DIR_PARAM = 'dir';

/** Debounce delay (ms) before writing filter/sort changes to the URL. */
export const REPUTATION_URL_DEBOUNCE_MS = 250;

export type ReputationSortField = 'date';
export type ReputationSortDir = 'asc' | 'desc';

export const DEFAULT_TYPE = 'All';
export const DEFAULT_SORT: ReputationSortField = 'date';
export const DEFAULT_DIR: ReputationSortDir = 'desc';

const VALID_SORTS: ReputationSortField[] = ['date'];
const VALID_DIRS: ReputationSortDir[] = ['asc', 'desc'];

/**
 * Validate a type filter query value.
 * Unknown or empty values fall back to {@link DEFAULT_TYPE}.
 * When `availableTypes` is provided (excluding "All"), the value must be in that set.
 */
export function getValidType(
  param: string | null | undefined,
  availableTypes: readonly string[] = []
): string {
  if (!param || param === DEFAULT_TYPE) return DEFAULT_TYPE;
  if (availableTypes.length === 0) return param;
  return availableTypes.includes(param) ? param : DEFAULT_TYPE;
}

/** Validate a sort-field query value; invalid → {@link DEFAULT_SORT}. */
export function getValidSort(param: string | null | undefined): ReputationSortField {
  return param && (VALID_SORTS as string[]).includes(param)
    ? (param as ReputationSortField)
    : DEFAULT_SORT;
}

/** Validate a sort-direction query value; invalid → {@link DEFAULT_DIR}. */
export function getValidDir(param: string | null | undefined): ReputationSortDir {
  return param && (VALID_DIRS as string[]).includes(param)
    ? (param as ReputationSortDir)
    : DEFAULT_DIR;
}

export type ReputationUrlState = {
  type: string;
  sort: ReputationSortField;
  dir: ReputationSortDir;
};

/** Parse and validate reputation URL state from a search-params-like object. */
export function parseReputationUrlState(
  getParam: (key: string) => string | null,
  availableTypes: readonly string[] = []
): ReputationUrlState {
  return {
    type: getValidType(getParam(REPUTATION_TYPE_PARAM), availableTypes),
    sort: getValidSort(getParam(REPUTATION_SORT_PARAM)),
    dir: getValidDir(getParam(REPUTATION_DIR_PARAM)),
  };
}

/**
 * Build a query string for the given reputation state.
 * Default values are omitted so shareable URLs stay compact.
 * Unrelated existing params are preserved.
 */
export function buildReputationQueryString(
  current: { toString(): string } | URLSearchParams | string,
  state: ReputationUrlState
): string {
  const params = new URLSearchParams(
    typeof current === 'string' ? current : current.toString()
  );

  if (state.type === DEFAULT_TYPE) {
    params.delete(REPUTATION_TYPE_PARAM);
  } else {
    params.set(REPUTATION_TYPE_PARAM, state.type);
  }

  if (state.sort === DEFAULT_SORT) {
    params.delete(REPUTATION_SORT_PARAM);
  } else {
    params.set(REPUTATION_SORT_PARAM, state.sort);
  }

  if (state.dir === DEFAULT_DIR) {
    params.delete(REPUTATION_DIR_PARAM);
  } else {
    params.set(REPUTATION_DIR_PARAM, state.dir);
  }

  return params.toString();
}

/**
 * Whether the URL already reflects `state` (after normalisation).
 * Used to avoid redundant `router.replace` calls.
 */
export function isReputationUrlInSync(
  getParam: (key: string) => string | null,
  state: ReputationUrlState,
  availableTypes: readonly string[] = []
): boolean {
  const parsed = parseReputationUrlState(getParam, availableTypes);
  return (
    parsed.type === state.type &&
    parsed.sort === state.sort &&
    parsed.dir === state.dir
  );
}

/** Unique event types present in history, sorted alphabetically (no "All"). */
export function getAvailableHistoryTypes(history: readonly ReputationHistoryItem[]): string[] {
  return Array.from(new Set(history.map((event) => event.type))).sort();
}

/**
 * Filter by event type then sort by date without mutating the source array.
 * Non-parseable dates sort as `0` so they stay stable relative to each other.
 */
export function filterAndSortHistory<T extends ReputationHistoryItem>(
  history: readonly T[],
  type: string,
  dir: ReputationSortDir = DEFAULT_DIR,
  _sort: ReputationSortField = DEFAULT_SORT
): T[] {
  const filtered =
    type === DEFAULT_TYPE
      ? [...history]
      : history.filter((event) => event.type === type);

  const multiplier = dir === 'asc' ? 1 : -1;
  filtered.sort((a, b) => {
    const aTime = Date.parse(a.date);
    const bTime = Date.parse(b.date);
    const aVal = Number.isNaN(aTime) ? 0 : aTime;
    const bVal = Number.isNaN(bTime) ? 0 : bTime;
    if (aVal === bVal) return a.id.localeCompare(b.id);
    return (aVal - bVal) * multiplier;
  });

  return filtered;
}
