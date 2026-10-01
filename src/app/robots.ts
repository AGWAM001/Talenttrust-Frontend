import type { MetadataRoute } from 'next';

const DEFAULT_SITE_URL = 'http://localhost:3000';
const SITE_URL_ERROR =
  'NEXT_PUBLIC_SITE_URL must be an absolute HTTP(S) URL without credentials, query, or fragment.';

function getSitemapUrl(siteUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(siteUrl);
  } catch {
    throw new Error(SITE_URL_ERROR);
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error(SITE_URL_ERROR);
  }

  parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, '')}/`;
  return new URL('sitemap.xml', parsedUrl).toString();
}

/**
 * Resolves the canonical site origin used for robots.txt and sitemap links.
 *
 * Invariants:
 * - The returned value is always a valid, non-empty absolute URL origin
 *   (no trailing slash, no path, no query, no fragment) so that concatenating
 *   `/sitemap.xml` produces a deterministic, well-formed URL.
 * - Only http:/ and https: are accepted; any other protocol is rejected.
 * - The function never throws and never returns an invalid origin: if the
 *   configured value is missing or malformed, it falls back to a safe local
 *   default.
 */
export const DEFAULT_SITE_URL = 'http://localhost:3000';

const ALLOWED_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:']);

/**
 * Normalizes a configured site URL into a canonical origin.
 *
 * @param raw - Raw configuration value (e.g. from `NEXT_PUBLIC_SITE_URL`).
 * @returns The normalized origin, or `null` if the input is not a valid,
 *          supported absolute URL.
 */
export function normalizeSiteUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return null;
  }

  if (parsed.hostname.length === 0) {
    return null;
  }

  // Canonicalize to an origin only: drop path, query, fragment, and any
  // default port so the resulting string is stable across equivalent inputs.
  return parsed.origin;
}

/**
 * Resolves the effective site origin from the provided environment.
 *
 * @param env - Environment map. Defaults to `process.env` for production
 *             usage; injectable for deterministic testing.
 * @returns A canonical origin URL string.
 */
export function resolveSiteUrl(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const normalized = normalizeSiteUrl(env.NEXT_PUBLIC_SITE_URL);
  return normalized ?? DEFAULT_SITE_URL;
}

/**
 * Generates robots.txt metadata to instruct search crawlers.
 *
 * The generated object is deterministic for a given environment and always
 * exposes a valid absolute sitemap URL.
 *
 * @returns Robots metadata rules
 */
export default function robots(): MetadataRoute.Robots {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const sitemap = getSitemapUrl(configuredSiteUrl || DEFAULT_SITE_URL);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap,
  };
}
