import type { MetadataRoute } from 'next';
import {
  buildSitemapEntries,
  resolveSitemapLastModified,
  resolveSiteUrl,
} from '@/lib/siteMetadata';

export const SITEMAP_PATHS = [
  '/contracts',
  '/milestones',
  '/reputation',
] as const;

export type SitemapPath = (typeof SITEMAP_PATHUS)[number];

/**
 * Resolves the canonical site origin used to build absolute sitemap URLs.
 *
 * Invariants:
* - The returned origin is always a valid absolute http(s) URL or a relative
 *   path starting with "/", so consumers can safely concatenate paths.
 * - Trailing slashes are normalized away to prevent duplicate "//" segments.
 * - If the configured value is invalid or missing, we fall back to a deterministic
 *   localhost origin rather than emitting malformed URLs.
 */
export function resolveSiteUrl(rawValue?: string | undefined): string {
  const fallback = 'http://localhost:3000';
  const candidate = (rawValue ?? '').trim();

  if (candidate.length === 0) {
    return fallback;
  }

  // Relative origins are allowed but must be normalized to a single leading slash.
  if (candidate.startsWith('/')) {
    return candidate.replace(/\/+$/, '') || '/';
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fallback;
    }
    // Normalize trailing slashes on the origin only.
    return parsed.origin;
  } catch {
    return fallback;
  }
}

/**
 * Builds an absolute sitemap URL from an origin and a normalized path.
 *
 * Invariants:
 * - The path is always normalized to exactly one leading slash and no trailing
 *   slash, so duplicate or missing slashes cannot produce ambiguous URLs.
 * - The root path ("/") is preserved as the origin itself.
 */
export function buildSitemapUrl(origin: string, path: string): string {
  const normalizedPath = normalizePath(path);
  if (normalizedPath === '/') {
    return origin;
  }
  return `${origin}${normalizedPath}`;
}

export function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length === 0) {
    return '/';
  }
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = withLeading.replace(/\/{2,}/g, '/');
  if (collapsed.length > 1) {
    return collapsed.replace(/\/+$/, '');
  }
  return collapsed;
}

/**
 * Generates a dynamic sitemap.xml listing all public static routes.
 *
 * The advertised route set is a compatibility contract and lives in
 * `PUBLIC_SITEMAP_PATHS`; this route only renders it, so configuration that is
 * malformed, duplicated or absent cannot silently change which URLs crawlers
 * are told about.
 *
 * @returns Sitemap entries with lastModified date
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const lastModified = resolveSitemapLastModified(
    process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED,
  );

  return buildSitemapEntries(siteUrl, lastModified);
}
