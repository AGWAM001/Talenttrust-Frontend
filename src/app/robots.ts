import type { MetadataRoute } from 'next';
import { createSiteUrlResolver, type SiteUrlResolution } from '@/lib/siteUrl';

/**
 * Metadata routes may be invoked concurrently (once per request in dev, once
 * per build worker in production) and repeatedly across a process lifetime.
 * The resolver is module-scoped and holds only a bounded, frozen memo keyed by
 * the raw environment value, so overlapping calls cannot observe a partially
 * built or hand-mutated result, and a changed NEXT_PUBLIC_SITE_URL is never
 * served from a previous resolution.
 */
const resolver = createSiteUrlResolver();

/**
 * Generates robots.txt metadata to instruct search crawlers.
 *
 * The sitemap origin is validated rather than concatenated blindly: an invalid,
 * over-long, non-HTTP or credential-bearing NEXT_PUBLIC_SITE_URL falls back to
 * the default origin and is reported through the shared error reporter instead
 * of being emitted into robots.txt as an attacker-influenced directive. The
 * return value is a fresh object per call, so a caller mutating the result of
 * one invocation cannot influence another.
 *
 * @returns Robots metadata rules
 */
export default function robots(): MetadataRoute.Robots {
  const site: SiteUrlResolution = resolver.resolve(process.env.NEXT_PUBLIC_SITE_URL);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}

/**
 * Test-only hook: clears memoised resolutions and diagnostic dedupe state so a
 * suite can observe first-refusal logging again. Not part of the Next.js
 * metadata route contract and unused by application code.
 */
export function __resetRobotsResolverForTests(): void {
  resolver.reset();
}