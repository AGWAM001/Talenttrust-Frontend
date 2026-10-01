import type { MetadataRoute } from 'next';

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
    ...(sitemap ? { sitemap } : {}),
  };
}
