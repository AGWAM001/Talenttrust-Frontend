import {
  PUBLIC_SITEMAP_PATHS,
  buildSitemapEntries,
  resolveSitemapLastModified,
  resolveSiteUrl,
} from '@/lib/siteMetadata';
import { setErrorReporter } from '@/lib/errorReporter';

const DEFAULT_BASE = 'http://localhost:3000';

type Report = {
  error: unknown;
  context: string;
  level?: string;
  meta?: Record<string, unknown>;
};

describe('siteMetadata.ts', () => {
  let reports: Report[];

  beforeEach(() => {
    reports = [];
    setErrorReporter((error, context, level, meta) => {
      reports.push({ error, context, level, meta });
    });
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    setErrorReporter(null);
    jest.useRealTimers();
  });

  describe('PUBLIC_SITEMAP_PATHS', () => {
    it('pins the advertised route set and order', () => {
      // Append-only contract: crawlers key off these exact addresses.
      expect([...PUBLIC_SITEMAP_PATHS]).toEqual([
        '/',
        '/contracts',
        '/milestones',
        '/reputation',
      ]);
    });

    it('keeps gated and dynamic routes out of the public set', () => {
      expect(PUBLIC_SITEMAP_PATHS).not.toContain('/wallet');
      expect(PUBLIC_SITEMAP_PATHS.some((p) => p.includes('['))).toBe(false);
    });
  });

  describe('resolveSiteUrl', () => {
    it('returns the dev default for absent or blank configuration', () => {
      expect(resolveSiteUrl(undefined)).toBe(DEFAULT_BASE);
      expect(resolveSiteUrl('')).toBe(DEFAULT_BASE);
      expect(resolveSiteUrl('   ')).toBe(DEFAULT_BASE);
      expect(reports).toHaveLength(0);
    });

    it('leaves a well-formed URL untouched', () => {
      expect(resolveSiteUrl('https://talenttrust.app')).toBe(
        'https://talenttrust.app',
      );
      expect(reports).toHaveLength(0);
    });

    it('strips trailing slashes so joined routes cannot double up', () => {
      expect(resolveSiteUrl('https://talenttrust.app/')).toBe(
        'https://talenttrust.app',
      );
      expect(resolveSiteUrl('  https://talenttrust.app///  ')).toBe(
        'https://talenttrust.app',
      );
    });

    it('keeps a path prefix for subdirectory deployments', () => {
      expect(resolveSiteUrl('https://example.com/talenttrust/')).toBe(
        'https://example.com/talenttrust',
      );
    });

    it('drops query, fragment and credentials', () => {
      expect(resolveSiteUrl('https://talenttrust.app/?utm_source=x#pricing')).toBe(
        'https://talenttrust.app',
      );
      expect(resolveSiteUrl('https://admin:s3cret@talenttrust.app')).toBe(
        'https://talenttrust.app',
      );
    });

    it('completes a scheme-less host', () => {
      expect(resolveSiteUrl('talenttrust.app')).toBe('https://talenttrust.app');
      expect(resolveSiteUrl('talenttrust.app:8443/deploy')).toBe(
        'https://talenttrust.app:8443/deploy',
      );
    });

    it('treats a bare loopback host as plain HTTP', () => {
      expect(resolveSiteUrl('localhost:3000')).toBe('http://localhost:3000');
      expect(resolveSiteUrl('127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    });

    it.each([
      'not a url',
      'javascript:alert(1)',
      'ftp://talenttrust.app',
      '/relative/path',
      'https://',
    ])('falls back to the dev default for %p', (value) => {
      expect(resolveSiteUrl(value)).toBe(DEFAULT_BASE);
      expect(reports).toHaveLength(1);
      expect(reports[0].level).toBe('warn');
      expect(reports[0].context).toBe('siteMetadata');
    });

    it('names the offending value so misconfiguration is diagnosable', () => {
      resolveSiteUrl('http://bad host');
      expect(reports[0].error).toContain('http://bad host');
    });
  });

  describe('resolveSitemapLastModified', () => {
    it('uses the build clock when unset or blank', () => {
      expect(resolveSitemapLastModified(undefined)).toEqual(new Date());
      expect(resolveSitemapLastModified('  ')).toEqual(new Date());
      expect(reports).toHaveLength(0);
    });

    it('honours a configured ISO-8601 timestamp', () => {
      expect(
        resolveSitemapLastModified('2020-05-05T10:20:30.000Z'),
      ).toEqual(new Date('2020-05-05T10:20:30.000Z'));
      expect(reports).toHaveLength(0);
    });

    it('falls back to the build clock for an unparseable timestamp', () => {
      expect(resolveSitemapLastModified('last tuesday')).toEqual(new Date());
      expect(reports).toHaveLength(1);
      expect(reports[0].level).toBe('warn');
    });
  });

  describe('buildSitemapEntries', () => {
    const stamp = new Date('2020-01-01T00:00:00.000Z');

    it('emits one entry per public route, in order', () => {
      expect(buildSitemapEntries('https://talenttrust.app', stamp)).toEqual([
        { url: 'https://talenttrust.app', lastModified: stamp },
        { url: 'https://talenttrust.app/contracts', lastModified: stamp },
        { url: 'https://talenttrust.app/milestones', lastModified: stamp },
        { url: 'https://talenttrust.app/reputation', lastModified: stamp },
      ]);
    });

    it('normalizes inconsistent slashes in route declarations', () => {
      const entries = buildSitemapEntries('https://a.app', stamp, [
        '/',
        'contracts',
        '/milestones//',
      ]);
      expect(entries.map((e) => e.url)).toEqual([
        'https://a.app',
        'https://a.app/contracts',
        'https://a.app/milestones',
      ]);
    });

    it('collapses routes that resolve to the same URL', () => {
      const entries = buildSitemapEntries('https://a.app', stamp, [
        '/contracts',
        '/contracts',
        '/',
        '',
      ]);
      expect(entries.map((e) => e.url)).toEqual([
        'https://a.app/contracts',
        'https://a.app',
      ]);
      expect(reports).toHaveLength(2);
      expect(reports[0].level).toBe('warn');
    });

    it('returns an empty sitemap for an empty route list', () => {
      expect(buildSitemapEntries('https://a.app', stamp, [])).toEqual([]);
    });

    it('is deterministic across repeated generations', () => {
      expect(buildSitemapEntries('https://a.app', stamp)).toEqual(
        buildSitemapEntries('https://a.app', stamp),
      );
      expect(reports).toHaveLength(0);
    });

    it('composes routes onto a subdirectory base', () => {
      expect(
        buildSitemapEntries('https://example.com/talenttrust', stamp).map(
          (e) => e.url,
        ),
      ).toEqual([
        'https://example.com/talenttrust',
        'https://example.com/talenttrust/contracts',
        'https://example.com/talenttrust/milestones',
        'https://example.com/talenttrust/reputation',
      ]);
    });
  });
});
