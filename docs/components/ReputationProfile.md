# ReputationProfile — Component API Reference

Concise, accurate reference for the reputation component surface in the
TalentTrust frontend. This document is the **canonical props/API entry
point**; rendering-state and data-flow specifics live in
[`docs/components/ReputationPage.md`](./ReputationPage.md).

**Source file:** `src/components/ReputationProfile.tsx`
**Page wrapper:** `src/app/reputation/page.tsx` → exports `ReputationPageContent`
**Route loading skeleton:** `src/app/reputation/loading.tsx` → exports `default`
**Re-exported types:** `src/types/domain.ts` → `ReputationEvent`, `ReputationProfileProps`, `Reputation`
**Behaviour tests:** `src/components/ReputationProfile.test.tsx`,
`src/app/reputation/__tests__/page.test.tsx`

---

## Components in the Reputation Module

| Name | Kind | Location | Purpose |
|------|------|----------|---------|
| `ReputationProfile` | React component (default export) | `src/components/ReputationProfile.tsx` | Renders the full reputation profile: avatar, score meter, level, legend, and history. |
| `ReputationPageContent` | React component (named export) | `src/app/reputation/page.tsx` | Route-level wrapper that chooses between `<EmptyState illustration="reputation" />` and `<ReputationProfile />` based on data. |
| `default` page export | React component | `src/app/reputation/page.tsx` | Page entry mounted at `/reputation`; supplies mock data and delegates to `ReputationPageContent`. |
| `ReputationLoading` | React component (default export of `loading.tsx`) | `src/app/reputation/loading.tsx` | Suspense skeleton for the `/reputation` route. Sets `aria-busy="true"` and announces "Loading reputation…". |

`ReputationProfile` is a **pure presentational component**; it never reads
from the wallet, repository, or network. All data shapes flow in as props.

---

## `ReputationProfile` — Props

```ts
import ReputationProfile, {
  ReputationEvent,
  ReputationProfileProps,
} from '@/components/ReputationProfile';
```

### `ReputationProfileProps`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `name` | `string` | **Yes** | — | Display name shown as the avatar initial and in the sr-only `<h2>`. Also drives the `aria-label` of the profile region. |
| `score` | `number \| null` | No | `undefined` | Numeric reputation score. When `undefined`, `null`, or `< 0` the component renders the `"No reputation yet"` empty state. Any value `>= 0` is a valid score (including `0`). |
| `level` | `string` | No | *derived* | Explicit level label. When omitted, the level is derived from `score` via `resolveReputationLevel(score, maxScore)`. When `score` is absent, the level text is `'Community Member'`. |
| `history` | `ReputationEvent[]` | No | `[]` | Ordered list of reputation events. Affects the rendered state (see *Rendering states* below). |
| `maxScore` | `number` | No | `5` | Upper bound of the score range. Used for `aria-valuemax` on the meter role and for scaling the reputation level bands. |

### `ReputationEvent`

Each item in `history` has this shape:

```ts
type ReputationEvent = {
  id: string;      // React key + accessible identifier
  type: string;    // Short label (e.g. "Verification")
  summary: string; // Human-readable description
  date: string;    // ISO-8601 or human date string
};
```

> When `date` parses as a valid `Date`, the rendered `<time dateTime="…">`
> element exposes the machine-readable ISO value. Unparseable date strings
> omit the `dateTime` attribute so the markup remains valid.

### `ReputationBand` (returned by `getReputationBands`)

```ts
type ReputationBand = {
  min: number;
  max: number;
  label: string;
};
```

---

## `ReputationPageContent` — Props

```tsx
import { ReputationPageContent } from '@/app/reputation/page';
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `reputationData` | `Reputation \| null` | No | `undefined` | The reputation record. When `null`, `undefined`, or has a falsy/negative `score`, the component renders the *No reputation* empty state. |
| `userName` | `string` | No | `'User'` | Display name passed to `ReputationProfile`. |

`Reputation` is the canonical reputation shape (defined in
`src/types/domain.ts` as
`Omit<ReputationProfileProps, 'name'> & { name?: string }`).

---

## Helpers

### `getReputationBands(maxScore: number): ReputationBand[]`

Returns the five scored bands scaled proportionally to `maxScore`:

| Base band (maxScore 5) | Label |
|------------------------|-------|
| `[0.0, 1.0)` | Newcomer |
| `[1.0, 2.0)` | Contributor |
| `[2.0, 3.0)` | Active Contributor |
| `[3.0, 4.0)` | Trusted Partner |
| `[4.0, 5.0]` | Expert |

When `maxScore` is not 5, each band is multiplied by `maxScore / 5`. So a
`maxScore` of `10` yields bands `[0, 2)`, `[2, 4)`, `[4, 6)`, `[6, 8)`,
`[8, 10]`.

### `resolveReputationLevel(score: number, maxScore: number): string`

Returns the label of the band containing `score`. Edge cases:

- `score < 0` → first band label (`'Newcomer'` by default).
- `score >= maxScore` → last band label (`'Expert'` by default).
- A `score` at a band boundary belongs to the **upper** band (e.g. `score = 2`
  on the default scale resolves to `'Active Contributor'`, not `'Contributor'`).

---

## Rendering States

The component switches between three visual states derived from `score`
and `history.length`:

| Condition | What is rendered |
|-----------|------------------|
| `score` missing, `null`, or `< 0` | `"No reputation yet"` block, level shows `"Pending"`, history shows empty-state message, no `<meter>`, no legend, no amber banner. |
| `score >= 0`, `history.length === 0` | Profile block with `<meter>`, legend, plus an **amber partial-data banner**: *"A score exists but history is currently hidden until verified actions are available."* |
| `score >= 0`, `history.length > 0` | Profile block with `<meter>`, legend, and an ordered list (`<ol>`) of history events. Date is rendered in `<time dateTime="…" />`. |

Accessibility markers worth knowing:

- The score uses `role="meter"` with `aria-valuenow`, `aria-valuemin="0"`,
  `aria-valuemax={maxScore}`, `aria-labelledby="reputation-score-label"`,
  and `aria-describedby="reputation-legend"`.
- The profile card is a `<section>` with `aria-labelledby="profile-heading"`;
  the heading itself is `sr-only`.
- The level legend is a `<ul aria-labelledby="reputation-legend-title">`.
- The history list is an `<ol aria-labelledby="reputation-history-heading">`
  so assistive tech announces the list's purpose. Each `<li>` carries
  `aria-labelledby` referencing three ids — `reputation-event-type-{id}`,
  `reputation-event-summary-{id}`, and `reputation-event-date-{id}` — so
  every entry's type, summary, and date are programmatically associated
  into a single accessible name.

---

## Minimal Usage Examples

### Full profile (score + history)

```tsx
import ReputationProfile from '@/components/ReputationProfile';

export function VerifiedUserProfile() {
  return (
    <ReputationProfile
      name="Ada Lovelace"
      score={88}
      level="Trusted Partner"
      history={[
        {
          id: 'ev-1',
          type: 'Verification',
          summary: 'Completed identity verification',
          date: '2026-04-24',
        },
        {
          id: 'ev-2',
          type: 'On-chain review',
          summary: 'Received positive trust signal',
          date: '2026-04-23',
        },
      ]}
    />
  );
}
```

### Partial profile (no history yet)

```tsx
<ReputationProfile name="Grace Hopper" score={42} history={[]} />
```

### No reputation yet

```tsx
<ReputationProfile name="Anonymous" />              // score undefined
<ReputationProfile name="Anonymous" score={null} /> // score null
```

### Custom max score (e.g. percentile)

```tsx
<ReputationProfile
  name="Linus"
  score={75}
  maxScore={100}
  history={[]}
/>
```

### Page-level wrapper

```tsx
import { ReputationPageContent } from '@/app/reputation/page';
import type { Reputation } from '@/types/domain';

export function Page({ data }: { data: Reputation | null }) {
  return <ReputationPageContent reputationData={data} userName="Ada" />;
}
```

---

## Behavioural Guarantees

- **Pure rendering.** No side effects, network calls, or storage reads.
- **SSR-safe.** The component does not read `window`/`localStorage`.
- **Score `0` is valid.** Treated as `hasReputation = true`; renders the
  meter at `aria-valuenow="0"`.
- **Negative `score`** is rendered as the empty state.
- **History dates** that fail `Date.parse(...)` omit the `dateTime`
  attribute but still render their text content.
- **Legend** only renders when a score is present.
- **`name`** accepts any string; the avatar shows `name.slice(0, 1).toUpperCase()`
  and falls back gracefully for single-character or lowercase strings.
- **Default derived level.** When `level` is unset but `score` is present,
  the level is derived from `resolveReputationLevel(score, maxScore)`.
  When `score` is absent, the level text is `'Community Member'`.

---

## Accessibility

The list below documents only behaviors that are implemented in the current code.

### Roles and landmarks

- The profile region uses a named `<section>` with `aria-labelledby="profile-heading"` in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- The reputation score is exposed with `role="meter"` and related ARIA values in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- The reputation legend is labelled with `aria-labelledby="reputation-legend-title"` in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- The history list is an `<ol>` with `aria-labelledby="reputation-history-heading"` so it has an accessible name in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- Each history `<li>` uses `aria-labelledby` to associate its type, summary, and date into one accessible name in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- The page wrapper renders a focusable `<main>` element in [src/app/reputation/ReputationPageClient.tsx](../../src/app/reputation/ReputationPageClient.tsx).

### Keyboard interactions

- The component relies on native keyboard support for its interactive controls (`<button>`, `<select>`, and checkbox `<input>` elements) in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- No custom `onKeyDown` or `onKeyUp` handlers are implemented in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).

### Focus behavior

- The page client moves focus to the main landmark on mount in [src/app/reputation/ReputationPageClient.tsx](../../src/app/reputation/ReputationPageClient.tsx).
- The main landmark is made focusable with `tabIndex={-1}` in [src/app/reputation/ReputationPageClient.tsx](../../src/app/reputation/ReputationPageClient.tsx).
- The component adds focus styling classes to select and checkbox controls in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).

### Notes for contributors

- Preserve the current semantic HTML and native controls when editing [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- Keep the existing ARIA relationships in place when changing the markup in [src/components/ReputationProfile.tsx](../../src/components/ReputationProfile.tsx).
- If focus behavior changes, verify the main landmark in [src/app/reputation/ReputationPageClient.tsx](../../src/app/reputation/ReputationPageClient.tsx) still receives focus as intended.

## Related Documentation

| Topic | File |
|-------|------|
| Page rendering states and data flow | [`docs/components/ReputationPage.md`](./ReputationPage.md) |
| Domain type definitions | [`src/types/domain.ts`](../../src/types/domain.ts) |
| Copywriting guidelines | [`docs/COPYWRITING_GUIDE.md`](../COPYWRITING_GUIDE.md) |
| Accessibility testing helpers | [`docs/components/Accessibility.md`](./Accessibility.md) |

---

## Testing

Run the focused reputation test suites:

```bash
npm test -- --testPathPattern='ReputationProfile|reputation'
```

Coverage lives in:

- `src/components/ReputationProfile.test.tsx` – 10+ describe blocks
  covering undefined/`null`/zero scores, partial/full history, accessibility
  audits (`jest-axe`), ordered list semantics, `<time>` element semantics,
  meter role & ARIA, level-legend derivation, and boundary mapping.
- `src/app/reputation/__tests__/page.test.tsx` – state-based coverage of
  `ReputationPageContent`, default prop fallbacks, and accessibility
  (heading hierarchy, `<main>` semantics).
