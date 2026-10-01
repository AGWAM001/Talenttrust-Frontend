import type { MetadataRoute } from 'next';
import { reportError, type ErrorReporter } from '../lib/errorReporter';

/**
 * Deterministic sitemap generation with recoverable failures (#1256).
 *
 * `/sitemap.xml` is generated per request, so every run must land on the same
 * answer for the same inputs: crawlers re-fetch it constantly, and a sitemap
 * that changes shape between requests (or between processes) makes indexing
 * behaviour impossible to reason about. Two things used to break that:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` was trusted verbatim. A typo (`https:/app.com`),
 *      a protocol-relative value (`//evil.com`), a non-HTTP scheme
 *      (`javascript:`, `file:`), embedded credentials, or a base with a path
 *      prefix all produced a silently malformed — or unsafe — document, and
 *      nothing was logged.
 *   2. Nothing validated the result, so one bad route took the whole document
 *      down instead of degrading to a smaller correct sitemap.
 *
 * Invariants (each asserted in `src/app/__tests__/sitemap.test.ts`):
 *
 *   S1 – Every entry is an absolute `http(s)` URL. Nothing relative, nothing
 *        with credentials, nothing with a foreign scheme ever reaches output.
 *   S2 – The function never throws. A rejected route is dropped and reported;
 *        a rejected base URL falls back to {@link DEFAULT_SITE_URL}. The route
 *        always returns a usable document.
 *   S3 – Never empty. A sitemap with zero URLs is invalid and makes crawlers
 *        drop the site, so the base entry is always emitted.
 *   S4 – Deterministic order and cardinality. Declaration order is preserved,
 *        duplicates collapse to their first occurrence, and the URL count is
 *        capped at the protocol limit of {@link SITEMAP_MAX_URLS}.
 *   S5 – One timestamp per document, captured once, so a single response never
 *        mixes `lastModified` values. Set `SOURCE_DATE_EPOCH` to make it
 *        reproducible across builds.
 *   S6 – No silent degradation. Every rejection is reported with a stable code
 *        and the *reason* only — never the offending value, which can carry
 *        credentials, hostnames or paths.
 *   S7 – Reports are emitted once per distinct condition per process, so a hot
 *        `/sitemap.xml` route cannot flood the logs or grow memory. The key
 *        space is the fixed code + reason vocabulary, so the set is bounded.
 *
 * No user data is read or written here, so repeated or concurrent generation is
 * side-effect free apart from the deduplicated reports in S7.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Documented fallback origin. Preserved from the original implementation. */
export const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * Ordered public routes. `'/'` is the site root and always resolves to the
 * configured base without a trailing slash, which is what the previous
 * implementation emitted.
 */
export const SITEMAP_ROUTES: readonly string[] = Object.freeze([
  '/',
  '/contracts',
  '/milestones',
  '/reputation',
]);

/** Protocol limit for a single sitemap file (per sitemaps.org). */
export const SITEMAP_MAX_URLS = 50_000;

/** Only these schemes may appear in a sitemap. */
const ALLOWED_PROTOCOLS: readonly string[] = Object.freeze(['http:', 'https:']);

/**
 * True when `value` contains a space or a C0/C1 control character.
 *
 * Spelled out as a code-point scan rather than a regular expression so the
 * rule is explicit and so the intent is not mistaken for a character-class
 * range. Hyphens and every other printable character are deliberately allowed
 * (`https://my-site.example` is valid).
 */
function hasUnsafeBaseUrlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x20 || (code >= 0x7f && code <= 0x9f)) return true;
  }
  return false;
}

/**
 * Allowlist for route path characters (RFC 3986 `pchar` plus `/`). A whitelist
 * is used instead of a blacklist so a future URL syntax cannot smuggle a
 * character past validation into the XML.
 */
const SAFE_ROUTE_CHARS = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/]+$/;

/** Stable report codes, safe to alert on. */
export const SITEMAP_SITE_URL_REJECTED_CODE = 'SITEMAP_SITE_URL_REJECTED' as const;
export const SITEMAP_SITE_URL_SANITIZED_CODE = 'SITEMAP_SITE_URL_SANITIZED' as const;
export const SITEMAP_ROUTE_DROPPED_CODE = 'SITEMAP_ROUTE_DROPPED' as const;
export const SITEMAP_TRUNCATED_CODE = 'SITEMAP_TRUNCATED' as const;
export const SITEMAP_INVALID_TIMESTAMP_CODE = 'SITEMAP_INVALID_TIMESTAMP' as const;

/** Largest absolute date `Date` can represent (ms since epoch). */
const MAX_DATE_MS = 8.64e15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Why a configured base URL could not be used as-is. */
export type SitemapBaseUrlRejection =
  | 'unparsable'
  | 'unsupported-protocol'
  | 'invalid-characters';

/** Parts stripped from an otherwise valid base URL. */
export type SitemapSanitisedPart = 'credentials' | 'query' | 'hash';

export interface ResolvedSitemapBaseUrl {
  /**
   * Absolute origin plus optional base path, normalised without a trailing
   * slash — e.g. `https://app.example` or `https://example.com/docs`.
   */
  base: string;
  /** True when {@link DEFAULT_SITE_URL} is in use because `raw` was rejected. */
  usedFallback: boolean;
  /** Present only when `usedFallback` is true. */
  rejection?: SitemapBaseUrlRejection;
  /** Scheme of the rejected value when one could be read. Never host or path. */
  rejectedProtocol?: string;
  /** Parts that were dropped from an otherwise valid value. */
  sanitised: SitemapSanitisedPart[];
}

export interface SitemapBuildOptions {
  /**
   * Configured site URL. Defaults to `NEXT_PUBLIC_SITE_URL`; a blank or absent
   * value is treated as "not configured" and is not reported.
   */
  siteUrl?: string;
  /** Route list. Defaults to {@link SITEMAP_ROUTES}. */
  routes?: readonly string[];
  /** Clock seam. Defaults to `() => new Date()`. */
  now?: () => Date;
  /** Report seam. Defaults to the central `reportError`. Never deduplicated. */
  report?: ErrorReporter;
  /**
   * URL-resolution seam. Defaults to `new URL(path, base)`. Injectable so a
   * platform-level parser failure can be exercised deterministically.
   */
  resolveUrl?: (path: string, base: string) => URL;
  /**
   * Document size cap. Defaults to {@link SITEMAP_MAX_URLS}; a non-finite or
   * sub-1 value falls back to that limit, so the cap can never be disabled by a
   * bad input. Overridable so the boundary is testable without building a
   * 50,000-entry document.
   */
  maxUrls?: number;
}

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

/** Collapses duplicate slashes and removes any trailing slash. */
function normalisePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return collapsed;
}

/**
 * Validates a configured site URL and, when it is unusable, returns the
 * documented fallback together with the reason (S1, S2, S6).
 *
 * Pure: the caller decides whether the reason is worth reporting.
 */
export function resolveSitemapBaseUrl(raw: string | undefined): ResolvedSitemapBaseUrl {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';

  // Unset / blank is a legitimate configuration (local development), not a
  // misconfiguration, so it is reported as a fallback without a rejection
  // reason and therefore without a warning.
  if (trimmed === '') {
    return { base: DEFAULT_SITE_URL, usedFallback: true, sanitised: [] };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      base: DEFAULT_SITE_URL,
      usedFallback: true,
      rejection: 'unparsable',
      sanitised: [],
    };
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return {
      base: DEFAULT_SITE_URL,
      usedFallback: true,
      rejection: 'unsupported-protocol',
      rejectedProtocol: parsed.protocol.replace(/:$/, ''),
      sanitised: [],
    };
  }

  // `new URL` either throws or yields a non-empty host for http(s), so there is
  // no "parsed but hostless" case to handle here. What can still reach the XML
  // verbatim is a raw value carrying whitespace or a control character, which
  // the parser would silently percent-encode into a URL the operator did not
  // write. Reject it rather than serve something different from what was set.
  if (hasUnsafeBaseUrlChars(trimmed)) {
    return {
      base: DEFAULT_SITE_URL,
      usedFallback: true,
      rejection: 'invalid-characters',
      sanitised: [],
    };
  }

  // `URL.origin` is scheme + host + port only: it can never contain userinfo,
  // a query string or a fragment, so the value composed below cannot leak
  // credentials into a document served to every crawler. Their presence is
  // still recorded and reported, because embedding credentials or a token in a
  // public `NEXT_PUBLIC_*` value is a configuration fault worth surfacing.
  const sanitised: SitemapSanitisedPart[] = [];
  if (parsed.username !== '' || parsed.password !== '') {
    sanitised.push('credentials');
  }
  if (parsed.search !== '') {
    sanitised.push('query');
  }
  if (parsed.hash !== '') {
    sanitised.push('hash');
  }

  return {
    base: `${parsed.origin}${normalisePathname(parsed.pathname)}`,
    usedFallback: false,
    sanitised,
  };
}

// ---------------------------------------------------------------------------
// Timestamp resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the single `lastModified` value shared by every entry (S5).
 *
 * `SOURCE_DATE_EPOCH` (seconds, the reproducible-builds convention) wins when
 * present and valid, which makes repeated builds emit an identical document.
 * Anything unusable — including an injected clock that yields an Invalid Date —
 * falls back to wall-clock time and is reported rather than propagated.
 */
function resolveLastModified(now: () => Date, report: ErrorReporter): Date {
  const raw = process.env.SOURCE_DATE_EPOCH;

  if (raw !== undefined && raw.trim() !== '') {
    const seconds = Number(raw);
    const ms = seconds * 1000;
    if (Number.isFinite(seconds) && seconds >= 0 && Math.abs(ms) <= MAX_DATE_MS) {
      return new Date(ms);
    }
    report(
      new Error('SOURCE_DATE_EPOCH is not a usable timestamp; using the current time.'),
      'sitemap',
      'warn',
      { code: SITEMAP_INVALID_TIMESTAMP_CODE, source: 'SOURCE_DATE_EPOCH' },
    );
  }

  const current = now();
  if (current instanceof Date && Number.isFinite(current.getTime())) {
    return current;
  }

  report(
    new Error('Sitemap clock returned an invalid date; using the current time.'),
    'sitemap',
    'warn',
    { code: SITEMAP_INVALID_TIMESTAMP_CODE, source: 'clock' },
  );
  return new Date();
}

// ---------------------------------------------------------------------------
// Entry construction
// ---------------------------------------------------------------------------

export interface SitemapRouteBuild {
  entries: MetadataRoute.Sitemap;
  /** Number of routes dropped by validation or by a resolver failure. */
  dropped: number;
  /** True when the protocol URL cap forced a truncation. */
  truncated: boolean;
}

/**
 * Builds the sitemap body for a resolved base URL (S1, S3, S4).
 *
 * Every route is built in isolation: a rejected or failing route is counted and
 * reported and the remaining routes still ship, so one bad entry degrades the
 * document instead of emptying it.
 */
function buildEntries(
  base: string,
  routes: readonly string[],
  lastModified: Date,
  report: ErrorReporter,
  resolveUrl: (path: string, base: string) => URL,
  maxUrls: number,
): SitemapRouteBuild {
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();
  let dropped = 0;
  let truncated = false;

  for (const route of routes) {
    if (entries.length >= maxUrls) {
      truncated = true;
      dropped += 1;
      continue;
    }

    const trimmed = typeof route === 'string' ? route.trim() : '';
    const isHome = trimmed === '' || trimmed === '/';

    let url: string;
    if (isHome) {
      // Home keeps the configured base verbatim so the emitted URL matches the
      // previous implementation byte for byte (no trailing slash).
      url = base;
    } else {
      const relative = trimmed.replace(/^\/+/, '');
      if (!isSafeRoutePath(relative)) {
        dropped += 1;
        report(
          new Error(`Skipped an unusable sitemap route: ${describeRoute(trimmed)}.`),
          'sitemap',
          'warn',
          { code: SITEMAP_ROUTE_DROPPED_CODE, reason: 'invalid-route' },
        );
        continue;
      }

      try {
        // Relative resolution keeps a configured base path (`https://x/docs`)
        // in front of every route and cannot produce a double slash.
        url = resolveUrl(relative, `${base}/`).toString();
      } catch {
        dropped += 1;
        report(
          new Error(`Skipped a sitemap route whose URL could not be resolved: ${describeRoute(trimmed)}.`),
          'sitemap',
          'warn',
          { code: SITEMAP_ROUTE_DROPPED_CODE, reason: 'unresolvable-route' },
        );
        continue;
      }
    }

    // Re-validate the resolver's output: S1 is enforced, not assumed.
    if (!isAbsoluteHttpUrl(url)) {
      dropped += 1;
      report(
        new Error(`Skipped a sitemap route that did not resolve to an absolute http(s) URL: ${describeRoute(trimmed)}.`),
        'sitemap',
        'warn',
        { code: SITEMAP_ROUTE_DROPPED_CODE, reason: 'not-absolute-http' },
      );
      continue;
    }

    if (seen.has(url)) {
      // Duplicate route: collapse to the first occurrence (S4).
      dropped += 1;
      continue;
    }
    seen.add(url);
    entries.push({ url, lastModified });
  }

  return { entries, dropped, truncated };
}

/**
 * True when a route can be safely appended to the base as a relative path.
 *
 * Rejects anything outside the `pchar` allowlist (S1) plus `.`, `..` and empty
 * segments, so a route can never escape the configured base directory or smuggle
 * a query, fragment or percent-encoded control character into the output.
 */
function isSafeRoutePath(relative: string): boolean {
  if (relative === '' || !SAFE_ROUTE_CHARS.test(relative)) return false;
  return relative
    .split('/')
    .every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

/** True when `value` is an absolute `http(s)` URL with no embedded credentials. */
function isAbsoluteHttpUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    ALLOWED_PROTOCOLS.includes(parsed.protocol) &&
    parsed.hostname !== '' &&
    parsed.username === '' &&
    parsed.password === ''
  );
}

/**
 * Describes a route for a log message without echoing attacker-controlled or
 * credential-bearing content: only its length and character classes.
 */
function describeRoute(route: string): string {
  const routePath = route.split(/[?#]/)[0];
  return `<${routePath.length} chars, ${/^[a-z0-9/_\-.]*$/i.test(routePath) ? 'safe chars' : 'unexpected chars'}>`;
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

/**
 * Pure, dependency-injectable sitemap builder.
 *
 * Never throws (S2): every failure mode degrades to a smaller valid document
 * plus a report. `sitemap()` is the thin Next.js entry point over this.
 */
export function buildSitemap(options: SitemapBuildOptions = {}): MetadataRoute.Sitemap {
  const {
    siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
    routes = SITEMAP_ROUTES,
    now = () => new Date(),
    report = reportError,
    resolveUrl = (path: string, against: string) => new URL(path, against),
    maxUrls = SITEMAP_MAX_URLS,
  } = options;

  // A bad cap must never disable the protocol limit (S4).
  const urlLimit =
    Number.isFinite(maxUrls) && maxUrls >= 1 ? Math.floor(maxUrls) : SITEMAP_MAX_URLS;

  const resolved = resolveSitemapBaseUrl(siteUrl);

  if (resolved.rejection) {
    report(
      new Error('NEXT_PUBLIC_SITE_URL was rejected; falling back to the default origin.'),
      'sitemap',
      'warn',
      {
        code: SITEMAP_SITE_URL_REJECTED_CODE,
        reason: resolved.rejection,
        protocol: resolved.rejectedProtocol,
        fallback: DEFAULT_SITE_URL,
      },
    );
  } else if (resolved.sanitised.length > 0) {
    report(
      new Error('NEXT_PUBLIC_SITE_URL was sanitised before use.'),
      'sitemap',
      'warn',
      {
        code: SITEMAP_SITE_URL_SANITIZED_CODE,
        sanitised: resolved.sanitised,
      },
    );
  }

  const lastModified = resolveLastModified(now, report);
  const { entries, dropped, truncated } = buildEntries(
    resolved.base,
    routes,
    lastModified,
    report,
    resolveUrl,
    urlLimit,
  );

  if (truncated) {
    report(
      new Error('Sitemap exceeded the protocol URL limit and was truncated.'),
      'sitemap',
      'warn',
      { code: SITEMAP_TRUNCATED_CODE, limit: urlLimit, dropped },
    );
  }

  // S3: the base entry is re-added only if a caller-supplied route list was so
  // broken that the home route never made it. `SITEMAP_ROUTES` always includes
  // it, so this only triggers for an empty/hostile route list.
  if (entries.length === 0) {
    entries.push({ url: resolved.base, lastModified });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Next.js entry point
// ---------------------------------------------------------------------------

/**
 * Conditions already reported in this process (S7).
 *
 * The key space is `code + reason + sanitised`, all drawn from the fixed
 * vocabulary above, so this set cannot grow without bound.
 */
const reportedConditions = new Set<string>();

/**
 * Wraps the central reporter with once-per-condition deduplication.
 *
 * `sitemap()` runs on every request to `/sitemap.xml`, so without this a
 * misconfigured deployment would emit an identical warning per request. The
 * memo lives here rather than inside {@link buildSitemap} so the pure builder
 * stays trivially testable.
 */
function createDeduplicatedReporter(report: ErrorReporter): ErrorReporter {
  return (error, context, level = 'error', meta) => {
    const code = typeof meta?.code === 'string' ? meta.code : 'unknown';
    const reason = typeof meta?.reason === 'string' ? meta.reason : '';
    const sanitised = Array.isArray(meta?.sanitised) ? meta.sanitised.join('+') : '';
    const signature = `${context}|${code}|${reason}|${sanitised}`;

    if (reportedConditions.has(signature)) return;
    reportedConditions.add(signature);

    report(error, context, level, meta);

    // The default reporter is a no-op when NODE_ENV=production, and a sitemap
    // that silently serves `localhost` URLs to crawlers is a real, hard-to-
    // diagnose SEO bug. Surface the misconfiguration in production logs too.
    // Only the reason and the fallback are printed — never the configured
    // value, which may embed credentials, a hostname or a private path.
    if (context === 'sitemap' && code === SITEMAP_SITE_URL_REJECTED_CODE) {
      console.warn(
        `[sitemap] NEXT_PUBLIC_SITE_URL rejected (${String(reason)}); falling back to ${DEFAULT_SITE_URL}.`,
      );
    }
  };
}

/**
 * Generates sitemap.xml for every public static route.
 *
 * @returns Sitemap entries with a single shared lastModified date.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap({ report: createDeduplicatedReporter(reportError) });
}
