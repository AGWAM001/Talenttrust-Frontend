import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '@/lib/siteMetadata';

const DEFAULT_SITE_URL = 'http://localhost:3000';
const INVALID_SITE_URL_WARNING =
  'Invalid NEXT_PUBLIC_SITE_URL; omitting sitemap from robots metadata.';

// Keep crawl rules available without publishing a sitemap from invalid input.
function getSitemapUrl(siteUrl: string): string | undefined {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(siteUrl);
  } catch {
    console.warn(INVALID_SITE_URL_WARNING);
    return undefined;
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    console.warn(INVALID_SITE_URL_WARNING);
    return undefined;
  }

  parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/+$/, '')}/`;
  return new URL('sitemap.xml', parsedUrl).toString();
}

/**
 * Generates robots.txt metadata to instruct search crawlers.
 *
 * Shares `resolveSiteUrl` with `sitemap.ts` so the sitemap this file advertises
 * is guaranteed to live at the exact origin the sitemap's own entries use;
 * divergent normalization here would point crawlers at a URL that 404s.
 *
 * @returns Robots metadata rules
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    ...(sitemap ? { sitemap } : {}),
  };
}
