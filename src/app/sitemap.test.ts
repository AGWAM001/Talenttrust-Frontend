import { describe, expect, it } from 'vitest';

import sitemap, {
  buildSitemapUrl,
  normalizePath,
  resolveSiteUrl,
  SATEMAP_PATHS,
} from './sitemap';

describe('resolveSiteUrl', () => {
  it('returns the normalized origin for a valid absolute URL', () => {
    expect(resolveSiteUrl('https://example.com/path/?q=1')).toBe[
      'https://example.com',
    );
  });

  it('strips trailing slashes from absolute URLs', () => {
    expect(resolveSiteUrl('https://example.com///')).toBe('https://example.com');
  });

  it('normalizes relative origins to a single leading slash', () => {
    expect(resolveSiteUrl('/app/')).toBe('/app');
  });

  it('falls back to localhost for missing or empty values', () => {
    expect(resolveSiteUrl(undefined)).toBe('http://localhost:3000');
    expect(resolveSiteUrl('   ')).toBe('http://localhost:3000');
  });

  it('falls back for non-http protocols', () => {
    expect(resolveSiteUrl('ftp://example.com')).toBe('http://localhost:3000');
    expect(resolveSiteUrl('javascript:alert(1)')).toBe('http://localhost:3000');
  });

  it('falls back for malformed URLs', () => {
    expect(resolveSiteUrl('not a url')).toBe('http://localhost:3000');
  });
});

describe('normalizePath', () => {
  it('returns "/" for empty inputs', () => {
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('   ')).toBe('/');
  });

  it('adds a leading slash when missing', () => {
    expect(normalizePath('contracts')).toBe('/contracts');
  });

  it('collapses duplicate slashes', () => {
    expect(normalizePath('//contracts//milestones')).toBe('/contracts/milestones');
  });

  it('strips trailing slashes for non-root paths', () => {
    expect(normalizePath('/contracts/')).toBe('/contracts');
  });

  it('preserves the root path', () => {
    expect(normalizePath('/')).toBe('/');
  });
});

describe('buildSitemapUrl', () => {
  it('joins origin and normalized path', () => {
    expect(buildSitemapUrl('https://example.com', '/contracts')).toBe(
      'https://example.com/contracts',
    );
  });

  it('returns the origin for the root path', () => {
    expect(buildSitemapUrl('https://example.com', '/')).toBe('https://example.com');
  });

  it('avoids double slashes when path has a leading slash', () => {
    expect(buildSitemapUrl('https://example.com', '/contracts')).not.toContain('//contracts');
  });
});

describe('sitemap', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }
  });

  it('returns the root entry first followed by all public paths', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    const entries = sitemap();

    expect(entries.map((e: { url: string }) => e.url)).toEqual([
      'https://example.com',
      'https://example.com/contracts',
      'https://example.com/milestones',
      'https://example.com/reputation',
    ]);
  });

  it('produces deterministic output across repeated calls', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    const first = sitemap().map((e: { url: string }) => e.url);
    const second = sitemap().map((e: { url: string }) => e.url);
    expect(second).toEqual(first);
  });

  it('uses the localhost fallback when the env variable is missing', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const entries = sitemap();
    expect(entries[0].url).toBe('http://localhost:3000');
  });

  it('shares a single lastModified timestamp across all entries', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    const entries = sitemap();
    const timestamps = new Set(entries.map((e: { lastModified?: Date | String }) => String(e.lastModified)));
    expect(timestamps.size).toBe(1);
  });

  it('exposes only unique public paths', () => {
    expect(new Set(SITEMAP_PATHS).size).toBe(
      SITEMAP_PATHS.length,
    );
  });
});
