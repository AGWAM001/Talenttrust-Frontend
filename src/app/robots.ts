import type { MetadataRoute } from 'next';
import { resolveSiteUrl } from '@/lib/siteMetadata';

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
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
