import type { MetadataRoute } from 'next';
import {
  buildSitemapEntries,
  resolveSitemapLastModified,
  resolveSiteUrl,
} from '@/lib/siteMetadata';

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
