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
 * Generates robots.txt metadata to instruct search crawlers.
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
