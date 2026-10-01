# `notFoundContent` — 404 compatibility contract

The public recovery surface rendered by [`src/app/not-found.tsx`](../../src/app/not-found.tsx).

**Module:** [`src/lib/notFoundContent.ts`](../../src/lib/notFoundContent.ts)
**Consumer:** [`src/app/not-found.tsx`](../../src/app/not-found.tsx)

## Why this exists

The 404 page is the only screen the app guarantees after a broken or expired
link. Its recovery links, home route, and support address used to be inline
constants in the page component, which meant the "contract" existed only as
whatever markup happened to render. This module makes that contract explicit,
validates it, and keeps it stable across upgrades, malformed upstream data, and
empty data — without changing what users see.

## Exports

| Export | Purpose |
| --- | --- |
| `NotFoundQuickLink` | `{ href, label, description }` — one recovery destination. |
| `NOT_FOUND_HOME_HREF` | `/` — the "Go Home" target. |
| `NOT_FOUND_SUPPORT_EMAIL` | `support@talenttrust.io`. |
| `NOT_FOUND_SUPPORT_HREF` | `mailto:…` href derived from the address. |
| `MAX_NOT_FOUND_QUICK_LINKS` | Upper bound on rendered recovery links (`5`). |
| `DEFAULT_NOT_FOUND_QUICK_LINKS` | The documented default list, frozen and ordered. |
| `sanitizeNotFoundQuickLink(value)` | Validates/trims one candidate; returns a frozen link or `null`. |
| `normalizeNotFoundQuickLinks(input)` | Total, pure normalization returning links plus drop counts. |
| `getNotFoundQuickLinks()` | Page-facing accessor; a fresh array of validated defaults. |

## Invariants

1. **Single source of truth.** `DEFAULT_NOT_FOUND_QUICK_LINKS` owns the routes,
   copy, and order. The page is a thin renderer; behaviour changes belong here.
2. **Total and pure.** Normalization accepts any `unknown`, never throws, and
   always returns a result object.
3. **Internal links only.** A link is accepted only when `href` is a
   root-relative path with no whitespace and no backslash. Absolute
   (`https://…`), protocol-relative (`//host`), and `mailto:` hrefs are rejected
   so the 404 page can never become an open-redirect vector.
4. **De-duplicated.** The first occurrence of an `href` wins, so the list can
   never show two identical destinations.
5. **Bounded.** The list is capped at `MAX_NOT_FOUND_QUICK_LINKS`.
6. **Fail-safe fallback.** A non-array input, or an array that yields no valid
   link, renders the documented defaults so a recovery path always exists.
7. **Diagnosable, not leaky.** The result counts rejected, duplicate, and
   truncated entries (and whether the fallback was used) without echoing the
   offending — potentially attacker-controlled — content.

## Normalization result

```ts
interface NotFoundLinkNormalization {
  links: readonly NotFoundQuickLink[];
  rejected: number;      // not a well-formed internal link
  duplicates: number;    // href already seen
  truncated: number;     // valid, but past MAX_NOT_FOUND_QUICK_LINKS
  usedFallback: boolean; // defaults substituted for unusable/empty input
}
```

## Tests

- [`src/lib/notFoundContent.test.ts`](../../src/lib/notFoundContent.test.ts)
  — documented defaults and freeze semantics, success/trim, rejection of
  non-arrays and malformed entries (absolute/protocol-relative/backslash/
  whitespace hrefs), duplicate de-duplication after trimming, cap boundary and
  overflow, fallback on empty/all-invalid input, adversarial/cyclic input, and
  input purity/determinism.
- [`src/app/not-found.test.tsx`](../../src/app/not-found.test.tsx) — wiring
  assertions that the rendered links equal the contract, the home/support hrefs
  come from the constants, no off-site anchor can render, plus an axe scan.
