import sitemap from '../sitemap';
import { setErrorReporter } from '@/lib/errorReporter';

describe('sitemap.ts', () => {
  const originalEnv = process.env;
  let warnings: string[];

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    warnings = [];
    setErrorReporter((error, _context, level) => {
      if (level === 'warn') warnings.push(String(error));
    });
    // Freeze time for consistent lastModified testing
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    process.env = originalEnv;
    setErrorReporter(null);
    jest.useRealTimers();
  });

  it('should generate sitemap with all public static routes', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const result = sitemap();

    expect(result).toHaveLength(4);
    expect(result.map(entry => entry.url)).toEqual([
      'http://localhost:3000',
      'http://localhost:3000/contracts',
      'http://localhost:3000/milestones',
      'http://localhost:3000/reputation',
    ]);

    result.forEach(entry => {
      expect(entry.lastModified).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });
  });

  it('should use custom NEXT_PUBLIC_SITE_URL when provided', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    const result = sitemap();

    expect(result[0].url).toBe('https://talenttrust.app');
    expect(result[1].url).toBe('https://talenttrust.app/contracts');
  });

  // --- Compatibility contract: malformed configuration must not corrupt output ---

  it('should not emit double slashes when the site URL has a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app/';
    const result = sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      'https://talenttrust.app',
      'https://talenttrust.app/contracts',
      'https://talenttrust.app/milestones',
      'https://talenttrust.app/reputation',
    ]);
  });

  it.each([
    ['', 'blank'],
    ['   ', 'whitespace only'],
    ['not a url', 'unparseable'],
    ['javascript:alert(1)', 'non-http scheme'],
  ])(
    'should fall back to the dev origin when the value is %p (%s)',
    (value) => {
      process.env.NEXT_PUBLIC_SITE_URL = value;
      const result = sitemap();

      expect(result).toHaveLength(4);
      expect(result[0].url).toBe('http://localhost:3000');
      expect(result.every((entry) => entry.url.startsWith('http://localhost:3000'))).toBe(
        true,
      );
    },
  );

  it('should keep the advertised route set stable under a subpath deployment', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com/talenttrust/';
    const result = sitemap();

    expect(result).toHaveLength(4);
    expect(result[1].url).toBe('https://example.com/talenttrust/contracts');
  });

  it('should use the configured timestamp so generation is deterministic', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED = '2020-05-05T10:20:30.000Z';

    expect(sitemap()).toEqual(sitemap());
    sitemap().forEach((entry) => {
      expect(entry.lastModified).toEqual(new Date('2020-05-05T10:20:30.000Z'));
    });
  });

  it('should ignore an unparseable timestamp instead of emitting Invalid Date', () => {
    process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED = 'last tuesday';
    const result = sitemap();

    result.forEach((entry) => {
      expect(entry.lastModified.getTime()).not.toBeNaN();
      expect(entry.lastModified).toEqual(new Date('2024-01-01T00:00:00.000Z'));
    });
  });

  it('should not advertise session-gated or dynamic routes', () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls.some((url) => url.includes('/wallet'))).toBe(false);
    expect(urls.some((url) => url.includes('['))).toBe(false);
  });

  it('should report a configuration fallback so failures are diagnosable', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://talenttrust.app';
    expect(sitemap()).toHaveLength(4);
    expect(warnings).toHaveLength(0);

    process.env.NEXT_PUBLIC_SITE_URL = 'https://bad host';
    sitemap();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('https://bad host');
  });
});
