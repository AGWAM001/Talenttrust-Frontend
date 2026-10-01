# Milestones Data Flow

This document traces how milestone data moves through the TalentTrust frontend, from localStorage persistence to rendered UI. It is intended to orient new contributors on the architecture of the `/milestones` route and the shared `MilestonesList` component.

---

## Mermaid Diagram

```mermaid
flowchart TD
    subgraph Storage["localStorage"]
        LSK["talenttrust_app_data<br/>{ contracts: [], milestones: [] }"]
    end

    subgraph Page["MilestonesPage — src/app/milestones/page.tsx"]
        MOUNT["useEffect on mount"]
        URL_SYNC["useEffect — URL ↔ statusFilter sync<br/>router.replace(?status=...)"]
        FILTER["useMemo — filter by statusFilter"]
        CREATE["handleSubmitMilestone"]
    end

    subgraph Repo["repository.ts"]
        LIST["listMilestones()"]
        SAVE["saveMilestone(milestone)"]
    end

    subgraph Filters["MilestoneFilter — src/components/milestones/MilestoneFilter.tsx"]
        RADIO["radiogroup: All / Pending / Completed / Paid / Disputed"]
    end

    subgraph List["MilestonesList — src/components/MilestonesList.tsx"]
        TALLY["milestoneStatusTally()"]
        MISMATCH["findCurrencyMismatches()"]
        DUESOON["isDueSoon() — 7-day window"]
        CARDS["milestones.map → <article> cards"]
    end

    subgraph Utils["Pure utilities — src/lib/"]
        TALLY_F["milestoneStatusTally.ts"]
        DUESOON_F["dueSoon.ts — parseLocalDate, isDueSoon"]
        MISMATCH_F["currencyMismatch.ts"]
    end

    subgraph Form["MilestoneCreationForm — src/components/milestones/MilestoneCreationForm.tsx"]
        FIELDS["Title, Payout, Currency, Status, Due Date"]
        VALIDATE["validate + sanitizeUserText"]
        GEN_ID["id = slug-title-TIMESTAMP"]
    end

    LSK -->|readStore| LIST
    LIST -->|Milestone[] or []| MOUNT
    MOUNT -->|setMilestones| FILTER
    MOUNT -->|check dismissed flag| FILTER

    RADIO -->|statusFilter| URL_SYNC
    URL_SYNC -->|statusFilter state| FILTER

    FILTER -->|filtered Milestone[]| TALLY
    FILTER -->|filtered Milestone[]| MISMATCH
    FILTER -->|filtered Milestone[]| DUESOON
    FILTER -->|filtered Milestone[]| CARDS

    TALLY --> TALLY_F
    MISMATCH --> MISMATCH_F
    DUESOON --> DUESOON_F

    FIELDS --> VALIDATE
    VALIDATE --> GEN_ID
    GEN_ID -->|onSubmit| CREATE
    CREATE -->|saveMilestone| SAVE
    SAVE -->|append| LSK
    SAVE -->|re-read listMilestones| FILTER
```

---

## ASCII Diagram

For environments that do not render Mermaid (terminal, plain-text diffs):

```
+---------------------+
| localStorage        |
| talenttrust_app_data|
| { milestones: [] }  |
+----------+----------+
           |
           | listMilestones()
           v
+----------+----------+
| MilestonesPage      |
| (page.tsx)          |
|                     |
| 1. useEffect mount: |
|    persisted =      |
|      listMilestones |
|    if len > 0:      |
|      milestones = persisted
|    else:            |
|      milestones =   |
|        SAMPLE_MILESTONES
|                     |
| 2. URL sync:        |
|    searchParams     |
|      .get('status') |
|      <-> statusFilter state
|    router.replace() |
|                     |
| 3. Filter:          |
|    filtered =       |
|      milestones     |
|      .filter(by     |
|        statusFilter)|
+----------+----------+
           |
           | milestones={filtered}
           v
+----------+----------+     +---------------------+
| MilestonesList      |     | Pure Utilities      |
| (MilestonesList.tsx)|     | (src/lib/)          |
|                     |     |                     |
| +-- statusTally ----+---->| milestoneStatusTally|
| |   (chip row)      |     |   .ts               |
| |                   |     +---------------------+
| +-- currencyWarning-+---->+---------------------+
| |   (amber banner)  |     | currencyMismatch.ts |
| |                   |     +---------------------+
| +-- dueSoonBanner --+---->+---------------------+
| |   (7-day window)  |     | dueSoon.ts          |
| |                   |     |  parseLocalDate()   |
| |                   |     |  isDueSoon()        |
| +-- milestone cards |     +---------------------+
|     <article> per   |
|     milestone:      |
|       title         |
|       dueDate       |
|       StatusBadge   |
|       formatAmount()|
+---------------------+

+---------------------+
| Create Milestone    |
| (CreationForm modal)|
|                     |
| fields:             |
|   title (required)  |
|   payout (required) |
|   currency (select) |
|   status (select)   |
|   dueDate (optional)|
|                     |
| on submit:          |
|   validate fields   |
|   id = slug-TIMESTAMP
|   onSubmit(milestone)|
|     -> saveMilestone |
|     -> listMilestones|
|     -> re-render     |
+---------------------+
```

---

## Stage 1 — Fetch (on mount)

**File:** `src/app/milestones/page.tsx` (lines 94–108)

On client mount, a `useEffect` calls `listMilestones()` from `src/lib/repository.ts`. The repository reads `localStorage['talenttrust_app_data']`, parses the JSON blob, and returns the `milestones` array — or `[]` if the key is missing, corrupt, or during SSR.

| Condition | Result |
|-----------|--------|
| Persisted milestones exist | `milestones = persisted`, sample banner hidden |
| No persisted milestones | `milestones = SAMPLE_MILESTONES` (5 hardcoded demo records) |
| Sample data previously dismissed (`safeStorage`) | `milestones = []`, sample banner hidden |

The sample data ensures new users see a populated page. Dismissing it via "Start from scratch" writes a flag to `localStorage` via `safeStorage.setItem` and clears the milestones to `[]`.

**SSR safety:** `listMilestones()` is guarded by `isBrowser()` (`typeof window !== 'undefined'`). During Next.js server rendering it returns `[]`, avoiding hydration mismatches. The actual data loads only in the client-side `useEffect`.

---

## Stage 2 — Filter (URL + state)

**File:** `src/app/milestones/page.tsx` (lines 60–130)

Two `useEffect` hooks keep the URL query parameter and React state in sync:

1. **URL → state:** On external URL changes (back/forward), `searchParams.get('status')` is read and applied to `statusFilter` via `getValidStatus()`. Invalid or missing values fall back to `'All'`.
2. **State → URL:** When the user selects a filter, `router.replace(?status=...)` updates the URL without creating a history entry.

The `VALID_STATUSES` array (`['All', 'Pending', 'Completed', 'Paid', 'Disputed']`) determines which URL values are accepted. Note: `'Active'` is a valid filter radio option in `MilestoneFilter` but is **not** URL-persistable — selecting it shows active milestones but the URL reverts to `'All'` on reload.

Filtering is performed by a `useMemo`:

```typescript
const filtered = useMemo(() => {
  if (statusFilter === 'All') return displayMilestones;
  return displayMilestones.filter((m) => m.status === statusFilter);
}, [displayMilestones, statusFilter]);
```

---

## Stage 3 — Render (MilestonesList)

**File:** `src/components/MilestonesList.tsx`

`MilestonesList` receives the filtered `Milestone[]` and computes three derived data sets, each from a pure utility in `src/lib/`:

### 3a. Status tally → chip row

`milestoneStatusTally(milestones)` counts milestones per status in canonical order (`Active → Completed → Disputed → Pending → Paid`), omitting zero-count statuses. The result drives a row of colored chips (icon + label + count).

**Source:** `src/lib/milestoneStatusTally.ts`

### 3b. Currency mismatch → amber warning

When a `contractCurrency` prop is provided (e.g. from the contract detail page), `findCurrencyMismatches(contractCurrency, milestones)` returns the IDs of milestones whose currency differs from the contract's. The list renders an amber `role="alert"` banner listing the mismatched items.

**Source:** `src/lib/currencyMismatch.ts`

On the standalone `/milestones` page, `contractCurrency` is **not** passed, so this banner never appears. It only activates in the contract detail context (`src/app/contracts/[id]/page.tsx`).

### 3c. Due-soon check → reminder banner

`isDueSoon(milestone.dueDate, today, 7)` checks if a milestone's date falls within 7 days from today. Milestones in terminal statuses (`Paid`, `Completed`) are excluded. The banner is dismissible and links to `#milestone-${id}` anchors on individual cards.

**Source:** `src/lib/dueSoon.ts` — uses `parseLocalDate()` to avoid UTC-to-local date shifts.

### 3d. Card list

Each milestone renders as an `<article>` with:
- `id="milestone-${id}"` (anchor target for due-soon links)
- Title and due date (or "TBD")
- `StatusBadge` component for the status indicator
- Formatted payout via `usePreferences().formatAmount(payout, currency)`

The scrollable container has `role="region"`, `tabIndex={0}`, and an `aria-labelledby` referencing both the heading and item count for screen reader context.

---

## Stage 4 — Create (modal form)

**File:** `src/components/milestones/MilestoneCreationForm.tsx`

Clicking "Add Milestone" opens a modal dialog (`role="dialog"`, `aria-modal="true"`) with fields for title, payout, currency, status, and due date. On submit:

1. All required fields are validated; title is sanitized via `sanitizeUserText()`.
2. An `id` is generated as `{slugified-title}-${Date.now()}`.
3. The complete `Milestone` object is passed to the parent's `onSubmit` callback.

Back in `page.tsx`, `handleSubmitMilestone`:
1. Calls `saveMilestone(milestone)` — appends to `localStorage`.
2. Re-reads `listMilestones()` to get the full updated array.
3. Updates state: `setMilestones(persisted)`, `setIsDismissed(true)`, `setShowForm(false)`.

---

## Secondary entry point — Contract detail page

**File:** `src/app/contracts/[id]/page.tsx`

The contract detail page uses `listMilestonesByContract(contractId)` to fetch milestones linked to a specific contract. These are merged with the contract's own milestones (de-duplicated by `id`, persisted records taking precedence) and passed to `MilestonesList` **with** `contractCurrency` set, enabling the currency mismatch warning banner.

---

## Key files reference

| File | Role |
|------|------|
| `src/app/milestones/page.tsx` | Page orchestrator: fetch, state, URL sync, filter, create |
| `src/app/milestones/loading.tsx` | Suspense loading skeleton |
| `src/components/MilestonesList.tsx` | Renders filtered milestones with tally, warnings, cards |
| `src/components/milestones/MilestoneFilter.tsx` | Accessible radiogroup status filter |
| `src/components/milestones/MilestoneCreationForm.tsx` | Modal creation form with validation |
| `src/components/StatusBadge.tsx` | Status indicator badge + `StatusType` definition |
| `src/lib/repository.ts` | localStorage persistence: `listMilestones`, `saveMilestone`, etc. |
| `src/lib/milestoneStatusTally.ts` | Pure utility: per-status counts |
| `src/lib/dueSoon.ts` | Pure utility: date parsing + 7-day window check |
| `src/lib/currencyMismatch.ts` | Pure utility: currency mismatch detection |
| `src/lib/safeStorage.ts` | Defensive localStorage wrapper |
| `src/types/domain.ts` | Canonical `Milestone` type re-export |
