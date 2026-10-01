import type { MetadataRoute } from 'next';
import { reportError } from '@/lib/errorReporter';

/**
 * Origin used when `NEXT_PUBLIC_SITE_URL` is absent. Local development relies
 * on this value, so an unset variable is not reported as a misconfiguration.
 */
const DEFAULT_SITE_URL = 'http://localhost:3000';

/**
 * A host (optionally with port and path) written without a scheme, e.g.
 * `talenttrust.app` or `localhost:3000`. The `(?::\d+)?` group is what keeps
 * scheme-bearing values such as `javascript:alert(1)` or `file:///etc/passwd`
 * out of this shape, so they are never coerced into `https://…`.
 */
const BARE_AUTHORITY_RE = /^[a-z0-9._-]+(?::\d+)?(?:\/[^\s]*)?$/i;

/** Hosts that serve plain HTTP in local development. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Public static routes advertised to crawlers, in output order.
 *
 * Compatibility contract — this list is append-only and order-stable:
 * crawlers and `src/app/__tests__/sitemap.test.ts` depend on the exact set and
 * sequence below. `'/'` is the site root.
 *
 * Excluded deliberately:
 * - `/wallet` needs an active wallet session, so an anonymous crawler can never
 *   resolve it.
 * - `/contracts/[id]` is dynamic content with no enumerable public id space.
 */
export const PUBLIC_SITEMAP_PATHS: readonly string[] = [
  '/',
  '/contracts',
  '/milestones',
  '/reputation',
];

/**
 * Normalizes the `NEXT_PUBLIC_SITE_URL` operator input into a URL base.
 *
 * The result always carries an `http`/`https` scheme and never ends with a
 * slash, so joining a route onto it cannot produce the `//route` duplicates a
 * raw env value would yield. Anything unusable degrades to
 * {@link DEFAULT_SITE_URL} rather than throwing: a metadata route must never
 * take down the app.
 *
 * Query strings, fragments and userinfo are dropped — they would otherwise be
 * replicated onto every generated URL, and credentials in the base would be
 * published to crawlers.
 *
 * @param rawSiteUrl - Unvalidated `NEXT_PUBLIC_SITE_URL` value.
 * @returns A normalized, slash-free base URL.
 */
export function resolveSiteUrl(rawSiteUrl: string | undefined): string {
  const candidate = (rawSiteUrl ?? '').trim();
  if (candidate === '') return DEFAULT_SITE_URL;

  const parsed = parseHttpUrl(candidate);
  if (parsed === null) {
    reportError(
      `Unusable NEXT_PUBLIC_SITE_URL ("${candidate}")`,
      'siteMetadata',
      'warn',
      { fallback: DEFAULT_SITE_URL },
    );
    return DEFAULT_SITE_URL;
  }

  const path = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.origin}${path}`;
}

/**
 * Parses a site URL, accepting scheme-less hosts as an operator convenience.
 *
 * @param candidate - Trimmed env value.
 * @returns The parsed URL, or `null` when no http(s) reading exists.
 */
function parseHttpUrl(candidate: string): URL | null {
  const attempts = [candidate];
  if (BARE_AUTHORITY_RE.test(candidate)) {
    const isLoopback = LOOPBACK_HOSTS.has(candidate.split(/[/:]/)[0]);
    attempts.unshift(`${isLoopback ? 'http' : 'https'}://${candidate}`);
  }

  for (const attempt of attempts) {
    try {
      const url = new URL(attempt);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url;
    } catch {
      // No URL reading under this interpretation; try the next candidate.
    }
  }
  return null;
}

/**
 * Resolves the `lastModified` stamp shared by every sitemap entry.
 *
 * Setting `NEXT_PUBLIC_SITEMAP_LAST_MODIFIED` to an ISO-8601 timestamp makes
 * generation deterministic across rebuilds and revalidations, so crawlers are
 * not told every URL changed on each request. When unset the build clock is
 * used; when set but unparseable the build clock is used and the
 * misconfiguration is reported, rather than emitting an `Invalid Date` element
 * that would make the whole document rejectable.
 *
 * @param rawTimestamp - Unvalidated `NEXT_PUBLIC_SITEMAP_LAST_MODIFIED` value.
 * @returns The timestamp to advertise.
 */
export function resolveSitemapLastModified(
  rawTimestamp: string | undefined,
): Date {
  const candidate = (rawTimestamp ?? '').trim();
  if (candidate === '') return new Date();

  const parsed = Date.parse(candidate);
  if (Number.isNaN(parsed)) {
    reportError(
      `Unusable NEXT_PUBLIC_SITEMAP_LAST_MODIFIED ("${candidate}")`,
      'siteMetadata',
      'warn',
      { fallback: 'build clock' },
    );
    return new Date();
  }
  return new Date(parsed);
}

/**
 * Builds sitemap entries for the public routes.
 *
 * Route values are normalized, and entries resolving to an already emitted URL
 * are dropped with a warning. Without that, a duplicated or blank route — or a
 * base URL that already points at one of them — would advertise the same
 * document under several addresses, which crawlers treat as a penalty-worthy
 * defect rather than a no-op.
 *
 * @param baseUrl - Normalized base from {@link resolveSiteUrl}.
 * @param lastModified - Stamp from {@link resolveSitemapLastModified}.
 * @param paths - Routes to emit; defaults to {@link PUBLIC_SITEMAP_PATHS}.
 * @returns Sitemap entries, in input order and free of duplicate URLs.
 */
export function buildSitemapEntries(
  baseUrl: string,
  lastModified: Date,
  paths: readonly string[] = PUBLIC_SITEMAP_PATHS,
): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  for (const rawPath of paths) {
    const url = joinRoute(baseUrl, rawPath);
    if (seen.has(url)) {
      reportError(
        `Skipped duplicate sitemap route ("${rawPath}")`,
        'siteMetadata',
        'warn',
        { url },
      );
      continue;
    }
    seen.add(url);
    entries.push({ url, lastModified });
  }

  return entries;
}

/**
 * Joins one route onto a slash-free base, tolerating inconsistent slashes.
 *
 * `'/'`, `''`, `'contracts'` and `'/contracts//'` all resolve predictably, so a
 * typo in the route list cannot emit `base//contracts`.
 *
 * @param baseUrl - Slash-free base URL.
 * @param rawPath - Route as declared.
 * @returns Absolute URL for the route.
 */
function joinRoute(baseUrl: string, rawPath: string): string {
  const trimmed = rawPath.trim().replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? baseUrl : `${baseUrl}/${trimmed}`;
}
