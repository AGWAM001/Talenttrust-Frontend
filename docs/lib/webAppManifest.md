# `webAppManifest` — web app manifest contract

The install-time contract for [`src/app/manifest.ts`](../../src/app/manifest.ts),
served by Next.js as `/manifest.webmanifest`.

**Module:** [`src/lib/webAppManifest.ts`](../../src/lib/webAppManifest.ts)
**Consumer:** [`src/app/manifest.ts`](../../src/app/manifest.ts)

## Why this exists

The manifest is a Next.js metadata route: the framework calls it and hands the
returned object to the browser. A malformed manifest does not throw — it
silently stops the app from being installable, drops the branded icon from a
home screen, or renders with the wrong chrome colour. The "contract" used to be
whatever the route file happened to return, which is not something a review can
verify.

This module makes the manifest an explicit, tested data contract: the canonical
branding lives in one place, every field is validated before it is emitted, the
canonical install icons cannot be removed or overridden, and the result is
frozen so a caller cannot mutate shared state.

## Exports

| Export | Purpose |
| --- | --- |
| `MANIFEST_NAME` / `MANIFEST_SHORT_NAME` / `MANIFEST_DESCRIPTION` | Canonical branding text. |
| `MANIFEST_START_URL` | `/` — the install entry point. |
| `MANIFEST_DISPLAY` | `standalone`. |
| `MANIFEST_BACKGROUND_COLOR` / `MANIFEST_THEME_COLOR` | `#ffffff` / `#2563eb`. |
| `DEFAULT_MANIFEST_ICONS` | Frozen, ordered canonical icon set (SVG first, then 192 and 512 PNG). |
| `MAX_MANIFEST_ICONS` | Upper bound on declared icons (`12`). |
| `MAX_MANIFEST_NAME_LENGTH` / `MAX_MANIFEST_SHORT_NAME_LENGTH` / `MAX_MANIFEST_DESCRIPTION_LENGTH` | Per-field length budgets. |
| `MAX_MANIFEST_ICON_SRC_LENGTH` / `MAX_MANIFEST_START_URL_LENGTH` / `MAX_MANIFEST_ICON_DIMENSION` | Path and size bounds. |
| `MANIFEST_DISPLAY_MODES` | Display modes the contract passes through. |
| `SUPPORTED_MANIFEST_ICON_TYPES` | `image/png`, `image/svg+xml`, `image/webp`, `image/jpeg`. |
| `SUPPORTED_MANIFEST_ICON_PURPOSES` | `any`, `maskable`, `monochrome`. |
| `WebAppManifestIcon` | `{ src, sizes, type, purpose? }`. |
| `sanitizeWebAppManifestIcon(value)` | Validates/canonicalizes one icon; returns a frozen icon or `null`. |
| `normalizeWebAppManifestIcons(input)` | Total normalization returning the icons plus drop counts. |
| `buildWebAppManifest(source?)` | Pure, total builder returning `{ manifest, report }`. |
| `getWebAppManifest()` | Canonical manifest as a fresh deeply frozen object. |
| `reportWebAppManifestAnomalies(report)` | Emits a counts-only warning through the shared error reporter when degraded. |

## Invariants

1. **Canonical icons are reserved.** `/icon.svg`, `/icon-192x192.png`, and
   `/icon-512x512.png` are always present and keep their declaration order
   (SVG first, because it is the preferred resolution-independent format). A
   source may only *add* non-colliding icons, so it can never strip a required
   install size or replace the branded assets.
2. **Total.** `buildWebAppManifest` accepts any `unknown` — omitted, `null`,
   primitives, partial objects, cyclic objects, and objects with hostile
   getters — and never throws.
3. **Deterministic.** The same source always yields structurally identical
   output; normalization order and the cap make the icon list independent of
   input quirks such as leading zeros (`0256x0256` → `256x256`) or duplicate
   size tokens.
4. **Validated and bounded.** `src` must be a safe root-relative path (no
   absolute/protocol-relative URLs, backslashes, whitespace, or `..`
   segments); `sizes` must be `any` or `WxH` with `0 < W,H <= 8192`; `type` must
   be a supported image MIME type; `display` must be a known mode; colours must
   be `#rgb`/`#rrggbb`; text fields are trimmed and length-checked.
5. **Safe fallback.** An unusable scalar falls back to the documented canonical
   value; an `icons` value that yields no usable entry falls back to the
   canonical icon set. Installability is therefore guaranteed for every input.
6. **Immutable and stateless.** Results are deeply frozen and no module-level
   mutable state is shared between calls, so retries and concurrent calls
   cannot observe or corrupt one another.
7. **Diagnosable, not leaky.** The report exposes only counts
   (`rejected`, `duplicates`, `truncated`, `adjustedFields`, `usedFallback`,
   `degraded`) — never the offending content. `reportWebAppManifestAnomalies`
   is silent for a clean build, so normal operation adds no log noise.

## The report

```ts
interface WebAppManifestReport {
  rejected: number;       // malformed icon entries dropped
  duplicates: number;     // icons dropped for re-using a src (incl. canonical srcs)
  truncated: number;      // valid icons dropped past MAX_MANIFEST_ICONS
  adjustedFields: number; // scalar fields that fell back to the canonical default
  usedFallback: boolean;  // `icons` present but unusable → canonical set used
  degraded: boolean;      // any of the above non-zero
}
```

## Usage

```ts
import { buildWebAppManifest, reportWebAppManifestAnomalies } from '@/lib/webAppManifest';

export default function manifest() {
  const { manifest: value, report } = buildWebAppManifest();
  reportWebAppManifestAnomalies(report); // no-op for the canonical config
  return value;
}
```

## Tests

- [`src/lib/webAppManifest.test.ts`](../../src/lib/webAppManifest.test.ts) —
  canonical output and icon order, scalar validation (empty/over-long/
  non-string values, unknown display modes, invalid colours and paths), icon
  validation (malformed `src`/`sizes`/`type`/`purpose`, boundary dimensions,
  size-token canonicalization), duplicate and cap boundaries, canonical-src
  override attempts, totality (primitives, cycles, hostile getters),
  determinism and idempotence, deep-freeze immutability, and the counts-only
  observability contract.
- [`src/app/__tests__/manifest.test.ts`](../../src/app/__tests__/manifest.test.ts)
  — route wiring: the route equals the contract output, returns a fresh deeply
  frozen manifest per call, cannot be mutated into a degraded state, and emits
  no diagnostics for the canonical configuration.
