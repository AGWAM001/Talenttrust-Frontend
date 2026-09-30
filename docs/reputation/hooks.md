# Reputation Hooks & Utilities

This document provides a comprehensive reference for the reputation module's custom helper functions, utilities, and types. These functions power the reputation profile component with deterministic, testable, and accessible reputation tracking.

## Table of Contents

- [Helper Functions](#helper-functions)
  - [getReputationBands](#getreputationbands)
  - [resolveReputationLevel](#resolverepuationlevel)
- [Utility Functions](#utility-functions)
  - [formatRelativeTime](#formatrelativetime)
  - [toISOString](#toisostring)
- [Types](#types)
  - [ReputationProfileProps](#reputationprofileprops)
  - [ReputationEvent](#reputationevent)
  - [ReputationBand](#reputationband)
- [Examples](#examples)

---

## Helper Functions

### `getReputationBands`

Scales a set of baseline reputation level bands based on a maximum score value.

#### Location

`src/components/ReputationProfile.tsx`

#### Signature

```typescript
function getReputationBands(maxScore: number): ReputationBand[]
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `maxScore` | `number` | The maximum possible reputation score. Used to calculate the scale factor for band boundaries. |

#### Returns

Returns an array of `ReputationBand` objects. Each band contains:
- `min` (number): Lower bound of the score range
- `max` (number): Upper bound of the score range
- `label` (string): Human-readable reputation level name

#### Baseline Bands

The function uses these five baseline bands, scaled proportionally:

```
0-1:     Newcomer
1-2:     Contributor
2-3:     Active Contributor
3-4:     Trusted Partner
4-5:     Expert
```

#### Behavior

- Divides the `maxScore` by 5 to calculate the scale factor
- Maps each baseline band's min/max by the scale factor
- Preserves band labels

#### Example

```typescript
import { getReputationBands } from '@/components/ReputationProfile';

// Default case (max score = 5)
const bands = getReputationBands(5);
// Result: [
//   { min: 0, max: 1, label: 'Newcomer' },
//   { min: 1, max: 2, label: 'Contributor' },
//   { min: 2, max: 3, label: 'Active Contributor' },
//   { min: 3, max: 4, label: 'Trusted Partner' },
//   { min: 4, max: 5, label: 'Expert' }
// ]

// Custom max score
const customBands = getReputationBands(100);
// Result: [
//   { min: 0, max: 20, label: 'Newcomer' },
//   { min: 20, max: 40, label: 'Contributor' },
//   { min: 40, max: 60, label: 'Active Contributor' },
//   { min: 60, max: 80, label: 'Trusted Partner' },
//   { min: 80, max: 100, label: 'Expert' }
// ]
```

#### Edge Cases

- **Fractional max scores**: All calculations use floating-point arithmetic. A `maxScore` of 3.5 scales appropriately.
- **Zero or negative scores**: While `getReputationBands` accepts any number, the reputation logic typically ensures non-negative scores.

#### Testing

Unit tests cover:
- Default max score (5)
- Custom max scores (100, 10, 3)
- Fractional scales
- Band boundary accuracy

---

### `resolveReputationLevel`

Determines a reputation level name from a numeric score and max score.

#### Location

`src/components/ReputationProfile.tsx`

#### Signature

```typescript
function resolveReputationLevel(score: number, maxScore: number): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `score` | `number` | The user's reputation score. |
| `maxScore` | `number` | The maximum possible reputation score. |

#### Returns

A string label (e.g., `'Newcomer'`, `'Expert'`) corresponding to the score's band.

#### Behavior

1. Retrieves all bands by calling `getReputationBands(maxScore)`
2. Returns the first band label if `score < 0`
3. Returns the last band label if `score >= maxScore`
4. Finds the band where:
   - For all bands except the last: `score >= band.min && score < band.max`
   - For the last band: `score >= band.min && score <= band.max`
5. Returns the found band's label, or the first band's label if no match (defensive fallback)

#### Example

```typescript
import { resolveReputationLevel } from '@/components/ReputationProfile';

const maxScore = 5;

resolveReputationLevel(0, maxScore);      // 'Newcomer'
resolveReputationLevel(1, maxScore);      // 'Contributor'
resolveReputationLevel(2.5, maxScore);    // 'Active Contributor'
resolveReputationLevel(3.9, maxScore);    // 'Trusted Partner'
resolveReputationLevel(4.5, maxScore);    // 'Expert'
resolveReputationLevel(5, maxScore);      // 'Expert'

// Boundary cases
resolveReputationLevel(-1, maxScore);     // 'Newcomer' (below minimum)
resolveReputationLevel(10, maxScore);     // 'Expert' (above maximum)
```

#### Edge Cases

- **Negative scores**: Treated as below minimum; returns first band label
- **Scores above max**: Returns last band label
- **Exact band boundaries**: Upper boundaries are inclusive for the last band only; for other bands, they are exclusive (e.g., a score of exactly 2 is in the "Active Contributor" band, not "Contributor")

#### Testing

Unit tests cover:
- All band transitions
- Exact boundary values (0, 1, 2, 3, 4, 5)
- Scores below minimum (negative values)
- Scores above maximum
- Fractional scores
- Custom max scores (10, 100, etc.)

---

## Utility Functions

### `formatRelativeTime`

Formats a timestamp as a human-readable relative time string (e.g., "2 minutes ago", "just now").

#### Location

`src/lib/formatRelativeTime.ts`

#### Signature

```typescript
function formatRelativeTime(
  timestamp: Date | string | number | null | undefined,
  now: Date | number = new Date(),
): string | null
```

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timestamp` | `Date \| string \| number \| null \| undefined` | (required) | The past point in time to describe. Accepts a `Date` object, ISO-8601 string, or millisecond epoch number. Pass `null` or `undefined` to receive `null`. |
| `now` | `Date \| number` | `new Date()` | Reference "current" time. Inject a fixed value in tests for deterministic output. |

#### Returns

A localized relative-time string, or `null` when `timestamp` is absent or cannot be parsed.

#### Time Thresholds

The function uses these thresholds to determine the output format:

| Time Difference | Output Format |
|-----------------|---------------|
| < 45 seconds | "just now" |
| < 45 minutes | "N minute(s) ago" |
| < 22 hours | "N hour(s) ago" |
| < 26 days | "N day(s) ago" |
| < 7 weeks (49 days) | "N week(s) ago" |
| < 11 months (330 days) | "N month(s) ago" |
| ≥ 11 months | "N year(s) ago" |

#### Implementation Details

- Uses `Intl.RelativeTimeFormat` for locale-aware output and automatic pluralization
- Supports English locale by default (hardcoded as `'en'`)
- Future timestamps or zero difference both return "just now"
- Deterministic: injecting a fixed `now` value produces consistent results regardless of when the function is called

#### Example

```typescript
import { formatRelativeTime } from '@/lib/formatRelativeTime';

// Relative to current time (Date.now())
formatRelativeTime(new Date(Date.now() - 2 * 60_000)); // "2 minutes ago"
formatRelativeTime(new Date(Date.now() - 5 * 60_000)); // "5 minutes ago"
formatRelativeTime(new Date(Date.now() - 2 * 3600_000)); // "2 hours ago"

// Deterministic in tests: inject a fixed reference time
const now = new Date('2026-07-27T12:00:00Z');
const timestamp = new Date('2026-07-27T11:55:00Z');
formatRelativeTime(timestamp, now); // "5 minutes ago"

// ISO-8601 string input
formatRelativeTime('2026-07-27T11:50:00Z', new Date('2026-07-27T12:00:00Z')); // "10 minutes ago"

// Epoch milliseconds
const nowMs = Date.now();
const thenMs = nowMs - 3 * 60_000; // 3 minutes ago
formatRelativeTime(thenMs, nowMs); // "3 minutes ago"

// Edge cases
formatRelativeTime(null); // null
formatRelativeTime(undefined); // null
formatRelativeTime('invalid-date'); // null
formatRelativeTime(new Date(Date.now() + 1000), Date.now()); // "just now" (future)
```

#### Edge Cases

- **Null/undefined input**: Returns `null` without error
- **Invalid date strings**: Returns `null` if the string cannot be parsed
- **Future timestamps**: Treated as "just now"
- **Very recent (< 45 seconds)**: Returns "just now"
- **Very old (> 11 months)**: Returns "N years ago"

#### Testing

Unit tests cover:
- All threshold boundaries (45s, 45min, 22h, 26d, 7w, 11mo)
- Deterministic output with injected `now` parameter
- Null and undefined inputs
- Invalid date strings
- Future timestamps
- Epoch milliseconds
- ISO-8601 strings
- Date objects
- Boundary transitions (e.g., 44 minutes vs. 45 minutes)

#### Accessibility & SEO

This function is typically paired with the `<time>` HTML element for semantic markup:

```tsx
const relativeTime = formatRelativeTime(timestamp);
const isoTime = toISOString(timestamp);

return (
  <p>
    Updated <time dateTime={isoTime}>{relativeTime}</time>
  </p>
);
```

The `<time>` element's `dateTime` attribute carries the machine-readable ISO-8601 value, improving screen reader support and search engine date parsing.

---

### `toISOString`

Converts a timestamp to its ISO-8601 string representation for use in a `<time dateTime="...">` attribute.

#### Location

`src/lib/formatRelativeTime.ts`

#### Signature

```typescript
function toISOString(
  timestamp: Date | string | number | null | undefined,
): string
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `timestamp` | `Date \| string \| number \| null \| undefined` | Same accepted types as `formatRelativeTime`. |

#### Returns

An ISO-8601 string representation, or an empty string (`''`) when the input is absent or invalid.

#### Behavior

1. Returns an empty string if `timestamp` is `null` or `undefined`
2. If `timestamp` is a `Date`, calls its `toISOString()` method
3. If `timestamp` is a string or number, constructs a `Date` and calls `toISOString()`
4. Returns an empty string if the constructed date is invalid

#### Example

```typescript
import { toISOString } from '@/lib/formatRelativeTime';

// Date object
toISOString(new Date('2026-07-27T10:30:00Z')); // '2026-07-27T10:30:00.000Z'

// ISO-8601 string
toISOString('2026-07-27T10:30:00Z'); // '2026-07-27T10:30:00.000Z'

// Epoch milliseconds
toISOString(1748395800000); // '2026-07-27T10:30:00.000Z'

// Edge cases
toISOString(null); // ''
toISOString(undefined); // ''
toISOString('invalid-date'); // ''
```

#### Edge Cases

- **Null/undefined**: Returns empty string
- **Invalid date strings**: Returns empty string
- **String input**: Re-parses the string as a Date and converts back to ISO format (useful for validation and normalization)

#### Typical Usage

Used in conjunction with `formatRelativeTime` for accessible `<time>` elements:

```tsx
const relativeTime = formatRelativeTime(lastUpdated);
const isoTime = toISOString(lastUpdated);

return (
  <p aria-label={isoTime ? `Last updated at ${isoTime}` : 'Last updated'}>
    Updated <time dateTime={isoTime}>{relativeTime}</time>
  </p>
);
```

---

## Types

### `ReputationProfileProps`

Props passed to the `ReputationProfile` component.

#### Location

`src/components/ReputationProfile.tsx`

#### Definition

```typescript
export type ReputationProfileProps = {
  name: string;
  score?: number | null;
  level?: string;
  history?: ReputationEvent[];
  maxScore?: number;
  lastUpdated?: Date | string | number | null;
};
```

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | (required) | The user's name, displayed in the profile header. |
| `score` | `number \| null` | `undefined` | The user's reputation score. When `null` or undefined, the component displays "No reputation yet". |
| `level` | `string` | `undefined` | The user's reputation level (e.g., "Expert"). When omitted, the component derives it from the score using `resolveReputationLevel`. |
| `history` | `ReputationEvent[]` | `[]` | Array of reputation events (completed contracts, feedback received, etc.). |
| `maxScore` | `number` | `5` | Maximum possible reputation score. Used for scaling reputation bands and meter element aria-valuemax. |
| `lastUpdated` | `Date \| string \| number \| null` | `undefined` | ISO-8601 timestamp (or Date / epoch ms) indicating when this reputation profile was last refreshed. When provided, a relative "Updated X ago" indicator is shown. Pass `null` or omit to hide the indicator. |

#### Example

```tsx
import ReputationProfile from '@/components/ReputationProfile';

<ReputationProfile
  name="Alice Johnson"
  score={3.5}
  level="Trusted Partner"
  history={[
    {
      id: '1',
      type: 'Contract Completed',
      summary: 'Completed "Logo Design" contract',
      date: '2026-07-20T14:30:00Z',
    },
  ]}
  maxScore={5}
  lastUpdated={new Date('2026-07-27T10:30:00Z')}
/>
```

---

### `ReputationEvent`

Represents a single event in a user's reputation history.

#### Location

`src/components/ReputationProfile.tsx`

#### Definition

```typescript
export type ReputationEvent = {
  id: string;
  type: string;
  summary: string;
  date: string;
};
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the event. Used as the React key in the history list. |
| `type` | `string` | Category label (e.g., "Contract Completed", "Feedback Received"). |
| `summary` | `string` | Human-readable description of the event. |
| `date` | `string` | ISO-8601 timestamp or human-readable date string. The component wraps this in a `<time>` element for semantic markup. |

#### Example

```typescript
const event: ReputationEvent = {
  id: 'evt-456',
  type: 'Feedback Received',
  summary: '5-star review from client: "Excellent communication and delivery"',
  date: '2026-07-25T09:15:00Z',
};
```

#### Semantic Rendering

Events are rendered as an ordered list (`<ol>`) because reputation history is chronological. Each date is wrapped in a `<time>` element:

```tsx
<time dateTime={event.date}>{event.date}</time>
```

If the date string is not a valid ISO-8601 date, the `dateTime` attribute is omitted but the text is still rendered.

---

### `ReputationBand`

Represents a range of reputation scores and the corresponding level label.

#### Location

`src/components/ReputationProfile.tsx`

#### Definition

```typescript
export type ReputationBand = {
  min: number;
  max: number;
  label: string;
};
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `min` | `number` | Lower bound of the score range (inclusive). |
| `max` | `number` | Upper bound of the score range (inclusive for the last band; exclusive for others). |
| `label` | `string` | Human-readable reputation level name (e.g., "Expert"). |

#### Example

```typescript
const band: ReputationBand = {
  min: 4,
  max: 5,
  label: 'Expert',
};
```

#### Usage in Components

Bands are typically used to render a legend or visual indicator showing which level the user has achieved:

```tsx
{getReputationBands(maxScore).map((band) => {
  const isActive = score >= band.min && score < band.max;
  return (
    <li key={band.label} className={isActive ? 'active' : 'inactive'}>
      <p>{band.min.toFixed(1)} - {band.max.toFixed(1)}</p>
      <p>{band.label}</p>
    </li>
  );
})}
```

---

## Examples

### Example 1: Displaying a Reputation Profile with Last Updated

```tsx
import ReputationProfile from '@/components/ReputationProfile';

export function UserReputationPage({ userId }: { userId: string }) {
  // Fetch reputation data from API
  const [reputation, setReputation] = useState<Reputation | null>(null);

  useEffect(() => {
    async function fetchReputation() {
      const res = await fetch(`/api/reputation/${userId}`);
      const data = await res.json();
      setReputation(data);
    }
    fetchReputation();
  }, [userId]);

  if (!reputation) return <div>Loading...</div>;

  return (
    <ReputationProfile
      name={reputation.userName}
      score={reputation.score}
      level={reputation.level}
      history={reputation.history}
      maxScore={5}
      lastUpdated={reputation.lastUpdated} // Displays "Updated X ago"
    />
  );
}
```

### Example 2: Deterministic Testing of Relative Time

```typescript
import { formatRelativeTime } from '@/lib/formatRelativeTime';

describe('Reputation profile with relative timestamps', () => {
  it('displays "2 minutes ago" for a timestamp 2 minutes in the past', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    const twoMinutesAgo = new Date('2026-07-27T11:58:00Z');

    const result = formatRelativeTime(twoMinutesAgo, now);
    expect(result).toBe('2 minutes ago');
  });

  it('displays "just now" for a timestamp within 45 seconds', () => {
    const now = new Date('2026-07-27T12:00:00Z');
    const justNow = new Date('2026-07-27T11:59:30Z'); // 30 seconds ago

    const result = formatRelativeTime(justNow, now);
    expect(result).toBe('just now');
  });
});
```

### Example 3: Resolving Reputation Levels

```typescript
import { resolveReputationLevel, getReputationBands } from '@/components/ReputationProfile';

export function ReputationLevelBadge({ score }: { score: number }) {
  const maxScore = 5;
  const level = resolveReputationLevel(score, maxScore);
  const bands = getReputationBands(maxScore);

  const badgeColor = {
    'Newcomer': 'bg-gray-100',
    'Contributor': 'bg-blue-100',
    'Active Contributor': 'bg-green-100',
    'Trusted Partner': 'bg-purple-100',
    'Expert': 'bg-gold-100',
  }[level];

  return (
    <span className={`badge ${badgeColor}`}>
      {level}
    </span>
  );
}
```

### Example 4: Custom Max Score

```typescript
import { getReputationBands, resolveReputationLevel } from '@/components/ReputationProfile';

export function CustomScaleReputation({ score, maxScore }: { score: number; maxScore: number }) {
  const bands = getReputationBands(maxScore);
  const level = resolveReputationLevel(score, maxScore);

  return (
    <div>
      <p>Score: {score} / {maxScore}</p>
      <p>Level: {level}</p>
      <ul>
        {bands.map((band) => (
          <li key={band.label}>
            {band.min.toFixed(1)} - {band.max.toFixed(1)}: {band.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Testing

Unit tests are defined in:
- `src/components/ReputationProfile.test.tsx` — Tests for `getReputationBands` and `resolveReputationLevel`
- `src/lib/__tests__/formatRelativeTime.test.ts` — Tests for `formatRelativeTime` and `toISOString`

To run the tests:

```bash
npm test src/components/ReputationProfile.test.tsx
npm test src/lib/__tests__/formatRelativeTime.test.ts
```

### Coverage

- `getReputationBands`: Edge cases, custom max scores, fractional scales
- `resolveReputationLevel`: All band transitions, boundary values, out-of-range scores
- `formatRelativeTime`: All time thresholds, deterministic output, null/invalid inputs
- `toISOString`: Valid dates, null/undefined inputs, invalid strings

All tests maintain >95% coverage for impacted modules.

