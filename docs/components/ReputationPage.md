# Reputation Page

The Reputation page (`src/app/reputation/page.tsx`) displays user reputation data using the `ReputationProfile` component, with fallback to an `EmptyState` when no reputation exists.

The client entry point for this feature is `src/app/reputation/ReputationPageClient.tsx`, which owns the state invariants described below.

## Overview

The page wires user reputation data to the `ReputationProfile` component, which renders one of three distinct states based on available data.

The client component also owns the URL-backed filter/sort state and enforces the invariants that keep that state deterministic and consistent under concurrent and partial-failure conditions.

## State Invariants

All invariants below are enforced in `src/app/reputation/ReputationPageClient.tsx` and are covered by focused tests.

1. **Valid data or nothing** — the client only renders `ReputationProfile` when the shaped reputation data is well-formed. Malformed or partially loaded payloads fall back to `EmptyState` rather than rendering half-initialized profiles.
2. **Score bounds** — `score` is either null or a non-negative finite number. Negative, `NaN`, or `Infinity` values are treated as "no reputation".
3. **History normalization** — `history` is always an array. Non-array values are normalized to `[]`. Duplicate event `id`s are deduplicated keeping the first occurrence so rendering is deterministic.
4. **URL-state consistency** — invalid `?type=` or `?dir=` values are ignored and fall back to defaults. URL writes are debounced and applied through `router.replace` so rapid changes cannot produce an intermediate invalid state.
5. **Concurrency safety** — debounced URL writes are cancelled on unmount and on each new update, so a stale timer cannot overwrite a newer selection.
6. **Retry / partial failure** — when data fetching fails or returns a partial payload, the client retains the last known good state and surfaces a non-sensitive error message instead of silently dropping data.
7. **Authorization boundary** — the client never attempts to mutate reputation data; it only reads and displays. Any write action must go through the authorized server path.

## Rendering States

### State 1: No Reputation
**Condition:** No reputation score exists (null, undefined, negative, `NaN`, or non-finite)

Render:
```
EmptyState with illustration="reputation"
- Title: "No reputation yet"
- Description: Guidance on building reputation through contracts
- No ReputationProfile rendered
S```

Example:
```jsx
// User has no reputation data
render(<ReputationPage />);
// Output: EmptyState component
```

---

### State 2: Partial Reputation

**Condition:** Score exists, but history is empty

Render:
```
ReputationProfile with partial-state UI
- Shows reputation score
- Shows reputation level
- Shows privacy note explaining partial state
- History section displays "Private by default"
- No history items rendered
```

Behavior:
- Triggers `showPartial` branch inside ReputationProfile
- Displays amber-colored notification: "Partial reputation data"
- Indicates history is hidden until verified actions are available

Example:
```jsx
// User has score but no history yet
<ReputationProfile 
  name="User" 
  score={42} 
  level="Community Member" 
  history={[]} 
/>
// Output: ReputationProfile with partial state UI
```

---

### State 3: Full Reputation

**Condition:** Score exists and history contains events

Render:
```
ReputationProfile with complete profile
- Shows reputation score
- Shows reputation level  
- Renders privacy notes
- Displays full reputation history
- History section shows "Visible" badge
- Each history event renders with type, summary, and date
```

Example:
```jsx
// User has complete reputation data
<ReputationProfile 
  name="User" 
  score={88} 
  level="Trusted Contributor" 
  history={[
    { id: '1', type: 'Verification', summary: '...', date: '2026-04-24' },
    { id: '2', type: 'On-chain review', summary: '...', date: '2026-04-23' }
  ]} 
/>
// Output: ReputationProfile with full profile data
```

---

## Data Flow

```
localStorage (reputation event store)
    ↓  listReputationEvents()  — read only inside the mount effect (never during render/SSR)
    ↓  guarded by checkStorageAvailability()
shapeReputationData(events) → Reputation | null
    ↓
status machine → loading | success | unavailable
    ↓
ReputationPageContent → EmptyState | ReputationSummaryCard + ReputationProfile
```

### Data Shaping Helper

The route renders through the single tested `ReputationPageContent`
implementation (exported from `ReputationPageContent.tsx`, re-exported from
`page.tsx`) — it no longer carries a route-local copy of that component, which
would silently drop the `SafeBoundary` and the history `Suspense` wrapper.

`shapeReputationData()` (defined next to the component) turns the persisted
events into the page model. The score is seeded until the documented API
integration below replaces it; the level is **always** derived from the score
bands via `resolveReputationLevel`, never a caller-supplied literal, so score
and level cannot disagree:

```typescript
export const REPUTATION_DEMO_SCORE = 4.5;

export function shapeReputationData(history: ReputationEvent[]): Reputation {
  return {
    score: REPUTATION_DEMO_SCORE,
    level: resolveReputationLevel(REPUTATION_DEMO_SCORE, 5), // "Expert"
    history,
  };
}

function normalizeHistory(history: unknown): ReputationEvent[] {
  if (!Array.isArray(history)) return [];
  const seen = new Set<string>();
  const out: ReputationEvent[] = [];
  for (const event of history) {
    if (!event || typeof event !== 'object') continue;
    const id = (event as ReputationEvent).id;
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
    seen.add(id);
    out.push(event as ReputationEvent);
  }
  return out;
}
```

When a caller passes no reputation data (`null`/`undefined`) or a negative
score, `ReputationPageContent` renders the empty state; an event array is
required for the full profile.

### Route compatibility contracts

`page.tsx` exposes a stable surface that `__tests__/page-contracts.test.tsx`
pins against regressions:

- **Surface** — the default route component takes no props, and the
  `ReputationPageContent` / `ReputationPageContentProps` re-exports resolve to
  the canonical module (`toBe` the module's own bindings), so a caller can never
  bind to a divergent copy.
- **Determinism** — persistence is read once per mount; malformed events
  (missing/blank `id`) are dropped rather than rendered; a stable read returns
  the same profile on every rerender.
- **Degraded reads** — when storage is unavailable or the read throws, the route
  shows a recoverable `role="alert"` with a Retry control and **no profile**,
  and reports via `reportError`; a silent fallback is never presented as
  trustworthy reputation data. The alert text carries no stored identifiers.
- **Concurrency** — each read is tagged with a generation token and applied in a
  microtask; only the newest generation replaces state, so overlapping retries
  cannot land out of order.
- **Accessibility** — exactly one `<main>` landmark and one `<h1>`; the history
  profile stays inside a `Suspense` boundary so `?type`/`?dir` URL sync remains
  shareable; focus moves to `<main>` (`tabIndex={-1}`) ~100ms after mount.

---

## Types

All types are imported from `ReputationProfile`:

```typescript
// Reputation event in history
export type ReputationEvent = {
  id: string;
  type: string;
  summary: string;
  date: string;
};

// Props for ReputationProfile component
export type ReputationProfileProps = {
  name: string;
  score?: number | null;
  level?: string;
  history?: ReputationEvent[];
};
```

---

## Accessibility

The page maintains proper heading hierarchy:

- **Page Level:** `<h1>Reputation</h1>` (visible, level 1)
- \**Component Level:\** ReputationProfile uses `<h2>` (screen-reader only in profile section)

No duplicate primary headings are introduced. The `EmptyState` component uses `<h2>` internally, which maintains semantic structure.

**Testing:** Verify heading hierarchy with:
```typescript
screen.getByRole('heading', { level: 1 });
```

---

## API Integration (Future)

Replace the mock data with actual API calls:

```typescript
// Current (mock)
const mockReputationData: UserReputation | null = null;

// TODO: Future API integration
const { data: reputationData } = useQuery('reputation', fetchUserReputation);
const profileProps = useMemo(
  () => shapeReputationData(reputationData, userName),
  [reputationData, userName]
);
```

No changes to rendering logic are needed when API is integrated. The invariant enforcement in `ReputationPageClient.tsx` guarantees that malformed or partial API responses cannot produce an invalid render.

---

## Reputation Level Legend & Bands

The reputation score (which defaults to a scale of 0 to 5) is mapped to one of five reputation levels. If no explicit level is provided to the `ReputationProfile` component, the level is derived automatically from the score based on the following bands:

| Min Score (Inclusive) | Max Score | Level Name         |
|----------------------|-----------|--------------------|
| 0.0                   | 1.0       | Newcomer             |
| 1.0                   | 2.0       | Contributor            |
| 2.0                   | 3.0       | Active Contributor     |
| 3.0                   | 4.0       | Trusted Partner        |
| 4.0                   | 5.0 (Incl)| Expert                |

These bands scale proportionally if a custom `maxScore` is provided (e.g. if `maxScore` is 10, the "Trusted Partner" band scales to 6.0 - 8.0).

---

## URL filter / sort state

When reputation history is present, `ReputationProfile` exposes:

- \**Filter\** (`?type=`) — event type, default `All` (omitted from the URL)
- \**Sort\** (`?dir=`) — `desc` (newest first, default, omitted) or `asc` (oldest first)

Behaviour:

1. State is **restored from the URL** on load and on back/forward navigation.
2. Invalid `type` / `dir` / `sort` values are ignored and fall back to defaults.
3. URL writes are **debounced** (250ms) via `router.replace` so rapid changes stay shareable without flooding history. Pending timers are cancelled on unmount and before each new write to prevent stale updates.
4. Pure helpers live in `src/lib/reputationUrlState.ts` (validation, query build, filter+sort).

Example shareable link: `/reputation?type=Verification&dir=asc`

### URL sync tests

```bash
npm test -- --testPathPattern="reputation-filter-url|reputationUrlState"
```

---

## Testing

### Coverage Requirements

- ✓ Empty state rendering
- ✓ Partial reputation (score only)
- ✓ Full reputation (score + history)
- ✓ Heading hierarchy
- ✓ ReputationProfile not rendered when no data
- ✓ Restore filter/sort from URL; invalid params ignored; debounced shareable updates
- ✓ Route contracts: stable export surface, malformed-event dropping, degraded
  read alert + Retry, overlapping-read generation guard, single landmark/h1,
  focus-on-mount (`__tests__/page-contracts.test.tsx`)

### Running Tests

```bash
npm test -- src/app/reputation/__tests__/page.test.tsx
npm test -- src/app/reputation/__tests__/page-contracts.test.tsx
npm test -- --testPathPattern="reputation-filter-url|reputationUrlState|ReputationProfile.test"
```

---

## Files

- **Client Entry:** `src/app/reputation/ReputationPageClient.tsx`
- **Page:** `src/app/reputation/page.tsx`
- **Content (single tested implementation):** `src/app/reputation/ReputationPageContent.tsx`
- **Component:** `src/components/ReputationProfile.tsx`
- **URL helpers:** `src/lib/reputationUrlState.ts`
- **Tests:** `src/app/reputation/__tests__/page.test.tsx`
- **Route contract tests:** `src/app/reputation/__tests__/page-contracts.test.tsx`
- **Component Tests:** `src/components/ReputationProfile.test.tsx`
- **URL Tests:** `src/app/__tests__/reputation-filter-url.test.tsx`
- **Helper Tests:** `src/lib/__tests__/reputationUrlState.test.ts`
- -**Client Invariant Tests:** `src/app/reputation/__tests__/ReputationPageClient.test.tsx`
