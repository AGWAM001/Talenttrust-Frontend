# `sortContracts`

Deterministic client-side ordering for the Contracts list toolbar.

**Module:** [`src/lib/sortContracts.ts`](../../src/lib/sortContracts.ts)
**Consumer:** [`src/app/contracts/page.tsx`](../../src/app/contracts/page.tsx)

## Why this exists

The Contracts list needs to surface recently created contracts first. Ordering
used to be an inline comparator inside the page component, which made it hard to
test and left ties (contracts sharing a `createdAt` value) resolved by whatever
order `listContracts()` happened to return. This module extracts the comparator,
gives it a stable tie-break, and makes it testable in isolation.

## API

| Export | Purpose |
| --- | --- |
| `ContractSortOrder` | Union of the four supported orderings. |
| `DEFAULT_CONTRACT_SORT_ORDER` | `'date-desc'` — newest created first. |
| `CONTRACT_SORT_OPTIONS` | Toolbar `<option>` values and labels, in display order. |
| `isContractSortOrder(value)` | Type guard for an arbitrary value. |
| `toContractSortOrder(value)` | Coerces a `<select>` value, falling back to the default. |
| `compareContracts(a, b, order)` | The comparator, for callers that compose their own sort. |
| `sortContracts(contracts, order?)` | Returns a **new** ordered array; never mutates the input. |

## Ordering rules

1. **`date-desc` / `date-asc`** compare `Date.parse(createdAt)`.
   `createdAt` is a display string, so values that fail to parse are treated as
   the oldest possible date — they group together at one end of the list rather
   than scattering.
2. **`value-desc` / `value-asc`** compare `totalValue`.
3. **Every ordering** falls back to an ascending comparison of `id`. Contracts
   that tie on the primary key therefore always come out in the same order, no
   matter how the incoming array was arranged.

Because the tie-break is total, `sortContracts` is a pure function of the list's
contents: re-sorting an already-sorted list, or sorting a shuffled copy, yields
identical output.

## Composing with search

The page filters first and sorts second:

```tsx
const filteredContracts = useMemo(() => /* search by name/party */, [contracts, searchQuery]);
const sortedContracts = useMemo(
  () => sortContracts(filteredContracts, sortOrder),
  [filteredContracts, sortOrder],
);
```

Changing the search query or the sort order re-derives the list without
refetching, and the exports (CSV/JSON) and result count both read from
`sortedContracts`, so what you see is what you export.

## Tests

- [`src/lib/__tests__/sortContracts.test.ts`](../../src/lib/__tests__/sortContracts.test.ts)
  — ordering in both directions, human-readable and ISO dates, same-day
  timestamps, equal-timestamp tie-breaks, duplicate ids, unparsable dates,
  empty and single-item lists, input immutability, and the sort-order helpers.
  100% statement/branch/function/line coverage of the module.
- [`src/app/contracts/__tests__/page.test.tsx`](../../src/app/contracts/__tests__/page.test.tsx)
  — toolbar integration: default ordering, switching to oldest-first, tie-break
  through the rendered list, and combining the sort with the search filter.
