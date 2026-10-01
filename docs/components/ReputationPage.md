# Reputation Page

The Reputation page (`src/app/reputation/page.tsx`) displays user reputation data using the `ReputationProfile` component, with fallback to an `EmptyState` when no reputation exists.

## Overview

The page wires user reputation data to the `ReputationProfile` component, which renders one of three distinct states based on available data.

## Rendering States

### State 1: No Reputation
**Condition:** No reputation score exists (null, undefined, or negative)

**Render:**
```
EmptyState with illustration="reputation"
- Title: "No reputation yet"
- Description: Guidance on building reputation through contracts
- No ReputationProfile rendered
```

**Example:**
```jsx
// User has no reputation data
render(<ReputationPage />);
// Output: EmptyState component
```

---

### State 2: Partial Reputation
**Condition:** Score exists, but history is empty

**Render:**
```
ReputationProfile with partial-state UI
- Shows reputation score
- Shows reputation level
- Shows privacy note explaining partial state
- History section displays "Private by default"
- No history items rendered
```

**Behavior:**
- Triggers `showPartial` branch inside ReputationProfile
- Displays amber-colored notification: "Partial reputation data"
- Indicates history is hidden until verified actions are available

**Example:**
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

**Render:**
```
ReputationProfile with complete profile
- Shows reputation score
- Shows reputation level  
- Renders privacy notes
- Displays full reputation history
- History section shows "Visible" badge
- Each history event renders with type, summary, and date
```

**Example:**
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
UserReputation (API/mock)
    ↓
shapeReputationData() → ReputationProfileProps
    ↓
useMemo (memoized)
    ↓
hasReputation check → Routing
    ↓
EmptyState OR ReputationProfile
```

### Data Shaping Helper

The `shapeReputationData()` helper ensures type safety and provides sensible defaults:

```typescript
interface UserReputation {
  score?: number | null;
  level?: string;
  history?: ReputationEvent[];
}

function shapeReputationData(
  reputationData: UserReputation | null | undefined,
  userName: string = 'User'
): ReputationProfileProps {
  return {
    name: userName,
    score: reputationData?.score ?? null,
    level: reputationData?.level ?? 'Community Member',
    history: reputationData?.history ?? [],
  };
}
```

**Defaults:**
- `score`: null (triggers EmptyState)
- `level`: "Community Member"
- `history`: [] (empty array)

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
- **Component Level:** ReputationProfile uses `<h2>` (screen-reader only in profile section)

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

No changes to rendering logic are needed when API is integrated.

---

## Reputation Level Legend & Bands

The reputation score (which defaults to a scale of 0 to 5) is mapped to one of five reputation levels. If no explicit level is provided to the `ReputationProfile` component, the level is derived automatically from the score based on the following bands:

| Min Score (Inclusive) | Max Score | Level Name |
|-----------------------|-----------|------------|
| 0.0                   | 1.0       | Newcomer   |
| 1.0                   | 2.0       | Contributor|
| 2.0                   | 3.0       | Active Contributor |
| 3.0                   | 4.0       | Trusted Partner    |
| 4.0                   | 5.0 (Incl)| Expert     |

These bands scale proportionally if a custom `maxScore` is provided (e.g., if `maxScore` is 10, the "Trusted Partner" band scales to 6.0 - 8.0).

---

## URL filter / sort state

When reputation history is present, `ReputationProfile` exposes:

- **Filter** (`?type=`) — event type, default `All` (omitted from the URL)
- **Sort** (`?dir=`) — `desc` (newest first, default, omitted) or `asc` (oldest first)

Behaviour:

1. State is **restored from the URL** on load and on back/forward navigation.
2. Invalid `type` / `dir` / `sort` values are ignored and fall back to defaults.
3. URL writes are **debounced** (250ms) via `router.replace` so rapid changes stay shareable without flooding history.
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

### Running Tests

```bash
npm test -- src/app/reputation/__tests__/page.test.tsx
npm test -- --testPathPattern="reputation-filter-url|reputationUrlState|ReputationProfile.test"
```

---

## Files

- **Page:** `src/app/reputation/page.tsx`
- **Component:** `src/components/ReputationProfile.tsx`
- **URL helpers:** `src/lib/reputationUrlState.ts`
- **Tests:** `src/app/reputation/__tests__/page.test.tsx`
- **Component Tests:** `src/components/ReputationProfile.test.tsx`
- **URL Tests:** `src/app/__tests__/reputation-filter-url.test.tsx`
- **Helper Tests:** `src/lib/__tests__/reputationUrlState.test.ts`
