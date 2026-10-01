/**
 * State + data-integrity contract for the web app manifest
 * (`src/app/manifest.ts`).
 *
 * `src/app/manifest.ts` is a Next.js metadata route: the framework calls it and
 * ships the returned object to browsers as `/manifest.webmanifest`. A manifest
 * that is malformed does not throw — it silently stops the app from being
 * installable, drops the branded icon on a home screen, or renders with the
 * wrong chrome colour. That makes "the manifest is always valid" a state
 * invariant worth owning explicitly rather than leaving as whatever the route
 * file happens to return.
 *
 * This module makes the whole contract total, deterministic, and immutable:
 *
 * 1. **Canonical icons are reserved.** The branded install icons
 *    (`/icon.svg`, `/icon-192x192.png`, `/icon-512x512.png`) are always present
 *    and in declaration order. A source can only ever *add* non-colliding
 *    icons; it cannot replace, reorder, or delete the canonical set, so a
 *    malformed source cannot strip the app of a required install size.
 * 2. **Total and deterministic.** `buildWebAppManifest` accepts any `unknown`
 *    (omitted, `null`, primitives, cycles, hostile getters) and never throws.
 *    The same input always yields structurally identical output.
 * 3. **Validated and bounded.** Every scalar is trimmed, pattern-checked, and
 *    length-clamped; every icon is validated (`src` must be a safe
 *    root-relative path, `sizes` must be `any` or `WxH`, `type` must be a
 *    supported image MIME type). Unusable values fall back to the canonical
 *    defaults instead of leaking through.
 * 4. **Immutable and stateless.** Results are deeply frozen and no module-level
 *    mutable state is shared between calls, so retries and concurrent calls
 *    cannot observe or corrupt one another.
 * 5. **Diagnosable, not leaky.** `buildWebAppManifest` returns a report of
 *    counts (rejected / duplicate / truncated / adjusted), never the offending
 *    content, and `reportWebAppManifestAnomalies` emits that summary through
 *    the shared error reporter only when the source actually degraded.
 */

import type { MetadataRoute } from 'next';
import { reportError } from './errorReporter';

/** An icon entry as declared by the manifest. */
export interface WebAppManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
  readonly purpose?: WebAppManifestIconPurpose;
}

/** Allowed `purpose` values, matching the web app manifest spec. */
export type WebAppManifestIconPurpose = 'any' | 'maskable' | 'monochrome';

/** Display modes the contract will pass through. */
export type WebAppManifestDisplay = NonNullable<
  MetadataRoute.Manifest['display']
>;

/** Product name shown when the app is installed. */
export const MANIFEST_NAME = 'TalentTrust - Safe Freelance Payments';

/** Home-screen label. Kept within the recommended 12-character budget. */
export const MANIFEST_SHORT_NAME = 'TalentTrust';

/** Install prompt / store description. */
export const MANIFEST_DESCRIPTION =
  'Safe, secure payments that protect both freelancers and clients throughout your project.';

/** Entry point the installed app opens at. */
export const MANIFEST_START_URL = '/';

/** Standalone hides the browser chrome, which is what an installable app wants. */
export const MANIFEST_DISPLAY: WebAppManifestDisplay = 'standalone';

/** Splash background, matching the light `--background` token. */
export const MANIFEST_BACKGROUND_COLOR = '#ffffff';

/** Browser chrome colour, matching the `--primary` token. */
export const MANIFEST_THEME_COLOR = '#2563eb';

/** Longest accepted `name`; anything longer falls back to the default. */
export const MAX_MANIFEST_NAME_LENGTH = 45;

/** Longest accepted `short_name` (the recommended home-screen budget). */
export const MAX_MANIFEST_SHORT_NAME_LENGTH = 12;

/** Longest accepted `description`. */
export const MAX_MANIFEST_DESCRIPTION_LENGTH = 300;

/** Upper bound on how many icons the manifest will ever declare. */
export const MAX_MANIFEST_ICONS = 12;

/** Upper bound on an icon `src`. */
export const MAX_MANIFEST_ICON_SRC_LENGTH = 256;

/** Upper bound on `start_url`. */
export const MAX_MANIFEST_START_URL_LENGTH = 512;

/** Largest width/height accepted in an icon `sizes` token. */
export const MAX_MANIFEST_ICON_DIMENSION = 8192;

/** Display modes the contract accepts; anything else falls back. */
export const MANIFEST_DISPLAY_MODES: readonly WebAppManifestDisplay[] = [
  'fullscreen',
  'standalone',
  'minimal-ui',
  'browser',
];

/** Image MIME types an icon may declare. */
export const SUPPORTED_MANIFEST_ICON_TYPES = [
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/jpeg',
] as const;

/** Allowed `purpose` tokens. */
export const SUPPORTED_MANIFEST_ICON_PURPOSES: readonly WebAppManifestIconPurpose[] =
  ['any', 'maskable', 'monochrome'];

/**
 * Documented default icon set. Order is part of the public contract (the SVG
 * is first because it is the preferred, resolution-independent format) and is
 * asserted by tests — editing this list is a user-visible behaviour change.
 */
export const DEFAULT_MANIFEST_ICONS: readonly WebAppManifestIcon[] =
  Object.freeze([
    Object.freeze({
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
    }),
    Object.freeze({
      src: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    }),
    Object.freeze({
      src: '/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    }),
  ]);

/**
 * Outcome of normalizing a candidate icon list. Only counts are exposed — never
 * the offending values — so callers can log or emit metrics without echoing
 * attacker- or config-controlled content.
 */
export interface WebAppManifestIconNormalization {
  /** Frozen, de-duplicated, bounded icon list that always includes the defaults. */
  readonly icons: readonly WebAppManifestIcon[];
  /** Entries dropped because they were not a well-formed icon. */
  readonly rejected: number;
  /** Entries dropped because their `src` was already present. */
  readonly duplicates: number;
  /** Valid entries dropped because the list exceeded {@link MAX_MANIFEST_ICONS}. */
  readonly truncated: number;
  /**
   * `true` when the source supplied an `icons` value but no entry was usable,
   * so the canonical default set renders unchanged. Absent input is not a
   * fallback and reports `false`.
   */
  readonly usedFallback: boolean;
}

/** Sanitized diagnostics for one manifest build. */
export interface WebAppManifestReport {
  /** Malformed icon entries dropped. */
  readonly rejected: number;
  /** Icon entries dropped for re-using a `src`. */
  readonly duplicates: number;
  /** Valid icon entries dropped past the cap. */
  readonly truncated: number;
  /** Scalar fields that fell back to the canonical default (invalid/over-long). */
  readonly adjustedFields: number;
  /** See {@link WebAppManifestIconNormalization.usedFallback}. */
  readonly usedFallback: boolean;
  /** `true` when the source diverged from the canonical manifest in any way. */
  readonly degraded: boolean;
}

/** Result of building a manifest: the frozen manifest plus its diagnostics. */
export interface WebAppManifestBuild {
  readonly manifest: MetadataRoute.Manifest;
  readonly report: WebAppManifestReport;
}

/** Reporter context label used for manifest diagnostics. */
export const WEB_APP_MANIFEST_REPORT_CONTEXT = 'webAppManifest';

interface FieldResult<T> {
  readonly value: T;
  /** `true` when the candidate was unusable and the canonical default was used. */
  readonly adjusted: boolean;
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SIZE_TOKEN_PATTERN = /^(\d{1,4})x(\d{1,4})$/;
// Rejecting control characters is the purpose of this pattern (see
// `isSafeManifestPath`), so the lint rule that flags them does not apply.
// eslint-disable-next-line no-control-regex
const CONTROL_OR_WHITESPACE = /[\u0000-\u001F\u007F\s]/;

const SUPPORTED_ICON_TYPE_SET = new Set<string>(SUPPORTED_MANIFEST_ICON_TYPES);
const SUPPORTED_ICON_PURPOSE_SET = new Set<string>(
  SUPPORTED_MANIFEST_ICON_PURPOSES,
);
const DISPLAY_MODE_SET = new Set<string>(MANIFEST_DISPLAY_MODES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads a property from an arbitrary source without ever throwing. Hostile
 * getters and exotic objects (e.g. revoked proxies) are treated as absent.
 */
function safeGet(source: unknown, key: string): unknown {
  if (!isRecord(source)) return undefined;
  try {
    return source[key];
  } catch {
    return undefined;
  }
}

/**
 * A root-relative path that stays inside the app. Rejects absolute URLs,
 * protocol-relative URLs (`//host`), backslashes, whitespace/control characters,
 * and `..` traversal segments.
 */
function isSafeManifestPath(path: string): boolean {
  if (!path.startsWith('/')) return false;
  if (path.startsWith('//')) return false;
  if (path.includes('\\')) return false;
  if (CONTROL_OR_WHITESPACE.test(path)) return false;
  return !path.split('/').includes('..');
}

function normalizeText(
  value: unknown,
  maxLength: number,
  fallback: string,
): FieldResult<string> {
  // An absent value is not a fault: the canonical default is simply used.
  if (value === undefined) return { value: fallback, adjusted: false };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= maxLength) {
      return { value: trimmed, adjusted: false };
    }
  }
  return { value: fallback, adjusted: true };
}

function normalizeStartUrl(
  value: unknown,
  fallback: string,
): FieldResult<string> {
  if (value === undefined) return { value: fallback, adjusted: false };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length <= MAX_MANIFEST_START_URL_LENGTH &&
      isSafeManifestPath(trimmed)
    ) {
      return { value: trimmed, adjusted: false };
    }
  }
  return { value: fallback, adjusted: true };
}

function normalizeHexColor(
  value: unknown,
  fallback: string,
): FieldResult<string> {
  if (value === undefined) return { value: fallback, adjusted: false };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (HEX_COLOR_PATTERN.test(trimmed)) {
      return { value: trimmed.toLowerCase(), adjusted: false };
    }
  }
  return { value: fallback, adjusted: true };
}

function normalizeDisplay(
  value: unknown,
  fallback: WebAppManifestDisplay,
): FieldResult<WebAppManifestDisplay> {
  if (value === undefined) return { value: fallback, adjusted: false };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (DISPLAY_MODE_SET.has(trimmed)) {
      return { value: trimmed as WebAppManifestDisplay, adjusted: false };
    }
  }
  return { value: fallback, adjusted: true };
}

/**
 * Normalizes an icon `sizes` value to a canonical, space-joined, de-duplicated
 * token list. Accepts `any` and one or more `WxH` tokens; anything else is
 * rejected.
 */
function normalizeIconSizes(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const tokens = value.trim().split(/\s+/);
  if (tokens.length === 0 || tokens[0] === '') return null;

  const sizes: string[] = [];
  for (const token of tokens) {
    if (token === 'any') {
      sizes.push('any');
      continue;
    }

    const match = SIZE_TOKEN_PATTERN.exec(token);
    if (!match) return null;

    const width = Number(match[1]);
    const height = Number(match[2]);
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width > MAX_MANIFEST_ICON_DIMENSION ||
      height > MAX_MANIFEST_ICON_DIMENSION
    ) {
      return null;
    }

    sizes.push(`${width}x${height}`);
  }

  return Array.from(new Set(sizes)).join(' ');
}

function normalizeIconSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_MANIFEST_ICON_SRC_LENGTH) {
    return null;
  }
  return isSafeManifestPath(trimmed) ? trimmed : null;
}

function normalizeIconType(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return SUPPORTED_ICON_TYPE_SET.has(normalized) ? normalized : null;
}

function normalizeIconPurpose(
  value: unknown,
): WebAppManifestIconPurpose | null | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return SUPPORTED_ICON_PURPOSE_SET.has(normalized)
    ? (normalized as WebAppManifestIconPurpose)
    : null;
}

/**
 * Validates and trims a single candidate icon. Returns a frozen icon, or `null`
 * when the value is unusable. Pure and total — never throws.
 */
export function sanitizeWebAppManifestIcon(
  value: unknown,
): WebAppManifestIcon | null {
  try {
    if (!isRecord(value)) return null;

    const src = normalizeIconSrc(value.src);
    const sizes = normalizeIconSizes(value.sizes);
    const type = normalizeIconType(value.type);
    if (src === null || sizes === null || type === null) return null;

    const purpose = normalizeIconPurpose(value.purpose);
    if (purpose === null) return null;

    const icon: {
      src: string;
      sizes: string;
      type: string;
      purpose?: WebAppManifestIconPurpose;
    } = { src, sizes, type };
    if (purpose !== undefined) {
      icon.purpose = purpose;
    }

    return Object.freeze(icon);
  } catch {
    return null;
  }
}

function freezeIconNormalization(
  icons: WebAppManifestIcon[],
  rejected: number,
  duplicates: number,
  truncated: number,
  usedFallback: boolean,
): WebAppManifestIconNormalization {
  return Object.freeze({
    icons: Object.freeze(icons),
    rejected,
    duplicates,
    truncated,
    usedFallback,
  });
}

/**
 * Deterministically normalizes arbitrary candidate data into a bounded,
 * de-duplicated icon list that always begins with the canonical default icons.
 *
 * The canonical `src`s are reserved: a source entry that re-uses one is counted
 * as a duplicate and dropped, so input can never override the branded or
 * required install sizes.
 */
export function normalizeWebAppManifestIcons(
  input: unknown,
): WebAppManifestIconNormalization {
  const canonical = [...DEFAULT_MANIFEST_ICONS];

  // Absent input is the normal production case: the canonical set, no fault.
  if (input === undefined) {
    return freezeIconNormalization(canonical, 0, 0, 0, false);
  }

  // Present but not an array: unusable, so the canonical set is the fallback.
  if (!Array.isArray(input)) {
    return freezeIconNormalization(canonical, 0, 0, 0, true);
  }

  const seen = new Set<string>(canonical.map((icon) => icon.src));
  const icons = [...canonical];
  let rejected = 0;
  let duplicates = 0;
  let truncated = 0;
  let accepted = 0;

  for (const entry of input) {
    const icon = sanitizeWebAppManifestIcon(entry);

    if (icon === null) {
      rejected += 1;
      continue;
    }

    if (seen.has(icon.src)) {
      duplicates += 1;
      continue;
    }

    if (icons.length >= MAX_MANIFEST_ICONS) {
      truncated += 1;
      continue;
    }

    seen.add(icon.src);
    icons.push(icon);
    accepted += 1;
  }

  return freezeIconNormalization(
    icons,
    rejected,
    duplicates,
    truncated,
    accepted === 0,
  );
}

/**
 * Recursively freezes an object graph. Idempotent and cycle-safe (a value is
 * frozen before its children are visited, and already-frozen values are not
 * re-entered).
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;

  Object.freeze(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/**
 * Builds the web app manifest from an arbitrary source.
 *
 * @param source - Any candidate manifest config. Omitted, `null`, primitives,
 *   partial objects, cyclic objects, and hostile getters are all accepted; each
 *   unusable field falls back to its documented default. Passing nothing yields
 *   the canonical TalentTrust manifest.
 * @returns A deeply frozen manifest plus a counts-only diagnostics report.
 */
export function buildWebAppManifest(source?: unknown): WebAppManifestBuild {
  const name = normalizeText(
    safeGet(source, 'name'),
    MAX_MANIFEST_NAME_LENGTH,
    MANIFEST_NAME,
  );
  const shortName = normalizeText(
    safeGet(source, 'short_name'),
    MAX_MANIFEST_SHORT_NAME_LENGTH,
    MANIFEST_SHORT_NAME,
  );
  const description = normalizeText(
    safeGet(source, 'description'),
    MAX_MANIFEST_DESCRIPTION_LENGTH,
    MANIFEST_DESCRIPTION,
  );
  const startUrl = normalizeStartUrl(
    safeGet(source, 'start_url'),
    MANIFEST_START_URL,
  );
  const display = normalizeDisplay(
    safeGet(source, 'display'),
    MANIFEST_DISPLAY,
  );
  const backgroundColor = normalizeHexColor(
    safeGet(source, 'background_color'),
    MANIFEST_BACKGROUND_COLOR,
  );
  const themeColor = normalizeHexColor(
    safeGet(source, 'theme_color'),
    MANIFEST_THEME_COLOR,
  );
  const icons = normalizeWebAppManifestIcons(safeGet(source, 'icons'));

  const adjustedFields = [
    name,
    shortName,
    description,
    startUrl,
    display,
    backgroundColor,
    themeColor,
  ].filter((field) => field.adjusted).length;

  const report: WebAppManifestReport = Object.freeze({
    rejected: icons.rejected,
    duplicates: icons.duplicates,
    truncated: icons.truncated,
    adjustedFields,
    usedFallback: icons.usedFallback,
    degraded:
      icons.rejected > 0 ||
      icons.duplicates > 0 ||
      icons.truncated > 0 ||
      adjustedFields > 0,
  });

  const manifest: MetadataRoute.Manifest = {
    name: name.value,
    short_name: shortName.value,
    description: description.value,
    start_url: startUrl.value,
    display: display.value,
    background_color: backgroundColor.value,
    theme_color: themeColor.value,
    // Copy into a fresh mutable array so the value matches Next's `Icon[]`
    // type; the elements themselves remain frozen.
    icons: [...icons.icons],
  };

  return Object.freeze({ manifest: deepFreeze(manifest), report });
}

/**
 * Page-facing accessor returning the canonical, validated manifest.
 *
 * A fresh deeply frozen object is returned on every call, so callers cannot
 * mutate a shared reference and corrupt later requests.
 */
export function getWebAppManifest(): MetadataRoute.Manifest {
  return buildWebAppManifest().manifest;
}

/**
 * Emits a bounded diagnostics summary for a degraded manifest build.
 *
 * Clean builds are silent, so normal operation adds no log noise. When the
 * source degraded, only counts are reported — never the offending content.
 */
export function reportWebAppManifestAnomalies(report: WebAppManifestReport): void {
  if (!report.degraded) return;

  reportError(
    new Error('Web app manifest source was normalized to safe defaults'),
    WEB_APP_MANIFEST_REPORT_CONTEXT,
    'warn',
    {
      rejected: report.rejected,
      duplicates: report.duplicates,
      truncated: report.truncated,
      adjustedFields: report.adjustedFields,
      usedFallback: report.usedFallback,
    },
  );
}
