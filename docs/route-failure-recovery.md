# Route failure recovery — contracts loading fallback & sitemap

Reference for the two deterministic failure-recovery contracts introduced in
`src/app/contracts/loading.tsx` (#1166) and `src/app/sitemap.ts` (#1256).

Both files answer a single question: *when something goes wrong on a route,
what does the user (or the operator) see, and is that answer stable?*

---

## 1. `/contracts` loading fallback

**Code:** [`src/app/contracts/loading.tsx`](../src/app/contracts/loading.tsx),
[`src/app/contracts/ContractsLoadingBoundary.tsx`](../src/app/contracts/ContractsLoadingBoundary.tsx)
**Tests:** [`src/app/contracts/__tests__/loading.test.tsx`](../src/app/contracts/__tests__/loading.test.tsx)

### State model

```
                    ┌──────────────────────────── retry budget spent ──────────────┐
                    │                                                              ▼
 pending ──(render throws)──▶ failed ──"Try again"──▶ pending ──▶ … ──▶ failed ──▶ failed
    │                          │                        (clean remount)             │
    └──(stall timeout)──▶ pending + "taking longer" notice                  "Reload page"
```

| Phase | Rendered | Reported |
|-------|----------|----------|
| `pending` | shared `ContractsSkeleton` + one polite live region | — |
| `pending` + stalled | skeleton **stays mounted**, plus a reload affordance | `CONTRACTS_LOADING_STALLED` at `warn` |
| `failed` | `role="alert"`, "Try again" (or "Reload page"), "Go home" | `CONTRACTS_LOADING_FAILED` at `error` |

### Invariants

| # | Invariant | Where |
|---|-----------|-------|
| I1 | The boundary never reads, writes or clears persisted storage, and never remounts anything above itself — a failure/retry cycle cannot lose contracts, milestones, wallet items or preferences | `leaves persisted storage byte-identical…` |
| I2 | Retry is re-entrancy safe: concurrent activations yield exactly one transition (`retryInFlight` latch, counter incremented outside the state updater) | `applies at most one transition for two concurrent retry activations` |
| I3 | Retries are bounded by `MAX_IN_BOUNDARY_RETRIES` (3); after that only a hard reload can recover. The counter lives on the instance, not in state, so `getDerivedStateFromError` cannot reset the budget | `bounds retries and falls back to a hard reload` |
| I4 | Error messages, stacks and component stacks are never rendered and never enter the report metadata | `never leaks the thrown message into the DOM` |
| I5 | A stall is a `warn`, not a failure: the pending render may still succeed, so the skeleton stays and the state never claims an error | `keeps the skeleton mounted so the page does not jump` |
| I6 | Exactly one polite live region exists; the stall escalates by changing its text | `escalates to an actionable notice and re-announces politely` |
| I7 | The pending render reads no clock, randomness or environment, so two renders are byte-identical | `renders deterministically` |

### Why not a second `<main>`?

The root layout owns the single `<main id="main-content">` landmark. The previous
fallback rendered its own `<main>`, producing a duplicate landmark (the class of
bug fixed for `/milestones` in #682). The wrapper is now a `<div aria-busy="true">`.

### Why is the stall budget 30 s?

Long enough that a cold start on a slow connection never trips it, short enough
that a hung request is not an unrecoverable dead end. `stallTimeoutMs <= 0` or
`NaN` disables the watchdog, which degrades to the previous behaviour rather
than escalating immediately.

---

## 2. `/sitemap.xml`

**Code:** [`src/app/sitemap.ts`](../src/app/sitemap.ts)
**Tests:** [`src/app/__tests__/sitemap.test.ts`](../src/app/__tests__/sitemap.test.ts)

### Resolution order

1. `NEXT_PUBLIC_SITE_URL`, validated: must parse, must be `http(s)`, must not
   contain whitespace or control characters. A value the URL parser normalises
   (`https:/host`, `https:host`) is accepted.
2. `DEFAULT_SITE_URL` (`http://localhost:3000`) — the pre-existing fallback,
   emitted byte for byte as before.
3. Routes come from the frozen `SITEMAP_ROUTES` and are resolved *relatively*
   against `base + '/'`, so a base path (`https://host/docs`) is preserved and
   no double slash can appear.

### Invariants

| # | Invariant | Where |
|---|-----------|-------|
| S1 | Every entry is an absolute `http(s)` URL with a host and **no credentials** — enforced on the resolver's output, not assumed | `expectOnlyAbsoluteHttpUrls` helper, `rejects a resolver that leaks credentials…` |
| S2 | `sitemap()` never throws: a rejected route is dropped, a rejected base falls back | `never throws for any combination of hostile inputs` |
| S3 | The document is never empty; the base entry is always emitted | `always emits at least the base entry, even for an empty route list` |
| S4 | Declaration order preserved, duplicates collapsed to the first occurrence, document capped at `SITEMAP_MAX_URLS` (50 000) | `collapses duplicates…`, `caps the document at the configured limit…` |
| S5 | One timestamp per document, captured once; `SOURCE_DATE_EPOCH` makes it reproducible, an unusable value falls back and is reported | `shares one timestamp…`, `honours SOURCE_DATE_EPOCH…` |
| S6 | Reports carry a stable code and the *reason* only — never the offending value (which can embed credentials, host or path) | `reports a rejected base URL with the reason and never the offending value` |
| S7 | Reports are emitted once per distinct condition per process, so a hot route cannot flood logs or grow memory | `reports a misconfigured site URL once per process…` |

### Security notes

* **Scheme allowlist.** `javascript:`, `data:`, `file:` and `ftp:` bases are
  rejected — an unvalidated `NEXT_PUBLIC_SITE_URL` previously flowed straight
  into the served document.
* **No credential leakage.** `URL.origin` cannot represent userinfo, a query or
  a fragment, so the composed base cannot carry them. Their presence in the
  configured value is still reported, because embedding credentials in a public
  `NEXT_PUBLIC_*` variable is a configuration fault.
* **Route allowlist.** Routes must match an RFC 3986 `pchar` allowlist and may
  not contain `.`/`..`/empty segments, so a route can never escape the base
  directory or smuggle a query, fragment or encoded control character.
* **Path traversal.** `'/../etc/passwd'` and `'/nested/../escape'` are dropped.
* **Production diagnosability.** The default reporter is a no-op under
  `NODE_ENV=production`, so a rejected site URL is additionally logged once via
  `console.warn` — a sitemap silently serving `localhost` URLs to crawlers is a
  real SEO bug that is otherwise invisible. Only the reason and the fallback are
  printed.

### Known follow-up (out of scope here)

[`src/app/robots.ts`](../src/app/robots.ts) composes `${siteUrl}/sitemap.xml`
from the same environment variable without validation, so it can still publish
a malformed sitemap reference. It is a separate route with its own public
interface and is intentionally untouched by this change.

---

## Report codes

| Code | Level | Meaning |
|------|-------|---------|
| `CONTRACTS_LOADING_FAILED` | `error` | The `/contracts` loading fallback subtree threw |
| `CONTRACTS_LOADING_STALLED` | `warn` | The fallback outlived its stall budget; the render may still succeed |
| `SITEMAP_SITE_URL_REJECTED` | `warn` | `NEXT_PUBLIC_SITE_URL` was unusable; the default origin is in use |
| `SITEMAP_SITE_URL_SANITIZED` | `warn` | The value was usable but carried credentials, a query or a fragment |
| `SITEMAP_ROUTE_DROPPED` | `warn` | A route was invalid, unresolvable, or did not resolve to an absolute `http(s)` URL |
| `SITEMAP_TRUNCATED` | `warn` | The document hit the protocol URL limit |
| `SITEMAP_INVALID_TIMESTAMP` | `warn` | `SOURCE_DATE_EPOCH` or the injected clock was unusable |

All of them flow through [`src/lib/errorReporter.ts`](../src/lib/errorReporter.ts),
so a host application can capture them with `setErrorReporter`.
